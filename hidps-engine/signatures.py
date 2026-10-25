"""
HIDPS Signature-Based Detection Catalog & Normalization Engine
Proyek: PPID Kementerian Agama Kota Parepare
Kategori Deteksi:
1. SQL Injection (SQLI)
2. Cross-Site Scripting (XSS)
3. Path Traversal / Local File Inclusion (PATH_TRAVERSAL)
4. Remote File Inclusion (RFI)
5. Command Injection (COMMAND_INJECTION)

Dirancang dengan inspirasi OWASP Core Rule Set (CRS) dan mitigasi ReDoS
(input length bounding + linear-time regular expressions).
"""

import html
import re
import urllib.parse
from dataclasses import dataclass
from typing import List, Optional

MAX_EVAL_LENGTH = 8192


@dataclass(frozen=True)
class SignatureRule:
    rule_id: str
    category: str
    name: str
    severity: str  # 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
    pattern: re.Pattern
    description: str


def normalize_payload(raw_input: str) -> str:
    """
    Normalizes HTTP URI, query string, and user-agent input before signature matching:
    1. Bounds input length to prevent ReDoS on pathological payloads.
    2. Performs up to 2 passes of URL decoding (catches single & double encoding).
    3. Unescapes HTML entities.
    4. Strips null bytes.
    5. Collapses SQL inline comments (/**/) and consecutive whitespace.
    """
    if not raw_input:
        return ""

    bounded = raw_input[:MAX_EVAL_LENGTH]

    # Multi-pass URL unquoting (2 passes)
    decoded = bounded
    for _ in range(2):
        unquoted = urllib.parse.unquote_plus(decoded)
        if unquoted == decoded:
            break
        decoded = unquoted

    # HTML entity decoding
    decoded = html.unescape(decoded)

    # Remove null bytes
    decoded = decoded.replace("\x00", "")

    # Collapse inline C-style comments often used for SQLi evasion
    decoded = re.sub(r"/\*.*?\*/", " ", decoded)

    # Collapse whitespace
    decoded = re.sub(r"\s+", " ", decoded).strip()

    return decoded[:MAX_EVAL_LENGTH]


SIGNATURE_CATALOG: List[SignatureRule] = [
    # ==========================================
    # 1. SQL INJECTION (SQLI)
    # ==========================================
    SignatureRule(
        rule_id="RULE-SQLI-01",
        category="SQLI",
        name="SQL Injection - UNION SELECT Extraction",
        severity="CRITICAL",
        pattern=re.compile(
            r"(?i)\bunion\b(?:\s+all)?\s+\bselect\b\s+[\w\*\,\(\)\.\'\"]+",
        ),
        description="Mendeteksi percobaan ekstraksi tabel database menggunakan operator UNION [ALL] SELECT.",
    ),
    SignatureRule(
        rule_id="RULE-SQLI-02",
        category="SQLI",
        name="SQL Injection - Boolean Tautology Bypass",
        severity="HIGH",
        pattern=re.compile(
            r"(?i)(?:['\"\)]\s*(?:or|and)\s+['\"]?\d+['\"]?\s*=\s*['\"]?\d+|['\"]\s*or\s+['\"][a-z0-9]+['\"]\s*=\s*['\"][a-z0-9]+|\bor\s+1\s*=\s*1\b)",
        ),
        description="Mendeteksi percobaan bypass autentikasi atau filter klausa WHERE menggunakan tautologi boolean (OR 1=1).",
    ),
    SignatureRule(
        rule_id="RULE-SQLI-03",
        category="SQLI",
        name="SQL Injection - Time-Based Blind & Stacked Queries",
        severity="CRITICAL",
        pattern=re.compile(
            r"(?i)(?:\bsleep\s*\(\s*\d+\s*\)|\bbenchmark\s*\(\s*\d+|\bpg_sleep\s*\(\s*\d+|\bwaitfor\s+delay\s+['\"][\d:]+['\"]|;\s*(?:drop|alter|truncate|delete\s+from|insert\s+into|update)\s+\b\w+)",
        ),
        description="Mendeteksi blind SQL injection berbasis waktu (SLEEP/BENCHMARK/PG_SLEEP) atau stacked query destruktif.",
    ),
    SignatureRule(
        rule_id="RULE-SQLI-04",
        category="SQLI",
        name="SQL Injection - Database Schema & Metadata Probing",
        severity="HIGH",
        pattern=re.compile(
            r"(?i)\b(?:information_schema\.(?:tables|columns|schemata)|pg_catalog\.pg_tables|sqlite_master|sys\.databases|xp_cmdshell)\b",
        ),
        description="Mendeteksi enumerasi struktur tabel internal database melalui katalog sistem.",
    ),
    SignatureRule(
        rule_id="RULE-SQLI-05",
        category="SQLI",
        name="SQL Injection - Error/Function Probing & Comment Truncation",
        severity="MEDIUM",
        pattern=re.compile(
            r"(?i)(?:['\"`]\s*(?:--|#|/\*)|(?:\bextractvalue|\bupdatexml|\bconcat_ws|\bgroup_concat|\bload_file)\s*\()",
        ),
        description="Mendeteksi pemotongan query dengan komentar SQL (-- atau #) setelah kutipan atau fungsi ekstraksi error.",
    ),

    # ==========================================
    # 2. CROSS-SITE SCRIPTING (XSS)
    # ==========================================
    SignatureRule(
        rule_id="RULE-XSS-01",
        category="XSS",
        name="XSS - Script Tag Injection",
        severity="HIGH",
        pattern=re.compile(
            r"(?i)<\s*/?\s*script\b[^>]*>",
        ),
        description="Mendeteksi penyisipan elemen HTML <script> secara langsung pada URI atau parameter.",
    ),
    SignatureRule(
        rule_id="RULE-XSS-02",
        category="XSS",
        name="XSS - Inline Event Handler Execution",
        severity="HIGH",
        pattern=re.compile(
            r"(?i)\bon(?:error|load|click|mouseover|focus|blur|submit|toggle|animationstart)\s*=\s*['\"\w\(\)]",
        ),
        description="Mendeteksi atribut event handler DOM berbahaya seperti onerror=, onload=, atau onmouseover=.",
    ),
    SignatureRule(
        rule_id="RULE-XSS-03",
        category="XSS",
        name="XSS - Dangerous Pseudo-Protocol URI",
        severity="HIGH",
        pattern=re.compile(
            r"(?i)\b(?:javascript|vbscript)\s*:|data\s*:\s*text/html\b",
        ),
        description="Mendeteksi eksekusi kode melalui skema URI javascript:, vbscript:, atau data:text/html.",
    ),
    SignatureRule(
        rule_id="RULE-XSS-04",
        category="XSS",
        name="XSS - DOM Cookie Theft & JS Sink Probing",
        severity="MEDIUM",
        pattern=re.compile(
            r"(?i)\b(?:document\.(?:cookie|domain|write)|window\.location|String\.fromCharCode|eval\s*\(|alert\s*\(|prompt\s*\(|confirm\s*\()",
        ),
        description="Mendeteksi akses ke sink JavaScript sensitif seperti document.cookie, eval(), atau alert().",
    ),
    SignatureRule(
        rule_id="RULE-XSS-05",
        category="XSS",
        name="XSS - Embedded Vector Tag (SVG/Iframe/Object)",
        severity="MEDIUM",
        pattern=re.compile(
            r"(?i)<\s*(?:svg|iframe|object|embed|applet|meta|body)\b[^>]*>",
        ),
        description="Mendeteksi penyisipan tag vektor XSS alternatif seperti <svg>, <iframe>, atau <object>.",
    ),

    # ==========================================
    # 3. PATH TRAVERSAL / LOCAL FILE INCLUSION
    # ==========================================
    SignatureRule(
        rule_id="RULE-TRAV-01",
        category="PATH_TRAVERSAL",
        name="Path Traversal - Dot-Dot-Slash Directory Escape",
        severity="HIGH",
        pattern=re.compile(
            r"(?i)(?:\.\./|\.\.\\|%2e%2e[/\\%]|/\.\.;/)",
        ),
        description="Mendeteksi urutan navigasi direktori induk (../ atau ..\\) untuk keluar dari web root.",
    ),
    SignatureRule(
        rule_id="RULE-TRAV-02",
        category="PATH_TRAVERSAL",
        name="LFI - POSIX System Credential & Proc File Access",
        severity="CRITICAL",
        pattern=re.compile(
            r"(?i)(?:/etc/(?:passwd|shadow|group|hosts|sudoers|ssh/sshd_config)|/proc/self/(?:environ|cmdline|maps)|/var/log/(?:auth|syslog|nginx))",
        ),
        description="Mendeteksi percobaan pembacaan file sistem sensitif Linux seperti /etc/passwd atau /proc/self/environ.",
    ),
    SignatureRule(
        rule_id="RULE-TRAV-03",
        category="PATH_TRAVERSAL",
        name="LFI - Application Secret & Config File Exposure",
        severity="CRITICAL",
        pattern=re.compile(
            r"(?i)(?:^|[/\?&=])(?:\.env(?:\.local|\.production)?|\.git/(?:config|HEAD)|wp-config\.php|id_rsa|\.htpasswd)\b",
        ),
        description="Mendeteksi akses tidak sah ke file konfigurasi aplikasi (.env, .git/config, kunci SSH).",
    ),
    SignatureRule(
        rule_id="RULE-TRAV-04",
        category="PATH_TRAVERSAL",
        name="LFI - Stream Wrapper & Protocol Manipulation",
        severity="HIGH",
        pattern=re.compile(
            r"(?i)\b(?:php://(?:filter|input|stdin)|phar://|zip://|file:///|glob://)",
        ),
        description="Mendeteksi penggunaan stream wrapper (php://filter, file:///) untuk membaca kode sumber lokal.",
    ),

    # ==========================================
    # 4. REMOTE FILE INCLUSION (RFI)
    # ==========================================
    SignatureRule(
        rule_id="RULE-RFI-01",
        category="RFI",
        name="RFI - External Protocol in Inclusion Parameter",
        severity="CRITICAL",
        pattern=re.compile(
            r"(?i)(?:[?&](?:file|page|include|inc|doc|path|template|load|view|url|module|redirect_uri)=)(?:https?|ftp|sftp|tftp)://",
        ),
        description="Mendeteksi parameter inklusi file yang diarahkan ke server eksternal melalui protokol HTTP/FTP.",
    ),
    SignatureRule(
        rule_id="RULE-RFI-02",
        category="RFI",
        name="RFI - Remote Webshell & Script Payload URL",
        severity="CRITICAL",
        pattern=re.compile(
            r"(?i)[?&][^=]+=(?:https?|ftp)://[^\s/$.?#].[^\s&]*\.(?:php|phtml|jsp|jspx|asp|aspx|sh|pl|py|rb|cgi|txt)\b",
        ),
        description="Mendeteksi pemuatan skrip atau webshell jarak jauh (.php, .sh, .py, .txt) melalui query URL.",
    ),
    SignatureRule(
        rule_id="RULE-RFI-03",
        category="RFI",
        name="RFI - Expect & Base64 Data Stream Execution",
        severity="HIGH",
        pattern=re.compile(
            r"(?i)\b(?:expect://|data://text/plain;base64,[a-zA-Z0-9+/=]+)",
        ),
        description="Mendeteksi inklusi payload terenkode base64 melalui wrapper data:// atau expect://.",
    ),

    # ==========================================
    # 5. COMMAND INJECTION (COMMAND_INJECTION)
    # ==========================================
    SignatureRule(
        rule_id="RULE-CMDI-01",
        category="COMMAND_INJECTION",
        name="OS Command Injection - Chained Reconnaissance Commands",
        severity="CRITICAL",
        pattern=re.compile(
            r"(?i)(?:;|\|\||&&|\||`|\$\()\s*(?:/bin/|/usr/bin/)?(?:cat|ls|id|whoami|uname|pwd|ifconfig|netstat|ps|env|printenv)\b",
        ),
        description="Mendeteksi injeksi operator shell (; | && $()) yang diikuti perintah rekognisi sistem operasi.",
    ),
    SignatureRule(
        rule_id="RULE-CMDI-02",
        category="COMMAND_INJECTION",
        name="OS Command Injection - Reverse Shell & Network Downloader",
        severity="CRITICAL",
        pattern=re.compile(
            r"(?i)(?:\b(?:nc|netcat|ncat)\s+-[elvp]|\bbash\s+-i\b|/dev/tcp/[\d\.]+/\d+|\b(?:curl|wget)\s+(?:-[a-zA-Z]+\s+)*https?://|\bchmod\s+(?:\+x|777)\b)",
        ),
        description="Mendeteksi upaya pembukaan reverse shell (nc, bash -i, /dev/tcp) atau pengunduhan malware via curl/wget.",
    ),
    SignatureRule(
        rule_id="RULE-CMDI-03",
        category="COMMAND_INJECTION",
        name="OS Command Injection - Destructive & Privilege Escalation",
        severity="CRITICAL",
        pattern=re.compile(
            r"(?i)(?:;|\|\||&&|\||`|\$\()\s*(?:rm\s+-[rf]+|mkfifo\s+|sudo\s+|su\s+-|chmod\s+|chown\s+|crontab\s+)",
        ),
        description="Mendeteksi perintah destruktif (rm -rf) atau eskalasi hak akses (sudo, crontab, mkfifo).",
    ),
    SignatureRule(
        rule_id="RULE-CMDI-04",
        category="COMMAND_INJECTION",
        name="OS Command Injection - Windows CMD & PowerShell Payload",
        severity="HIGH",
        pattern=re.compile(
            r"(?i)\b(?:cmd(?:\.exe)?\s*/c\b|powershell(?:\.exe)?\s+-(?:enc|encodedcommand|nop|noprofile|w\s+hidden|exec\s+bypass))",
        ),
        description="Mendeteksi injeksi perintah Windows cmd.exe /c atau PowerShell terenkode.",
    ),
]


@dataclass(frozen=True)
class SignatureMatchResult:
    rule_id: str
    category: str
    name: str
    severity: str
    matched_snippet: str
    description: str


def evaluate_request(
    request_uri: str,
    user_agent: str = "",
    referer: str = "",
) -> List[SignatureMatchResult]:
    """
    Evaluates an HTTP request's URI, User-Agent, and Referer against all active signatures.
    Returns a list of matched SignatureMatchResult items sorted by severity priority.
    """
    combined_raw = f"{request_uri} {user_agent} {referer}".strip()
    normalized = normalize_payload(combined_raw)
    if not normalized:
        return []

    matches: List[SignatureMatchResult] = []
    severity_rank = {"CRITICAL": 4, "HIGH": 3, "MEDIUM": 2, "LOW": 1}

    for rule in SIGNATURE_CATALOG:
        m = rule.pattern.search(normalized)
        if m:
            snippet = m.group(0)[:200]
            matches.append(
                SignatureMatchResult(
                    rule_id=rule.rule_id,
                    category=rule.category,
                    name=rule.name,
                    severity=rule.severity,
                    matched_snippet=snippet,
                    description=rule.description,
                )
            )

    matches.sort(key=lambda r: severity_rank.get(r.severity, 0), reverse=True)
    return matches


def get_catalog_summary() -> List[dict]:
    """Returns serializable metadata for all rules in the catalog."""
    return [
        {
            "rule_id": r.rule_id,
            "category": r.category,
            "name": r.name,
            "severity": r.severity,
            "description": r.description,
        }
        for r in SIGNATURE_CATALOG
    ]
