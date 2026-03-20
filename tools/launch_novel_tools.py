from __future__ import annotations

import ctypes
import subprocess
import sys
import time
import urllib.error
import urllib.request
import webbrowser
from pathlib import Path


SITE_URL = "http://127.0.0.1:8000"
STARTUP_TIMEOUT_SECONDS = 20
HEALTH_PATH = "/api/health"


def base_dir() -> Path:
    if getattr(sys, "frozen", False):
        return Path(sys.executable).resolve().parent
    return Path(__file__).resolve().parents[1]


def show_message(title: str, message: str) -> None:
    try:
        ctypes.windll.user32.MessageBoxW(None, message, title, 0x0)
    except Exception:
        print(f"{title}: {message}")


def is_server_alive(url: str) -> bool:
    try:
        with urllib.request.urlopen(f"{url}{HEALTH_PATH}", timeout=2) as response:
            return response.status == 200
    except (urllib.error.URLError, TimeoutError, OSError):
        return False


def start_server(project_root: Path) -> tuple[bool, str]:
    python_exe = project_root / ".venv" / "Scripts" / "python.exe"
    log_file = project_root / "server.log"

    if not python_exe.exists():
        return False, f"未找到虚拟环境启动文件：\n{python_exe}"

    with log_file.open("a", encoding="utf-8") as handle:
        creationflags = getattr(subprocess, "CREATE_NO_WINDOW", 0)
        subprocess.Popen(
            [
                str(python_exe),
                "-m",
                "uvicorn",
                "app.main:app",
                "--host",
                "127.0.0.1",
                "--port",
                "8000",
            ],
            cwd=project_root,
            stdout=handle,
            stderr=subprocess.STDOUT,
            creationflags=creationflags,
        )

    deadline = time.time() + STARTUP_TIMEOUT_SECONDS
    while time.time() < deadline:
        if is_server_alive(SITE_URL):
            return True, ""
        time.sleep(0.5)

    return False, f"服务在 {STARTUP_TIMEOUT_SECONDS} 秒内未成功启动。\n请检查日志：\n{log_file}"


def main() -> int:
    project_root = base_dir()

    if not is_server_alive(SITE_URL):
        ok, error_message = start_server(project_root)
        if not ok:
            show_message("Novel Tools", error_message)
            return 1

    webbrowser.open(f"{SITE_URL}/")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
