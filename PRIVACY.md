# Privacy Policy — Undo & Redo for YouTube

**This extension does not collect, transmit, sell or share any data.** It makes no network requests.

## What is stored, and where
Everything is kept in your browser's local extension storage (`chrome.storage.local`) on your own device:

- **Your settings** (on/off, keyboard shortcuts).
- **Seek history:** for up to the last 100 videos you scrubbed in, the video ID and the timestamps you jumped between (up to 50 entries per video). This is what lets Undo/Redo work after you reload a tab.

Nothing leaves your device. No analytics, no accounts, no remote code.

## Your control
- Open the extension popup and click **Clear saved history** to delete all stored seek history.
- Removing the extension deletes all of its stored data.

## Permissions
- `storage` — to save the settings and seek history above.
- Access to `youtube.com` — so the content script can add the Undo/Redo buttons to the player and read the video's playback position. It does not read or modify anything else on the page.

## Affiliation
This is an independent project. It is not affiliated with, endorsed by, or sponsored by YouTube or Google.

## Contact
Open an issue on the project's GitHub repository.
