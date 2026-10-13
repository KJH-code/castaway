# beta — test builds and test arenas

| What | How |
|---|---|
| **macOS beta build** (`CASTAWAY.app` + `.dmg`) | `sh beta/build-mac.sh` → `beta/builds/` (not in git — the dmg is over 200 MB) |
| Windows / Linux builds | GitHub → Actions → "데스크톱 판" → latest run → Artifacts |
| Test arenas (`*_arena.html`) | open the file in a browser — each one is a self-contained test bed for one system (combat, clouds, siege …) |
| `build_sandbox.html` | flat ground, free materials — try house building |
| `_v.html` | model viewer |

The build is unsigned. On macOS the first launch needs **right-click → Open**; on Windows, **More info → Run anyway**.

Testers' saves live outside the app (macOS `~/Library/Application Support/CASTAWAY/saves`), so a new build keeps them.
A save made on the old 1.9 km island still opens at that size; new islands are 3.8 km unless changed in Settings → 섬 넓이.
