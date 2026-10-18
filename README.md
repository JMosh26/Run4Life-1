# Run4Life

A typing-based endless runner. Type the words on incoming obstacles to make your runner jump or slide over them — and escape a relentless chaser behind you.

## How to Play

- Type the word shown above each obstacle.
- Correctly typed letters turn white (or yellow, depending on your current state).
- Complete the word to trigger the obstacle's action:
  - **Ground obstacle** → runner jumps over it.
  - **Floating obstacle** → runner slides under it.
- The chaser behind you stalls at cleared obstacles — but never gives up.
- Survive as long as you can.

## Health System & States

You no longer die instantly from wrong letters or obstacle hits. Instead, you have **4 lives** (states). Taking damage slows down the world, giving the chaser time to catch up to you.

| State | Lives | Speed Modifier | Sprite Sheet |
|-------|-------|----------------|--------------|
| Normal | 4 | 100% Speed | `runner-run-4` |
| Minor Injury | 3 | 10% Slower | `runner-run-3` |
| Injured | 2 | 30% Slower | `runner-run-2` |
| Critical | 1 | 60% Slower | `runner-run-1` |
| Dead | 0 | Game Over | N/A |

- **Damage Cooldown:** After taking a hit, there is a 1-second invincibility window (indicated by a white flashing box) to prevent rapid life loss.
- **Chaser Catch:** Getting caught by the chaser is an instant game over, regardless of how many lives you have left.

## Difficulty Progression

Difficulty scales with the distance traveled during the 1-minute journey.

| Distance / Time | What Changes |
|-----------------|--------------|
| 0s (Start)      | Baseline: fast world, short words |
| 10s (1500px)    | Slide obstacles unlock |
| 20s (3000px)    | Longer words, slower world, fewer spawns |
| 35s (5250px)    | Longest words, even slower world |
| 60s (9000px)    | The Escape Hatch appears |

## Tech & Architecture

- **Vanilla JavaScript (ES6+)** — No frameworks, no dependencies.
- **HTML5 Canvas** — For rendering the game loop.
- **Object-Oriented Design (Java principles in JS):**
  - `Entity`: Abstract base class defining `update()`, `draw()`, and `getBounds()`.
  - `Runner`: Extends `Entity`. Handles player input, jump/slide physics, and health-state sprite swapping.
  - `Chaser`: Extends `Entity`. Handles AI pathing, obstacle avoidance, and stagger states.
  - `Obstacle`: Extends `Entity`. Handles word-typing states, variants (jump/slide), and collision flags.

## Play

Open `index.html` in any modern browser — no build step required.

## Controls

- **Letter keys** — Type the current word.
- **Backspace** — Delete the last typed letter.
- **Escape** — Clear your typing.

## Features to Implement

- [ ] **Main Menu:** Add an animated menu containing the "PLAY" button and menu music.
- [ ] **Unlockable Maps:** Inside the "PLAY" button, add unlockable maps based on the player's highest distance/high score.
- [ ] **Hatch Sequence (Endgame):** At the end of the 60-second journey, a hatch appears. The player must type 3 words (with 3 lock-pick tries) to escape before the chaser catches them.
- [ ] **Obstacle Sprite Variants:** Finish implementing the broken/damaged obstacle sprites at higher distances.
- [ ] **Death Screen UI:** Replace the browser `alert()` with a custom canvas-drawn Game Over screen.