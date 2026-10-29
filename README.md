# Run4Life

**Run4Life** is a typing-based endless runner that runs entirely in the browser. Words hover above incoming obstacles — type each word correctly and your runner automatically jumps or slides over it. A chaser is always behind you, and every mistake costs you time, speed, and health.

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
- [Project structure](#project-structure)
- [Code architecture](#code-architecture)
- [Configuration reference](#configuration-reference)
- [Sprite sheets](#sprite-sheets)
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
  - **Ground obstacle** → the runner jumps over it.
  - **Floating obstacle** → the runner slides under it.
- A wrong letter costs one life and shakes the screen.
- Hitting an obstacle costs one life and slows the world down.
- If the chaser touches you, the run ends immediately.
- Survive **9,000 px** to reach the escape hatch, then unlock it to win.

> The journey is **nominal 60 seconds** at the base world speed. Slow motion and injuries can make an actual run take longer than 60 seconds of real time.

---

## Controls

| Key | Action |
|-----|--------|
| **A–Z** (and other single characters) | Type the target word |
| **Backspace** | Delete the last typed letter |
| **Escape** | Clear the current typing |
| **Enter** (at the hatch) | Submit the typed hatch word |

The game listens on `window`, so you do not need to click the canvas before typing.

---

## Game flow

```
Main menu ──PLAY──▶ Running ──9,000 px──▶ Hatch challenge
                       │                      │
                       │                      ├── all 3 words correct ──▶ ESCAPED (win)
                       │                      └── 3 failed lockpicks ──▶ hatch drops, chaser at 2× speed
                       │
                       └── lives = 0 or chaser catches you ──▶ YOU DIED
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
  - Shortest words (~3 letters) → **30% speed** (`SLOWMO_FACTOR_MAX`)
  - Longest words (~10 letters) → **7% speed** (`SLOWMO_FACTOR_MIN`)
- The effect smoothly returns to 100% as the obstacle reaches the runner.
- A subtle red tint shows how strong the slowdown is.

This is the core readability mechanic: the game gives you more real time to type longer words.

### 3. Obstacles and actions

Obstacles are created by `spawnObstacle()` and move left with the world.

**Ground obstacles (`type = 'jump'`)** use one of three sprite variants:

| Variant | Size |
|---------|------|
| Barrier | 80 × 60 |
| Stop sign | 50 × 50 |
| Cone | 40 × 40 |

**Floating obstacles (`type = 'slide'`)** are 50 × 120 blocks with legs. They unlock after **1,500 px** and then have a **50%** spawn chance.

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
| Dead | 0 | Game over | — |

Damage sources:

- Typing a wrong letter.
- Colliding with an obstacle.

After taking damage, the runner gets **2 seconds** of invincibility (`HIT_COOLDOWN`), shown as a pulsing white outline and a shrinking cooldown bar. Contact with the chaser is an **instant game over**, regardless of remaining lives.

Jump and slide sprite sheets only exist for state 4. States 1–3 fall back to `runner-slide-4.png`; jump sheets exist for all four states.

### 5. The chaser

The chaser pursues the runner from behind and speeds up over the journey:

- **50 px/s** at the start (`CHASER_SPEED_START`)
- **120 px/s** at the end (`CHASER_SPEED_END`)

Behavior:

- Moves toward the runner's center each frame.
- Stops **130 px** behind any cleared obstacle it has not yet traversed, drifting at **70%** of world speed while blocked.
- Jumps or slides over cleared obstacles when they are **50 px** away.
- During the hatch sequence it moves at **30%** speed; after a failed hatch it moves at **200%** speed.

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
| 9,000 px | 60 s | Hatch | — | — |

Additional rules:

- Floating obstacles unlock at **1,500 px** (50% spawn chance).
- The health multiplier is applied **on top of** the tier speed. A critical runner in the hard tier moves the world at `90% × 70% = 63%`.
- The chaser's speed scales independently from 50 to 120 px/s across the full 9,000 px.

Word pools live in `WORD_POOLS`:

- **Easy:** ~3–5 letters (`run`, `jump`, `dash`, `slide`, …)
- **Medium:** ~6–9 letters (`running`, `dodging`, `knowledge`, …)
- **Hard:** 9–11 letters (`accelerate`, `synchronize`, `complicated`, …)

### 7. Hatch endgame

When `distanceTraveled` reaches `JOURNEY_DISTANCE` (9,000 px), `startHatchSequence()` runs:

1. The hatch rises into the center of the screen over **0.8 seconds**.
2. Obstacles are removed and normal spawning stops.
3. The player must type **three easy words**, one at a time, pressing **Enter** to submit each.
4. The player has **3 lockpicks**:
   - Correct word → advance to the next word.
   - Wrong word → lose one lockpick.
   - All lockpicks lost → the hatch drops away and the chaser doubles its speed.

Completing all three words immediately ends the run with **ESCAPED** (green win screen). Runner lives are not consumed by the hatch challenge, but the chaser can still catch you while you type.

### 8. Scoring and records

The HUD (top-right) tracks **survival time**, not points:

- **CURRENT** — elapsed run time in `mm:ss`.
- **BEST** — saved best time, or `NO RECORD` for a first-time player.

The best time persists in `localStorage` under the key `run4life.bestSurvivalTime`.

The codebase also maintains an internal points score (`score`, `distanceScore`) with floating `+points` popups:

| Source | Points |
|--------|-------:|
| Distance | 0.05 per pixel |
| Completed word | 100 |
| Per letter in the word | +10 |

This point total is **not displayed** on the HUD or game-over screen; survival time is the official score.

---

## Project structure

```
Run4Life-1/
├── index.html                  Main menu, game-over dialog, canvas, HUD
├── style.css                   Menu/UI styling, animated menu road, HUD skin
├── game.js                     Entire game (config, classes, loop, rendering)
├── README.md                   This document
├── fonts/
│   └── Symtext.ttf             Game font (declared as "GameMode" in CSS)
└── sprites/
    ├── Character-Sprites/      Runner run/jump/slide (states 1–4), chaser
    ├── Maps/
    │   ├── Map1.png            Sky/background
    │   └── Building.png        Reserved / unused
    ├── Meter-Sprites/          Journey bar + head icons
    ├── Obstacles/              Barrier, stop sign, cone
    └── Others/
        ├── word-bg.png         Background behind obstacle words
        ├── hud-background.png  Survival HUD background
        └── Button_Icons.png    Game-over button skin
```

### What each file does

| File | Responsibility |
|------|----------------|
| `index.html` | DOM shell: `#mainMenu`, `#gameOver`, `<canvas id="game">`, `#survivalHud` |
| `style.css` | Menu layout/animation, game-over dialog, win/lose themes, HUD image |
| `game.js` | Everything else: constants, entity classes, input, game loop, rendering |
| `fonts/Symtext.ttf` | Font used for obstacle words |

---

## Code architecture

`game.js` is organized top-to-bottom. The important entry points are listed below by function name (line numbers change as the file evolves).

### Classes

```
Entity                         Abstract base: x, y, width, height, getBounds()
 ├── Runner                    Player movement, jump/slide, health-based sprites
 ├── Chaser                    Pursuit, obstacle blocking, jump/slide reactions
 └── Obstacle                  Word, type (jump/slide), variant, cleared state
```

- **`Entity`** defines the shared position/size contract and requires subclasses to implement `update()`.
- **`Runner`** owns jump/slide state and animation. Its draw scale and hitbox scale are shared constants (`RUNNER_SPRITE_SCALE`, `RUNNER_HITBOX_INSET`) so visuals and collisions cannot drift apart.
- **`Chaser`** is a simple pursuit AI: move toward the runner, stop behind cleared obstacles, then jump or slide over them.
- **`Obstacle`** stores the word, the required action, and per-entity flags (`cleared`, `awaitingJump`, `awaitingSlide`, `chaserDelay`, `chaserJumped`, `chaserSlid`).

### Game loop

```
requestAnimationFrame(gameLoop)
  └── update(scaledDelta, realDelta)
        ├── advance survival time and distance
        ├── start the hatch at 9,000 px
        ├── update runner + chaser + obstacles
        ├── spawn obstacles (tier-based interval)
        ├── pick the typing target
        ├── fire queued jump/slide actions
        ├── move the chaser over cleared obstacles
        ├── resolve runner/obstacle and runner/chaser collisions
        └── tick visual effects (flash, shake, cooldown, popups)
  └── draw()
        ├── sky background + camera shake
        ├── floor + journey meter
        ├── runner, chaser, obstacles, hatch
        ├── score popups
        └── slow-motion tint, wrong-letter flash, hit-cooldown outline
```

### Helper functions worth knowing

| Function | Purpose |
|----------|---------|
| `getWorldSpeed()` | Base world speed × difficulty tier × health multiplier |
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
| `resetGame()` | Restores all mutable state for a fresh run |
| `resizeCanvas()` | Matches the canvas to the window and repositions entities |

### Input wiring

Two `keydown` listeners split the work:

1. **Letter input** — appends to `currentTyped` (or `hatchTyped` during the hatch) and calls `checkTypedMatch()`.
2. **Editing keys** — handles Backspace, Escape, and Enter.

Menu music is generated procedurally with the Web Audio API (triangle melody + sine bass) and is opt-in via the ♪ button.

---

## Configuration reference

All tuning values live near the top of `game.js`, grouped by system.

| Group | Constants | What they control |
|-------|-----------|-------------------|
| Journey | `JOURNEY_DURATION`, `JOURNEY_DISTANCE` | Run length (60 s nominal, 9,000 px) |
| World | `WORLD_SPEED`, `WORLD_SPEED_TIER_2/3` | Scroll speed per difficulty tier |
| Words | `WORD_TIER_2_DISTANCE`, `WORD_TIER_3_DISTANCE`, `WORD_POOLS` | When each word list unlocks |
| Spawning | `spawnInterval`, `SPAWN_INTERVAL_TIER_2/3`, `SLIDE_UNLOCK_DISTANCE`, `SLIDE_CHANCE_AFTER_UNLOCK` | Obstacle frequency and type mix |
| Slow motion | `SLOWMO_DISTANCE`, `SLOWMO_FACTOR_MIN/MAX`, `SLOWMO_WORD_LENGTH_MIN/MAX` | How strongly time slows |
| Jump | `JUMP_DURATION`, `JUMP_HEIGHT`, `JUMP_TRIGGER_DISTANCE`, `JUMP_HITBOX_HEIGHT` | Jump feel and hitbox |
| Slide | `SLIDE_DURATION`, `SLIDE_HEIGHT`, `SLIDE_WIDTH`, `SLIDE_TRIGGER_DISTANCE` | Slide feel and hitbox |
| Chaser | `CHASER_SPEED_START/END`, `CHASER_STOP_DISTANCE`, `CHASER_JUMP_CUE` | Pursuit difficulty |
| Health | `MAX_LIVES`, `HIT_COOLDOWN` | Damage rules and invincibility |
| Hatch | `HATCH_WORD_COUNT`, `HATCH_LOCKPICK_COUNT`, `HATCH_CHASER_SLOW_FACTOR`, `HATCH_CHASER_FAILURE_FACTOR` | Endgame rules |
| Runner visuals | `RUNNER_SPRITE_SCALE`, `RUNNER_SLIDE_STRETCH_X/Y`, `RUNNER_HITBOX_INSET` | Shared draw scale and hitbox size |
| Effects | `WRONG_FLASH_DURATION`, `SHAKE_DURATION`, `SHAKE_INTENSITY` | Feedback intensity |

> The hitbox is deliberately smaller than the drawn sprite. `RUNNER_HITBOX_INSET` is tuned so collisions feel fair while the sprite looks large.

---

## Sprite sheets

All character sheets are horizontal strips, read left-to-right.

| Sheet | Frames | Frame size | Files |
|-------|-------:|-----------:|-------|
| Runner run | 10 | 120 × 200 | `runner-run-{1..4}.png` |
| Runner jump | 10 | 120 × 200 | `runner-jump-{1..4}.png` |
| Runner slide | 14 | 200 × 200 | `runner-slide-4.png` only |
| Chaser run | 9 | 300 × 300 | `chaser-run.png` |
| Chaser jump | 8 | 300 × 300 | `chaser-jump.png` |
| Chaser slide | 16 | 300 × 300 | `chaser-slide.png` |

Obstacle sprites are single images (`obstacle-1/2/3.png`). The journey meter uses `meter-bar.png` plus the four runner head icons, the chaser head, and the hatch icon.

The main menu reuses `runner-run-4.png` and `chaser-run.png` as CSS `steps()` sprite animations.

---

## Development notes

- **No build step.** Edit a file and refresh the browser.
- **State lives in module-level variables** in `game.js`; `resetGame()` is the single place that restores them between runs.
- **`localStorage` is per-origin.** Running from a local server and from `file://` will use different saved best times.
- **Rendering order matters:** sky → floor/meter → entities → hatch → popups → full-screen tints.
- **The journey meter is at the bottom** of the screen (`METER_BOTTOM_MARGIN`), despite the old comment suggesting the top.
- **Reserved constants:** `CHASER_STAGGER_DURATION`, `CHASER_STAGGER_FACTOR`, and the `chaser.staggerTime` path are currently unused (the chaser never staggers), and `HATCH_OFFSET_FROM_RUNNER` / `getHatchWorldX()` are left over from an earlier world-position hatch design. They can be removed or implemented later.
- **No pause, touch, or gamepad support yet.**
- **`prefers-reduced-motion`** is respected for the game-over animations, but canvas effects (shake, slow-motion tint) always play.

### Ideas / next steps

- [x] Main menu with animated road and optional Web Audio music
- [x] Custom game-over screen with win/lose variants
- [x] Hatch endgame with independent lockpicks
- [x] Distance-based difficulty tiers and word pools
- [ ] Unlockable maps based on best distance/time
- [ ] Damaged obstacle sprite variants at higher distances
- [ ] Touch/mobile input
- [ ] Pause menu
