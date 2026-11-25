// Boot and the one loop: input is read every frame, the world advances in
// fixed 1/60 s steps (several in a slow frame, none in a fast one), and the
// renderer paints what is there. The game moves between four screens: title,
// play, paused and game over.
//
// ?seed=N fixes the order pattern. ?shot=start|play|rush|serve (with &seed=N)
// stages that scene instead of running the loop, paints it twice and sets
// window.__shotReady for a screenshot.
import { BEST_KEY, STEP } from './config.js';
import { createRandom } from './random.js';
import { createSoundBoard } from './audio.js';
import {
  ACTION_CONFIRM, ACTION_DISCARD, ACTION_MUTE, ACTION_PAUSE,
  ACTION_RESTART, createInput,
} from './input.js';
import {
  SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE, createWorld,
} from './world.js';
import { createRenderer } from './render.js';
import { stageShot } from './shots.js';

const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(seed);
const renderer = createRenderer(canvas);
const sounds = createSoundBoard();

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best score then lasts this visit only.
  }
}

function playSound(name) {
  if (!name) return;
  if (name === 'pickup') sounds.pickup();
  else if (name === 'chop') sounds.chop();
  else if (name === 'chopDone') sounds.chopDone();
  else if (name === 'sizzle') sounds.sizzle();
  else if (name === 'ding') sounds.ding();
  else if (name === 'serve') sounds.serve();
  else if (name === 'wrong') sounds.wrong();
}

// Screen readers (and anyone watching the page's text) hear the screen
// changes and each served dish.
function announce(message) {
  status.textContent = message;
}

function runShot(name) {
  stageShot(name, world);
  let painted = 0;
  function paint() {
    renderer.draw(world, world.screen);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas, {
    onPointer(point) {
      sounds.unlock();
      if (world.screen === SCREEN_TITLE) {
        world.reset();
        announce('Playing. Serve the orders before patience runs out.');
        return;
      }
      if (world.screen === SCREEN_OVER) {
        world.reset();
        return;
      }
      if (world.screen !== SCREEN_PLAY) return;
      // A click on a station the chef can already reach works it at once;
      // anywhere else sets a walk target.
      world.moveTarget = point;
      const station = world.nearestStation();
      if (station) {
        const centre = { x: station.x + station.width / 2, y: station.y + station.height / 2 };
        if (Math.hypot(point.x - centre.x, point.y - centre.y) < 110) {
          playSound(world.interact());
          world.moveTarget = null;
        }
      }
    },
  });
  let screen = SCREEN_TITLE;
  let best = readBest();
  world.best = best;
  let accumulator = 0;
  let last = performance.now();

  function startGame() {
    world.reset();
    world.best = best;
    screen = SCREEN_PLAY;
    announce('Playing. Serve the orders before patience runs out.');
  }

  function endGame() {
    screen = SCREEN_OVER;
    if (world.score > best) {
      best = world.score;
      world.best = best;
      saveBest(best);
    }
    announce(`Shift over. Score ${world.score}. Best ${best}.`);
  }

  function frame(now) {
    requestAnimationFrame(frame);
    const elapsed = Math.min(MAX_FRAME, (now - last) / 1000);
    last = now;
    const actions = input.takeActions();
    for (const action of actions) {
      sounds.unlock();
      if (action === ACTION_MUTE) {
        const muted = sounds.toggleMuted();
        world.addMessage(muted ? 'Sound off' : 'Sound on', 'info');
      } else if (action === ACTION_RESTART && (screen === SCREEN_OVER || screen === SCREEN_PAUSED)) {
        startGame();
      } else if (action === ACTION_PAUSE && (screen === SCREEN_PLAY || screen === SCREEN_PAUSED)) {
        screen = screen === SCREEN_PLAY ? SCREEN_PAUSED : SCREEN_PLAY;
        world.screen = screen;
      } else if (action === ACTION_CONFIRM) {
        if (screen === SCREEN_TITLE) startGame();
        else if (screen === SCREEN_OVER) startGame();
        else if (screen === SCREEN_PLAY) playSound(world.interact());
      } else if (action === ACTION_DISCARD && screen === SCREEN_PLAY) {
        playSound(world.discardCarried());
      }
    }
    if (screen === SCREEN_PLAY) {
      accumulator += elapsed;
      while (accumulator >= STEP) {
        world.step(STEP, input.moveVector());
        accumulator -= STEP;
      }
      if (world.screen === SCREEN_OVER) endGame();
    }
    world.screen = screen;
    renderer.draw(world, screen);
  }

  // Expose the live state for play-testing from the console.
  window.__game = world;
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
