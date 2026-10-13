# tools/ai — texture and outline models (plan; nothing is trained yet)

**Status: waiting for the data sets.** No model exists and the game does not load any generated texture yet.
This file fixes where the data goes and what will be built, so the data can be committed in the right shape.

## Where the data goes

Commit the data sets under `tools/ai/data/` (plain images; git handles them, but keep single files under 100 MB):

```
tools/ai/data/
  ground/<biome>/<anything>.jpg     top-down ground photos, one folder per biome
                                    (beach, dune, marsh, meadow, broadleaf, conifer, scrub, rock, scree, river, seabed)
  sprites/<kind>/<anything>.png     photos of one plant or object per image, one folder per kind
                                    (mangrove, bamboo, palm, birch, pine, fern, bush, rock, coral …)
  masks/<kind>/<same name>.png      optional: hand-made cut-outs (white = object) for the outline model
```

If the data set is large (more than about 1 GB) say so first — it should then go through Git LFS, and that has to be
decided before the first commit (moving later means rewriting history).

## What will be built from it

1. **Texture model** — a small conditional generator. Input: biome id, moisture, slope, and the mix of nearby objects
   ("hyperparameters of the proximity of each sprite or biome"). Output: a 256 px ground tile in the camcorder's low
   video quality. Trained on `data/ground/`, degraded on purpose to the game's 480-line look so it never learns detail
   the game cannot show.
2. **Outline model** — a small segmentation network that, given a sprite photo, marks where the object ends and the
   background begins. A large pretrained segmenter is used only as the teacher (to label `data/sprites/` where no
   hand-made mask exists); the model that ships is the small one, tuned for low-resolution textures.
3. **Export** — `tools/ai/export.py` writes, for an island seed, one texture set per biome region into
   `presets/random_textures/<seed>/` plus an index. The game reads that folder when the island is generated and falls
   back to the built-in photo textures when it is missing.

## Why the game does not run the model itself

A browser page cannot write into a folder, and shipping a neural-network runtime would add tens of megabytes to a game
that currently needs no install. So generation is an offline step (or a build step for the desktop app); the game only
loads the resulting images. If generation at island-creation time inside the desktop app turns out to be required, the
exported model can be run there with ONNX Runtime — that is a later decision, after the models exist.

## Environment

`python3 -m venv env/py && env/py/bin/pip install -r env/requirements.txt` (see `env/README.md`).
Training output goes to `tools/ai/runs/` (ignored by git).
