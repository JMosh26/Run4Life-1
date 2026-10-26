
//CANVAS AND PLAY ASPECT RATIO
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = true;
const inputEl = document.getElementById('input');  
const mainMenuEl = document.getElementById('mainMenu');
const playButton = document.getElementById('playButton');
const menuMusicButton = document.getElementById('menuMusic');
const gameOverEl = document.getElementById('gameOver');
const gameOverTitleEl = document.getElementById('gameOverTitle');
const gameOverReasonEl = document.getElementById('gameOverReason');
const gameOverScoreEl = document.getElementById('gameOverScore');
const gameOverBestEl = document.getElementById('gameOverBest');
const newBestMessageEl = document.getElementById('newBestMessage');
const currentScoreEl = document.getElementById('currentScore');
const bestScoreEl = document.getElementById('bestScore');
const returnToMenuButton = document.getElementById('returnToMenu');
const tryAgainButton = document.getElementById('tryAgain');
let gameStarted = false;
let menuAudioContext = null;
let menuMelody = null;
let menuBass = null;
let menuMusicTimer = null;
let menuMusicStep = 0;
const BEST_SCORE_STORAGE_KEY = 'run4life.bestSurvivalTime';
const savedBestScore = localStorage.getItem(BEST_SCORE_STORAGE_KEY);
let bestSurvivalTime = savedBestScore === null ? null : Number(savedBestScore);
if (!Number.isFinite(bestSurvivalTime) || bestSurvivalTime < 0) {
  bestSurvivalTime = null;
}
let survivalTime = 0;

// -- RUNNER SPRITE FRAMES -- //
//Running Sprite
const RUN_FRAMES = 10;
const RUN_FRAME_W = 120;
const RUN_FRAME_H = 200;
const JUMP_FRAMES = 10;
const JUMP_FRAME_W = 120;
const JUMP_FRAME_H = 200;
const SLIDE_FRAMES = 14;
const SLIDE_FRAME_W = 200;
const SLIDE_FRAME_H = 200;

const runnerRunSheets = {};
const runnerJumpSheets = {};
const runnerSlideSheets = {};

// --- Load State 4 (Normal) ---
runnerRunSheets[4] = new Image();
runnerRunSheets[4].src = 'sprites/Character-Sprites/runner-run-4.png';
runnerJumpSheets[4] = new Image();
runnerJumpSheets[4].src = 'sprites/Character-Sprites/runner-jump-4.png';
runnerSlideSheets[4] = new Image();
runnerSlideSheets[4].src = 'sprites/Character-Sprites/runner-slide-4.png';

// --- Load State 3 (Minor Injury) ---
runnerRunSheets[3] = new Image();
runnerRunSheets[3].src = 'sprites/Character-Sprites/runner-run-3.png';
// Assuming you also have jump/slide for state 3, otherwise point them to 4
runnerJumpSheets[3] = new Image();
runnerJumpSheets[3].src = 'sprites/Character-Sprites/runner-jump-3.png'; // or runner-jump-4.png
runnerSlideSheets[3] = new Image();
runnerSlideSheets[3].src = 'sprites/Character-Sprites/runner-slide-4.png'; // or runner-slide-4.png

// --- Load State 2 (Injured) ---
runnerRunSheets[2] = new Image();
runnerRunSheets[2].src = 'sprites/Character-Sprites/runner-run-2.png';
runnerJumpSheets[2] = new Image();
runnerJumpSheets[2].src = 'sprites/Character-Sprites/runner-jump-2.png'; // or runner-jump-4.png
runnerSlideSheets[2] = new Image();
runnerSlideSheets[2].src = 'sprites/Character-Sprites/runner-slide-4.png'; // or runner-slide-4.png

// --- Load State 2 (Injured) ---
runnerRunSheets[1] = new Image();
runnerRunSheets[1].src = 'sprites/Character-Sprites/runner-run-1.png';
runnerJumpSheets[1] = new Image();
runnerJumpSheets[1].src = 'sprites/Character-Sprites/runner-jump-1.png'; // or runner-jump-4.png
runnerSlideSheets[1] = new Image();
runnerSlideSheets[1].src = 'sprites/Character-Sprites/runner-slide-4.png'; // or runner-slide-4.png

// Map Images
const skyImage = new Image();
skyImage.src = 'sprites/Maps/Map1.png';

/* Player Health System */
const MAX_LIVES = 4;
let lives = MAX_LIVES;
let hitCooldownTime = 0;
const HIT_COOLDOWN = 2.0; // 1 second grace period

/* Type Constraints */
const TYPING_RANGE_MAX = 600;    // obstacle must be within 600px to type
const TYPING_RANGE_MIN = -50;    // how far past the runner the obstacle can be

// -- Meter and Head Icon Images -- //

const runnerHeadSheets = {};
for(let i = 1; i <= 4; i++){
  runnerHeadSheets[i] = new Image();
  runnerHeadSheets[i].src = `sprites/Meter-Sprites/meter-head-runner-${i}.png`;
}

function drawHatch() {
  const centerX = canvas.width / 2;
  const panelY = hatchY - 58;
  const panelWidth = Math.min(460, Math.max(260, canvas.width - 32));
  const panelX = centerX - panelWidth / 2;
  const panelHeight = 142;

  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  ctx.fillStyle = 'rgba(5, 10, 11, 0.92)';
  ctx.strokeStyle = '#b7c8b4';
  ctx.lineWidth = 3;
  roundRect(ctx, panelX, panelY - 20, panelWidth, panelHeight, 10);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#e8eddf';
  ctx.font = 'bold 18px monospace';
  ctx.fillText(hatchState === 'failed' ? 'HATCH SEALED' : 'UNLOCK THE HATCH', centerX, panelY + 4);

  const wordY = panelY + 38;
  ctx.font = 'bold 16px monospace';
  hatchWords.forEach((word, index) => {
    const wordX = centerX - 105 + index * 105;
    ctx.fillStyle = index < hatchWordIndex ? '#83d69a' : index === hatchWordIndex ? '#f2d26a' : '#68716b';
    ctx.fillText(word.toUpperCase(), wordX, wordY);
    if (index === hatchWordIndex && hatchState === 'active') {
      ctx.strokeStyle = '#f2d26a';
      ctx.lineWidth = 1;
      ctx.strokeRect(wordX - 42, wordY - 15, 84, 30);
    }
  });

  ctx.fillStyle = '#d6dfd3';
  ctx.font = '14px monospace';
  const prompt = hatchState === 'entering'
    ? 'THE HATCH IS RISING...'
    : hatchState === 'failed'
      ? 'NO LOCKPICKS LEFT'
      : `TYPE: ${(hatchWords[hatchWordIndex] || '').toUpperCase()}  [ENTER]`;
  ctx.fillText(prompt, centerX, panelY + 72);

  if (hatchState === 'active') {
    const inputWidth = Math.min(230, panelWidth - 36);
    ctx.fillStyle = '#101817';
    ctx.fillRect(centerX - inputWidth / 2, panelY + 91, inputWidth, 28);
    ctx.strokeStyle = '#83d69a';
    ctx.strokeRect(centerX - inputWidth / 2, panelY + 91, inputWidth, 28);
    ctx.fillStyle = '#83d69a';
    ctx.font = '16px monospace';
    ctx.fillText(hatchTyped || '_', centerX, panelY + 105);
  }

  const hatchXPos = centerX - HATCH_WIDTH / 2;
  const hatchTop = hatchY;
  ctx.fillStyle = '#384744';
  ctx.strokeStyle = '#c6d2c4';
  ctx.lineWidth = 5;
  roundRect(ctx, hatchXPos, hatchTop, HATCH_WIDTH, HATCH_HEIGHT, 12);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#53635d';
  roundRect(ctx, hatchXPos + 18, hatchTop + 18, HATCH_WIDTH - 36, HATCH_HEIGHT - 36, 8);
  ctx.fill();

  ctx.fillStyle = '#d1b76a';
  for (const [boltX, boltY] of [
    [hatchXPos + 12, hatchTop + 12],
    [hatchXPos + HATCH_WIDTH - 12, hatchTop + 12],
    [hatchXPos + 12, hatchTop + HATCH_HEIGHT - 12],
    [hatchXPos + HATCH_WIDTH - 12, hatchTop + HATCH_HEIGHT - 12],
  ]) {
    ctx.beginPath();
    ctx.arc(boltX, boltY, 4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#c6d2c4';
  ctx.font = 'bold 14px monospace';
  ctx.fillText('ESCAPE', centerX, hatchTop + HATCH_HEIGHT / 2);

  const lockpickX = panelX + panelWidth - 22;
  const lockpickStartY = panelY + 18;
  for (let index = 0; index < HATCH_LOCKPICK_COUNT; index++) {
    drawLockpick(lockpickX, lockpickStartY + index * 38, index < lockpicksRemaining);
  }

  ctx.restore();
}

function drawLockpick(x, y, active) {
  ctx.save();
  ctx.translate(x, y);
  ctx.globalAlpha = active ? 1 : 0.25;
  ctx.strokeStyle = active ? '#f2d26a' : '#89918b';
  ctx.fillStyle = ctx.strokeStyle;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(0, 0, 7, 0, Math.PI * 2);
  ctx.moveTo(7, 0);
  ctx.lineTo(23, 0);
  ctx.lineTo(23, 7);
  ctx.moveTo(17, 0);
  ctx.lineTo(17, 5);
  ctx.stroke();
  ctx.restore();
}

function roundRect(context, x, y, width, height, radius) {
  const corner = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + corner, y);
  context.lineTo(x + width - corner, y);
  context.quadraticCurveTo(x + width, y, x + width, y + corner);
  context.lineTo(x + width, y + height - corner);
  context.quadraticCurveTo(x + width, y + height, x + width - corner, y + height);
  context.lineTo(x + corner, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - corner);
  context.lineTo(x, y + corner);
  context.quadraticCurveTo(x, y, x + corner, y);
  context.closePath();
}

const chaserHeadImage = new Image();
chaserHeadImage.src = 'sprites/Meter-Sprites/meter-head-chaser.png';

const hatchHeadImage = new Image();
hatchHeadImage.src = 'sprites/Meter-Sprites/meter-head-hatch.png';

const meterBarImage = new Image();
meterBarImage.src = 'sprites/Meter-Sprites/meter-bar.png';

const METER_TRACK_START_OFFSET = 40;   // how many pixels to push icons right
const METER_TRACK_END_OFFSET = 40;     // how many pixels to pull the end left

// -- CHASER SPRITE FRAMES -- //
const CHASER_FRAME_W = 300;
const CHASER_FRAME_H = 300;

// Frame counts per animation
const CHASER_RUN_FRAMES = 9;
const CHASER_JUMP_FRAMES = 8;
const CHASER_SLIDE_FRAMES = 16;

const chaserRunSheet = new Image();
chaserRunSheet.src = 'sprites/Character-Sprites/chaser-run.png';

const chaserJumpSheet = new Image();
chaserJumpSheet.src = 'sprites/Character-Sprites/chaser-jump.png';

const chaserSlideSheet = new Image();
chaserSlideSheet.src = 'sprites/Character-Sprites/chaser-slide.png';

// -- Speed Scaling 
const CHASER_SPEED_START = 50;      // at journey start
const CHASER_SPEED_END = 120;       // at journey end


//Text BG 
const wordBgImage = new Image();
wordBgImage.src = 'sprites/Others/word-bg.png';


// Journey
const JOURNEY_DURATION = 60;                     // seconds
const JOURNEY_DISTANCE = JOURNEY_DURATION * 150;  // 18000px

// Meter (horizontal bar at the top of the screen)
const METER_BOTTOM_MARGIN = 50; 
const ICON_SIZE = 32;   
const METER_MARGIN_X = 60;
const METER_HEIGHT = 12;
const METER_MARKER_WIDTH = 12;
const METER_MARKER_HEIGHT = 24;

// Hatch — position relative to the runner's start
const HATCH_OFFSET_FROM_RUNNER = JOURNEY_DISTANCE;
const HATCH_WORD_COUNT = 3;
const HATCH_LOCKPICK_COUNT = 3;
const HATCH_TRANSITION_DURATION = 0.8;
const HATCH_WIDTH = 220;
const HATCH_HEIGHT = 150;
const HATCH_CHASER_SLOW_FACTOR = 0.3;
const HATCH_CHASER_FAILURE_FACTOR = 2;

//Obstacle Variants (1 - Barrier 2 - Stop sign 3 - Cone)
const OBSTACLE_VARIANTS = [
  {
    name: 'barrier',
    width: 80,
    height: 60,
    sprites: ['sprites/Obstacles/obstacle-1.png'],
  },
  {
    name: 'stop-sign',
    width: 50,
    height: 50,
    sprites: ['sprites/Obstacles/obstacle-2.png'],
  },
  {
    name: 'cone',
    width: 40,
    height: 40,
    sprites: ['sprites/Obstacles/obstacle-3.png'],
  },
];

OBSTACLE_VARIANTS.forEach(variant => {
  variant.images = variant.sprites.map(src => {
    const img = new Image();
    img.src = src;
    return img;
  });
});




//SLOW MOTION, JUMPING AND SLIDING 
const SLOWMO_DISTANCE = 220;    // how close an obstacle must be to trigger slow-mo
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
const CHASER_SLIDE_DURATION = 1.05;
//Slow-motion scaling 
const SLOWMO_FACTOR_MIN = 0.07;   // deepest slow (longest words)
const SLOWMO_FACTOR_MAX = 0.3;    // mildest slow (shortest words)

const SLOWMO_WORD_LENGTH_MIN = 3;   // shortest word in your pools
const SLOWMO_WORD_LENGTH_MAX = 10;  // longest word in your pools


//CHASER STAGGER
const CHASER_STAGGER_DURATION = 1.2; // how long the slowdown lasts
const CHASER_STAGGER_FACTOR = 0.1;   // 0.1 = chaser moves at 10% speed
const CHASER_BLOCK_DRIFT = 0.7;   // 0.6 = drifts at 60% of floor speed when blocked

//WORLD SPEED
const WORLD_SPEED = 150;

//DEFAULT ENTITY SIZE
const ENTITY_WIDTH = 30;
const ENTITY_HEIGHT = 50; 

// -- Chaser Size -- 
const CHASER_WIDTH = 50;
const CHASER_HEIGHT = 50;

//JUMP HITBOX
const JUMP_HITBOX_HEIGHT = 15;   

//FLOOR 
const FLOOR_HEIGHT = 150;      // how thick the floor band is
const FLOOR_OFFSET = 0;      // gap between entity feet and floor top

//SCORING SYSTEM
const SCORE_PER_PIXEL = 0.05;      // distance points per pixel scrolled
const SCORE_PER_WORD = 100;        // bonus for each typed word
const SCORE_LENGTH_BONUS = 10;     // extra per letter in the word
const WORD_TIER_2_DISTANCE = 3000;
const WORD_TIER_3_DISTANCE = 5250;
const WORLD_SPEED_TIER_2 = 0.95;   // 5% slower at tier 2
const WORLD_SPEED_TIER_3 = 0.90;   // 10% slower at tier 3
const SPAWN_INTERVAL_TIER_2 = 3.0; // was 2.5
const SPAWN_INTERVAL_TIER_3 = 3.5; // even more space at tier 3

//SLIDE OBSTACLE
const SLIDE_OBSTACLE_WIDTH = 50;
const SLIDE_OBSTACLE_HEIGHT = 120;
const SLIDE_OBSTACLE_GAP = 30;   // clearance between floor and block bottom
const SLIDE_UNLOCK_DISTANCE = 1500;
const SLIDE_CHANCE_AFTER_UNLOCK = 0.5; 


//Wrong letter feedback
let wrongFlashTime = 0;     // seconds remaining on the red flash
let shakeTime = 0;          // seconds remaining on the camera shake
const WRONG_FLASH_DURATION = 0.2;
const SHAKE_DURATION = 0.25;
const SHAKE_INTENSITY = 8;  // pixels of offset at peak



let floorScroll = 0;      

// let chaserStaggerTime = 0;          // seconds remaining on the stagger

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
let chaserDistanceTraveled = 0;
let runnerStartX = 0;
//Hatch Position
let hatchX = null;   // set later, when the hatch spawns
let hatchState = 'inactive';
let hatchY = 0;
let hatchTransitionTime = 0;
let hatchWords = [];
let hatchWordIndex = 0;
let hatchTyped = '';
let lockpicksRemaining = HATCH_LOCKPICK_COUNT;

/**
 * Entity — Abstract base class for all game objects with a position and size.
 *
 * Demonstrates:
 *   - Abstraction: defines the interface (update, draw, getBounds)
 *     that all subclasses must implement.
 *   - Encapsulation: holds x, y, width, height as core state.
 *   - Inheritance base: parent of Runner, Chaser, Obstacle, Hatch.
 *   - Polymorphism: all subclasses can be treated uniformly via update/draw.
 */
class Entity {
  constructor(x, y, width, height) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
  }

  /**
   * Returns the current axis-aligned bounding box.
   * Overridable by subclasses (e.g., for slide flattening, jump shrink).
   */
  getBounds() {
    return {
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height,
    };
  }

  /**
   * Update this entity's state each frame.
   * MUST be overridden by subclasses.
   */
  update(delta) {
    throw new Error('Entity.update() must be overridden by subclass');
  }

  /**
   * Draw this entity to the canvas.
   * MUST be overridden by subclasses.
   */
  draw(ctx) {}
}
/**
 * Runner — the player-controlled entity.
 *
 * Demonstrates:
 *   - Inheritance: extends Entity (inherits x, y, width, height, getBounds)
 *   - Encapsulation: owns its jump, slide, and animation state
 *   - Polymorphism: implements update() and draw() for the game loop
 */
class Runner extends Entity {
  constructor(x, y) {
    super(x, y, ENTITY_WIDTH, ENTITY_HEIGHT);

    this.jump = {
      active: false,
      time: 0,
      duration: JUMP_DURATION,
      height: JUMP_HEIGHT,
      yOffset: 0,
    };

    this.slide = {
      active: false,
      time: 0,
      duration: SLIDE_DURATION,
      height: ENTITY_HEIGHT,
      width: ENTITY_WIDTH,
    };

    this.anim = {
      frame: 0,
      timer: 0,
      fps: 10,
    };
  }

  // Placeholder methods — filled in during later sub-steps.
  update(delta) {
    const activeFrameCount = this.jump.active ? JUMP_FRAMES
                       : this.slide.active ? SLIDE_FRAMES
                       : RUN_FRAMES;

    const activeFps = this.jump.active
                  ? JUMP_FRAMES / this.jump.duration
                  : this.slide.active
                    ? SLIDE_FRAMES / this.slide.duration
                    : this.anim.fps;

    this.anim.timer += delta;
  
    if (this.anim.timer >= 1 / activeFps) {
      this.anim.timer = 0;
      this.anim.frame = (this.anim.frame + 1) % activeFrameCount;
    }
  }
  draw(ctx) {
    const isJumping = this.jump.active;
    const isSliding = this.slide.active;

    const SPRITE_SCALE = 2.0;
    const SLIDE_STRETCH_X = 1.5;
    const SLIDE_STRETCH_Y = 0.8;

    const spriteW = ENTITY_WIDTH * SPRITE_SCALE * (isSliding ? SLIDE_STRETCH_X : 1);
    const spriteH = ENTITY_HEIGHT * SPRITE_SCALE * (isSliding ? SLIDE_STRETCH_Y : 1);
    const spriteX = this.x + (this.width - spriteW) / 2;
    const spriteY = this.y + this.height - spriteH + this.jump.yOffset;

    const currentLives = Math.max(1, lives); // Prevents crashing if lives is 0
      
    const runSheet = runnerRunSheets[currentLives] || runnerRunSheets[4];
    const jumpSheet = runnerJumpSheets[currentLives] || runnerJumpSheets[4];
    const slideSheet = runnerSlideSheets[currentLives] || runnerSlideSheets[4];

    let activeSheet;
    if (isSliding) {
      activeSheet = slideSheet;
    } else if (isJumping) {
      activeSheet = jumpSheet;
    } else {
      activeSheet = runSheet;
    }

    if (activeSheet && activeSheet.complete && activeSheet.naturalWidth > 0) {
      
      // 2. Figure out which frame to draw based on the action
      let activeFrameW, activeFrameH;
      if (isSliding) {
        activeFrameW = SLIDE_FRAME_W;
        activeFrameH = SLIDE_FRAME_H;
      } else if (isJumping) {
        activeFrameW = JUMP_FRAME_W;
        activeFrameH = JUMP_FRAME_H;
      } else {
        activeFrameW = RUN_FRAME_W;
        activeFrameH = RUN_FRAME_H;
      }

      // 3. Calculate the source X in the sprite sheet
      const sx = this.anim.frame * activeFrameW;

      // 4. Draw it!
      ctx.drawImage(
        activeSheet,
        sx, 0, activeFrameW, activeFrameH,
        spriteX, spriteY, spriteW, spriteH
      );
    }
  }
}

class Chaser extends Entity {
  constructor(x, y) {
    super(x, y, CHASER_WIDTH, CHASER_HEIGHT);

    this.jump = {
      active: false,
      time: 0,
      duration: JUMP_DURATION,
      height: JUMP_HEIGHT,
      yOffset: 0,
      targetId: null,
    };

    this.slide = {
      active: false,
      time: 0,
      duration: SLIDE_DURATION,
      height: CHASER_HEIGHT,
      width: CHASER_WIDTH,
      targetId: null,
    };
        this.anim = {
      frame: 0,
      timer: 0,
      fps: 10,
    };

    this.staggerTime = 0;
    this.blocked = false;
  }

update(delta, runner, obstacles, worldSpeed) {
  // -- Chaser Sprite --
  const activeFrameCount = this.jump.active ? CHASER_JUMP_FRAMES
                         : this.slide.active ? CHASER_SLIDE_FRAMES
                         : CHASER_RUN_FRAMES;

  const activeFps = this.jump.active
                    ? CHASER_JUMP_FRAMES / this.jump.duration
                    : this.slide.active
                      ? CHASER_SLIDE_FRAMES / this.slide.duration
                      : this.anim.fps;

  this.anim.timer += delta;
  if (this.anim.timer >= 1 / activeFps) {
    this.anim.timer = 0;

    if (this.slide.active) {
      // Hold on last frame during slide
      if (this.anim.frame < CHASER_SLIDE_FRAMES - 1) {
        this.anim.frame++;
      }
    } else if (this.jump.active) {
      // Hold on last frame during jump
      if (this.anim.frame < CHASER_JUMP_FRAMES - 1) {
        this.anim.frame++;
      }
    } else {
      // Loop normally during running
      this.anim.frame = (this.anim.frame + 1) % CHASER_RUN_FRAMES;
    }
  }

  // --- Chaser movement ---
  const runnerCX = runner.x + runner.width / 2;
  const runnerCY = runner.y + runner.height / 2;
  const chaserCX = this.x + this.width / 2;
  const chaserCY = this.y + this.height / 2;

  const dx = runnerCX - chaserCX;
  const dy = runnerCY - chaserCY;
  const dist = Math.hypot(dx, dy);

  // --- Blocked check ---
  let blockedByObstacle = false;
  for (const o of obstacles) {
    if (!o.chaserDelay) continue;
    if (o.chaserJumped || o.chaserSlid) continue;   // ← skip both

    const obstacleCenterX = o.x + o.width / 2;
    const gap = obstacleCenterX - chaserCX;

    if (gap > 0 && gap < CHASER_STOP_DISTANCE) {
      const isTargeted = (this.jump.targetId === o.id) || (this.slide.targetId === o.id);
      if (!isTargeted) {
        blockedByObstacle = true;
        break;
      }
    }
  }

  this.blocked = blockedByObstacle;

  // --- Speed ---
  let chaserSpeed = getChaserSpeed();
  if (hatchState === 'entering' || hatchState === 'active') {
    chaserSpeed *= HATCH_CHASER_SLOW_FACTOR;
  } else if (hatchState === 'failed') {
    chaserSpeed *= HATCH_CHASER_FAILURE_FACTOR;
  }
  if (this.staggerTime > 0) {
    chaserSpeed *= CHASER_STAGGER_FACTOR;
  }

  // --- Movement ---
  if (blockedByObstacle) {
    this.x -= worldSpeed * delta * CHASER_BLOCK_DRIFT;
  } else if (dist > 1) {
    const move = (dx / dist) * chaserSpeed * delta;
    this.x += move;
    this.y += (dy / dist) * chaserSpeed * delta;
    this.distanceTraveled = (this.distanceTraveled || 0) + move;
  }
}
  draw(ctx) {
    const isJumping = this.jump.active;
    const isSliding = this.slide.active;

    const SPRITE_SCALE = 2.0;
    const SLIDE_STRETCH_X = 1.2;
    const SLIDE_STRETCH_Y = 1;

    const spriteW = this.width * SPRITE_SCALE * (isSliding ? SLIDE_STRETCH_X : 1);
    const spriteH = this.height * SPRITE_SCALE * (isSliding ? SLIDE_STRETCH_Y : 1);
    const spriteX = this.x + (this.width - spriteW) / 2;
    const spriteY = this.y + this.height - spriteH + this.jump.yOffset;

    const activeSheet = isSliding ? chaserSlideSheet : isJumping ? chaserJumpSheet : chaserRunSheet;

    if (activeSheet.complete && activeSheet.naturalWidth > 0) {
      const sx = this.anim.frame * CHASER_FRAME_W;

      ctx.drawImage(
        activeSheet,
        sx, 0, CHASER_FRAME_W, CHASER_FRAME_H,
        spriteX, spriteY, spriteW, spriteH
      );
    } else {
      // Fallback rectangle while loading
      ctx.fillStyle = this.staggerTime > 0 ? '#a55' : '#f44';
      ctx.fillRect(this.x, this.y + this.jump.yOffset, this.width, this.height);
    }
  }
}

class Obstacle extends Entity {
  constructor(x, y, width, height, word, type, variantIndex) {
    super(x, y, width, height);

    this.word = word;
    this.type = type;                 // 'jump' or 'slide'
    this.variantIndex = variantIndex;

    // State flags
    this.cleared = false;
    this.awaitingJump = false;
    this.awaitingSlide = false;
    this.chaserDelay = false;
    this.chaserJumped = false;
    this.chaserSlid = false;
    this.hitRunner = false;

    // ID assigned externally by the spawn factory
    this.id = null;
  }

  update(delta, worldSpeed) {
    this.x -= worldSpeed * delta;
  }

  draw(ctx) {
    if (this.type === 'slide') {
      // Floating block placeholder
      ctx.fillStyle = this.cleared ? '#7a3d00' : '#f80';
      ctx.fillRect(this.x, this.y, this.width, this.height);

      // Support legs
      const legTop = this.y + this.height;
      const legBottom = getFloorTop();
      ctx.fillStyle = '#000';

      ctx.fillRect(this.x + 5, legTop, 6, legBottom - legTop);
      ctx.fillRect(this.x + this.width - 11, legTop, 6, legBottom - legTop);
      ctx.fillRect(this.x + 5, legTop + (legBottom - legTop) / 2, this.width - 10, 4);

      ctx.strokeStyle = '#000';
      ctx.lineWidth = 2;
      ctx.strokeRect(this.x, this.y, this.width, this.height);
    } else {
      const variant = OBSTACLE_VARIANTS[this.variantIndex];
      const sprite = variant.images[0];

      // Sprite (behind)
      if (sprite && sprite.complete && sprite.naturalWidth > 0) {
        ctx.drawImage(sprite, this.x, this.y, this.width, this.height);
      }

      // Placeholder rectangle (uncomment if you want the tint back)
      // ctx.globalAlpha = 0.4;
      // ctx.fillStyle = this.cleared ? '#7a3d00' : '#f80';
      // ctx.fillRect(this.x, this.y, this.width, this.height);
      // ctx.globalAlpha = 1.0;
    }

    drawObstacleWord(this);
  }
}
// const runner = {
//   x: canvas.width / 2 - ENTITY_WIDTH / 2,
//   y: canvas.height / 2 - ENTITY_HEIGHT / 2,
//   width: ENTITY_WIDTH,
//   height: ENTITY_HEIGHT,
// };
const runner = new Runner(0, 0);

const chaser = new Chaser(-CHASER_WIDTH / 2, 0);

// const chaserJump = {
//   active: false,
//   time: 0,
//   duration: JUMP_DURATION,
//   height: JUMP_HEIGHT,
//   yOffset: 0,
//   targetId: null,
// };

// const chaserSlide = {
//   active: false,
//   time: 0,
//   duration: SLIDE_DURATION,
//   height: ENTITY_HEIGHT,
//   width: ENTITY_WIDTH,
//   targetId: null,
// };

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
  if (!gameStarted) return;

  if (hatchState !== 'inactive') {
    if (hatchState === 'active' && e.key.length === 1 && /^[a-z]$/i.test(e.key)) {
      hatchTyped += e.key.toLowerCase();
    }
    return;
  }

  // Only care about single-character keys (letters, numbers)
  if (e.key.length !== 1) return;

  // Prevent default for spacebar (it scrolls the page)
  if (e.key === ' ') e.preventDefault();

  currentTyped += e.key.toLowerCase();

  checkTypedMatch();
});

window.addEventListener('keydown', (e) => {
  if (!gameStarted) return;

  if (hatchState !== 'inactive') {
    if (hatchState !== 'active') return;
    if (e.key === 'Backspace') {
      hatchTyped = hatchTyped.slice(0, -1);
      e.preventDefault();
    } else if (e.key === 'Escape') {
      hatchTyped = '';
    } else if (e.key === 'Enter') {
      submitHatchWord();
      e.preventDefault();
    }
    return;
  }

  if (e.key === 'Backspace') {
    currentTyped = currentTyped.slice(0, -1);
    e.preventDefault();
  }
  if (e.key === 'Escape') {
    currentTyped = '';
  }
});

menuMusicButton.addEventListener('click', () => {
  if (menuAudioContext) {
    stopMenuMusic();
  } else {
    startMenuMusic();
  }
});

playButton.addEventListener('click', startGame);
returnToMenuButton.addEventListener('click', () => {
  gameStarted = false;
  gameOverEl.hidden = true;
  gameOverEl.classList.remove('is-win');
  mainMenuEl.hidden = false;
  document.body.classList.remove('playing');
});
tryAgainButton.addEventListener('click', startGame);

function startGame() {
  mainMenuEl.hidden = true;
  gameOverEl.hidden = true;
  gameOverEl.classList.remove('is-win');
  document.body.classList.add('playing');
  gameStarted = true;
  resetGame();
  updateScoreDisplay();
  lastTime = performance.now();
  rafId = requestAnimationFrame(gameLoop);
}

function startMenuMusic() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) {
    menuMusicButton.disabled = true;
    menuMusicButton.title = 'Menu music is not supported in this browser';
    return;
  }

  menuAudioContext = new AudioContextClass();
  menuAudioContext.resume();
  menuMelody = menuAudioContext.createOscillator();
  menuBass = menuAudioContext.createOscillator();
  const melodyGain = menuAudioContext.createGain();
  const bassGain = menuAudioContext.createGain();
  melodyGain.gain.value = 0.035;
  bassGain.gain.value = 0.025;
  menuMelody.type = 'triangle';
  menuBass.type = 'sine';
  menuMelody.connect(melodyGain).connect(menuAudioContext.destination);
  menuBass.connect(bassGain).connect(menuAudioContext.destination);
  menuMelody.frequency.value = 220;
  menuBass.frequency.value = 110;
  menuMelody.start();
  menuBass.start();

  const melodyNotes = [220, 261.63, 329.63, 392, 329.63, 261.63];
  const bassNotes = [110, 130.81, 98, 146.83];
  menuMusicStep = 0;
  menuMusicTimer = window.setInterval(() => {
    if (!menuAudioContext || !menuMelody || !menuBass) return;
    const now = menuAudioContext.currentTime;
    menuMelody.frequency.setTargetAtTime(melodyNotes[menuMusicStep % melodyNotes.length], now, 0.04);
    if (menuMusicStep % 3 === 0) {
      menuBass.frequency.setTargetAtTime(bassNotes[(menuMusicStep / 3) % bassNotes.length], now, 0.08);
    }
    menuMusicStep += 1;
  }, 320);

  menuMusicButton.setAttribute('aria-pressed', 'true');
  menuMusicButton.setAttribute('aria-label', 'Disable menu music');
  menuMusicButton.title = 'Disable menu music';
}

function stopMenuMusic() {
  if (menuMusicTimer !== null) {
    window.clearInterval(menuMusicTimer);
    menuMusicTimer = null;
  }
  if (menuMelody) menuMelody.stop();
  if (menuBass) menuBass.stop();
  if (menuAudioContext) menuAudioContext.close();
  menuMelody = null;
  menuBass = null;
  menuAudioContext = null;
  menuMusicButton.setAttribute('aria-pressed', 'false');
  menuMusicButton.setAttribute('aria-label', 'Enable menu music');
  menuMusicButton.title = 'Enable menu music';
}

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
  let speed = WORLD_SPEED;
  
  // ... existing tier logic ...
  if (distanceTraveled >= WORD_TIER_3_DISTANCE) speed = WORLD_SPEED * WORLD_SPEED_TIER_3;
  else if (distanceTraveled >= WORD_TIER_2_DISTANCE) speed = WORLD_SPEED * WORLD_SPEED_TIER_2;

  // Apply health penalty
  speed *= getSpeedMultiplier(); 
  
  return speed;
}

function getSpawnInterval() {
  const distanceTraveled = getdistanceTraveledScore();
  if (distanceTraveled >= WORD_TIER_3_DISTAMCE) return SPAWN_INTERVAL_TIER_3;
  if (distanceTraveled >= WORD_TIER_2_DISTANCE) return SPAWN_INTERVAL_TIER_2;
  return spawnInterval;
}

function getHatchWorldX() {
  return runnerStartX + JOURNEY_DISTANCE;
}

function startHatchSequence() {
  hatchState = 'entering';
  hatchY = canvas.height + HATCH_HEIGHT;
  hatchTransitionTime = 0;
  hatchWords = Array.from({ length: HATCH_WORD_COUNT }, () => {
    const pool = WORD_POOLS.easy;
    return pool[Math.floor(Math.random() * pool.length)];
  });
  hatchWordIndex = 0;
  hatchTyped = '';
  lockpicksRemaining = HATCH_LOCKPICK_COUNT;
  obstacles.length = 0;
  targetedObstacle = null;
  currentTyped = '';
}

function submitHatchWord() {
  if (!hatchTyped) return;

  if (hatchTyped === hatchWords[hatchWordIndex]) {
    hatchWordIndex += 1;
    hatchTyped = '';
    if (hatchWordIndex === HATCH_WORD_COUNT) {
      hatchState = 'opened';
      gameOver('You unlocked the hatch and escaped!', 'ESCAPED');
    }
    return;
  }

  lockpicksRemaining -= 1;
  hatchTyped = '';
  wrongFlashTime = WRONG_FLASH_DURATION;
  if (lockpicksRemaining <= 0) {
    hatchState = 'failed';
    hatchTransitionTime = 0;
  }
}

function getSpeedMultiplier() {
  if (lives >= 4) return 1.00; // Normal
  if (lives >= 3) return 0.90; // Minor (10% slower)
  if (lives >= 2) return 0.80; // Injured (20% slower)
  if (lives >= 1) return 0.70; // Critical (30% slower)
  return 0;
}
function loseLife() {
  if (hitCooldownTime > 0) return; 
  if (lives <= 0) return;

  lives -= 1;
  hitCooldownTime = HIT_COOLDOWN;

  // Visual feedback (reusing your existing flash/shake)
  wrongFlashTime = WRONG_FLASH_DURATION;
  shakeTime = SHAKE_DURATION;
  
  // Reset animation so the new sprite starts cleanly
  runner.anim.frame = 0;
  runner.anim.timer = 0;

  if (lives <= 0) {
    gameOver('You took too much damage!');
  }
}


function gameLoop(timestamp) {
  if (!gameStarted) return;

  let delta = (timestamp - lastTime) / 1000;
  lastTime = timestamp;

  // Clamp delta to prevent tab-switch teleport
  if (delta > 0.1) delta = 0.1;

  // Apply slow-motion scaling
  const timeScale = getTimeScale();
  const scaledDelta = delta * timeScale;

  update(scaledDelta, delta);
  draw();

  if (gameStarted) rafId = requestAnimationFrame(gameLoop);
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
      const factor = getSlowFactorForWord(o.word);
      const scale = factor + (1 - factor) * t;
      minScale = Math.min(minScale, scale);
    }
  }

  return minScale;
}


function getJumpShrinkFactor() {
  if (!runner.jump.active) return 1;

  const t = runner.jump.time / runner.jump.duration;
  const easeIn = Math.min(t * 5, 1);
  const easeOut = Math.min((1 - t) * 5, 1);
  const phase = Math.min(easeIn, easeOut);
  const factor = 1 - (1 - JUMP_HITBOX_HEIGHT / ENTITY_HEIGHT) * phase;

  return factor;
}
function getChaserY() {
  return getGroundY() - CHASER_HEIGHT / 2;
}

function getRunnerBounds() {
  const SPRITE_SCALE = 1.3;
  const SLIDE_STRETCH_X = 1.4;   // must match your draw code
  const HITBOX_INSET = 0.8;      // hitbox is 80% of sprite size

  // Compute sprite footprint (mirrors the draw code exactly)
  const isSliding = runner.slide.active;

    // const spriteW = ENTITY_WIDTH * SPRITE_SCALE * (isSliding ? SLIDE_STRETCH_X : 1);
    // const spriteH = ENTITY_HEIGHT * SPRITE_SCALE;
  const spriteW = (isSliding ? runner.slide.width : ENTITY_WIDTH) * SPRITE_SCALE;
  const spriteH = (isSliding ? runner.slide.height : ENTITY_HEIGHT) * SPRITE_SCALE;
  const spriteX = runner.x + (runner.width - spriteW) / 2;
  const spriteY = runner.y + runner.height - spriteH + runner.jump.yOffset;

  // Slide — return the sprite footprint, or a slightly inset version
  if (isSliding) {
    const w = runner.slide.width;
    const h = runner.slide.height;
    return {
      x: runner.x - (w - runner.width) / 2,
      y: runner.y + (runner.height - h),
      width: w,
      height: h,
    };
  }

  // Jump — shrink toward a cube at the peak
  if (runner.jump.active) {
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

function getChaserSpeed() {
  const progress = Math.min(distanceTraveled / JOURNEY_DISTANCE, 1);
  return CHASER_SPEED_START + (CHASER_SPEED_END - CHASER_SPEED_START) * progress;
}


function getChaserBounds() {
  if (chaser.slide.active) {
    const h = chaser.slide.height;
    const w = chaser.slide.width;
    return {
      x: chaser.x - (w - chaser.width) / 2,
      y: chaser.y + (chaser.height - h),
      width: w,
      height: h,
    };
  }
  if (chaser.jump.active) {
    return {
      x: chaser.x,
      y: chaser.y + chaser.jump.yOffset,
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

  const runnerCX = runner.x + runner.width / 2;
  let closest = null;
  let closestDist = Infinity;

  for (const o of obstacles) {
    if (o.cleared) continue;

    const obstacleCX = o.x + o.width / 2;
    const dist = obstacleCX - runnerCX;

    // Only target if it's within the typing window
    if (dist > TYPING_RANGE_MIN && dist < TYPING_RANGE_MAX) {
      if (dist < closestDist) {
        closestDist = dist;
        closest = o;
      }
    }
  }

  // If no obstacle is in range, clear the target
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


function getCurrentWordPool() {
  if (distanceTraveled >= WORD_TIER_3_DISTANCE) return WORD_POOLS.hard;
  if (distanceTraveled >= WORD_TIER_2_DISTANCE) return WORD_POOLS.medium;
  return WORD_POOLS.easy;
}

function getSlowFactorForWord(word) {
  const len = word.length;
  const t = Math.min(
    Math.max((len - SLOWMO_WORD_LENGTH_MIN) / (SLOWMO_WORD_LENGTH_MAX - SLOWMO_WORD_LENGTH_MIN), 0),
    1
  );
  return SLOWMO_FACTOR_MAX + (SLOWMO_FACTOR_MIN - SLOWMO_FACTOR_MAX) * t;
}
function getChaserSlideDuration() {
  if (obstacles.length === 0) return SLIDE_DURATION;

  const chaserCenterX = chaser.x + chaser.width / 2;
  let minDist = Infinity;
  let closest = null;

  for (const o of obstacles) {
    if (!o.chaserDelay) continue;
    if (o.chaserJumped || o.chaserSlid) continue;
    if (o.type !== 'slide') continue;

    const obstacleCenterX = o.x + o.width / 2;
    const d = obstacleCenterX - chaserCenterX;
    if (d > 0 && d < minDist) {
      minDist = d;
      closest = o;
    }
  }

  if (!closest) return SLIDE_DURATION;

  const closingSpeed = getWorldSpeed() + getChaserSpeed();
  const timeToReach = minDist / closingSpeed;
  const timeToPass = (closest.width + chaser.width) / closingSpeed;
  const duration = timeToReach + timeToPass;

  return Math.max(1.5, Math.min(duration, 2.5));
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
  if (runner.jump.active || runner.slide.active) return;

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
  if (chaser.jump.active || chaser.slide.active) return;

  const chaserCX = chaser.x + chaser.width / 2;

  for (const o of obstacles) {
    if (!o.chaserDelay) continue;
    if (o.chaserJumped || o.chaserSlid) continue;

    const obstacleCenterX = o.x + o.width / 2;
    const gap = obstacleCenterX - chaserCX;

    if (gap > 0 && gap < CHASER_JUMP_CUE) {
      if (o.type === 'slide') {
        chaser.slide.active = true;
        chaser.slide.time = 0;
        chaser.slide.duration = getChaserSlideDuration();
        chaser.slide.targetId = o.id;
        o.chaserSlid = true;

        chaser.anim.frame = 0;
        chaser.anim.timer = 0;
      } else {
        chaser.jump.active = true;
        chaser.jump.time = 0;
        chaser.jump.duration = CHASER_JUMP_DURATION;
        chaser.jump.targetId = o.id;
        o.chaserJumped = true;
        chaser.anim.frame = 0;
        chaser.anim.timer = 0;
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
  runner.jump.active = true;
  runner.jump.time = 0;
  runner.jump.duration = getJumpDurationForDistance();

  runner.anim.frame = 0;   // ← start from frame 0
  runner.anim.timer = 0;
}
function triggerRunnerSlide() {
  runner.slide.active = true;
  runner.slide.time = 0;
  runner.slide.duration = getSlideDurationForDistance();

  runner.anim.frame = 0;
  runner.anim.timer = 0;
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

    loseLife();

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
    if (jump === chaser.jump) {
        chaser.anim.frame = 0;
        chaser.anim.timer = 0;
        jump.targetId = null; 
    }
      
      

    if (jump === runner.jump) {
      runner.anim.frame = runner.anim.frame % RUN_FRAMES;
      runner.anim.timer = 0;
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
    if (slide === chaser.slide){
      chaser.anim.frame = 0;
      chaser.anim.timer = 0;
      slide.targetId = null;
    }

    if (slide === runner.slide) {
      runner.anim.frame = runner.anim.frame % RUN_FRAMES;
      runner.anim.timer = 0;
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

function update(delta, elapsedTime = delta) {
  survivalTime += elapsedTime;
  updateScoreDisplay();

  if (hatchState === 'inactive' && distanceTraveled >= JOURNEY_DISTANCE) {
    startHatchSequence();
  }

  const isHatchSequence = hatchState !== 'inactive';
  const worldSpeed = getWorldSpeed();   // compute once per frame 
  if (!isHatchSequence) {
    distanceTraveled = Math.min(distanceTraveled + worldSpeed * delta, JOURNEY_DISTANCE);
  }

  //Countdown for wrong letter
  if (wrongFlashTime > 0) wrongFlashTime -= delta;
  if (shakeTime > 0) shakeTime -= delta;
  if (hitCooldownTime > 0) hitCooldownTime -= delta;

  if (hatchState === 'entering') {
    hatchTransitionTime += delta;
    const progress = Math.min(hatchTransitionTime / HATCH_TRANSITION_DURATION, 1);
    const easedProgress = 1 - Math.pow(1 - progress, 3);
    hatchY = canvas.height / 2 - HATCH_HEIGHT / 2 +
      (canvas.height + HATCH_HEIGHT - (canvas.height / 2 - HATCH_HEIGHT / 2)) * (1 - easedProgress);
    if (progress >= 1) {
      hatchState = 'active';
    }
  } else if (hatchState === 'failed') {
    hatchTransitionTime += delta;
    const progress = Math.min(hatchTransitionTime / HATCH_TRANSITION_DURATION, 1);
    const easedProgress = progress * progress * (3 - 2 * progress);
    hatchY = canvas.height / 2 - HATCH_HEIGHT / 2 +
      (canvas.height + HATCH_HEIGHT - (canvas.height / 2 - HATCH_HEIGHT / 2)) * easedProgress;
  }

  // -- Runner Update -- //
  runner.update(delta);

  // -- Chaser Update -- //
  chaser.update(delta, runner, isHatchSequence ? [] : obstacles, worldSpeed);

  // --- Floor scroll ---
  if (!isHatchSequence) {
    floorScroll -= getWorldSpeed() * delta;
    if (floorScroll <= -80) floorScroll = 0;
  }

  // --- Distance score ---
  if (!isHatchSequence) distanceScore += worldSpeed * delta * SCORE_PER_PIXEL;

  for (let i = scorePopups.length - 1; i >= 0; i--) {
  scorePopups[i].life -= delta; 
  scorePopups[i].y -= 40 * delta;   // drift upward
  if (scorePopups[i].life <= 0) scorePopups.splice(i, 1);
  }

  // --- Move obstacles ---

  if (!isHatchSequence) obstacles.forEach(o => o.update(delta, worldSpeed));

  // --- Remove off-screen obstacles ---
  for (let i = obstacles.length - 1; i >= 0; i--) {
    if (obstacles[i].x + obstacles[i].width < 0) obstacles.splice(i, 1);
  }

  // --- Choose typing target ---
  if (!isHatchSequence) pickTargetObstacle();

  // --- Spawn timer ---
  if (!isHatchSequence) {
    spawnTimer += delta;
    if (spawnTimer >= spawnInterval) {
      spawnTimer = 0;
      spawnObstacle();
    }
  }
  if (!isHatchSequence) {
    checkActionTriggers();
    checkChaserAction();
  }
  updateJump(runner.jump, delta);
  updateSlide(runner.slide, runner, delta);
  

  // Handle the chaser's delayed jump
  const chaserJumpDelta = chaser.staggerTime > 0
  ? delta * CHASER_STAGGER_FACTOR
  : delta;
  updateJump(chaser.jump, chaserJumpDelta);
  updateSlide(chaser.slide, chaser, chaserJumpDelta);

    // --- Collisions ---
  // --- Runner collision (uses visual bounds) ---
  const runnerBounds = getRunnerBounds();
  for (const o of isHatchSequence ? [] : obstacles) {
    if (rectsOverlap(o, runnerBounds)) {
    loseLife();
    o.hitRunner = true; // Mark so it only hits once
    if (!gameStarted) return;
    }
  }

  // --- Chaser catches runner ---
  const chaserBounds = getChaserBounds();
  if (rectsOverlap(runnerBounds, chaserBounds)) {
    lives = 0; // Wipe lives
    gameOver('The chaser caught you!');
  }

  // if (rectsOverlap(runner, chaser)) {
  //   gameOver('The chaser caught you!');
  // }
}

function gameOver(reason, title = 'YOU DIED') {
  cancelAnimationFrame(rafId);
  gameStarted = false;
  const isNewBest = bestSurvivalTime === null || survivalTime > bestSurvivalTime;
  if (isNewBest) {
    bestSurvivalTime = survivalTime;
    localStorage.setItem(BEST_SCORE_STORAGE_KEY, String(bestSurvivalTime));
  }
  updateScoreDisplay();
  gameOverScoreEl.textContent = formatSurvivalTime(survivalTime);
  gameOverBestEl.textContent = formatSurvivalTime(bestSurvivalTime);
  newBestMessageEl.hidden = !isNewBest;
  gameOverEl.classList.toggle('is-win', title === 'ESCAPED');
  gameOverTitleEl.textContent = title;
  gameOverReasonEl.textContent = reason;
  gameOverEl.hidden = false;
}

function formatSurvivalTime(seconds) {
  if (seconds === null) return 'NO RECORD';
  const totalSeconds = Math.floor(seconds);
  const minutes = Math.floor(totalSeconds / 60);
  const remainder = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`;
}

function updateScoreDisplay() {
  const currentScore = formatSurvivalTime(survivalTime);
  const bestScore = formatSurvivalTime(bestSurvivalTime);
  if (currentScoreEl.textContent !== currentScore) currentScoreEl.textContent = currentScore;
  if (bestScoreEl.textContent !== bestScore) bestScoreEl.textContent = bestScore;
}
function drawFloor() {
  const floorTop = getFloorTop();
  const floorH = FLOOR_HEIGHT;
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, floorTop, canvas.width, floorH);
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  // 1. Draw the Sky Background
  if (skyImage.complete && skyImage.naturalWidth > 0) {
    // Draw it to cover the entire canvas
    ctx.drawImage(skyImage, 0, 0, canvas.width, canvas.height);
  } else {
    // Fallback while loading: solid sky blue
    ctx.fillStyle = '#87ceeb'; 
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
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
const runnerH = runner.slide.active ? runner.slide.height : runner.height;
const runnerW = runner.slide.active ? runner.slide.width : runner.width;
const runnerX = runner.x - (runnerW - runner.width) / 2;
const runnerY = runner.y + (runner.height - runnerH) + runner.jump.yOffset;

  // // Debug reference rectangle (behind) — remove after tuning
// const dbg = getRunnerBounds();
// ctx.fillStyle = '#4f4';
// ctx.fillRect(dbg.x, dbg.y, dbg.width, dbg.height);
// ctx.strokeStyle = '#2a2';
// ctx.lineWidth = 2;
// ctx.strokeRect(dbg.x, dbg.y, dbg.width, dbg.height);

//Runner sheet
runner.draw(ctx);

// Implementing sprite sheet using Javascript
// const SPRITE_SCALE = 2.0;
// const SLIDE_STRETCH_X = 1.5;
// const SLIDE_STRETCH_Y = 0.8;

// const isJumping = runner.jump.active;
// const isSliding = runner.slide.active;

// const spriteW = ENTITY_WIDTH * SPRITE_SCALE * (isSliding ? SLIDE_STRETCH_X : 1);
// const spriteH = ENTITY_HEIGHT * SPRITE_SCALE * (isSliding ? SLIDE_STRETCH_Y : 1);
// const spriteX = runner.x + (runner.width - spriteW) / 2;
// const spriteY = runner.y + runner.height - spriteH + runner.jump.yOffset;

// const activeSheet = isSliding ? slideSheet : isJumping ? jumpSheet : runSheet;
// const activeFrameW = isSliding ? SLIDE_FRAME_W : isJumping ? JUMP_FRAME_W : RUN_FRAME_W;
// const activeFrameH = isSliding ? SLIDE_FRAME_H : isJumping ? JUMP_FRAME_H : RUN_FRAME_H;

// if (activeSheet.complete && activeSheet.naturalWidth > 0) {
//   const sx = runner.anim.frame * activeFrameW;

//   ctx.drawImage(
//     activeSheet,
//     sx, 0, activeFrameW, activeFrameH,
//     spriteX, spriteY, spriteW, spriteH
//   );
// }

// Chaser
const chaserH = chaser.slide.active ? chaser.slide.height : chaser.height;
const chaserW = chaser.slide.active ? chaser.slide.width : chaser.width;
const chaserX = chaser.x - (chaserW - chaser.width) / 2;
const chaserY = chaser.y + (chaser.height - chaserH);

chaser.draw(ctx);

obstacles.forEach(o => o.draw(ctx));
if (hatchState !== 'inactive') drawHatch();

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
    const intensity = (1 - timeScale) / (1 - SLOWMO_FACTOR_MIN); // 0 → 1
    ctx.fillStyle = `rgba(255, 0, 0, ${intensity * 0.08})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  if (wrongFlashTime > 0) {
  const alpha = (wrongFlashTime / WRONG_FLASH_DURATION) * 0.35;
  ctx.fillStyle = `rgba(255, 0, 0, ${alpha})`;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
    // --- Hit Cooldown Visual ---
  if (hitCooldownTime > 0) {
    // 1. Draw a glowing outline around the runner
    const bounds = getRunnerBounds();
    const pulse = Math.sin(hitCooldownTime * 30) * 0.5 + 0.5; // Flickers
    
    ctx.strokeStyle = `rgba(255, 255, 255, ${pulse})`; // White flash
    ctx.lineWidth = 2;
    ctx.strokeRect(bounds.x - 4, bounds.y - 4, bounds.width + 8, bounds.height + 8);
    
    // 2. Optional: Draw a cooldown bar above the runner's head
    const barWidth = 40;
    const barHeight = 4;
    const barX = runner.x + (runner.width - barWidth) / 2;
    const barY = bounds.y - 20;

    // Background of the bar
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(barX, barY, barWidth, barHeight);

    // Fill of the bar (shrinks as cooldown ticks down)
    const fillWidth = barWidth * (hitCooldownTime / HIT_COOLDOWN);
    ctx.fillStyle = '#fff';
    ctx.fillRect(barX, barY, fillWidth, barHeight);
  }

  ctx.restore(); 
}

function drawMeter() {
  const meterLeft = METER_MARGIN_X;
  const meterWidth = canvas.width - METER_MARGIN_X * 2;

  // Position the meter 50px from the bottom of the canvas
  const meterCenterY = canvas.height - METER_BOTTOM_MARGIN;

  // --- Black track line ---
if (meterBarImage.complete && meterBarImage.naturalWidth > 0) {
  ctx.drawImage(
    meterBarImage,
    meterLeft,
    meterCenterY - METER_HEIGHT / 2,
    meterWidth,
    METER_HEIGHT
  );
} else {
  // Fallback while the image loads
  ctx.fillStyle = '#000';
  ctx.fillRect(
    meterLeft,
    meterCenterY - METER_HEIGHT / 2,
    meterWidth,
    METER_HEIGHT
  );
}

  // --- Progress values ---
  const runnerProgress = Math.min(distanceTraveled / JOURNEY_DISTANCE, 1);
  const chaserVisual = getChaserVisualProgress();
  const chaserMeterProgress = chaserVisual * runnerProgress;

  // --- Icon Y (sits center of the track) ---
  const iconY = meterCenterY - ICON_SIZE / 2;
  const trackLeft = meterLeft + METER_TRACK_START_OFFSET;
  const trackWidth = meterWidth - METER_TRACK_START_OFFSET - METER_TRACK_END_OFFSET;

  // --- Chaser icon ---
  const chaserMeterX = trackLeft + chaserMeterProgress * trackWidth;
  drawMeterIcon(chaserHeadImage, chaserMeterX, iconY, '#f44');

  // --- Runner icon ---
 const runnerMeterX = trackLeft + runnerProgress * trackWidth;

  // Figure out which head icon to use (clamp to 1-4 to prevent errors)
  const currentLives = Math.max(1, lives);
  const currentHeadIcon = runnerHeadSheets[currentLives] || runnerHeadSheets[4];

  drawMeterIcon(currentHeadIcon, runnerMeterX, iconY, '#4f4');

  // --- Hatch icon (fixed at the end) ---
  const hatchMeterX = trackLeft + trackWidth;
  drawMeterIcon(hatchHeadImage, hatchMeterX, iconY, '#4bc9f0');
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
function drawMeterIcon(image, centerX, topY, fallbackColor) {
  const x = centerX - ICON_SIZE / 2;

  if (image && image.complete && image.naturalWidth > 0) {
    ctx.drawImage(image, x, topY, ICON_SIZE, ICON_SIZE);
  } else {
    // Fallback: colored square while the icon loads
    ctx.fillStyle = fallbackColor;
    ctx.fillRect(x, topY, ICON_SIZE, ICON_SIZE);
  }
}

function rectsOverlap(a, b) {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}
function getChaserVisualProgress() {
  const chaserStartX = -ENTITY_WIDTH / 2;
  const runnerCX = runner.x + runner.width / 2;
  const chaserCX = chaser.x + chaser.width / 2;

  const totalDistance = runnerCX - chaserStartX;
  if (totalDistance <= 0) return 1;

  const traveled = chaserCX - chaserStartX;
  return Math.max(0, Math.min(traveled / totalDistance, 1));
}

function spawnObstacle() {
  const pool = getCurrentWordPool();
  const word = pool[Math.floor(Math.random() * pool.length)];

  // Decide type
  let type = 'jump';
  if (distanceTraveled >= SLIDE_UNLOCK_DISTANCE) {
    type = Math.random() < SLIDE_CHANCE_AFTER_UNLOCK ? 'slide' : 'jump';
  }

  if (type === 'slide') {
    const floorTop = getFloorTop();
    const obstacleH = SLIDE_OBSTACLE_HEIGHT;
    const obstacleW = SLIDE_OBSTACLE_WIDTH;
    const blockBottom = floorTop - SLIDE_OBSTACLE_GAP;

    const obstacle = new Obstacle(
      canvas.width + 30,
      blockBottom - obstacleH,
      obstacleW,
      obstacleH,
      word,
      'slide',
      0   // no slide variant yet
    );
    obstacle.id = nextObstacleId++;
    obstacles.push(obstacle);
  }else {
    const variantIndex = Math.floor(Math.random() * OBSTACLE_VARIANTS.length);
    const variant = OBSTACLE_VARIANTS[variantIndex];

    const obstacleW = variant.width;
    const obstacleH = variant.height;

    const obstacle = new Obstacle(
      canvas.width + 30,
      getFloorTop() - obstacleH,
      obstacleW,
      obstacleH,
      word,
      'jump',
      variantIndex
    );
    obstacle.id = nextObstacleId++;
    obstacles.push(obstacle);
    console.log('Pushed obstacle. Total:', obstacles.length);
    }
}
function resetGame() {

  survivalTime = 0;
  lives = MAX_LIVES;
  hatchState = 'inactive';
  hatchY = canvas.height + HATCH_HEIGHT;
  hatchTransitionTime = 0;
  hatchWords = [];
  hatchWordIndex = 0;
  hatchTyped = '';
  lockpicksRemaining = HATCH_LOCKPICK_COUNT;
  hitCooldownTime = 0;
  obstacles.length = 0;
  targetedObstacle = null;
  currentTyped = '';
  distanceTraveled = 0;
  chaserDistanceTraveled = 0;

  /* Reset Visual Feedback */
  wrongFlashTime = 0;
  shakeTime = 0;
  

  chaser.x = -CHASER_WIDTH / 2;
  chaser.y = getChaserY();

  
  runner.x = canvas.width * 0.6 - runner.width / 2;
  runner.y = getEntityY();
  runnerStartX = runner.x;

  spawnTimer = 0;
  lastTime = 0;
  chaser.staggerTime = 0;
  score = 0;
  distanceScore = 0;

  runner.jump.active = false;
  runner.jump.time = 0;
  runner.jump.yOffset = 0;
  runner.anim.frame = 0;
  runner.anim.timer = 0;

  chaser.jump.active = false;
  chaser.jump.pending = false;
  chaser.jump.pendingTime = 0;
  chaser.jump.time = 0;
  chaser.jump.yOffset = 0;
  chaser.jump.targetId = null;

  runner.slide.active = false;
  runner.slide.time = 0;
  runner.slide.height = ENTITY_HEIGHT;
  runner.slide.width = ENTITY_WIDTH;

  chaser.slide.active = false;
  chaser.slide.time = 0;
  chaser.slide.height = ENTITY_HEIGHT;
  chaser.slide.width = ENTITY_WIDTH;
  chaser.slide.targetId = null;

}

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  if (typeof runner !== 'undefined') {
    runner.x = canvas.width * 0.6 - runner.width / 2;
    runner.y = getEntityY();
    runnerStartX = runner.x;
  }

  if (typeof chaser !== 'undefined') {
    chaser.y = getChaserY();
  }

  ctx.imageSmoothingEnabled = true;
}

document.fonts.ready.then(() => {
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);
});