# Graphics engines and techniques — what was checked, what applies to CASTAWAY

First pass, written 2026-10-13. Scope: the six repositories that were linked, plus the two engines named in the brief
whose source could not be reached. Everything under "verified" was read from the GitHub API on that date
(licence, last push, directory listing). Nothing here is quoted from memory as a file path.

**What this is not:** it is not the full survey the brief asks for (Unreal class-by-class, CRYENGINE, per-game
post-mortems for SnowRunner / RDR2 / etc.). Those parts are listed at the end as *not done*, with the reason.

## 1. The constraint that decides almost everything

CASTAWAY renders with **three.js r128 on WebGL2**, in a browser page or an Electron window. That rules out, today:
mesh/task shaders, multi-draw-indirect driven from the GPU, compute shaders, hardware ray tracing, sparse/virtual
textures, DLSS/FSR2/MetalFX-class temporal upscalers, and bindless resources. WebGPU would unlock compute and
indirect draws, but moving a 30-file renderer off three.js r128 is a rewrite, not an optimisation.

So the useful question for each engine below is not "can we adopt it" (we cannot embed a native renderer in a web
page) but **"which algorithm in it can be re-implemented in a WebGL2 shader or in our own JS/C code"**.

## 2. Where the frame time actually goes (measured, Apple M1, in-game F3 panel)

| | Before | After (this branch) |
|---|---|---|
| Triangles per frame, conifer forest at −174, −477 | 7,894k | 3,498k |
| JS time inside the draw call submission | 21.9 ms | 12.1 ms |
| All game logic per frame (sky, weather, light bookkeeping, world, player, HUD) | 0.4 ms | 0.4 ms |
| Draw calls | 412 | 406 |

Two thirds of the triangles were the hand-built oak/fir trees drawn at full branch detail in every 64 m tile whose
bounding sphere came within 25 m — seven tiles at once. The fix was a level-of-detail rule, not a faster language.
The workload is **vertex-bound** (and CPU-bound on draw submission); it is not fragment-bound any more, because the
camcorder pass renders the world at 480 lines and upsamples.

Consequence: porting per-frame game logic to C/WebAssembly cannot move the frame rate — 0.4 ms is the whole budget
it could win. C *was* worth it in island generation (see §5).

## 3. The six repositories

Licence and activity are from the GitHub API on 2026-10-13.

| Repository | Licence | Last push | Can CASTAWAY reuse code? |
|---|---|---|---|
| [godotengine/godot](https://github.com/godotengine/godot) | MIT | 2026-10-12 | Algorithms and vendored libraries, yes (MIT). The renderer itself, no — it is a native Vulkan/D3D12/Metal engine |
| [google/filament](https://github.com/google/filament) | Apache-2.0 | 2026-10-12 | Has a real WebGL2/WASM build (`web/filament-js`). Adopting it means replacing three.js |
| [bkaradzic/bgfx](https://github.com/bkaradzic/bgfx) | BSD-2-Clause | 2026-10-13 | Best *reference* of the six: small, single-purpose examples of exactly the techniques in the brief |
| [AcademySoftwareFoundation/openvdb](https://github.com/AcademySoftwareFoundation/openvdb) | Apache-2.0 | 2026-10-08 | Offline tool only. Sparse volumes — not a fit for a heightfield island at run time |
| [Auburn/FastNoiseLite](https://github.com/Auburn/FastNoiseLite) | MIT | 2026-06-21 | Yes, directly: single-header C, plus JavaScript and GLSL ports in the same repo |
| [blender/blender](https://github.com/blender/blender) | GPL (GitHub reports "NOASSERTION"; the repo is a mirror of projects.blender.org) | 2026-10-13 | As an **offline asset tool**, yes (CASTAWAY is GPL-3.0, so licence-compatible). Not as run-time code |

### 3.1 bgfx — the examples worth reading first

Verified directory names under `examples/`:

| Example | Technique | Relevance here |
|---|---|---|
| `49-hextile` (`hextile.cpp`, `fs_hextile.sc`) | Hex-tiling: stochastic texture tiling without visible repetition | **Adopted** — re-implemented in our ground shader (`engine/js/22-ground-textures.js`, `hexT`). Three texture reads instead of one for the near detail scale |
| `27-terrain` (`terrain.cpp`, `vs_terrain_height_texture.sc`) | Heightfield terrain, height sampled in the vertex shader | We already build chunk meshes with four index-range LODs; height-in-vertex-shader would let all chunks share one grid mesh. Medium value |
| `41-tess` | GPU tessellated terrain | Needs tessellation/compute — not available in WebGL2 |
| `37-gpudrivenrendering`, `48-drawindirect`, `26-occlusion` | GPU culling + indirect draws, occlusion queries | Not available in WebGL2 (no indirect draw, no compute). Occlusion queries exist in WebGL2 but stall the pipeline in practice |
| `40-svt` | Sparse virtual texturing | Not available in WebGL2 |
| `33-pom` | Parallax occlusion mapping | Possible in WebGL2 for gravel/forest floor. Needs height maps for the eight ground photos (we ship colour only). Fragment cost is affordable now that the world renders at 480 lines |
| `12-lod`, `42-bunnylod` | Mesh LOD selection / progressive simplification | The idea matches what we now do for trees (per-tile LOD rings); the simplifier itself is better taken from meshoptimizer (below) |
| `05-instancing` | Instancing | Already the basis of every plant and rock in the game |
| `46-fsr` | FidelityFX Super Resolution 1 (spatial upscaler) | A single-pass shader; could replace the bilinear upsample in the camcorder pass if a clean (non-tape) look is ever wanted |

### 3.2 Godot

Verified: `servers/rendering/` holds `renderer_scene_cull.cpp`, `renderer_scene_occlusion_cull.cpp`, and the `renderer_rd/`
back end; `thirdparty/meshoptimizer/` vendors `simplifier.cpp`, `clusterizer.cpp`, `vcacheoptimizer.cpp`,
`vfetchoptimizer.cpp`, `overdrawoptimizer.cpp`.

- Godot has **no built-in terrain system** — terrain there comes from add-ons — so there is no landscape renderer to study.
- The useful part for us is the vendored **[zeux/meshoptimizer](https://github.com/zeux/meshoptimizer)** (MIT, pushed
  2026-10-09): `simplifier.cpp` for LOD meshes, `vcacheoptimizer.cpp` / `vfetchoptimizer.cpp` for vertex-cache and
  vertex-fetch order. It is plain C++ with a C API and compiles to WebAssembly with the toolchain already set up in
  `env/`. It would let us generate tree and rock LODs from the full mesh instead of by dropping a random share of
  branches.

### 3.3 Filament

Verified: `filament/src/Froxelizer.cpp` (clustered "froxel" lighting), `Culler.cpp`, `web/filament-js`.
Filament is the only one of the six that ships a maintained WebGL2 target. Its strengths are physically based
materials and clustered lights. CASTAWAY's bottleneck is neither (one sun, a few point lights, vertex-bound foliage),
so switching would cost a renderer rewrite without addressing the measured problem. Worth revisiting only if the
project moves to PBR materials or many dynamic lights.

### 3.4 FastNoiseLite

Verified: `C/FastNoiseLite.h`, plus `JavaScript/`, `GLSL/`, `HLSL/` ports. This is the one drop-in candidate.
**Caveat that matters:** island generation must stay bit-identical for a given seed (saves store only a seed and a
diff). The existing terrain uses the game's own Perlin; swapping the noise changes every island. FastNoiseLite is
therefore suitable for **new** content only (the planned cliffs, fjords and caves, behind a world-version flag), and the
C and JS ports must be checked against each other the same way `nativeVerify()` checks the erosion kernels.

### 3.5 OpenVDB and Blender

Offline tools. OpenVDB's sparse volumes would matter for true 3D caves or overhangs built offline and exported as
meshes. Blender (geometry nodes, the decimate modifier, baking) is the practical route for authoring the hero assets
the game currently generates procedurally — trees with baked LODs and impostor atlases. Neither belongs in the
run-time.

## 4. Unreal Engine and CRYENGINE

Both repositories returned "Not Found" to an unauthenticated request (`EpicGames/UnrealEngine`, `CRYTEK/CRYENGINE`).
Unreal's source requires an Epic account linked to GitHub and is under Epic's source-available EULA — it can be
studied, not copied into a GPL project. Nothing about their file layout is stated here because none of it could be
verified from this machine. The public, citable descriptions of Nanite, Runtime Virtual Texturing and Landscape are
Epic's own documentation and SIGGRAPH course notes; they should be read from the source before anything is claimed.

## 5. What was actually changed in the game, and why

| Change | Bottleneck it addresses | Measured effect |
|---|---|---|
| Tree LOD rings (full branches only in the player's tile; thinner copies beyond) | Vertex load | 7.9M → 3.5M triangles, draw JS 21.9 → 12.1 ms |
| Automatic quality (`QUAL`): detail distances shrink when the slow frame-time average exceeds 24 ms | Vertex load on weaker machines | Not yet measured on a second machine |
| Camcorder pass: world rendered at 480 lines, upsampled with a tape shader | Fragment load | Fragment cost is no longer the limit |
| Screen noise moved from a blended full-screen DOM layer into that shader | Browser compositing | Not measurable in a hidden test tab; reported as the visible slowdown by the player |
| Rock and tree-branch meshes built per tile on approach, dropped when far (chunk streaming) | Load time, memory | Island build 9.4 s → about 5 s; a 4× larger island builds in the same time |
| Erosion kernels in C → WebAssembly (`engine/native/erosion.c`) | Island generation CPU | Those steps 0.7–0.9 s → 0.4–0.6 s, bit-identical on three seeds |
| Hex-tiling in the ground shader | Visual repetition | Visual; three extra texture reads per active ground layer near the camera |
| World scale (generate at 1.92 km, scale uniformly to 3.84 km) | Island/biome size | Same generation time; 217k props instead of 54k, built lazily |

### 5.1 Second pass (same machine, same conifer spot, four view directions)

| Change | What it addresses | Measured |
|---|---|---|
| Tree copies end at 125 m (was 150), middle ring at 72 m (was 90); far giant trees use a reduced mesh | Vertex load | 2.37M / 1.92M / 1.81M / 2.17M → 1.90M / 1.67M / 1.60M / 1.83M triangles |
| Ridge occlusion: tiles whose tops are hidden behind terrain are not drawn (`tileOcc`, `30-props.js`) | Vertex load in hilly views | 0–8% fewer triangles at this spot; 0.12 ms per re-evaluation (only when the eye moves 4 m) |
| Horizon haze in the fog chunk (`90-init.js`) | Pop-in at the draw distance | Visual; no measurable cost |
| Ocean mesh graded: 0.6 m cells at the centre, 90 m at the edge, same vertex count | Wave shape near the player, foam alignment | Visual; triangle count unchanged |
| Ground blend (`envPatch`, `userData.melt`) | Objects looking pasted on | One texture read per pixel inside the blend height; four texel fetches per vertex for non-instanced rock batches |
| Shoreline scan with beach profile, C vs JS | Foam placement | C 0.17 ms vs JS 0.30–0.34 ms per rescan |

Frame rate was **not** measured in a visible window: the test pane throttles frames, so only triangle counts and
CPU-side milliseconds above are comparable.

## 6. Roadmap, ordered by value for this renderer

1. **Tree mesh weight.** A single oak is still about 45k triangles at full detail. Generate proper LOD meshes with
   meshoptimizer (compiled to WASM) and bake an octahedral impostor atlas per species instead of one billboard.
2. **One shared terrain grid with height in the vertex shader** (bgfx `27-terrain`), so chunk meshes stop costing
   memory and the island can grow past 3× without more geometry.
3. **Parallax occlusion mapping for gravel and forest floor** (bgfx `33-pom`) once height maps exist for the ground set.
4. **Persistent ground deformation** (footprints, drag marks) as a small render-to-texture heightfield around the
   player, sampled by the ground shader — the WebGL2-sized version of what the brief describes for ruts.
5. **WebGPU** only if (1)–(4) are exhausted: it is the gateway to compute culling and indirect draws, and it is a
   renderer rewrite.

## 7. How to benchmark a change here

- Press **F3** in the game: per-section CPU time, draw calls and triangles for sky / main scene / shadow passes,
  GPU time where the timer-query extension exists, and the current automatic-quality factor.
- `node tools/probe.mjs island_world.html "nativeVerify()"` — C vs JS erosion: identical hashes, and the time of each.
- Compare **the same spot and view** before and after (teleport by setting `PL.pos`, `PL.yaw`), and report triangles
  and draw-JS milliseconds, not just FPS: FPS in a hidden or throttled tab is not comparable to a visible window.
- Deciding the limiting factor: halve the camcorder line count — if frame time does not move, it is not fragment-bound;
  lower 시야 (view distance) — if it moves with triangle count, it is vertex-bound; if neither moves it, look at draw
  submission (draw-call count) and at the browser's compositor (DOM layers over the canvas).

## 8. Not done

- Unreal Engine and CRYENGINE source investigation (no access; see §4).
- Game-specific research (SnowRunner/MudRunner, Pacific Drive, Sons of the Forest, The Long Drive, Only Up!, RDR2):
  not started. It needs their GDC/SIGGRAPH talks read at the source; nothing about them is asserted here.
- Mud/snow/tyre-rut deformation, granular approximations, GPU erosion: not investigated beyond item 4 of the roadmap.
- No benchmark was run on any machine other than one Apple M1, and none in a visible full-screen window.
