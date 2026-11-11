# Floating Platformers — Design Spec

_Status: **design only, not implemented.**_
_Last updated: 2026-11-11_
_Repo: `C:\Users\julz_\Desktop\Run4Life\Run4Life-1`_
_Related: `game.js` (jump physics, `Obstacle`, spawning, collisions), `README.md` §3/§7_

This document defines the floating-platformer obstacle type before implementation. It records the agreed behavior, the current physics limits, the reachability rules, and the open questions that must be answered first.

---

## 1. One-line summary

Floating platforms are randomized, sprite-based obstacles that scroll in with the world. Their **edges hurt** (lose 1 health) but their **top surface is standable**, and every platform must be **reachable with a single runner jump** from the surface before it.

---

## 2. Agreed behavior (from the brief)

1. Floating platforms are **obstacles** in the world, with their **own sprites** (variants allowed).
2. Touching a platform's **edge/side/underside** injures the runner — **−1 health** (one life), subject to the existing hit cooldown.
3. Landing **on top** of a platform lets the runner **stand and run on it** — no damage.
4. Platform placement is **randomized**, but each one must be **reachable by a jump** from the previous standable surface.
5. The player must never be placed in an impossible jump (unreachable height or gap).

---

## 3. Current mechanics baseline (measured from `game.js`)

These are the real values the platform system must fit into.

### Jump

| Constant | Value | Notes |
|---|---:|---|
| `JUMP_HEIGHT` | `150 px` | peak above the surface jumped from |
| `JUMP_DURATION` | `1.0 s` | default airtime |
| `getJumpDurationForDistance()` | `0.8–1.5 s` | clamped, stretched to cover the target obstacle |
| Jump arc | `yOffset = -4·H·t·(1−t)` | symmetric parabola, peak at `t = 0.5` |
| Trigger | typing completes the obstacle word | `triggerRunnerJump()` when the obstacle is within `JUMP_TRIGGER_DISTANCE = 200 px` |

### Runner

| Constant | Value | Notes |
|---|---:|---|
| `ENTITY_WIDTH × ENTITY_HEIGHT` | `30 × 50` | base entity |
| `RUNNER_SPRITE_SCALE` | `2.0` | drawn at `60 × 100` |
| Standing hitbox | ~`31 × 52` | `RUNNER_HITBOX_INSET = 0.52`, bottom-anchored |
| Jump hitbox | shrinks to `JUMP_HITBOX_HEIGHT = 15` | centered, smallest at the peak |
| `HIT_COOLDOWN` | `2.0 s` | invulnerability after a hit |

### World

| Constant | Value | Notes |
|---|---:|---|
| `WORLD_SPEED` | `150 px/s` | base |
| Tier 2 / 3 multipliers | `0.95` / `0.90` | from 3,000 / 5,250 px |
| Health multipliers | `1.00 / 0.90 / 0.80 / 0.70` | by remaining lives |
| Slow motion | `delta` is scaled, movement and jump use the same scaled `delta` | relative reach is preserved |
| Floor | `getGroundY() = canvas.height * 0.75`, `getFloorTop()` = ground + 25 | platform heights measured from `getFloorTop()` |

### Collision

- Everything currently uses AABB overlap: `rectsOverlap(a, b)`.
- Ground obstacles are `type: 'jump'`; overhead barriers are `type: 'slide'`.
- There is **no gravity, no landing, and no persistent vertical physics** today. The jump is a fixed-duration visual arc (`runner.jump.yOffset`) that returns to the ground automatically.

> **Implementation consequence:** "standing on top" is not possible with the current jump model alone. The platform system needs either a lightweight vertical physics state (gravity + landing) or a controlled "snap/ride the platform top" mode. This is the biggest decision in the spec — see §8.

---

## 4. Reachability model

Reachability must be computed from the **current** world speed and the **current** jump parameters, not from base-speed assumptions, because health and tier reduce speed (which reduces horizontal reach but does not change jump height).

### 4.1 Vertical reach

- Peak clearance from the surface jumped from: **150 px** (`JUMP_HEIGHT`).
- The runner hitbox shrinks during the jump, so the practical safe landing window is narrower than the raw peak.
- **Proposed rule:** platform top must be at most **`H` = 110 px above** the surface the runner jumps from.
  - Leaves ~40 px of margin below the 150 px peak for timing and hitbox.
  - Platforms lower than the launch surface are always fine.
- If the platform is approached from another platform, the same 110 px rule applies relative to **that platform's top**, not the floor.

### 4.2 Horizontal reach

Horizontal reach = `worldSpeed × airtime`.

- Worst case at tier 3 + critical health: `150 × 0.90 × 0.70 = 94.5 px/s`.
- With a 1.0 s jump: **~94.5 px** of horizontal travel.
- With the stretched 1.5 s jump: **~142 px**.

**Proposed rule:** at spawn time, compute `maxGap = getWorldSpeed() * SAFE_AIRTIME` with `SAFE_AIRTIME = 0.9 s` (not the maximum 1.5 s), and never place a platform whose **near edge** is farther than `maxGap` from the previous standable edge.

At base speed that gives ~135 px; at worst case ~85 px. This keeps jumps comfortable rather than frame-perfect.

### 4.3 Reachability invariant

A spawn is valid only if **all** of these hold:

```
platformTopY  >= launchTopY - MAX_STEP_UP        // not too high (MAX_STEP_UP = 110)
platformTopY  <= launchTopY + MAX_STEP_DOWN      // not absurdly low (e.g. 180)
nearEdgeX     <= launchEdgeX + maxGap            // horizontally reachable
platform does not overlap ground obstacles / other platforms / hatch marker
```

If a random candidate fails any check, re-roll or skip that spawn. **Never** clamp an unreachable platform into place.

---

## 5. Collision semantics

Each platform has one **solid top** and hazard sides.

| Contact | Result |
|---|---|
| Runner's feet land on the top surface (descending, feet within top band) | **Stand on platform** — no damage, `groundedOn = platform` |
| Runner body overlaps the left/right side while airborne or grounded | **−1 health** (respect `HIT_COOLDOWN`), knock back / bounce off |
| Runner hits the underside while rising | **−1 health** (or bounce down — see open questions) |
| Runner is standing on top when the platform scrolls past | Runner leaves the platform and falls / resumes normal ground (see §6) |
| Platform scrolls off-screen with the runner still on it | Do not drag the runner off-screen; release the runner at the screen edge |

Additional rules:

- The existing `HIT_COOLDOWN` (2 s) prevents rapid repeated damage from the same edge.
- The hatch sequence clears obstacles; platforms must be cleared too (they are not standable during the hatch UI).
- A platform edge hit should reuse `loseLife()` so health, speed penalty, flash, and shake stay consistent.

---

## 6. "Run on top" behavior

The runner is fixed at a screen X; the world scrolls left. So a platform under the runner moves left relative to them.

Options:

1. **Ride model (recommended for clarity):** while grounded on a platform, the runner's feet are pinned to the platform top, and the platform carries them left until its right edge passes the runner; then they fall back to the floor (or the next platform).
2. **Chase model:** the runner moves right along the platform at the platform's scroll speed so they appear to run across it. This changes the camera/runner X logic and is more invasive.
3. **Short-hop model:** landing is brief and automatic; the runner is nudged off after a fixed time.

The doc assumes **Option 1** unless told otherwise. The runner must not be carried off the left edge of the screen.

---

## 7. Randomization and spawning

Proposed spawn rules:

- Add a platform pool (`PLATFORM_VARIANTS`) with sprite, width, height, weight, and optional per-variant height range.
- Unlock platforms after a distance threshold (suggest `PLATFORM_UNLOCK_DISTANCE = 3,000 px`, tunable).
- Separate spawn interval or a chance roll on the existing spawner (e.g. 15–25% of spawns once unlocked).
- **Max 1–2 platforms on screen** at once to start.
- Every spawn validates the §4.3 reachability invariant against the last standable surface.
- Do **not** spawn a platform over a ground obstacle, the hatch marker, or another platform.
- Respect the hatch clearance zone (`HATCH_OBSTACLE_CLEARANCE`).
- Randomize variant, width, and height within reachable bounds; do not randomize into impossible jumps.
- Use a seeded/consistent launch reference: the last platform top if one is active, otherwise the floor.

Open: whether platforms move vertically (bobbing), horizontally at a different speed, or stay static relative to the world. The spec currently assumes **static relative to the world** (they only scroll left).

---

## 8. Open design decisions

These must be answered before coding:

1. **Jump model:** add real gravity/landing physics, or a simpler platform-snap mode on top of the existing arc? (Recommend: lightweight vertical state only while a platform is involved, to avoid rewriting every obstacle interaction.)
2. **How the player jumps onto a platform:** the game has no manual jump key today — jumps fire when a word is typed. Does a platform have a word above it like other obstacles, or does it need a new jump input?
3. **Platform motion:** static, bobbing, or moving horizontally?
4. **Ride vs chase** behavior for "run on top" (§6).
5. **Underside contact:** damage, bounce, or ignore?
6. **Chaser interaction:** does the chaser also jump onto/avoid platforms, or ignore them?
7. **Typing target:** are platforms valid typing targets, and do they count for slow-mo?
8. **Spawn budget:** unlock distance, frequency, and max simultaneous platforms.

---

## 9. Proposed data model

```js
const PLATFORM_VARIANTS = [
  // { src, sx, sy, sw, sh, width, height, weight }
  // Filled in once sprites are supplied.
];

const PLATFORM_UNLOCK_DISTANCE = 3000;
const PLATFORM_SPAWN_CHANCE = 0.2;      // share of spawns after unlock
const PLATFORM_MAX_ON_SCREEN = 2;
const PLATFORM_MAX_STEP_UP = 110;       // px above launch surface
const PLATFORM_MAX_STEP_DOWN = 180;     // px below launch surface
const PLATFORM_SAFE_AIRTIME = 0.9;      // seconds used for gap reachability
const PLATFORM_MIN_GAP = 20;            // px between platform and other hazards
```

Platform object (extend `Obstacle` or add a new class):

```js
{
  type: 'platform',
  x, y, width, height,        // AABB for the solid block
  topY,                       // y of the standable surface
  variantIndex,
  word,                       // only if platforms are typed
  grounded,                   // runner currently on top?
}
```

---

## 10. Integration points in `game.js`

| Area | Change |
|---|---|
| `PLATFORM_VARIANTS` + constants | new config block near the obstacle constants |
| `spawnObstacle()` | chance roll + reachability validation + no-overlap checks |
| `Obstacle` / new `Platform` class | draw sprite; expose top surface and edge hitboxes |
| `getRunnerBounds()` / collision loop | distinguish top landing from side damage |
| `updateJump()` / runner vertical state | support landing on and leaving a platform |
| `checkActionTriggers()` | trigger the jump onto a platform (if typing-driven) |
| `pickTargetObstacle()` | include/exclude platforms based on the chosen design |
| `getTimeScale()` | include/exclude platforms based on the chosen design |
| `draw()` | draw platforms with the other obstacles, plus any landing shadow |
| `resetGame()` | clear platform state and ride flags |
| `startHatchSequence()` | clear platforms with the other obstacles |

---

## 11. What I need from you before implementation

1. **Sprites**
   - File paths and how many variants.
   - Native dimensions and opaque crop boxes (`sx, sy, sw, sh`).
   - Anchor point (top-left or center-top).
   - Whether the art includes a distinct "safe top" vs "hazard edge", or whether I should draw the hazard edges.
2. **Platform size**
   - Width range and height range (on-screen px).
   - Fixed per variant or randomized within a range?
3. **Motion**
   - Static (scrolls with the world), bobbing vertically, or moving horizontally?
   - If moving, amplitude and speed limits.
4. **Jump control**
   - Do platforms have a word to type (like obstacles), or do you want a **manual jump key**?
   - If manual: which key, and does it replace or supplement typing-driven jumps?
5. **"Run on top" model**
   - Ride model, chase model, or short-hop model (§6)?
   - How long should the runner be able to stay on a platform?
6. **Damage rules**
   - Confirm: side/edge = −1 health, top = safe.
   - Underside contact: damage, bounce, or ignore?
   - Should edge damage respect the existing 2 s hit cooldown? (Recommend yes.)
7. **Chaser**
   - Should the chaser jump onto/avoid platforms, or ignore them entirely?
8. **Typing / slow-mo**
   - Are platforms typing targets?
   - Do they trigger slow motion like other obstacles?
9. **Spawn tuning**
   - Unlock distance, spawn chance/frequency, and max platforms on screen.
   - Should they appear before the hatch only, or throughout?
10. **Feedback**
    - Landing SFX / dust effect?
    - A visual cue for "safe top" vs "hazard edge"?
11. **Reachability acceptance**
    - Confirm `MAX_STEP_UP = 110 px` and `SAFE_AIRTIME = 0.9 s` are acceptable, or give your preferred difficulty.

---

## 12. Acceptance criteria

- [ ] Platforms spawn randomly but every spawn passes the reachability invariant.
- [ ] A single jump from the previous surface can land on the platform at base speed and at worst-case speed (tier 3 + critical health).
- [ ] Landing on top causes no damage and lets the runner stand/run on it.
- [ ] Touching an edge costs exactly 1 health, respecting the hit cooldown.
- [ ] Platforms never overlap ground obstacles, other platforms, or the hatch marker.
- [ ] Platforms are cleared on reset and on hatch start.
- [ ] No impossible jump can be generated.
- [ ] `node --check game.js` passes.

---

## 13. Out of scope (for the first pass)

- Moving/oscillating platforms (unless requested).
- Platform-to-platform physics chains longer than one jump.
- Manual jump/double-jump systems (unless requested).
- Platform-specific audio/music.
- Touch/gamepad support.
