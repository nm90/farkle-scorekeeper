# Bible Reader

A static, offline-capable Bible reader with **voice search** and **read-aloud**.
No build step, no dependencies, no accounts, no external services — three files:

| file | what |
| --- | --- |
| `index.html` | the whole app: UI, reference parser, phrase search, speech in/out |
| `kjv.json` | the King James Version, all 66 books / 31,100 verses (public domain) |
| `sw.js` | service worker that precaches everything for full offline use |

## Run it

Serve the folder over http(s) — any static host works (GitHub Pages, `python3 -m http.server`).
`file://` won't work because browsers block `fetch` and service workers there.

```bash
cd bible-reader
python3 -m http.server 8080
# open http://localhost:8080
```

On first visit the app downloads `kjv.json` once and stores it in IndexedDB; the
service worker also precaches the shell. After that it runs fully offline.

## Voice search

Tap the 🎤 button (or press <kbd>V</kbd>) and say either:

- **a reference** — “John three sixteen”, “Psalm twenty-three”, “first Corinthians
  thirteen four”, “Genesis chapter one verse one” — the parser understands book
  aliases, ordinals, spelled-out numbers, and even glued numbers (“John 316”);
- **any phrase** — “valley of the shadow of death” — which runs a full-text search
  across every verse, with exact-phrase matches ranked first.

A voice search that lands on a verse is read aloud automatically (toggle
“read results aloud” to turn that off). The same queries work typed into the
search box.

Speech recognition uses the browser's Web Speech API (Chrome, Edge, Safari).
Browsers without it can still type; everything else works everywhere.

## Read aloud

- **▶ Read aloud** (or <kbd>R</kbd>) reads the open chapter verse by verse, highlighting
  and scrolling to the verse being spoken.
- **Tap any verse** to start reading from it.
- Pick a voice and speed in the bar under the search box; settings persist.

## Keys

| key | action |
| --- | --- |
| <kbd>V</kbd> | start/stop voice search |
| <kbd>R</kbd> | read chapter aloud / stop |
| <kbd>←</kbd> <kbd>→</kbd> | previous / next chapter |
| <kbd>/</kbd> | focus the search box |

## Privacy

The only network request the app ever makes is for its own files. Speech
recognition and synthesis are the browser's own; no verse text, audio, or
queries are sent anywhere by this app.
