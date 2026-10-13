# env — virtual environment (toolchains)

Everything needed to **build** parts of the game, kept out of the game itself.
Players never need this folder; the game still runs by opening `island_world.html`.

| Path | What | In git? |
|---|---|---|
| `env/setup-zig.sh` | Downloads the Zig compiler (used as a C → WebAssembly compiler) into `env/zig/` and prunes it to what our build uses | script: yes |
| `env/zig/` | The pruned compiler itself | **no** (ignored — platform-specific binary) |
| `env/py/` | Python virtual environment made by `python3 -m venv env/py` | **no** (ignored) |

The compiled results that the game actually loads are committed under `engine/` — collaborators
only need this folder when they want to rebuild them.
