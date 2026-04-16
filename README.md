# onboarding-demo

## Racing Game (`racing-game/index.html`)

A self-contained WebGL kart racer ("Drift Kings") built with plain HTML, CSS, and
JavaScript. All game code is inlined in `racing-game/index.html` — there is no
build step and no package to install.

### Requirements

- A modern desktop browser with WebGL support (recent Chrome, Firefox, Edge, or
  Safari). A keyboard is required; the game does not currently support gamepad
  or touch input.
- No Node.js, npm, or other dependencies are needed.

### Run the game

You can launch the game in either of two ways.

**Option 1: Open the file directly**

Open `racing-game/index.html` in your browser, e.g.:

```bash
# macOS
open racing-game/index.html

# Linux
xdg-open racing-game/index.html

# Windows (PowerShell)
start racing-game/index.html
```

**Option 2: Serve it locally (recommended)**

Some browsers restrict features when pages are loaded from `file://`. Serving
the folder over `http://` avoids those issues:

```bash
# From the repo root, using Python 3 (no install required on most systems)
python3 -m http.server 8000
```

Then visit <http://localhost:8000/racing-game/> in your browser.

Any other static file server works too (`npx serve`, `php -S`, etc.) — the game
is a single static HTML file.

### How to play

On the start screen, pick a car, difficulty, and lap count, then click **Start
Race**.

Controls:

| Action     | Keys                              |
| ---------- | --------------------------------- |
| Accelerate | `W` or `↑`                        |
| Brake      | `S` or `↓`                        |
| Steer      | `A` / `D` or `←` / `→`            |
| Drift      | `Shift` (hold while turning)      |
| Use item   | `Space`                           |

When the race ends, click **Race Again** to return to the menu.
