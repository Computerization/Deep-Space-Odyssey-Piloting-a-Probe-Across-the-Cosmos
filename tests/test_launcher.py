"""Launcher policy checks; no browser is opened and no personal profile is used."""
from pathlib import Path
from tempfile import TemporaryDirectory
from unittest import TestCase
from unittest.mock import patch

import cosmos_browser as launcher


class LauncherTest(TestCase):
    url = 'http://127.0.0.1:4181'

    def test_windows_prefers_chrome_and_preserves_origin(self):
        with TemporaryDirectory() as tmp:
            chrome = Path(tmp) / 'Google Chrome.exe'
            chrome.touch()
            with patch.object(launcher.sys, 'platform', 'win32'), \
                 patch.object(launcher, 'windows_chrome_paths', return_value=[chrome]), \
                 patch.object(launcher.subprocess, 'Popen') as launch, \
                 patch.object(launcher.webbrowser, 'open') as fallback:
                launcher.open_browser(self.url)
                launch.assert_called_once_with([str(chrome), self.url])
                fallback.assert_not_called()

    def test_missing_or_unlaunchable_chrome_uses_default_browser(self):
        with TemporaryDirectory() as tmp:
            chrome = Path(tmp) / 'chrome.exe'
            for installed in (False, True):
                if installed:
                    chrome.touch()
                with self.subTest(installed=installed), patch.object(launcher.sys, 'platform', 'win32'), \
                     patch.object(launcher, 'windows_chrome_paths', return_value=[chrome]), \
                     patch.object(launcher.subprocess, 'Popen', side_effect=OSError), \
                     patch.object(launcher.webbrowser, 'open') as fallback:
                    launcher.open_browser(self.url)
                    fallback.assert_called_once_with(self.url)

    def test_macos_uses_chrome_bundle_then_falls_back_only_on_failure(self):
        for status in (0, 1):
            with self.subTest(status=status), patch.object(launcher.sys, 'platform', 'darwin'), \
                 patch.object(launcher.subprocess, 'run') as launch, \
                 patch.object(launcher.webbrowser, 'open') as fallback:
                launch.return_value.returncode = status
                launcher.open_browser(self.url)
                self.assertEqual(launch.call_args.args[0], ['open', '-b', 'com.google.Chrome', self.url])
                self.assertEqual(fallback.call_args_list, [] if status == 0 else [((self.url,), {})])
