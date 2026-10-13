# CASTAWAY — code map

Open **`island_world.html`** in a browser (double-click works; no server needed).
Keep the `engine/` and `presets/` folders next to it.

## Folders

| Folder | What |
|---|---|
| `engine/` | The game engine: `three.min.js` (three.js r128), `css/game.css`, `js/*.js` (the game code, mapped below), `native/` (C kernels and their built output) |
| `presets/` | Data, not code: `presets.js` (graphics and island presets picked in the settings panel), `models/` (mob models) |
| `beta/` | Stand-alone test arenas and sandboxes (`*_arena.html`, `build_sandbox.html`, `_v.html`) |
| `env/` | Build-only toolchains (C compiler, Python venv) — fetched by scripts, never committed (`env/README.md`) |
| `desktop/` | Electron wrapper |
| `tools/` | Check and build scripts |
| `docs/` | Design notes, development logs, graphics-engine research |

The game used to be one 2.3 MB HTML file. It is now split into a stylesheet and
a set of script files that are loaded **in the order below**. They are plain scripts
(not ES modules) on purpose: modules do not load from `file://`, and plain scripts
share one global scope, so nothing had to be rewritten to split them.

The single-file version from before the split is in git history (commit `8ec7546` and earlier).
To get one file again, run `python3 tools/build_single.py` (writes `island_world_single.html`).

## Files

| File | What lives there |
|---|---|
| `engine/css/game.css` | All styling: HUD, panels (inventory, crafting, box, settings), camcorder overlay, start screen, touch buttons |
| `engine/js/00-core.js` | Error banner, seeded random + noise, grid size, the global terrain fields `F`, biome table, resource table, island parameters `P` |
| `engine/js/10-worldgen.js` | Island generation: uplift → thermal erosion → droplet erosion → rivers → slope/distance fields → climate → biome classification → resource placement → seabed relief (`shapeSeabed`, runs last so land and saves are unaffected); `heightAt()` and friends |
| `engine/js/12-native.js` | Loads the **C erosion kernels** (WebAssembly) and routes `thermal` / `hydraulic` / `smoothTerrain` to them; `nativeVerify()` checks they give bit-identical islands to the JavaScript versions. Source: `engine/native/erosion.c`, build: `sh engine/native/build.sh` |
| `engine/js/data-native-wasm.js` | The compiled WebAssembly as base64 (generated — do not edit) |
| `engine/js/20-terrain.js` | Tree limb/leaf instancing data, bark, **ground shader** (per-biome textures, gravel), **rock material**, terrain chunks + LOD, sea/river water |
| `engine/js/data-ground-textures.js` | Eight real photo textures (sand, grass, two forest floors, rock, pebbles, mud, dry soil) embedded as base64. Not meant to be read |
| `engine/js/22-ground-textures.js` | Loads those photos into one array texture, builds the noise texture, and holds the **photo-based ground shader** (+ shoreline wet band and foam) |
| `engine/js/24-shapes.js` | Smooth shape toolkit shared by land plants and sea life: tubes (branches, roots, coral), lumpy blobs (stones), bending fronds (seaweed, ferns, palms), lathe shapes, leaf cards, and the part merger |
| `engine/js/30-props.js` | Distance tiers and tile culling, far trees, `buildProps()` (grass, trees, rocks, mounds), scattered gravel stones (`RUBBLE`), berries, supply ship |
| `engine/js/40-light.js` | `LIGHT`: who casts/receives shadows, sun shadow box, point/spot shadow budget, `renderFrame()` |
| `engine/js/45-sky.js` | Time of day, moon, sun, clouds, weather, rain, cloud shadows + wind, atmospheric sky, and the light tints (orange/violet at sunset and dawn, blue under the moon) |
| `engine/js/46-camcorder.js` | **Camcorder view**: the world is drawn to a small 480-line picture and shown through a tape/lens shader (colour bleed, grain, scan lines, sunset/moonlight grading, underwater look); battery and the hand charger |
| `engine/js/50-items.js` | The `ITEMS` table, inventory + worn slots, drag and drop (incl. trash slot), bare-hand harvesting, eating, **drinking (must look at water)**, quick slots |
| `engine/js/55-craft.js` | The `RECIPES` table, material counting, stations, crafting progress, crafting window |
| `engine/js/60-stations.js` | Hearth, furnace, grindstone, anvil, water wheel, dynamo; storage (basket, chest, **trash can**) and **name tags**; **pushing stations** (hold F); shared container logic |
| `engine/js/62-build.js` | House building (foundation, wall, roof, doors), build mode, fire effects, **torch** / oil lamp / electric lamp |
| `engine/js/64-dex.js` | Item and mineral dictionary, the box window, the grindstone window |
| `engine/js/70-weapons.js` | Melee hit test, held-item models (`WEAPON_FX`: spears, swords, axes, harpoons, torch …) |
| `engine/js/data-sentinel-mesh.js` | One 1.3 MB line of mesh data (helmet model). Not meant to be read |
| `engine/js/72-gear.js` | Armour, helmets, clothes, packs modelled in body coordinates (icons + worn look) |
| `engine/js/74-icons-guns.js` | Item icon rendering, held food models, swing animation, guns, grenade, scope, rocket, net fishing, left-click (`useHeld`) |
| `engine/js/80-player.js` | Mob table, first-person player (walking, **swimming**, stamina, hunger, health), synthesized audio, footsteps |
| `engine/js/82-hud.js` | Minimap, HUD (look prompt, bars), performance window (F3), benchmark |
| `engine/js/90-init.js` | Fog/shadow shader patches, shader precompile, `initThree()`, `generateWorld()` (the generation sequence) |
| `engine/js/92-save.js` | `snapshot()` / `restore()`, yes/no dialog, save slots (1–3, auto, previous-game backup), autosave |
| `engine/js/94-input.js` | Keyboard, mouse, touch, opening/closing windows, pause, settings panel |
| `engine/js/95-flora.js` | Plants that grow in **groves**: each ~80 m patch of a biome gets one community (jungle, bamboo grove, birch stand, pine wood, mangrove swamp, palm grove, flower field …). Ten tree types with trunks you collide with, five kinds of undergrowth, and what you can pick from them (vines, bamboo, coconuts, bananas, mushrooms) |
| `engine/js/95-giants.js` | Old-growth giants (30–40 m) whose buttress roots are walkable ground (`giantRootAt`, used by `floorAt`) |
| `engine/js/96-sea.js` | Coral reefs (7 forms), anemones, kelp, starfish, seabed boulders, clams/oysters/urchins, fish schools (harpoon + net), and the **far-from-shore panic** |
| `engine/js/96-foam.js` | Shoreline foam: instanced tetrahedra within 55 m of the player, animated in the vertex shader from the real wave height and the beach profile; the shoreline scan is C (`engine/native/shore.c`) |
| `engine/js/97-wildlife.js` | Bird flocks, nests with eggs, beehives with honey, the slingshot, tree climbing, and ambient insects (butterflies, fireflies, dragonflies, bees) |
| `engine/js/98-bag.js` | The full-screen **bag screen**: inventory + selected-item panel (actions, what it can make) + crafting, side by side |
| `engine/js/99-main.js` | The frame loop (`loop()`), and the five calls at the very end that start the game |

## Things added on 2026-10-13 (short map)

- **World scale** — `GCELL` / `setWorldScale` in `00-core.js`, `worldRescale` in `10-worldgen.js`. Islands are generated at 1.92 km
  and scaled uniformly; `CELL`, `WORLD`, `HALF` are variables now.
- **Level of detail and automatic quality** — `updateTileVis`, `limbLod`, `QUAL` in `30-props.js`.
- **Bag screen** — `98-bag.js` (two tabs, tooltips, recipe detail), `drawInv` / `invChip` in `50-items.js` (categories, pockets),
  `drawCraft` / `craftEdges` in `55-craft.js` (skill tree).
- **Everything is interactable** — `FLORA_PICK` (`95-flora.js`), `SEA_PICK` (`96-sea.js`), `RUBBLE.picks` (`30-props.js`).
- **Presets** — `presets/presets.js` (graphics and island presets shown in the settings panel).
- **Research and measurements** — `docs/graphics-engines.md`.

## Rules of thumb when editing

- **Load order matters.** A file may *call* functions from any other file at run time,
  but code that runs immediately while a file loads can only use things from files above it.
  New systems are easiest to add as a new file just above `99-main.js`.
- **Do not change what world generation draws from the seed** (`10-worldgen.js`,
  and the resource table order in `00-core.js`). Saves store only what changed on top of a
  world rebuilt from the seed. New world content should use its own random stream — see how
  `96-sea.js` and `RUBBLE` place things from a hash of the grid cell instead.
- Per-frame work goes through `loop()` in `99-main.js`. While the inventory, crafting,
  or dictionary is open, the world part of the loop is skipped (`uiHold()`).
- After editing, `node --check engine/js/<file>.js` catches syntax errors before you open the browser.
- When testing through a local server, use `python3 tools/serve.py` (it tells the browser never to cache).
  With the plain `python3 -m http.server` the browser keeps old `.js` files and an edit can look like it did nothing.
- In three.js r128 one material has one shader. Do not share a material between an `InstancedMesh` and a plain `Mesh`,
  and give every `InstancedMesh` that shares a material an instance colour (`setColorAt`) — otherwise drawing crashes.

## C / WebAssembly — not done yet

No C code is in the game and no compiler has been installed. What was measured instead (Apple M1):

| Opening the game (building an island) | Before | Now |
|---|---|---|
| First load | 9.4 s | 4.6 s |
| Re-rolling an island | — | 2.7 s |
| Memory after loading | 588 MB | about 240 MB |

The time came from JavaScript that did not need to run at all: every tree's branches and leaves (3.2 million
instances) were built up front, and are now built per 64 m tile only when you walk near it; rock shapes used
`Math.hypot` in their inner loops. What is left of island generation is erosion and rivers (about 1.3 s) plus
clouds (0.5 s). That 1.3 s is the only part a C port could shorten, and a port has to give bit-identical islands
(saves rebuild the island from its seed) and be embedded as base64 (`.wasm` cannot be fetched from `file://`).

## Where the frame time goes (measured on this Apple M1, F3 panel)

| Part | Time per frame |
|---|---|
| All game logic in JavaScript (sky, weather, light bookkeeping, world, player, HUD) | about 0.25 ms |
| three.js submitting ~390 draw calls (before the new plants were added) | about 5 ms |
| Everything else | the GPU running pixel shaders |

So the lag is pixel-shader cost, not JavaScript speed. The fix that mattered was replacing the ground
shader's procedural noise (dozens of noise evaluations per pixel) with texture lookups of real photos.
The camcorder view now draws the world at 480 lines instead of the full window, which cuts that pixel work to a fraction.
If it is still slow: Tab → **캠코더** 360줄, then lower **그림자** (shadows) and **시야** (view distance).

## Third-party code and images

- `engine/three.min.js` — three.js r128, MIT licence.
- Ground and rock photos in `engine/js/data-ground-textures.js` — from Poly Haven (polyhaven.com), all **CC0**
  (public domain): `sand_01`, `leafy_grass`, `forest_leaves_02`, `forrest_ground_01`, `rock_boulder_dry`,
  `ganges_river_pebbles`, `brown_mud_03`, `coral_gravel`. Downscaled to 512 px.
- Ideas (not code) taken from the engines in `graphics/`: zone-based flocking from
  three.js's `webgl_gpgpu_birds` example (MIT) for fish schools; fbm colour mixing from
  Babylon.js's procedural grass texture (Apache-2.0) for biome ground textures; stepped
  "toon" light bands, as in Godot's toon diffuse mode (MIT), for rocks.
- Nothing was copied from `examples/` (two of those are decompilations of commercial
  Nintendo games; the others are a Unity patch tool and a small JavaFX game).
