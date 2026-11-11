# Run4Life

**Run4Life** is a typing-based endless runner that runs entirely in the browser. Words hover above incoming obstacles â€” type each word correctly and your runner automatically jumps or slides over it. A chaser is always behind you, and every mistake costs you time, speed, and health.

No frameworks, no build step, no dependencies. Just open `index.html` and play.

---

## Table of contents

- [Quick start](#quick-start)
- [How to play](#how-to-play)
- [Controls](#controls)
- [Game flow](#game-flow)
- [Core systems](#core-systems)
  - [Typing and targeting](#1-typing-and-targeting)
  - [Slow motion](#2-slow-motion)
  - [Obstacles and actions](#3-obstacles-and-actions)
  - [Health and damage](#4-health-and-damage)
  - [The chaser](#5-the-chaser)
  - [Difficulty progression](#6-difficulty-progression)
  - [Hatch endgame](#7-hatch-endgame)
  - [Scoring and records](#8-scoring-and-records)
  - [Parallax city](#9-parallax-city)
- [Project structure](#project-structure)
- [Code architecture](#code-architecture)
- [Configuration reference](#configuration-reference)
- [Sprite sheets](#sprite-sheets)
- [Changelog](#changelog)
- [Development notes](#development-notes)

---

## Quick start

1. Open `index.html` in any modern browser (Chrome, Edge, Firefox, Safari).
2. Click **PLAY**.
3. Start typing the word above the nearest obstacle.

A local web server is optional, but it avoids browser restrictions on `file://` pages (especially `localStorage` and font loading):

```powershell
# From the Run4Life-1 folder
python -m http.server 8000
# Then open http://localhost:8000
```

Requirements: a keyboard. There is no touch or mobile control scheme yet.

---

## How to play

- Type the word shown above the nearest obstacle.
- Typed letters turn **white**; untyped letters stay **gray**.
- Completing a word triggers the obstacle's action automatically:
  - **Ground obstacle** â†’ the runner jumps over it.
  - **Floating obstacle** â†’ the runner slides under it.
- A wrong letter costs one life and shakes the screen.
- Hitting an obstacle costs one life and slows the world down.
- If the chaser touches you, the run ends immediately.
- Survive until the hatch appears, reach its red floor marker, and unlock it to win.

> The journey is **nominal 60 seconds** at the base world speed. Slow motion and injuries can make an actual run take longer than 60 seconds of real time.

---

## Controls

| Key | Action |
|-----|--------|
| **Aâ€“Z** (and other single characters) | Type the target word |
| **Backspace** | Delete the last typed letter |
| **Escape** | Clear the current typing |
| **SPACE** (at the hatch) | Advance to the next sentence word |

The game listens on `window`, so you do not need to click the canvas before typing.

---

## Game flow

```
Main menu ──PLAY──▶ Running ──9,000 px──▶ Hatch marker spawns
                       │                         │
                       │                         └─ runner in proximity ──▶ Hatch challenge
                       │                                                      │
                       │                                                      ├─ sentence correct ──▶ ESCAPED (win)
                       │                                                      └─ 3 failed lockpicks ──▶ chaser enrages ──▶ caught ──▶ YOU DIED
                       │
                       ├─ lives = 0 ──▶ chaser enrages (600%) ──▶ caught ──▶ YOU DIED
                       └─ chaser catches runner ──▶ YOU DIED
```

Both endings show the game-over dialog with the final survival time, the saved best time, and **NEW BEST!** when applicable. The dialog offers **MAIN MENU** and **TRY AGAIN**.

---

## Core systems

### 1. Typing and targeting

`pickTargetObstacle()` chooses the nearest untyped obstacle between **50 px behind** the runner (`TYPING_RANGE_MIN = -50`) and **600 px ahead** (`TYPING_RANGE_MAX`).

- Changing targets resets the typed buffer.
- The buffer must remain a **prefix** of the target word.
- A wrong letter removes that letter and calls `loseLife()`.
- When the buffer equals the whole word, the obstacle is marked `cleared` and queued for a jump or slide.

The typed word is rendered above the obstacle by `drawObstacleWord()` using the game font (`GameMode`, loaded from `fonts/Symtext.ttf`).

### 2. Slow motion

As an untyped obstacle gets closer, time slows down:

- Trigger distance: **220 px** (`SLOWMO_DISTANCE`).
- Longer words slow time more:
  - Shortest words (~3 letters) â†’ **30% speed** (`SLOWMO_FACTOR_MAX`)
  - Longest words (~10 letters) â†’ **7% speed** (`SLOWMO_FACTOR_MIN`)
- The effect smoothly returns to 100% as the obstacle reaches the runner.
- A subtle red tint shows how strong the slowdown is.

This is the core readability mechanic: the game gives you more real time to type longer words.

### 3. Obstacles and actions

Obstacles are created by `spawnObstacle()` and move left with the world.

**Ground obstacles (`type = 'jump'`)** use one of three sprite variants:

| Variant | Size |
|---------|------|
| Barrier | 80 Ã— 60 |
| Stop sign | 50 Ã— 50 |
| Cone | 40 Ã— 40 |

**Floating obstacles (`type = 'slide'`)** use `sliding-obstacle-1.png` or `sliding-obstacle-2.png`. The collision block is 50 Ã— 120 px and floats **30 px** above the floor; the art includes the legs, so it is drawn 150 px tall (120 block + 30 gap) and its visible clearance matches the hitbox. They unlock after **1,500 px** and then have a **50%** spawn chance.

When a word is completed, the action is queued (`awaitingJump` / `awaitingSlide`). `checkActionTriggers()` fires it when the obstacle reaches the trigger distance:

- Jump: **200 px** ahead
- Slide: **180 px** ahead

Jump and slide durations are calculated from the obstacle's actual distance and the current world speed, so the animation always covers the gap. The runner's hitbox shrinks toward a cube at the peak of a jump and flattens while sliding.

### 4. Health and damage

The runner has **4 lives** (`MAX_LIVES`). Each remaining life selects a sprite sheet and a world-speed multiplier:

| State | Lives | World speed | Sprite sheet |
|-------|------:|------------:|--------------|
| Normal | 4 | 100% | `runner-run-4` |
| Minor injury | 3 | 90% | `runner-run-3` |
| Injured | 2 | 80% | `runner-run-2` |
| Critical | 1 | 70% | `runner-run-1` |
| Dead | 0 | 0% (world freezes) | â€” |

Damage sources:

- Typing a wrong letter.
- Colliding with an obstacle.

After taking damage, the runner gets **2 seconds** of invincibility (`HIT_COOLDOWN`), shown as a pulsing white outline and a shrinking cooldown bar.

Losing the **last life does not show the game-over screen immediately**. Instead the chaser enrages: it ignores obstacles and stagger, jumps to **600% of its top speed** (`CHASER_SPEED_END Ã— CHASER_ENRAGE_SPEED_MULTIPLIER` = 720 px/s), and performs a single lunge before locking onto the runner while the world freezes and the screen pulses red. The run ends only when the enraged chaser actually catches the runner. Contact with the chaser at any time is still an instant game over.

Jump and slide sprite sheets only exist for state 4. States 1â€“3 fall back to `runner-slide-4.png`; jump sheets exist for all four states.

### 5. The chaser

The chaser pursues the runner from behind and speeds up over the journey:

- **50 px/s** at the start (`CHASER_SPEED_START`)
- **120 px/s** at the end (`CHASER_SPEED_END`)

Behavior:

- Moves toward the runner's center each frame.
- Stops **130 px** behind any cleared obstacle it has not yet traversed, drifting at **70%** of world speed while blocked.
- Jumps or slides over cleared obstacles when they are **50 px** away.
- During the hatch sequence it moves at **70%** speed (`HATCH_CHASER_SLOW_FACTOR`); if the hatch is sealed it enrages and lunges for the kill.
- When the runner's last life is lost it **enrages**: **600% of its top speed** (720 px/s), a single enrage lunge (`CHASER_ENRAGE_JUMP_DURATION`), ignores obstacles/stagger, and runs on real time so slow motion cannot delay the kill.

Touching the runner ends the run immediately.

> **Note:** only obstacles the player has cleared become chaser obstacles (`chaserDelay = true`). Obstacles that hit the runner do not slow the chaser.

### 6. Difficulty progression

Difficulty is driven by `distanceTraveled`:

| Distance | Approx. time | Word pool | World speed | Spawn interval |
|---------:|-------------:|-----------|------------:|---------------:|
| 0 px | 0 s | Easy | 100% | 4.0 s |
| 1,500 px | 10 s | Easy | 100% | 4.0 s |
| 3,000 px | 20 s | Medium | 95% | 3.0 s |
| 5,250 px | 35 s | Hard | 90% | 3.5 s |
| 9,000 px | 60 s | Hatch | â€” | â€” |

Additional rules:

- Floating obstacles unlock at **1,500 px** (50% spawn chance).
- The health multiplier is applied **on top of** the tier speed. A critical runner in the hard tier moves the world at `90% Ã— 70% = 63%`.
- The chaser's speed scales independently from 50 to 120 px/s across the full 9,000 px.

Word pools live in `WORD_POOLS`:

- **Easy:** ~3â€“5 letters (`run`, `jump`, `dash`, `slide`, â€¦)
- **Medium:** ~6â€“9 letters (`running`, `dodging`, `knowledge`, â€¦)
- **Hard:** 9â€“11 letters (`accelerate`, `synchronize`, `complicated`, â€¦)

### 7. Hatch endgame

When `distanceTraveled` reaches `JOURNEY_DISTANCE` (9,000 px), `spawnHatchObstacle()` adds a red hatch marker to the floor. It scrolls in with the world, and normal obstacle spawning stops once it appears. The marker is spawned one `HATCH_OBSTACLE_CLEARANCE` (260 px) further right than normal obstacles, and `spawnObstacle()` refuses to place an obstacle inside that clearance zone, so nothing ever spawns on top of or beside the hatch.

When the runner comes within `HATCH_PROXIMITY_DISTANCE` (120 px) of the marker, `startHatchSequence()` runs:

1. The hatch rises into the center of the screen over **0.8 seconds**.
2. Remaining obstacles are removed.
3. The player must retype **one sentence** from `HATCH_SENTENCES`, letter by letter. Typed letters turn white while the rest stay gray. Press **SPACE** to move to the next word once it is complete (Enter is ignored).
4. The player has **3 lockpicks**:
   - Correct letter â†’ it is added to the current word.
   - Wrong letter â†’ the letter is rejected and one lockpick is lost.
   - After a loss, a **0.75 s cooldown** ignores further wrong letters before another lockpick can be lost.
   - All lockpicks lost â†’ the hatch is sealed, the chaser enrages, and its jumpscare lunge ends the run.

Completing the whole sentence immediately ends the run with **ESCAPED** (green win screen). Runner lives are not consumed by the hatch challenge, but the chaser can still catch you while you type.

### 8. Scoring and records

The HUD (top-right) tracks **survival time**, not points:

- **CURRENT** â€” elapsed run time in `mm:ss`.
- **BEST** â€” saved best time, or `NO RECORD` for a first-time player.

The best time persists in `localStorage` under the key `run4life.bestSurvivalTime`.

The codebase also maintains an internal points score (`score`, `distanceScore`) with floating `+points` popups:

| Source | Points |
|--------|-------:|
| Distance | 0.05 per pixel |
| Completed word | 100 |
| Per letter in the word | +10 |

This point total is **not displayed** on the HUD or game-over screen; survival time is the official score.

### 9. Parallax city

The backdrop is a three-layer parallax skyline built from `sprites/Building/*.png`. Buildings are **purely decorative** â€” they live in their own arrays, never in `obstacles[]`, so typing, collisions, and chaser AI ignore them.

| Layer | Scroll factor | Height @1080p | Alpha | Gap range | Feel |
|-------|-------------:|--------------:|------:|----------:|------|
| Far | 0.18Ã— | 110â€“230 px | 0.50 | 40â€“150 px | Distant skyline, hazy |
| Mid | 0.42Ã— | 240â€“470 px | 0.75 | 28â€“110 px | Mid-distance blocks |
| Near | 0.72Ã— | 430â€“800 px | 1.00 | 14â€“75 px | Large, dense, close |

The **near layer is deliberately oversized and tightly packed** so the runner feels enclosed by the city rather than running past distant scenery. All sizes are authored against a 1920Ã—1080 reference and multiplied by `sceneScale()` (`canvas.height / 1080`), so the skyline stays proportional at any resolution.

Each building is picked with weighted randomness (small and mid buildings are more common; towers are rare), horizontally cropped to its opaque bounds (`sx/sy/sw/sh`) so it sits flush on the floor, and capped at a per-layer `maxWidth` so wide sprites cannot swallow the viewport.

Street props (`Electric-Post.png`) use a separate, sparse layer in front of the buildings but behind the runner (`speed: 0.9`, height `820â€“845` â€” taller than the tallest near-layer building so they read as close foreground silhouettes). Because `worldSpeed` already includes difficulty and health multipliers, and `delta` is slow-motion-scaled, the whole city inherits speed changes and slow motion automatically.

`drawPropWires()` connects every consecutive pair of posts with a bundle of **15 black**, gently sagging quadratic curves spread evenly across the crossarm (`PROP_WIRE_COUNT`, `PROP_WIRE_ANCHORS` in native sprite coords). The lines fan out (leftmost deepest sag â†’ rightmost shallowest) so they read as separate cables rather than one thick band. Wires are drawn before the posts so the poles cover the attachment points, and each span is skipped once it is off-screen.

A fresh run calls `resetBuildings()` in `resetGame()` and again in `resizeCanvas()`, prefilling from off-screen left so the skyline is complete on the first frame.

---

## Project structure

```
Run4Life-1/
â”œâ”€â”€ index.html                  Main menu, game-over dialog, canvas, HUD
â”œâ”€â”€ style.css                   Menu/UI styling, animated menu road, HUD skin
â”œâ”€â”€ game.js                     Entire game (config, classes, loop, rendering)
â”œâ”€â”€ README.md                   This document
â”œâ”€â”€ fonts/
â”‚   â””â”€â”€ Symtext.ttf             Game font (declared as "GameMode" in CSS)
â””â”€â”€ sprites/
    â”œâ”€â”€ Building/               Parallax city sprites (7 buildings + props)
    â”‚   â”œâ”€â”€ Apartment-1.png
    â”‚   â”œâ”€â”€ Store-3.png
    â”‚   â”œâ”€â”€ Short_Building-4.png
    â”‚   â”œâ”€â”€ Short_Building-5.png
    â”‚   â”œâ”€â”€ Short_Building-6.png
    â”‚   â”œâ”€â”€ Short_Building-7.png
    â”‚   â”œâ”€â”€ Tall_Building-2.png
    â”‚   â””â”€â”€ Objects/
    â”‚       â””â”€â”€ Electric-Post.png
    â”œâ”€â”€ Character-Sprites/      Runner run/jump/slide (states 1â€“4), chaser
    â”œâ”€â”€ Maps/
    â”‚   â”œâ”€â”€ Map1.png            Sky/background
    â”‚   â””â”€â”€ Building.png        Reserved / unused
    â”œâ”€â”€ Meter-Sprites/          Journey bar + head icons
    â”œâ”€â”€ Obstacles/              Barrier, stop sign, cone, sliding-obstacle-1/2
    â””â”€â”€ Others/
        â”œâ”€â”€ word-bg.png         Background behind obstacle words
        â”œâ”€â”€ hud-background.png  Survival HUD background
        â””â”€â”€ Button_Icons.png    Game-over button skin
```

### What each file does

| File | Responsibility |
|------|----------------|
| `index.html` | DOM shell: `#mainMenu`, `#gameOver`, `<canvas id="game">`, `#survivalHud` |
| `style.css` | Menu layout/animation, game-over dialog, win/lose themes, HUD image |
| `game.js` | Everything else: constants, entity classes, input, game loop, rendering |
| `fonts/Symtext.ttf` | Font used for obstacle words and the hatch sentence |

---

## Code architecture

`game.js` is organized top-to-bottom. The important entry points are listed below by function name (line numbers change as the file evolves).

### Classes

```
Entity                         Abstract base: x, y, width, height, getBounds()
 â”œâ”€â”€ Runner                    Player movement, jump/slide, health-based sprites
 â”œâ”€â”€ Chaser                    Pursuit, obstacle blocking, jump/slide reactions
 â””â”€â”€ Obstacle                  Word, type (jump/slide), variant, cleared state
```

- **`Entity`** defines the shared position/size contract and requires subclasses to implement `update()`.
- **`Runner`** owns jump/slide state and animation. Its draw scale and hitbox scale are shared constants (`RUNNER_SPRITE_SCALE`, `RUNNER_HITBOX_INSET`) so visuals and collisions cannot drift apart.
- **`Chaser`** is a simple pursuit AI: move toward the runner, stop behind cleared obstacles, then jump or slide over them.
- **`Obstacle`** stores the word, the required action, and per-entity flags (`cleared`, `awaitingJump`, `awaitingSlide`, `chaserDelay`, `chaserJumped`, `chaserSlid`).

### Game loop

```
requestAnimationFrame(gameLoop)
  â””â”€â”€ update(scaledDelta, realDelta)
        â”œâ”€â”€ advance survival time and distance
        â”œâ”€â”€ start the hatch at 9,000 px
        â”œâ”€â”€ scroll the parallax city (buildings + props)
        â”œâ”€â”€ update runner + chaser + obstacles
        â”œâ”€â”€ spawn obstacles (tier-based interval)
        â”œâ”€â”€ pick the typing target
        â”œâ”€â”€ fire queued jump/slide actions
        â”œâ”€â”€ move the chaser over cleared obstacles
        â”œâ”€â”€ resolve runner/obstacle and runner/chaser collisions
        â””â”€â”€ tick visual effects (flash, shake, cooldown, popups)
  â””â”€â”€ draw()
        â”œâ”€â”€ sky background + camera shake
        â”œâ”€â”€ parallax city (far â†’ mid â†’ near â†’ props)
        â”œâ”€â”€ floor + journey meter
        â”œâ”€â”€ runner, chaser, obstacles, hatch
        â”œâ”€â”€ score popups
        â””â”€â”€ slow-motion tint, wrong-letter flash, hit-cooldown outline
```

### Helper functions worth knowing

| Function | Purpose |
|----------|---------|
| `getWorldSpeed()` | Base world speed Ã— difficulty tier Ã— health multiplier |
| `getSpawnInterval()` | Tier-based obstacle spawn interval |
| `getCurrentWordPool()` | Easy / medium / hard word list for the current distance |
| `getTimeScale()` | Slow-motion factor from the nearest untyped obstacle |
| `pickTargetObstacle()` | Chooses the word you are currently typing |
| `checkTypedMatch()` | Validates the buffer, resolves words, applies damage |
| `checkActionTriggers()` | Starts the runner's jump/slide at the right distance |
| `checkChaserAction()` | Makes the chaser jump/slide over cleared obstacles |
| `getRunnerBounds()` / `getChaserBounds()` | Dynamic collision boxes |
| `getJumpDurationForDistance()` / `getSlideDurationForDistance()` | Distance-matched animation lengths |
| `spawnObstacle()` | Creates a ground or floating obstacle |
| `spawnScenery()` / `pickWeightedVariant()` | Spawns and weight-picks parallax buildings and props |
| `updateBuildings()` / `resetBuildings()` | Scrolls and prefills the parallax city |
| `drawBuildings()` / `drawProps()` | Renders the city layers behind the gameplay |
| `resetGame()` | Restores all mutable state for a fresh run |
| `resizeCanvas()` | Matches the canvas to the window and repositions entities |

### Input wiring

Two `keydown` listeners split the work:

1. **Letter input** â€” appends to `currentTyped` and calls `checkTypedMatch()`; during the hatch it calls `handleHatchLetter()` for per-letter validation.
2. **Editing keys** â€” handles Backspace and Escape; during the hatch, SPACE advances a completed word and Enter is ignored.

Menu music is generated procedurally with the Web Audio API (triangle melody + sine bass) and is opt-in via the â™ª button.

---

## Configuration reference

All tuning values live near the top of `game.js`, grouped by system.

| Group | Constants | What they control |
|-------|-----------|-------------------|
| Journey | `JOURNEY_DURATION`, `JOURNEY_DISTANCE` | Run length (60 s nominal, 9,000 px) |
| World | `WORLD_SPEED`, `WORLD_SPEED_TIER_2/3` | Scroll speed per difficulty tier |
| Words | `WORD_TIER_2_DISTANCE`, `WORD_TIER_3_DISTANCE`, `WORD_POOLS` | When each word list unlocks |
| Spawning | `spawnInterval`, `SPAWN_INTERVAL_TIER_2/3`, `SLIDE_UNLOCK_DISTANCE`, `SLIDE_CHANCE_AFTER_UNLOCK` | Obstacle frequency and type mix |
| Slide obstacles | `SLIDE_OBSTACLE_WIDTH/HEIGHT/GAP`, `SLIDE_OBSTACLE_TOTAL_HEIGHT`, `SLIDE_OBSTACLE_VARIANTS` | Overhead barrier hitbox, floor clearance, and artwork |
| Slow motion | `SLOWMO_DISTANCE`, `SLOWMO_FACTOR_MIN/MAX`, `SLOWMO_WORD_LENGTH_MIN/MAX` | How strongly time slows |
| Jump | `JUMP_DURATION`, `JUMP_HEIGHT`, `JUMP_TRIGGER_DISTANCE`, `JUMP_HITBOX_HEIGHT` | Jump feel and hitbox |
| Slide | `SLIDE_DURATION`, `SLIDE_HEIGHT`, `SLIDE_WIDTH`, `SLIDE_TRIGGER_DISTANCE` | Slide feel and hitbox |
| Chaser | `CHASER_SPEED_START/END`, `CHASER_STOP_DISTANCE`, `CHASER_JUMP_CUE`, `CHASER_ENRAGE_SPEED_MULTIPLIER`, `CHASER_ENRAGE_JUMP_HEIGHT/DURATION` | Pursuit difficulty and final-life jumpscare |
| Health | `MAX_LIVES`, `HIT_COOLDOWN` | Damage rules and invincibility |
| Hatch | `HATCH_SENTENCES`, `HATCH_LOCKPICK_COUNT`, `HATCH_LOCKPICK_COOLDOWN`, `HATCH_CHASER_SLOW_FACTOR`, `HATCH_CHASER_FAILURE_FACTOR`, `HATCH_OBSTACLE_WIDTH`, `HATCH_OBSTACLE_HEIGHT`, `HATCH_PROXIMITY_DISTANCE`, `DEBUG_HATCH_AT_START`, `DEBUG_HATCH_TRIGGER_DISTANCE` | Endgame rules, hatch marker/proximity, and debug trigger |
| Runner visuals | `RUNNER_SPRITE_SCALE`, `RUNNER_SLIDE_STRETCH_X/Y`, `RUNNER_HITBOX_INSET` | Shared draw scale and hitbox size |
| Parallax city | `BUILDING_VARIANTS`, `BUILDING_LAYERS`, `PROP_VARIANTS`, `PROP_LAYER`, `PROP_WIRE_COUNT`, `PROP_WIRE_ANCHORS` | Sprite crop boxes, layer speed/height/alpha/gap, prop spacing, post wire count/attachment points |
| Effects | `WRONG_FLASH_DURATION`, `SHAKE_DURATION`, `SHAKE_INTENSITY` | Feedback intensity |

> The hitbox is deliberately smaller than the drawn sprite. `RUNNER_HITBOX_INSET` is tuned so collisions feel fair while the sprite looks large.

---

## Sprite sheets

All character sheets are horizontal strips, read left-to-right.

| Sheet | Frames | Frame size | Files |
|-------|-------:|-----------:|-------|
| Runner run | 10 | 120 Ã— 200 | `runner-run-{1..4}.png` |
| Runner jump | 10 | 120 Ã— 200 | `runner-jump-{1..4}.png` |
| Runner slide | 14 | 200 Ã— 200 | `runner-slide-4.png` only |
| Chaser run | 9 | 300 Ã— 300 | `chaser-run.png` |
| Chaser jump | 8 | 300 Ã— 300 | `chaser-jump.png` |
| Chaser slide | 16 | 300 Ã— 300 | `chaser-slide.png` |

Obstacle sprites are single images (`obstacle-1/2/3.png`). Slide obstacles use `sliding-obstacle-1.png` and `sliding-obstacle-2.png` (native 150 Ã— 360, cropped to opaque bounds and drawn 150 px tall so the legs reach the floor). The journey meter uses `meter-bar.png` plus the four runner head icons, the chaser head, and the hatch icon.

The main menu reuses `runner-run-4.png` and `chaser-run.png` as CSS `steps()` sprite animations.

Background buildings are single painted PNGs with alpha, not sprite sheets. Their native sizes are recorded in `BUILDING_VARIANTS` alongside the opaque crop box used for rendering:

| File | Native size |
|------|------------:|
| `Apartment-1.png` | 192 Ã— 256 |
| `Store-3.png` | 365 Ã— 288 |
| `Short_Building-4.png` | 360 Ã— 360 |
| `Short_Building-5.png` | 500 Ã— 400 |
| `Short_Building-6.png` | 500 Ã— 400 |
| `Short_Building-7.png` | 500 Ã— 450 |
| `Tall_Building-2.png` | 288 Ã— 645 |
| `Objects/Electric-Post.png` | 150 Ã— 360 (prop) |

---

## Changelog

### 2026-11-11 - slower chaser during the hatch

- `HATCH_CHASER_SLOW_FACTOR` lowered from `0.85` to `0.70`, so the chaser moves at **70%** of its normal speed while the hatch is entering/active.

### 2026-11-11 - hatch marker clearance

- Added `HATCH_OBSTACLE_CLEARANCE` (260 px). `spawnHatchObstacle()` now spawns the marker one clearance zone further right than normal obstacles, and `spawnObstacle()` skips any spawn that would land inside the hatch marker's clearance zone. This prevents obstacles from spawning on top of or right next to the hatch as it scrolls in.

### 2026-11-11 - hatch marker and UI flow update

**Hatch marker object**
- At the hatch trigger distance, `spawnHatchObstacle()` adds a red placeholder hatch marker to `obstacles` (`type: 'hatch'`) on the floor. It scrolls in with the world; normal obstacle spawning stops once it appears.
- The typing sequence now starts on proximity: when the runner is within `HATCH_PROXIMITY_DISTANCE` of the marker, `startHatchSequence()` runs (instead of auto-starting at distance).

**Hatch UI**
- The hatch typing UI is screen-centered (not anchored to the floor marker) and pans up from below the screen to center over `HATCH_TRANSITION_DURATION` when the sequence begins.
- `HATCH_CHASER_SLOW_FACTOR` is set to `0.70` during the hatch sequence.
- `HATCH_SENTENCES` now uses longer prompts (12â€“14 words each).
- Hatch debug spawn flags remain available for testing (`DEBUG_HATCH_AT_START`, `DEBUG_HATCH_TRIGGER_DISTANCE`) and are disabled by default.

### 2026-11-10 - hatch endgame sign-off

**Sentence hatch**
- The hatch is unlocked by retyping **one sentence** from `HATCH_SENTENCES`, letter by letter, instead of three separate words.
- Typed letters turn white inline (no input box or prompt). The sentence renders in the Symtext font (`'GameMode'`, 22px) with per-letter progress and a highlight on the current word.
- **SPACE** advances a completed word; **Enter** is ignored. `e.repeat` is ignored so key-repeat cannot drain lockpicks.
- Each wrong letter costs one of three lockpicks; a **0.75 s cooldown** (`HATCH_LOCKPICK_COOLDOWN`) ignores wrong letters while active. Correct letters always register.

**Failure / debug**
- Losing the final lockpick seals the hatch and calls `startChaserEnrage()`, so the jumpscare lunge ends the run in ~0.45 s.
- The temporary hatch-at-start debug trigger was previously disabled; it may be re-enabled for testing as noted above.

### 2026-11-09 â€” `883216d` (pushed to `Hatch_Sys`)

**Electric posts and wires**
- Added a sparse foreground prop layer using `sprites/Building/Objects/Electric-Post.png`.
- Posts are **820â€“845 px** tall (`PROP_LAYER.height`), so every post is taller than the tallest near-layer building (800 px).
- Post spacing widened to **600â€“1100 px** (`PROP_LAYER.gap`).
- Every consecutive pair of posts is connected by **15 black wires** (`PROP_WIRE_COUNT`) attached across the crossarm (`PROP_WIRE_ANCHORS`), with fanned sag so they read as separate cables.

**Slide-obstacle sprites**
- Floating obstacles now use `sliding-obstacle-1.png` / `sliding-obstacle-2.png` instead of the drawn placeholder.
- Opaque crops strip the transparent padding; the art is drawn `SLIDE_OBSTACLE_TOTAL_HEIGHT` (150 px) tall while the collision block stays `50 Ã— 120` with 30 px floor clearance.

**Last-life enrage / jumpscare**
- Losing the **last life no longer shows the game-over screen immediately**.
- `loseLife()` starts `startChaserEnrage()` instead: the chaser moves at **720 px/s** (`CHASER_SPEED_END Ã— 6`), ignores obstacles/stagger, and performs a single lunge before locking onto the runner.
- The world freezes and a red pulse plays; the run ends **only** when the enraged chaser catches the runner.
- The hatch **ESCAPED** win dialog is unchanged.
- `resetGame()` clears the enrage state and restores the chaser's jump height.

---

## Development notes

- **No build step.** Edit a file and refresh the browser.
- **State lives in module-level variables** in `game.js`; `resetGame()` is the single place that restores them between runs.
- **`localStorage` is per-origin.** Running from a local server and from `file://` will use different saved best times.
- **Rendering order matters:** sky â†’ parallax city (far/mid/near/props) â†’ floor/meter â†’ entities â†’ hatch â†’ popups â†’ full-screen tints.
- **The journey meter is at the bottom** of the screen (`METER_BOTTOM_MARGIN`), despite the old comment suggesting the top.
- **Reserved constants:** `CHASER_STAGGER_DURATION`, `CHASER_STAGGER_FACTOR`, and the `chaser.staggerTime` path are currently unused (the chaser never staggers), and `HATCH_OFFSET_FROM_RUNNER` / `getHatchWorldX()` are left over from an earlier world-position hatch design. They can be removed or implemented later.
- **No pause, touch, or gamepad support yet.**
- **`prefers-reduced-motion`** is respected for the game-over animations, but canvas effects (shake, slow-motion tint) always play.

### Ideas / next steps

- [x] Main menu with animated road and optional Web Audio music
- [x] Custom game-over screen with win/lose variants
- [x] Sentence-based hatch endgame with lockpicks
- [x] Distance-based difficulty tiers and word pools
- [x] Parallax city background with close, dense buildings and street props
- [ ] Unlockable maps based on best distance/time
- [ ] Damaged obstacle sprite variants at higher distances
- [ ] Touch/mobile input
- [ ] Pause menu
