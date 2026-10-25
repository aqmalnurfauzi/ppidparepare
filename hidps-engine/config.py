"""
HIDPS Configuration & Log Discovery Manager
Proyek: PPID Kementerian Agama Kota Parepare
Mendukung variabel lingkungan (Environment Variables), file konfigurasi lokal non-rahasia,
serta auto-discovery file log akses web server (Nginx / Apache / Demo Log).
"""

import json
import os
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List

ENGINE_DIR = Path(__file__).resolve().parent
DEFAULT_DB_PATH = str(ENGINE_DIR / "hidps_events.db")
DEFAULT_DEMO_LOG_PATH = str(ENGINE_DIR / "logs" / "demo_access.log")
LOCAL_CONFIG_FILE = ENGINE_DIR / "config.json"

CANDIDATE_LOG_PATHS: List[str] = [
    "/var/log/nginx/access.log",
    "/var/log/nginx/ppid_access.log",
    "/var/log/apache2/access.log",
    "/var/log/httpd/access_log",
    str(ENGINE_DIR / "logs" / "access.log"),
    DEFAULT_DEMO_LOG_PATH,
]

SAFE_WHITELIST_IPS = {"127.0.0.1", "::1", "localhost", "0.0.0.0"}
VALID_MODES = {"detect_only", "simulation", "active_ufw"}

APPROVED_LOG_PREFIXES = (
    "/var/log/nginx/",
    "/var/log/apache2/",
    "/var/log/httpd/",
    str(ENGINE_DIR / "logs"),
)


def is_safe_log_path(path_str: str) -> bool:
    """
    Validates that a log file path is strictly bounded to approved candidate paths
    or standard web server log directories, and rejects path traversal (..) and null bytes.
    """
    if not path_str or not isinstance(path_str, str):
        return False
    clean = path_str.strip()
    if "\x00" in clean or ".." in clean:
        return False

    if clean in CANDIDATE_LOG_PATHS:
        return True

    try:
        resolved = Path(clean).resolve()
        resolved_str = str(resolved)
        return any(resolved_str.startswith(prefix) for prefix in APPROVED_LOG_PREFIXES)
    except Exception:
        return False


def redact_secret(value: str) -> str:
    """Redacts sensitive tokens so they are never exposed in logs or API responses."""
    if not value or len(value.strip()) == 0:
        return ""
    clean = value.strip()
    if len(clean) <= 8:
        return "***REDACTED***"
    return f"{clean[:4]}...{clean[-4:]} (REDACTED)"


def discover_log_sources() -> List[Dict[str, object]]:
    """
    Inspects standard candidate log locations and reports existence, readability, and size.
    """
    results: List[Dict[str, object]] = []
    for candidate in CANDIDATE_LOG_PATHS:
        p = Path(candidate)
        exists = p.exists() and p.is_file()
        readable = os.access(candidate, os.R_OK) if exists else False
        size_bytes = p.stat().st_size if exists and readable else 0
        results.append(
            {
                "path": candidate,
                "exists": exists,
                "readable": readable,
                "size_bytes": size_bytes,
                "is_demo": candidate == DEFAULT_DEMO_LOG_PATH,
            }
        )
    return results


@dataclass
class HidpsConfig:
    db_path: str
    log_path: str
    mode: str  # 'detect_only' | 'simulation' | 'active_ufw'
    dedup_window_seconds: int
    telegram_bot_token: str
    telegram_chat_id: str
    ufw_enabled: bool

    def to_safe_dict(self) -> Dict[str, object]:
        """Returns configuration dictionary with secrets strictly redacted."""
        return {
            "db_path": self.db_path,
            "log_path": self.log_path,
            "mode": self.mode,
            "dedup_window_seconds": self.dedup_window_seconds,
            "telegram_configured": bool(self.telegram_bot_token and self.telegram_chat_id),
            "telegram_bot_token_masked": redact_secret(self.telegram_bot_token),
            "telegram_chat_id": self.telegram_chat_id,
            "ufw_enabled": self.ufw_enabled,
        }


def load_local_config() -> Dict[str, object]:
    if not LOCAL_CONFIG_FILE.exists():
        return {}
    try:
        with open(LOCAL_CONFIG_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
            return data if isinstance(data, dict) else {}
    except Exception:
        return {}


def save_local_config(updates: Dict[str, object]) -> HidpsConfig:
    """
    Saves non-secret operational settings to hidps-engine/config.json.
    """
    current = load_local_config()
    allowed_keys = {
        "log_path",
        "mode",
        "dedup_window_seconds",
        "telegram_chat_id",
        "ufw_enabled",
    }
    for k, v in updates.items():
        if k in allowed_keys:
            current[k] = v

    if "mode" in current and current["mode"] not in VALID_MODES:
        current["mode"] = "detect_only"

    if "log_path" in current:
        proposed_log = str(current["log_path"])
        if not is_safe_log_path(proposed_log):
            raise ValueError(f"Path log '{proposed_log}' tidak aman atau berada di luar direktori yang diizinkan.")

    ENGINE_DIR.mkdir(parents=True, exist_ok=True)
    with open(LOCAL_CONFIG_FILE, "w", encoding="utf-8") as f:
        json.dump(current, f, indent=2)

    return load_config()


def load_config() -> HidpsConfig:
    local_cfg = load_local_config()

    db_path = os.environ.get("HIDPS_DB_PATH") or str(local_cfg.get("db_path") or DEFAULT_DB_PATH)

    # Determine log path: env -> local_cfg -> first readable candidate -> default demo log
    env_log = os.environ.get("HIDPS_LOG_PATH")
    cfg_log = str(local_cfg.get("log_path") or "")
    selected_log = env_log or cfg_log

    if selected_log and not is_safe_log_path(selected_log):
        selected_log = DEFAULT_DEMO_LOG_PATH

    if not selected_log:
        for src in discover_log_sources():
            if src["exists"] and src["readable"]:
                selected_log = str(src["path"])
                break
    if not selected_log:
        selected_log = DEFAULT_DEMO_LOG_PATH

    raw_mode = (
        os.environ.get("HIDPS_MODE")
        or str(local_cfg.get("mode") or "detect_only")
    ).strip().lower()
    mode = raw_mode if raw_mode in VALID_MODES else "detect_only"

    try:
        dedup = int(
            os.environ.get("HIDPS_DEDUP_WINDOW_SECONDS")
            or local_cfg.get("dedup_window_seconds")
            or 60
        )
    except ValueError:
        dedup = 60

    bot_token = (
        os.environ.get("TELEGRAM_BOT_TOKEN")
        or os.environ.get("HIDPS_TELEGRAM_BOT_TOKEN")
        or ""
    ).strip()
    chat_id = (
        os.environ.get("TELEGRAM_CHAT_ID")
        or os.environ.get("HIDPS_TELEGRAM_CHAT_ID")
        or str(local_cfg.get("telegram_chat_id") or "")
    ).strip()

    ufw_env = os.environ.get("UFW_ENABLED", "").strip().lower()
    if ufw_env in ("1", "true", "yes"):
        ufw_enabled = True
    elif ufw_env in ("0", "false", "no"):
        ufw_enabled = False
    else:
        ufw_enabled = bool(local_cfg.get("ufw_enabled", False))

    return HidpsConfig(
        db_path=db_path,
        log_path=selected_log,
        mode=mode,
        dedup_window_seconds=max(1, min(dedup, 86400)),
        telegram_bot_token=bot_token,
        telegram_chat_id=chat_id,
        ufw_enabled=ufw_enabled,
    )
