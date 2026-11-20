"""Open the voyage in the player's normal Chrome profile, without changing OS defaults."""
import os
from pathlib import Path
import subprocess
import sys
import webbrowser


def windows_chrome_paths():
    import winreg

    key = r'SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\chrome.exe'
    for hive in (winreg.HKEY_CURRENT_USER, winreg.HKEY_LOCAL_MACHINE):
        try:
            with winreg.OpenKey(hive, key) as entry:
                value, _ = winreg.QueryValueEx(entry, None)
            yield Path(os.path.expandvars(value.strip('"')))
        except OSError:
            pass
    for name in ('LOCALAPPDATA', 'ProgramFiles', 'ProgramFiles(x86)'):
        if base := os.environ.get(name):
            yield Path(base) / 'Google/Chrome/Application/chrome.exe'


def open_browser(url):
    if sys.platform == 'win32':
        for exe in windows_chrome_paths():
            if exe.is_absolute() and exe.is_file():
                try:
                    subprocess.Popen([str(exe), url])
                    return
                except OSError:
                    continue
    elif sys.platform == 'darwin':
        try:
            # Launch Services also finds Chrome outside /Applications.
            if subprocess.run(['open', '-b', 'com.google.Chrome', url],
                              stderr=subprocess.DEVNULL).returncode == 0:
                return
        except OSError:
            pass
    if not webbrowser.open(url):
        print(f'Open {url} in Google Chrome to play.')
