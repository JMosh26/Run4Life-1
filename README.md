# Run4Life

A typing-based endless runner. Type the words on incoming obstacles to make your runner jump or slide over them — and escape a relentless chaser behind you.

## How to Play

- Type the word shown above each obstacle.
- Correctly typed letters turn white; untyped letters stay gray.
- Complete the word to trigger the obstacle's action:
  - **Ground obstacle** → runner jumps over it.
  - **Floating obstacle** → runner slides under it.
- The chaser behind you stalls at cleared obstacles — but never gives up.
- Survive the full 60-second (9000px) journey.

## Controls

- **Letter keys** — Type the current word.
- **Backspace** — Delete the last typed letter.
- **Escape** — Clear your typing.
- **At the hatch** — Type each of the three displayed words and press Enter to submit. A wrong submission costs one lockpick.

## Health System & States

You don't die instantly from wrong letters or obstacle hits. Instead, you have **4 lives** (states). Taking damage slows down the world, giving the chaser time to catch up to you.

| State | Lives | Speed Modifier | Sprite Sheet |
|-------|-------|----------------|--------------|
| Normal | 4 | 100% Speed | `runner-run-4` |
| Minor Injury | 3 | 10% Slower | `runner-run-3` |
| Injured | 2 | 20% Slower | `runner-run-2` |
| Critical | 1 | 30% Slower | `runner-run-1` |
| Dead | 0 | Game Over | N/A |

- **Damage Cooldown:** After taking a hit, there is a 2-second invincibility window (`HIT_COOLDOWN`), shown as a white flashing outline plus a cooldown bar above the runner.
- **Chaser Catch:** Getting caught by the chaser is an instant game over, regardless of how many lives you have left.

## Difficulty Progression

Difficulty scales with the distance traveled during the 1-minute journey.

| Distance / Time | What Changes |
|-----------------|--------------|
| 0s (Start)      | Baseline: fast world, short words |
| 10s (1500px)    | Slide obstacles unlock (50% spawn chance) |
| 20s (3000px)    | Medium words, 5% slower world, 3.0s spawn interval |
| 35s (5250px)    | Hard words, 10% slower world, 3.5s spawn interval |
| 60s (9000px)    | The Escape Hatch appears (end of journey) |

At the hatch, correctly submit three words to escape. The hatch challenge has its own three lockpicks and does not use runner lives. The chaser moves at 30% speed during the challenge; if all lockpicks are lost, the hatch drops away and the chaser moves at 200% speed.

The chaser also accelerates over the journey: **50 px/s at the start → 120 px/s at the end**.

## Scoring

Survival time is the run score. The current time and saved best are shown in the top-right while playing; the best time persists in the browser between sessions. The game-over screen shows the final time, best time, and a **NEW BEST!** message when appropriate. A first-time player sees **NO RECORD** until their first run ends.

| Source | Points |
|--------|--------|
| Distance traveled | 0.05 per pixel |
| Each completed word | 100 |
| Per letter in the word | +10 |

Score gains pop up as floating `+points` text above the cleared obstacle.

## Project Structure

```
Run4Life/
├── index.html      # Menu, game-over screen, and canvas shell
├── style.css       # Menu / game-over UI, animated menu road & sprites
├── game.js         # Entire game: config, classes, loop, rendering
├── fonts/          # Symtext.ttf (obstacle words + menu title)
└── sprites/
    ├── Character-Sprites/   # Runner (run/jump/slide × 4 health states), chaser
    ├── Maps/                # Sky/background image
    ├── Meter-Sprites/       # Journey progress bar + head icons
    ├── Obstacles/           # barrier, stop-sign, cone
    └── Others/              # Word label background
```

## Code Overview (`game.js`, ~1800 lines)

The file is organized top-to-bottom as:

1. **Configuration block** (lines ~1–277) — DOM references, sprite loading, and all tuning constants grouped by system:
   - `WORLD_SPEED`, tier constants → world speed / word difficulty scaling
   - `JOURNEY_DURATION`, `JOURNEY_DISTANCE`, `HATCH_OFFSET_FROM_RUNNER` → journey length
   - `SLOWMO_*`, `JUMP_*`, `SLIDE_*`, `CHASER_*` → movement and feel tuning
   - `SCORE_*`, `MAX_LIVES`, `HIT_COOLDOWN`, `TYPING_RANGE_*` → rules
   - `OBSTACLE_VARIANTS` → sprite/size data per ground obstacle type
   - `WORD_POOLS` → `easy` / `medium` / `hard` word lists
2. **Classes** — `Entity` (abstract base) → `Runner`, `Chaser`, `Obstacle`
3. **Input & UI wiring** — keyboard listeners, menu/game-over buttons, procedural WebAudio menu music
4. **Pure helper functions** — geometry (`getFloorTop`, `getRunnerBounds`, `rectsOverlap`), difficulty getters (`getWorldSpeed`, `getCurrentWordPool`, `getChaserSpeed`), and slow-motion math (`getTimeScale`, `getSlowFactorForWord`)
5. **Game loop** — `gameLoop` → `update(delta)` → `draw()`, plus `gameOver()` and `resetGame()`
6. **Rendering** — `draw()` orchestrates sky, floor, meter HUD, entities, popups, and feedback flashes; `drawMeter()` / `drawObstacleWord()` handle HUD details

### Key mechanics to know

- **Time scaling:** `gameLoop` computes a `timeScale` each frame. As an untyped obstacle closes within `SLOWMO_DISTANCE` (220px), the whole world slows — longer words slow time more (down to 7% speed). This is what lets you read and type.
- **Typing target:** `pickTargetObstacle()` selects the nearest untyped obstacle within the typing window (`-50px` to `600px` ahead of the runner) and resets the buffer when the target changes.
- **Action queue:** Completing a word sets `cleared` + `awaitingJump`/`awaitingSlide` on the obstacle; `checkActionTriggers()` fires the actual jump/slide when the obstacle reaches trigger distance. The same pattern (`chaserDelay`, `chaserJumped`, `chaserSlid`) drives the chaser's obstacle avoidance.
- **Adaptive timings:** `getJumpDurationForDistance()` / `getSlideDurationForDistance()` compute airtime from the obstacle's actual distance, so animations always match the gap.
- **Hitboxes ≠ sprites:** `getRunnerBounds()` returns a dynamic box that shrinks mid-jump (`getJumpShrinkFactor()`) and flattens while sliding.

## Tech & Architecture

- **Vanilla JavaScript (ES6+)** — No frameworks, no dependencies.
- **HTML5 Canvas** — Rendering; DOM handles only the menu and game-over overlays.
- **Object-Oriented Design (Java principles in JS):**
  - `Entity`: Abstract base class defining `update()`, `draw()`, and `getBounds()`.
  - `Runner`: Extends `Entity`. Handles player input, jump/slide physics, and health-state sprite swapping.
  - `Chaser`: Extends `Entity`. Handles AI pathing, obstacle avoidance, and stagger states.
  - `Obstacle`: Extends `Entity`. Handles word-typing states, variants (jump/slide), and collision flags.

## Play

Open `index.html` in any modern browser — no build step required.

## Features to Implement

- [x] **Main Menu:** Animated menu with a "PLAY" button, scrolling road with runner/chaser sprites, and toggleable menu music (WebAudio).
- [x] **Death Screen UI:** Custom HTML/CSS game-over overlay with the loss reason, plus MAIN MENU / TRY AGAIN buttons.
- [ ] **Unlockable Maps:** Inside the "PLAY" button, add unlockable maps based on the player's highest distance/high score.
- [x] **Hatch Sequence (Endgame):** At the end of the journey, a hatch rises into view. Submit three words using three independent lockpicks to escape before the chaser catches you.
- [ ] **Obstacle Sprite Variants:** Finish implementing the broken/damaged obstacle sprites at higher distances.

## Notes for Contributors

- `spawnObstacle()` uses the fixed `spawnInterval` (4s); `getSpawnInterval()` exists but is currently unused (and references the misspelled `WORD_TIER_3_DISTAMCE`).
- Jump/slide sprite sheets only exist for health state 4 — states 1–3 intentionally fall back to `runner-jump-4` / `runner-slide-4`.
- `HIT_COOLDOWN` is `2.0` seconds despite the inline comment saying 1 second.
