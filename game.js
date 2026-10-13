
//CANVAS AND PLAY ASPECT RATIO
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;
const inputEl = document.getElementById('input');  
const PLAY_ASPECT = 16 / 9;     // width / height → portrait
const PLAY_MAX_HEIGHT = 0.9;    // 90% of window height
const PLAY_MAX_WIDTH = 0.6; 

//Running Sprite
const runSheet = new Image();
runSheet.src = 'sprites/runner-run.png';
const RUN_FRAMES = 10;
const RUN_FRAME_W = 120;
const RUN_FRAME_H = 200;

//Jumping Sprite
const jumpSheet = new Image();
jumpSheet.src = 'sprites/runner-jump.png';
const JUMP_FRAMES = 10;
const JUMP_FRAME_W = 120;
const JUMP_FRAME_H = 200;

//Text BG 
const wordBgImage = new Image();
wordBgImage.src = 'sprites/word-bg.png';

//Sliding Sprite
const slideSheet = new Image();
slideSheet.src = 'sprites/runner-slide.png';
const SLIDE_FRAMES = 14;
const SLIDE_FRAME_W = 200;
const SLIDE_FRAME_H = 200;

// Journey
const JOURNEY_DURATION = 120;                     // seconds
const JOURNEY_DISTANCE = JOURNEY_DURATION * 150;  // 18000px

// Meter (horizontal bar at the top of the screen)
const METER_MARGIN_TOP = 30;
const METER_MARGIN_X = 60;
const METER_HEIGHT = 12;
const METER_MARKER_WIDTH = 12;
const METER_MARKER_HEIGHT = 24;

// Hatch — position relative to the runner's start
const HATCH_OFFSET_FROM_RUNNER = JOURNEY_DISTANCE;

//Obstacle Variants (1 - Barrier 2 - Stop sign 3 - Cone)
const OBSTACLE_VARIANTS = [
  {
    name: 'barrier',
    width: 80,
    height: 60,
    sprites: ['sprites/obstacle-1.png'],
  },
  {
    name: 'stop-sign',
    width: 50,
    height: 50,
    sprites: ['sprites/obstacle-2.png'],
  },
  {
    name: 'cone',
    width: 40,
    height: 40,
    sprites: ['sprites/obstacle-3.png'],
  },
];

OBSTACLE_VARIANTS.forEach(variant => {
  variant.images = variant.sprites.map(src => {
    const img = new Image();
    img.src = src;
    return img;
  });
});

//Runner Animation Initializing
const runnerAnim = {
  frame: 0,
  timer: 0,
  fps: 10,
};



//SLOW MOTION, JUMPING AND SLIDING 
const SLOWMO_DISTANCE = 220;    // how close an obstacle must be to trigger slow-mo
const SLOWMO_FACTOR = 0.1;     // 0.35 = 35% speed. Lower = slower
const JUMP_DURATION = 1;      // seconds in the air
const JUMP_HEIGHT = 150;         // peak pixels above the ground
const CHASER_JUMP_DELAY = 0.25; // chaser starts its jump later
const JUMP_TRIGGER_DISTANCE = 200;  // jump when obstacle is this far from runner
const JUMP_SAFE_MARGIN = 40;         // extra leeway — jump still works if closer
const SLIDE_TRIGGER_DISTANCE = 180;   // start here; tune later
const SLIDE_DURATION = 0.8;           // how long the slide lasts
const SLIDE_HEIGHT = 20;
const SLIDE_WIDTH = 50;
const CHASER_STOP_DISTANCE = 130;      // chaser never gets closer than this to a pending obstacle
const CHASER_JUMP_CUE = 50;           // when the obstacle is this close, jump
const CHASER_JUMP_DURATION = 0.8;

//CHASER STAGGER
const CHASER_STAGGER_DURATION = 1.2; // how long the slowdown lasts
const CHASER_STAGGER_FACTOR = 0.1;   // 0.1 = chaser moves at 10% speed
const CHASER_BLOCK_DRIFT = 0.7;   // 0.6 = drifts at 60% of floor speed when blocked

//WORLD SPEED
const WORLD_SPEED = 150;

//DEFAULT ENTITY SIZE
const ENTITY_WIDTH = 30;
const ENTITY_HEIGHT = 50; 

//JUMP HITBOX
const JUMP_HITBOX_HEIGHT = 15;   

//FLOOR 
const FLOOR_HEIGHT = 150;      // how thick the floor band is
const FLOOR_OFFSET = 0;      // gap between entity feet and floor top

//SCORING SYSTEM
const SCORE_PER_PIXEL = 0.05;      // distance points per pixel scrolled
const SCORE_PER_WORD = 100;        // bonus for each typed word
const SCORE_LENGTH_BONUS = 10;     // extra per letter in the word
const WORD_TIER_2_SCORE = 2000;
const WORD_TIER_3_SCORE = 3000;
const WORLD_SPEED_TIER_2 = 0.95;   // 5% slower at tier 2
const WORLD_SPEED_TIER_3 = 0.90;   // 10% slower at tier 3
const SPAWN_INTERVAL_TIER_2 = 3.0; // was 2.5
const SPAWN_INTERVAL_TIER_3 = 3.5; // even more space at tier 3

//SLIDE OBSTACLE
const SLIDE_OBSTACLE_WIDTH = 50;
const SLIDE_OBSTACLE_HEIGHT = 120;
const SLIDE_OBSTACLE_GAP = 30;   // clearance between floor and block bottom
const SLIDE_UNLOCK_SCORE = 1000;
const SLIDE_CHANCE_AFTER_UNLOCK = 0.5; 


//Wrong letter feedback
let wrongFlashTime = 0;     // seconds remaining on the red flash
let shakeTime = 0;          // seconds remaining on the camera shake
const WRONG_FLASH_DURATION = 0.2;
const SHAKE_DURATION = 0.25;
const SHAKE_INTENSITY = 8;  // pixels of offset at peak

let floorScroll = 0;      

let chaserStaggerTime = 0;          // seconds remaining on the stagger

let lastTime = 0;
let spawnTimer = 0;
const spawnInterval = 4;
let rafId;

let targetedObstacle = null;
let currentTyped ='';
let nextObstacleId = 0; 
let score = 0;
let distanceScore = 0;      // accumulates over time (as a float)
let lastHudUpdate = 0;      // for throttling HUD redraws

//Distance Travelled
let distanceTraveled = 0;
//Hatch Position
let hatchX = null;   // set later, when the hatch spawns



// const runner = {
//   x: canvas.width / 2 - ENTITY_WIDTH / 2,
//   y: canvas.height / 2 - ENTITY_HEIGHT / 2,
//   width: ENTITY_WIDTH,
//   height: ENTITY_HEIGHT,
// };
const runner = {
  x: 0, y: 0,
  width: ENTITY_WIDTH,
  height: ENTITY_HEIGHT,
};
// const chaser = {
//   x: -ENTITY_WIDTH / 2,   // half off the left edge
//   y: canvas.height / 2 - ENTITY_HEIGHT / 2,
//   width: ENTITY_WIDTH,
//   height: ENTITY_HEIGHT,
// };
const chaser = {
  x: -ENTITY_WIDTH / 2,
  y: 0,
  width: ENTITY_WIDTH,
  height: ENTITY_HEIGHT,
};
const runnerJump = {
  active: false,
  time: 0,          // elapsed since jump started
  duration: JUMP_DURATION,
  height: JUMP_HEIGHT,
  yOffset: 0,       // current vertical offset from ground
};
const chaserJump = {
  active: false,
  time: 0,
  duration: JUMP_DURATION,
  height: JUMP_HEIGHT,
  yOffset: 0,
  targetId: null,
};
const runnerSlide = {
  active: false,
  time: 0,
  duration: SLIDE_DURATION,
  height: ENTITY_HEIGHT,
  width: ENTITY_WIDTH,
};

const chaserSlide = {
  active: false,
  time: 0,
  duration: SLIDE_DURATION,
  height: ENTITY_HEIGHT,
  width: ENTITY_WIDTH,
  targetId: null,
};

const WORD_POOLS = {
  easy: [
    'run', 'jump', 'duck', 'fire', 'dash', 'leap', 'dodge', 'slide',
    'hide', 'fast', 'move', 'stop', 'left', 'flip', 'spin', 'roll',
    'kirk', 'speed', 'cisco', 'ball', 'data', 'sort'
  ],
  medium: [
    'running', 'jumping', 'ducking', 'firefly', 'dashing', 'leaping',
    'dodging', 'sliding', 'hiding', 'faster', 'moving', 'stopping',
    'lifting', 'flipping', 'spinning', 'rolling', 'sigma', 'awesome',
    'knowledge'
  ],
  hard: [
    'sprinting', 'stumbling', 'dangerous', 'escalated', 'mysteries',
    'overboard', 'trembling', 'frightened', 'accelerate', 'overcoming',
    'synchronize', 'bewildered', 'complicated', 'transcended', 'unshaken',
    'relentless', 'illuminated', 'disasterous', 'uncovering', 'persistent',
    'networking', 'algorithm'
  ],
};

const obstacles = [];      

const scorePopups = [];



window.addEventListener('keydown', (e) => {
  // Only care about single-character keys (letters, numbers)
  if (e.key.length !== 1) return;

  // Prevent default for spacebar (it scrolls the page)
  if (e.key === ' ') e.preventDefault();

  currentTyped += e.key.toLowerCase();

  checkTypedMatch();
});

window.addEventListener('keydown', (e) => {
  if (e.key === 'Backspace') {
    currentTyped = currentTyped.slice(0, -1);
    e.preventDefault();
  }
  if (e.key === 'Escape') {
    currentTyped = '';
  }
});

function getEntityY() {
  return getGroundY() - ENTITY_HEIGHT / 2;
}

function getFloorTop() {
  return getGroundY() + ENTITY_HEIGHT / 2 + FLOOR_OFFSET;
}

function getGroundY() {
  return canvas.height * 0.75;
}

function getWorldSpeed() {
  const total = getTotalScore();
  if (total >= WORD_TIER_3_SCORE) return WORLD_SPEED * WORLD_SPEED_TIER_3;
  if (total >= WORD_TIER_2_SCORE) return WORLD_SPEED * WORLD_SPEED_TIER_2;
  return WORLD_SPEED;
}

function getSpawnInterval() {
  const total = getTotalScore();
  if (total >= WORD_TIER_3_SCORE) return SPAWN_INTERVAL_TIER_3;
  if (total >= WORD_TIER_2_SCORE) return SPAWN_INTERVAL_TIER_2;
  return spawnInterval;
}

function getRunnerWorldX() {
  return runnerStartX + distanceTraveled;
}

function getHatchWorldX() {
  return runnerStartX + JOURNEY_DISTANCE;
}



function gameLoop(timestamp) {
  let delta = (timestamp - lastTime) / 1000;
  lastTime = timestamp;

  // Clamp delta to prevent tab-switch teleport
  if (delta > 0.1) delta = 0.1;

  // Apply slow-motion scaling
  const timeScale = getTimeScale();
  const scaledDelta = delta * timeScale;

  update(scaledDelta);
  draw();

  rafId = requestAnimationFrame(gameLoop);
}
function getTimeScale() {
  if (obstacles.length === 0) return 1;

  const runnerCenterX = runner.x + runner.width / 2;
  let minScale = 1;

  for (const o of obstacles) {
    if (o.cleared) continue; //Remove if prefer slow-mo after clearing obstacle
    const obstacleCenterX = o.x + o.width / 2;
    const distance = obstacleCenterX - runnerCenterX;

    if (distance > 0 && distance < SLOWMO_DISTANCE) {
      // Closer = slower
      const t = distance / SLOWMO_DISTANCE;         // 1 → 0 as it approaches
      const scale = SLOWMO_FACTOR + (1 - SLOWMO_FACTOR) * t;
      minScale = Math.min(minScale, scale);
    }
  }

  return minScale;
}
function worldToMeterX(worldX) {
  const start = getMeterStartX();
  const end = getMeterEndX();
  const progress = Math.max(0, Math.min((worldX - start) / (end - start), 1));

  const meterLeft = METER_MARGIN_X;
  const meterWidth = canvas.width - METER_MARGIN_X * 2;

  return meterLeft + progress * meterWidth;
}
function getMeterStartX() {
  // The chaser's starting world X
  return -ENTITY_WIDTH / 2;
}

function getMeterEndX() {
  // The hatch's world X — but only known once the hatch spawns
  // Before the hatch spawns, use the "goal" position
  if (hatchX !== null) return hatchX;

  // Goal position = runner's starting X + JOURNEY_DISTANCE
  return runnerStartX + JOURNEY_DISTANCE;
}
function getJumpShrinkFactor() {
  if (!runnerJump.active) return 1;

  const t = runnerJump.time / runnerJump.duration;
  const easeIn = Math.min(t * 5, 1);
  const easeOut = Math.min((1 - t) * 5, 1);
  const phase = Math.min(easeIn, easeOut);
  const factor = 1 - (1 - JUMP_HITBOX_HEIGHT / ENTITY_HEIGHT) * phase;

  console.log('t:', t.toFixed(2), '| phase:', phase.toFixed(2), '| factor:', factor.toFixed(2));
  return factor;
}

function getRunnerBounds() {
  const SPRITE_SCALE = 1.3;
  const SLIDE_STRETCH_X = 1.4;   // must match your draw code
  const HITBOX_INSET = 0.8;      // hitbox is 80% of sprite size

  // Compute sprite footprint (mirrors the draw code exactly)
  const isSliding = runnerSlide.active;

    // const spriteW = ENTITY_WIDTH * SPRITE_SCALE * (isSliding ? SLIDE_STRETCH_X : 1);
    // const spriteH = ENTITY_HEIGHT * SPRITE_SCALE;
  const spriteW = (isSliding ? runnerSlide.width : ENTITY_WIDTH) * SPRITE_SCALE;
  const spriteH = (isSliding ? runnerSlide.height : ENTITY_HEIGHT) * SPRITE_SCALE;
  const spriteX = runner.x + (runner.width - spriteW) / 2;
  const spriteY = runner.y + runner.height - spriteH + runnerJump.yOffset;

  // Slide — return the sprite footprint, or a slightly inset version
  if (isSliding) {
    const w = runnerSlide.width;
    const h = runnerSlide.height;
    return {
      x: runner.x - (w - runner.width) / 2,
      y: runner.y + (runner.height - h),
      width: w,
      height: h,
    };
  }

  // Jump — shrink toward a cube at the peak
  if (runnerJump.active) {
    const factor = getJumpShrinkFactor();
    const w = spriteW * HITBOX_INSET * factor;
    const h = spriteH * HITBOX_INSET * factor;
    return {
      x: spriteX + (spriteW - w) / 2,
      y: spriteY + (spriteH - h) / 2,   // ← center vertically instead of bottom
      width: w,
      height: h,
    };
    
  }

  // Standing
  const w = spriteW * HITBOX_INSET;
  const h = spriteH * HITBOX_INSET;
  return {
    x: spriteX + (spriteW - w) / 2,
    y: spriteY + (spriteH - h),
    width: w,
    height: h,
  };
}




function getChaserBounds() {
  if (chaserSlide.active) {
    const h = chaserSlide.height;
    const w = chaserSlide.width;
    return {
      x: chaser.x - (w - chaser.width) / 2,
      y: chaser.y + (chaser.height - h),
      width: w,
      height: h,
    };
  }
  if (chaserJump.active) {
    return {
      x: chaser.x,
      y: chaser.y + chaserJump.yOffset,
      width: chaser.width,
      height: chaser.height,
    };
  }
  return {
    x: chaser.x,
    y: chaser.y,
    width: chaser.width,
    height: chaser.height,
  };
}
function pickTargetObstacle() {
  if (obstacles.length === 0) {
    targetedObstacle = null;
    currentTyped = '';
    return;
  }

  // Find the closest obstacle that hasn't been cleared yet
  let closest = null;
  for (const o of obstacles) {
    if (o.cleared) continue;
    if (!closest || o.x < closest.x) closest = o;
  }

  // No uncleared obstacles → clear target
  if (!closest) {
    targetedObstacle = null;
    currentTyped = '';
    return;
  }

  // If the target changed, reset typing
  if (targetedObstacle !== closest) {
    targetedObstacle = closest;
    currentTyped = '';
  }
}

function getTotalScore() {
  return Math.floor(score + distanceScore);
}

function getCurrentWordPool() {
  const total = getTotalScore();
  if (total >= WORD_TIER_3_SCORE) return WORD_POOLS.hard;
  if (total >= WORD_TIER_2_SCORE) return WORD_POOLS.medium;
  return WORD_POOLS.easy;
}

function drawScore() {
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 20px monospace';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'top';
  ctx.fillText('SCORE: ' + getTotalScore(), canvas.width - 20, 20);
}
function getSlideDurationForDistance() {
  if (obstacles.length === 0) return SLIDE_DURATION;

  const runnerCenterX = runner.x + runner.width / 2;
  let minDist = Infinity;
  let closest = null;

  for (const o of obstacles) {
    if (!o.awaitingSlide && !o.cleared) continue;
    const obstacleCenterX = o.x + o.width / 2;
    const d = obstacleCenterX - runnerCenterX;
    if (d > 0 && d < minDist) {
      minDist = d;
      closest = o;
    }
  }

  if (!closest) return SLIDE_DURATION;

  const speed = getWorldSpeed();                    // ← define once
  const timeToReach = minDist / speed;
  const timeToPass = (closest.width + runner.width) / speed;   // ← use `speed`
  const airtime = timeToReach + timeToPass;

  return Math.max(0.6, Math.min(airtime, 1.8));
}

function checkActionTriggers() {
  if (runnerJump.active || runnerSlide.active) return;

  const runnerCenterX = runner.x + runner.width / 2;

  for (const o of obstacles) {
    const obstacleCenterX = o.x + o.width / 2;
    const distance = obstacleCenterX - runnerCenterX;

    // Jump trigger
    if (o.awaitingJump && distance <= JUMP_TRIGGER_DISTANCE) {
      triggerRunnerJump();
      o.awaitingJump = false;
      return;
    }

    // Slide trigger
    if (o.awaitingSlide && distance <= SLIDE_TRIGGER_DISTANCE) {
      triggerRunnerSlide();
      o.awaitingSlide = false;
      return;
    }
  }
}
function checkChaserAction() {
  if (chaserJump.active || chaserSlide.active) return;

  const chaserCX = chaser.x + chaser.width / 2;

  for (const o of obstacles) {
    if (!o.chaserDelay) continue;
    if (o.chaserJumped || o.chaserSlid) continue;

    const obstacleCenterX = o.x + o.width / 2;
    const gap = obstacleCenterX - chaserCX;

    if (gap > 0 && gap < CHASER_JUMP_CUE) {
      if (o.type === 'slide') {
        chaserSlide.active = true;
        chaserSlide.time = 0;
        chaserSlide.duration = CHASER_JUMP_DURATION;
        chaserSlide.targetId = o.id;
        o.chaserSlid = true;
      } else {
        chaserJump.active = true;
        chaserJump.time = 0;
        chaserJump.duration = CHASER_JUMP_DURATION;
        chaserJump.targetId = o.id;
        o.chaserJumped = true;
      }
      return;
    }
  }
}
function getJumpDurationForDistance() {
  if (obstacles.length === 0) return JUMP_DURATION;

  const runnerCenterX = runner.x + runner.width / 2;
  let minDist = Infinity;

  for (const o of obstacles) {
    if (!o.awaitingJump && !o.cleared) continue;
    const obstacleCenterX = o.x + o.width / 2;
    const d = obstacleCenterX - runnerCenterX;
    if (d > 0 && d < minDist) minDist = d;
  }

  if (minDist === Infinity) return JUMP_DURATION;

  // Time for the obstacle to reach and pass the runner
  const speed = getWorldSpeed();
  const timeToReach = minDist / speed;
  const timeToPass = (runner.width + 40) / speed;
  const airtime = timeToReach + timeToPass;

  return Math.max(0.8, Math.min(airtime, 1.5));   // clamp
}
function triggerRunnerJump() {
  runnerJump.active = true;
  runnerJump.time = 0;
  runnerJump.duration = getJumpDurationForDistance();

  runnerAnim.frame = 0;   // ← start from frame 0
  runnerAnim.timer = 0;
}
function triggerRunnerSlide() {
  runnerSlide.active = true;
  runnerSlide.time = 0;
  runnerSlide.duration = getSlideDurationForDistance();

  runnerAnim.frame = 0;
  runnerAnim.timer = 0;
}
function checkTypedMatch() {
  if (!targetedObstacle) {
    currentTyped = '';
    return;
  }

  const word = targetedObstacle.word;

  // If typed text is not a prefix of the word, reset it
  if (!word.startsWith(currentTyped)) {
    currentTyped = currentTyped.slice(0, -1);

    // Wrong letter feedback
    wrongFlashTime = WRONG_FLASH_DURATION;
    shakeTime = SHAKE_DURATION;
    return;
  }

  // Full match → resolve the obstacle
  if (currentTyped === word) {
    targetedObstacle.cleared = true;
    targetedObstacle.chaserDelay = true;

    // Choose action based on obstacle type
    if (targetedObstacle.type === 'slide') {
      targetedObstacle.awaitingSlide = true;
    } else {
      targetedObstacle.awaitingJump = true;
    }

    // Score bonus
    const lengthBonus = word.length * SCORE_LENGTH_BONUS;
    score += SCORE_PER_WORD + lengthBonus;

    scorePopups.push({
      x: targetedObstacle.x + targetedObstacle.width / 2,
      y: targetedObstacle.y - 20,
      text: '+' + (SCORE_PER_WORD + lengthBonus),
      life: 0.8,
      maxLife: 0.8,
    });

    currentTyped = '';
  }
}
function drawObstacleWord(o) {
  if (o.cleared) return;

  const isTarget = (o === targetedObstacle);
  const typed = isTarget ? currentTyped : '';
  const word = o.word.toUpperCase();

  const FONT_SIZE = 23;
  const LETTER_KERN = 2;
  const FONT = `${FONT_SIZE}px Symtext`;

  ctx.font = FONT;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';

  const widths = word.split('').map(ch => ctx.measureText(ch).width);
  const textWidth = widths.reduce((a, b) => a + b, 0) - LETTER_KERN * (word.length - 1);

  // Background
  const PAD_X = 14;
  const PAD_Y = 8;

  const boxW = textWidth + PAD_X * 2;
  const boxH = FONT_SIZE + PAD_Y * 2;

  const boxX = o.x + o.width / 2 - boxW / 2;
  const boxY = o.y - 30 - boxH / 2;

  if (wordBgImage.complete && wordBgImage.naturalWidth > 0) {
    ctx.drawImage(wordBgImage, boxX, boxY, boxW, boxH);
  } else {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
    roundRect(ctx, boxX, boxY, boxW, boxH, 4);
    ctx.fill();
  }

  // Letters
  let drawX = o.x + o.width / 2 - textWidth / 2;
  const drawY = boxY + boxH / 2;

  for (let i = 0; i < word.length; i++) {
    ctx.fillStyle = i < typed.length ? '#ffffff' : '#636363';
    ctx.fillText(word[i], drawX, drawY);
    drawX += widths[i] - LETTER_KERN;
  }
}

function updateJump(jump, delta) {
  if (!jump.active) return;

  jump.time += delta;

  if (jump.time >= jump.duration) {
    jump.active = false;
    jump.time = 0;
    jump.yOffset = 0;
    if (jump === chaserJump) jump.targetId = null; 

    if (jump === runnerJump) {
      runnerAnim.frame = runnerAnim.frame % RUN_FRAMES;
      runnerAnim.timer = 0;
    }
    return;
  }

  // Parabolic arc: peak at duration/2
  const t = jump.time / jump.duration;         // 0 → 1
  jump.yOffset = -4 * jump.height * t * (1 - t); // classic parabola

}
function updateSlide(slide, entity, delta) {
  if (!slide.active) return;

  slide.time += delta;

  if (slide.time >= slide.duration) {
    slide.active = false;
    slide.time = 0;
    slide.height = entity.height;
    slide.width = entity.width;
    if (slide === chaserSlide) slide.targetId = null;

    if (slide === runnerSlide) {
      runnerAnim.frame = runnerAnim.frame % RUN_FRAMES;
      runnerAnim.timer = 0;
    }
    return;
  }

  const t = slide.time / slide.duration;
  const easeIn = Math.min(t * 5, 1);
  const easeOut = Math.min((1 - t) * 5, 1);
  const phase = Math.min(easeIn, easeOut);

  slide.height = entity.height + (SLIDE_HEIGHT - entity.height) * phase;
  slide.width = entity.width + (SLIDE_WIDTH - entity.width) * phase;
}

function update(delta) {
  const worldSpeed = getWorldSpeed();   // compute once per frame 
  distanceTraveled += worldSpeed * delta;

  //Countdown for wrong letter
  if (wrongFlashTime > 0) wrongFlashTime -= delta;
  if (shakeTime > 0) shakeTime -= delta;

  const activeFrameCount = runnerJump.active ? JUMP_FRAMES
                       : runnerSlide.active ? SLIDE_FRAMES
                       : RUN_FRAMES;

  const activeFps = runnerJump.active
                  ? JUMP_FRAMES / runnerJump.duration
                  : runnerSlide.active
                    ? SLIDE_FRAMES / runnerSlide.duration
                    : runnerAnim.fps;

  runnerAnim.timer += delta;
  if (runnerAnim.timer >= 1 / activeFps) {
    runnerAnim.timer = 0;
    runnerAnim.frame = (runnerAnim.frame + 1) % activeFrameCount;
  }
    // --- Chaser movement ---
  const runnerCX = runner.x + runner.width / 2;
  const runnerCY = runner.y + runner.height / 2;
  const chaserCX = chaser.x + chaser.width / 2;
  const chaserCY = chaser.y + chaser.height / 2;

  const dx = runnerCX - chaserCX;
  const dy = runnerCY - chaserCY;
  const dist = Math.hypot(dx, dy);


  let blockedByObstacle = false;
  for (const o of obstacles) {
    if (!o.chaserDelay) continue;      // only paused for player-typed obstacles
    if (o.chaserJumped) continue;      // already jumped → no longer blocks

    const obstacleCenterX = o.x + o.width / 2;
    const gap = obstacleCenterX - chaserCX;

    if (gap > 0 && gap < CHASER_STOP_DISTANCE) {
      // Only block if the chaser hasn't jumped this one yet
      if (!chaserJump.targetId || chaserJump.targetId !== o.id) {
        blockedByObstacle = true;
        break;
      }
    }
  }

let chaserSpeed = 30;
if (chaserStaggerTime > 0) {
  chaserSpeed *= CHASER_STAGGER_FACTOR;
}

if (blockedByObstacle) {
  // Slide with the floor — appears stationary relative to the ground
  chaser.x -= worldSpeed * delta * CHASER_BLOCK_DRIFT;
} else if (dist > 1) {
  chaser.x += (dx / dist) * chaserSpeed * delta;
  chaser.y += (dy / dist) * chaserSpeed * delta;
}


  // --- Floor scroll ---
  floorScroll -= getWorldSpeed() * delta;
  if (floorScroll <= -80) floorScroll = 0;

  // --- Distance score ---
  distanceScore += worldSpeed * delta * SCORE_PER_PIXEL;

  for (let i = scorePopups.length - 1; i >= 0; i--) {
  scorePopups[i].life -= delta;
  scorePopups[i].y -= 40 * delta;   // drift upward
  if (scorePopups[i].life <= 0) scorePopups.splice(i, 1);
  }

  // --- Move obstacles ---

  obstacles.forEach(o => o.x -= worldSpeed * delta);

  // --- Remove off-screen obstacles ---
  for (let i = obstacles.length - 1; i >= 0; i--) {
    if (obstacles[i].x + obstacles[i].width < 0) obstacles.splice(i, 1);
  }

  // --- Choose typing target ---
  pickTargetObstacle();

  // --- Spawn timer ---
  spawnTimer += delta;
  if (spawnTimer >= spawnInterval) {
    spawnTimer = 0;
    spawnObstacle();
  }
  checkActionTriggers();
  checkChaserAction();
  updateJump(runnerJump, delta);
  updateSlide(runnerSlide, runner, delta);
  

  // Handle the chaser's delayed jump
  const chaserJumpDelta = chaserStaggerTime > 0
  ? delta * CHASER_STAGGER_FACTOR
  : delta;
  updateJump(chaserJump, chaserJumpDelta);
  updateSlide(chaserSlide, chaser, chaserJumpDelta);

    // --- Collisions ---
  // --- Runner collision (uses visual bounds) ---
  const runnerBounds = getRunnerBounds();
  for (const o of obstacles) {
    if (rectsOverlap(o, runnerBounds)) {
    gameOver('An obstacle hit you!');
    return;
    }
  }

  // --- Chaser catches runner ---
  const chaserBounds = getChaserBounds();
  if (rectsOverlap(runnerBounds, chaserBounds)) {
    gameOver('The chaser caught you!');
  }

  if (rectsOverlap(runner, chaser)) {
    gameOver('The chaser caught you!');
  }
}

function gameOver(reason) {
  cancelAnimationFrame(rafId);
  const finalScore = getTotalScore();
  alert('Game Over: ' + reason + '\n\nFinal Score: ' + finalScore);
  resetGame();
  lastTime = performance.now();
  rafId = requestAnimationFrame(gameLoop);
}
function drawFloor() {
  const floorTop = getFloorTop();
  const floorH = FLOOR_HEIGHT;
   // Solid floor band
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, floorTop, canvas.width, floorH);
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.save();

  if (shakeTime > 0) {
  const t = shakeTime / SHAKE_DURATION;         // 1 → 0
  const magnitude = SHAKE_INTENSITY * t;

  // Random offset in both axes
  const offsetX = (Math.random() - 0.5) * 2 * magnitude;
  const offsetY = (Math.random() - 0.5) * 2 * magnitude;

  ctx.translate(offsetX, offsetY);
  }

  drawFloor();
  drawMeter();

// Runner
const runnerH = runnerSlide.active ? runnerSlide.height : runner.height;
const runnerW = runnerSlide.active ? runnerSlide.width : runner.width;
const runnerX = runner.x - (runnerW - runner.width) / 2;
const runnerY = runner.y + (runner.height - runnerH) + runnerJump.yOffset;

  // // Debug reference rectangle (behind) — remove after tuning
// const dbg = getRunnerBounds();
// ctx.fillStyle = '#4f4';
// ctx.fillRect(dbg.x, dbg.y, dbg.width, dbg.height);
// ctx.strokeStyle = '#2a2';
// ctx.lineWidth = 2;
// ctx.strokeRect(dbg.x, dbg.y, dbg.width, dbg.height);

// 2. Sprite — always full standing size
const SPRITE_SCALE = 2.0;
const SLIDE_STRETCH_X = 1.5;
const SLIDE_STRETCH_Y = 0.8;

const isJumping = runnerJump.active;
const isSliding = runnerSlide.active;

const spriteW = ENTITY_WIDTH * SPRITE_SCALE * (isSliding ? SLIDE_STRETCH_X : 1);
const spriteH = ENTITY_HEIGHT * SPRITE_SCALE * (isSliding ? SLIDE_STRETCH_Y : 1);
const spriteX = runner.x + (runner.width - spriteW) / 2;
const spriteY = runner.y + runner.height - spriteH + runnerJump.yOffset;

const activeSheet = isSliding ? slideSheet : isJumping ? jumpSheet : runSheet;
const activeFrameW = isSliding ? SLIDE_FRAME_W : isJumping ? JUMP_FRAME_W : RUN_FRAME_W;
const activeFrameH = isSliding ? SLIDE_FRAME_H : isJumping ? JUMP_FRAME_H : RUN_FRAME_H;

if (activeSheet.complete && activeSheet.naturalWidth > 0) {
  const sx = runnerAnim.frame * activeFrameW;

  ctx.drawImage(
    activeSheet,
    sx, 0, activeFrameW, activeFrameH,
    spriteX, spriteY, spriteW, spriteH
  );
}

// Chaser
const chaserH = chaserSlide.active ? chaserSlide.height : chaser.height;
const chaserW = chaserSlide.active ? chaserSlide.width : chaser.width;
const chaserX = chaser.x - (chaserW - chaser.width) / 2;
const chaserY = chaser.y + (chaser.height - chaserH);

ctx.fillStyle = chaserStaggerTime > 0 ? '#a55' : '#f44';
ctx.fillRect(
  chaserX,
  chaserY + chaserJump.yOffset,
  chaserW,
  chaserH
);
ctx.strokeStyle = chaserStaggerTime > 0 ? '#622' : '#a22';
ctx.strokeRect(
  chaserX,
  chaserY + chaserJump.yOffset,
  chaserW,
  chaserH
);

  
obstacles.forEach(o => {
  if (o.type === 'slide') {
    // Floating block placeholder
    ctx.fillStyle = o.cleared ? '#7a3d00' : '#f80';
    ctx.fillRect(o.x, o.y, o.width, o.height);

    // Support legs (simple, dark)
    const legTop = o.y + o.height;
    const legBottom = getFloorTop();
    ctx.fillStyle = '#000';

      // Two legs
    ctx.fillRect(o.x + 5, legTop, 6, legBottom - legTop);
    ctx.fillRect(o.x + o.width - 11, legTop, 6, legBottom - legTop);

      // Cross-brace between legs
    ctx.fillRect(o.x + 5, legTop + (legBottom - legTop) / 2, o.width - 10, 4);

    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.strokeRect(o.x, o.y, o.width, o.height);
  } else {
    const variant = OBSTACLE_VARIANTS[o.variantIndex];
    const sprite = variant.images[0];

    // 1. Sprite (behind)
    if (sprite && sprite.complete && sprite.naturalWidth > 0) {
      ctx.drawImage(sprite, o.x, o.y, o.width, o.height);
    }

    // 2. Placeholder rectangle (front, semi-transparent)
    // ctx.globalAlpha = 0.4;
    // ctx.fillStyle = o.cleared ? '#7a3d00' : '#f80';
    // ctx.fillRect(o.x, o.y, o.width, o.height);
    // ctx.globalAlpha = 1.0;
  }

  drawObstacleWord(o);
});

  drawScore(); 

  scorePopups.forEach(p => {
  const alpha = p.life / p.maxLife;
  ctx.fillStyle = `rgba(255, 215, 0, ${alpha})`;
  ctx.font = 'bold 18px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(p.text, p.x, p.y);
  });

  const timeScale = getTimeScale();
  if (timeScale < 1) {
    // Fade the intensity based on how slow it is
    const intensity = (1 - timeScale) / (1 - SLOWMO_FACTOR); // 0 → 1
    ctx.fillStyle = `rgba(255, 215, 0, ${intensity * 0.08})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  if (wrongFlashTime > 0) {
  const alpha = (wrongFlashTime / WRONG_FLASH_DURATION) * 0.35;
  ctx.fillStyle = `rgba(255, 0, 0, ${alpha})`;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  ctx.restore(); 
}

function drawMeter() {
  const meterLeft = METER_MARGIN_X;
  const meterWidth = canvas.width - METER_MARGIN_X * 2;
  const meterY = METER_MARGIN_TOP + METER_MARKER_HEIGHT / 2;
  const meterCenterY = meterY;

  // Black track line
  ctx.fillStyle = '#000';
  ctx.fillRect(meterLeft, meterCenterY - METER_HEIGHT / 2, meterWidth, METER_HEIGHT);

  // Chaser marker (red)
  const chaserMeterX = worldToMeterX(chaser.x);
  ctx.fillStyle = '#f44';
  ctx.fillRect(
    chaserMeterX - METER_MARKER_WIDTH / 2,
    meterCenterY - METER_MARKER_HEIGHT / 2,
    METER_MARKER_WIDTH,
    METER_MARKER_HEIGHT
  );

  // Runner marker (green)
  const runnerMeterX = worldToMeterX(runner.x);
  ctx.fillStyle = '#4f4';
  ctx.fillRect(
    runnerMeterX - METER_MARKER_WIDTH / 2,
    meterCenterY - METER_MARKER_HEIGHT / 2,
    METER_MARKER_WIDTH,
    METER_MARKER_HEIGHT
  );

  // Hatch marker (sky blue) — fixed at the end
  const hatchMeterX = worldToMeterX(getMeterEndX());
  ctx.fillStyle = '#4bc9f0';
  ctx.fillRect(
    hatchMeterX - METER_MARKER_WIDTH / 2,
    meterCenterY - METER_MARKER_HEIGHT / 2,
    METER_MARKER_WIDTH,
    METER_MARKER_HEIGHT
  );
}

function drawMarker(x, color) {
  const meterY = METER_MARGIN_TOP + METER_MARKER_HEIGHT / 2;
  ctx.fillStyle = color;
  ctx.fillRect(
    x - METER_MARKER_WIDTH / 2,
    meterY - METER_MARKER_HEIGHT / 2,
    METER_MARKER_WIDTH,
    METER_MARKER_HEIGHT
  );
}

function rectsOverlap(a, b) {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}


function spawnObstacle() {
  const pool = getCurrentWordPool();
  const word = pool[Math.floor(Math.random() * pool.length)];

  // Decide type
  let type = 'jump';
  if (getTotalScore() >= SLIDE_UNLOCK_SCORE) {
    type = Math.random() < SLIDE_CHANCE_AFTER_UNLOCK ? 'slide' : 'jump';
  }

  if (type === 'slide') {
    const floorTop = getFloorTop();
    const obstacleH = SLIDE_OBSTACLE_HEIGHT;
    const obstacleW = SLIDE_OBSTACLE_WIDTH;
    const blockBottom = floorTop - SLIDE_OBSTACLE_GAP;

    obstacles.push({
      id: nextObstacleId++,
      x: canvas.width + 30,
      y: blockBottom - obstacleH,   // top of the block
      width: obstacleW,
      height: obstacleH,
      word: word,
      type: 'slide',
      cleared: false,
      awaitingJump: false,
      awaitingSlide: false,
      chaserDelay: false,
      chaserJumped: false,
      chaserSlid: false,
    });
  } else {
    const variantIndex = Math.floor(Math.random() * OBSTACLE_VARIANTS.length);
    const variant = OBSTACLE_VARIANTS[variantIndex];

    const obstacleW = variant.width;
    const obstacleH = variant.height;

    obstacles.push({
      id: nextObstacleId++,
      x: canvas.width + 30,
      y: getFloorTop() - obstacleH,
      width: obstacleW,
      height: obstacleH,
      word: word,
      type: 'jump',
      variantIndex: variantIndex,   // ← new
      cleared: false,
      awaitingJump: false,
      awaitingSlide: false,
      chaserDelay: false,
      chaserJumped: false,
      chaserSlid: false,
    });
  }
}
function resetGame() {
  obstacles.length = 0;
  targetedObstacle = null;
  currentTyped = '';
  let runnerStartX = 0;
  distanceTraveled = 0;
  

  chaser.x = -ENTITY_WIDTH / 2;
  chaser.y = getEntityY();

  
  runner.x = canvas.width * 0.6 - runner.width / 2;
  runner.y = getEntityY();
  runnerStartX = runner.x;

  spawnTimer = 0;
  lastTime = 0;
  chaserStaggerTime = 0;
  score = 0;
  distanceScore = 0;

  runnerJump.active = false;
  runnerJump.time = 0;
  runnerJump.yOffset = 0;
  runnerAnim.frame = 0;
  runnerAnim.timer = 0;

  chaserJump.active = false;
  chaserJump.pending = false;
  chaserJump.pendingTime = 0;
  chaserJump.time = 0;
  chaserJump.yOffset = 0;
  chaserJump.targetId = null;

  runnerSlide.active = false;
  runnerSlide.time = 0;
  runnerSlide.height = ENTITY_HEIGHT;
  runnerSlide.width = ENTITY_WIDTH;

  chaserSlide.active = false;
  chaserSlide.time = 0;
  chaserSlide.height = ENTITY_HEIGHT;
  chaserSlide.width = ENTITY_WIDTH;
  chaserSlide.targetId = null;

}

function resizeCanvas() {
  let w = window.innerWidth * PLAY_MAX_WIDTH;
  let h = w / PLAY_ASPECT;

  const maxH = window.innerHeight * PLAY_MAX_HEIGHT;
  if (h > maxH) {
    h = maxH;
    w = h * PLAY_ASPECT;
  }

  canvas.width = Math.floor(w);
  canvas.height = Math.floor(h);

  const lineY = canvas.height * 3 / 4 - ENTITY_HEIGHT / 2;   // ← changed

  if (typeof runner !== 'undefined') {
    runner.x = canvas.width * 0.6 - runner.width / 2;
    runner.y = getEntityY();
    runnerStartX = runner.x;
  }

  if (typeof chaser !== 'undefined') {
    chaser.y = lineY;
  }

  ctx.imageSmoothingEnabled = false;
}

document.fonts.ready.then(() => {
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);
  lastTime = performance.now();   // prevent huge first delta
  rafId = requestAnimationFrame(gameLoop);
});