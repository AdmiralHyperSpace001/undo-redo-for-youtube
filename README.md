# Undo & Redo for YouTube

A tiny browser extension that adds **Undo** and **Redo** buttons to the YouTube player.
Accidentally hit a number key, clicked the wrong spot on the timeline, or dragged the scrubber too far?
One click (or `Alt+Z`) puts you back exactly where you were. `Alt+X` redoes it.

> Not affiliated with, endorsed by, or sponsored by YouTube or Google.

## Features
- Undo / Redo buttons in the player bar, just left of YouTube's right-hand controls
- Records progress-bar clicks, scrubbing, and YouTube's seek keys (`J` `L` `←` `→` `Home` `End` `0`–`9`)
- A whole scrub or drag counts as **one** step; ads, buffering and undo/redo themselves are ignored
- Up to 50 steps per video, remembered across reloads
- Hover tooltips show where you will land ("Undo to 2:17:34")
- Customizable shortcuts (default `Alt+Z` / `Alt+X`), or turn them off
- 100% local: no network requests, no tracking — see [PRIVACY.md](PRIVACY.md)

## Install
**From a store:** _(link coming soon)_

**From source (Chrome, Edge, Brave, any Chromium browser):**
1. Download or clone this repository.
2. Open `chrome://extensions` and enable **Developer mode**.
3. Click **Load unpacked** and choose this folder.
4. Reload any open YouTube tab (already-open tabs don't pick up new extensions).

## Usage
| Action | Button | Shortcut (default) |
|---|---|---|
| Undo last seek | ⟲ | `Alt+Z` |
| Redo | ⟳ | `Alt+X` |

Click the toolbar icon to change shortcuts, disable the extension, or clear saved history.

## Known limitations
- YouTube changes its page layout often. If the buttons ever disappear after a YouTube update, please open an issue.
- Seeks made by other means (e.g. clicking a transcript timestamp) are not recorded; only progress-bar and keyboard seeks are.
- Live streams are ignored.

## Development
```
manifest.json         extension manifest (Manifest V3)
styles.css            styles for the injected buttons and tooltip
popup.*               toolbar popup
src/
  config.js           constants & defaults (shared with the popup)
  utils.js            pure helpers (shared with the popup)
  seek-history.js     bounded undo/redo stack
  store.js            chrome.storage wrapper
  seek-tracker.js     watches the <video>, reports each user seek once, performs undo/redo seeks
  controls.js         the Undo/Redo group and tooltip
  controller.js       glue: settings, navigation, shortcuts, persistence
icons/                toolbar icons
dev/                  local test harness (not shipped)
scripts/package.sh    builds the store-ready zip in dist/
```
Script order matters; it is the order listed in `manifest.json`.

**Test harness:** `node dev/server.js`, then open <http://localhost:8080/watch?v=demo>.
It loads the real `src/*.js` into a page shaped like YouTube's player with a real `<video>`.
Layouts: `&layout=new` (default), `legacy`, `noautoplay`.

**Build a store zip:** `./scripts/package.sh` → `dist/undo-redo-for-youtube-<version>.zip`

## Contributing
Issues and pull requests are welcome. Please keep the extension dependency-free and network-free.

## Credits
- Undo arrow: [Eva Icons](https://github.com/akveo/eva-icons) "undo-outline" (MIT), via [SVG Repo](https://www.svgrepo.com/svg/305601/undo-outline). See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

## License
[MIT](LICENSE)
