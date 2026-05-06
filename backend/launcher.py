"""
CV Matcher — standalone launcher
Entry point for the PyInstaller bundle (and usable directly for dev).

Run with:  python launcher.py
"""
import sys
import os
import threading
import time


# ── Path helpers ───────────────────────────────────────────────────────────

def get_data_dir() -> str:
    """User-writable directory for database, .env, and logs.
    Windows: %APPDATA%\\CVMatcher   (e.g. C:\\Users\\Alice\\AppData\\Roaming\\CVMatcher)
    """
    base = os.environ.get('APPDATA') or os.path.expanduser('~')
    path = os.path.join(base, 'CVMatcher')
    os.makedirs(path, exist_ok=True)
    return path


def get_base_dir() -> str:
    """Directory containing bundled Python modules and the 'dist' folder.
    When frozen by PyInstaller: sys._MEIPASS (temp extraction folder).
    When running from source: the backend/ directory.
    """
    if getattr(sys, 'frozen', False):
        return sys._MEIPASS
    return os.path.dirname(os.path.abspath(__file__))


DATA_DIR = get_data_dir()
BASE_DIR  = get_base_dir()

# Expose to all submodules via env var (database.py reads this for DB_PATH)
os.environ['CV_MATCHER_DATA_DIR'] = DATA_DIR

# In dev mode, ensure backend/ is on sys.path so `import main` etc. work
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)


# ── First-run: Anthropic API key setup ────────────────────────────────────

def _ensure_env_file() -> str:
    """Make sure a .env file exists in DATA_DIR.
    On first run, show a dialog asking for the Anthropic API key.
    Returns the path to the .env file.
    """
    env_file = os.path.join(DATA_DIR, '.env')
    if os.path.exists(env_file):
        return env_file

    # First run — ask for the API key via a simple GUI dialog
    api_key = ''
    try:
        import tkinter as tk
        from tkinter import simpledialog, messagebox

        root = tk.Tk()
        root.withdraw()
        root.attributes('-topmost', True)

        api_key = simpledialog.askstring(
            'CV Matcher — הגדרה ראשונית',
            'הכנס את מפתח ה-API של Anthropic Claude:\n'
            '(ניתן להשיג בכתובת console.anthropic.com)\n\n'
            'ניתן לדלג ולהגדיר מאוחר יותר דרך הממשק.',
            parent=root,
        ) or ''
        root.destroy()

        if not api_key.strip():
            root2 = tk.Tk()
            root2.withdraw()
            messagebox.showinfo(
                'CV Matcher',
                'לא הוגדר מפתח API.\n'
                'ניתן להגדיר מאוחר יותר דרך הממשק → הגדרות.',
                parent=root2,
            )
            root2.destroy()
    except Exception:
        pass  # tkinter unavailable — continue without key

    with open(env_file, 'w', encoding='utf-8') as f:
        f.write(f'ANTHROPIC_API_KEY={api_key.strip()}\n')

    return env_file


# Load .env so all submodules (cv_processor, job_matcher, etc.) find the key
env_path = _ensure_env_file()
from dotenv import load_dotenv  # noqa: E402
load_dotenv(dotenv_path=env_path, override=True)


# ── Import app (here so PyInstaller includes all backend modules) ──────────

import uvicorn          # noqa: E402  — triggers inclusion in bundle
from main import app    # noqa: E402  — also pulls in database, job_matcher, etc.

PORT = 8000


# ── Server thread ─────────────────────────────────────────────────────────

def _run_server():
    log_file = os.path.join(DATA_DIR, 'app.log')
    uvicorn.run(
        app,
        host='127.0.0.1',
        port=PORT,
        log_level='error',
        access_log=False,
    )


# ── Browser opener ────────────────────────────────────────────────────────

def _open_browser():
    time.sleep(2.5)
    import webbrowser
    webbrowser.open(f'http://localhost:{PORT}')


# ── System tray icon ──────────────────────────────────────────────────────

def _build_tray_icon():
    """Create a simple 64×64 purple circle icon with 'CV' text."""
    try:
        from PIL import Image, ImageDraw
        img = Image.new('RGBA', (64, 64), (0, 0, 0, 0))
        draw = ImageDraw.Draw(img)
        draw.ellipse([2, 2, 62, 62], fill=(79, 70, 229, 255))   # indigo-600
        draw.ellipse([14, 22, 50, 42], fill=(255, 255, 255, 60)) # subtle gloss
        return img
    except Exception:
        return None


def _run_tray():
    """Show a system-tray icon. Blocks until the user chooses 'יציאה'."""
    try:
        import pystray
        import webbrowser

        icon_img = _build_tray_icon()
        if icon_img is None:
            raise RuntimeError('PIL not available')

        def on_open(icon, item):
            webbrowser.open(f'http://localhost:{PORT}')

        def on_quit(icon, item):
            icon.stop()
            os._exit(0)

        menu = pystray.Menu(
            pystray.MenuItem('פתח CV Matcher בדפדפן', on_open, default=True),
            pystray.Menu.SEPARATOR,
            pystray.MenuItem('יציאה מ-CV Matcher', on_quit),
        )
        icon = pystray.Icon('CVMatcher', icon_img, 'CV Matcher', menu)
        icon.run()                # blocks until on_quit fires

    except Exception:
        # Fallback: keep the process alive with a plain event
        threading.Event().wait()


# ── Entry point ───────────────────────────────────────────────────────────

if __name__ == '__main__':
    # 1. Start FastAPI + uvicorn in a background thread
    threading.Thread(target=_run_server, daemon=True, name='uvicorn').start()

    # 2. Open the browser once the server is ready
    threading.Thread(target=_open_browser, daemon=True, name='browser').start()

    # 3. Show tray icon (keeps process alive; user exits via tray menu)
    _run_tray()
