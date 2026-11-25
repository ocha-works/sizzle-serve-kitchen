// The simulation: the chef, what they carry, and every rule that turns an
// interaction into points. Movement is free (WASD / arrows / click-to-move);
// E works the nearest station, Q throws the last carried item away, and the
// shift ends when the timer runs out or three orders are lost.
import {
  CHEF, COOK_TIME, FIELD, INGREDIENTS, LEVEL_SECONDS, MAX_CARRY,
  MAX_HEARTS, READY_WINDOW, SHIFT_SECONDS, STEP,
} from './config.js';
import { createRandom } from './random.js';
import { createOrderBoard } from './orders.js';
import {
  STATION, choppedResult, cookedResult, createKitchenLayout,
  createKitchenState, updateKitchenStations,
} from './kitchen.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';

function stationCentre(station) {
  return { x: station.x + station.width / 2, y: station.y + station.height / 2 };
}

function distanceToStation(chef, station) {
  const centre = stationCentre(station);
  const dx = Math.max(Math.abs(chef.x - centre.x) - station.width / 2, 0);
  const dy = Math.max(Math.abs(chef.y - centre.y) - station.height / 2, 0);
  return Math.hypot(dx, dy);
}

export function createWorld(seed) {
  const random = createRandom(seed);
  const layout = createKitchenLayout();
  const board = createOrderBoard(random);
  const world = {
    random,
    layout,
    board,
    kitchen: createKitchenState(),
    chef: { x: 480, y: 560, facing: 1 },
    carry: [],
    score: 0,
    coins: 0,
    served: 0,
    hearts: MAX_HEARTS,
    timeLeft: SHIFT_SECONDS,
    elapsed: 0,
    level: 1,
    combo: 0,
    comboTimer: 0,
    best: 0,
    screen: SCREEN_TITLE,
    messages: [],
    moveTarget: null,
    lastAction: '',

    reset() {
      world.kitchen = createKitchenState();
      world.board.reset();
      world.chef = { x: 480, y: 560, facing: 1 };
      world.carry = [];
      world.score = 0;
      world.coins = 0;
      world.served = 0;
      world.hearts = MAX_HEARTS;
      world.timeLeft = SHIFT_SECONDS;
      world.elapsed = 0;
      world.level = 1;
      world.combo = 0;
      world.comboTimer = 0;
      world.messages = [];
      world.moveTarget = null;
      world.lastAction = '';
      world.board.spawnOrder('salad');
      world.board.spawnOrder('pasta');
      world.screen = SCREEN_PLAY;
    },

    addMessage(text, kind) {
      world.messages.push({ text, kind: kind || 'info', life: 2.4 });
      if (world.messages.length > 4) world.messages.shift();
    },

    // The nearest station the chef can reach, or null when too far away.
    nearestStation() {
      const stations = [
        ...layout.pantryBins,
        layout.board, layout.stove, layout.plate, layout.serve, layout.trash,
      ];
      let bestStation = null;
      let bestDistance = CHEF.interactRange;
      for (const station of stations) {
        const distance = distanceToStation(world.chef, station);
        if (distance < bestDistance) { bestDistance = distance; bestStation = station; }
      }
      return bestStation;
    },

    // One line of help for the station under the chef, so the player always
    // knows what E will do next.
    actionHint() {
      const station = world.nearestStation();
      if (!station) return 'Move with WASD / arrows, or click a spot to walk there';
      if (station.kind === STATION.pantry) {
        return world.carry.length >= MAX_CARRY
          ? 'Hands full — serve or trash something first'
          : `E: take ${station.label}`;
      }
      if (station.kind === STATION.board) {
        if (world.kitchen.board.item) return 'E: chop! (keep pressing)';
        const choppable = world.carry.find((item) => choppedResult(item));
        return choppable ? `E: put ${INGREDIENTS[choppable].name} on the board` : 'Board: bring something to chop';
      }
      if (station.kind === STATION.stove) {
        const ready = world.kitchen.pots.find((pot) => pot.state === 'ready');
        if (ready && world.carry.length < MAX_CARRY) return 'E: take the cooked dish off the stove';
        const burnt = world.kitchen.pots.find((pot) => pot.state === 'burnt');
        if (burnt) return 'E: clear the burnt pot';
        const cookable = world.carry.find((item) => cookedResult(item));
        return cookable ? `E: put ${INGREDIENTS[cookable].name} in a pot` : 'Stove: bring noodles, a patty or an egg';
      }
      if (station.kind === STATION.plate) {
        if (world.carry.length === 0) return 'Plating counter: bring ingredients for the plate';
        return 'E: add a carried item to the plate';
      }
      if (station.kind === STATION.serve) {
        return world.kitchen.plate.length === 0
          ? 'Serve window: finish a plate first'
          : 'E: serve the plate!';
      }
      if (station.kind === STATION.trash) return 'E: throw away the last carried item';
      return '';
    },

    // The E key (or a click on a station): do the one thing that station does
    // with what the chef carries. Returns a sound event name, or ''.
    interact() {
      const station = world.nearestStation();
      if (!station) return '';
      if (station.kind === STATION.pantry) return world.takeFromPantry(station);
      if (station.kind === STATION.board) return world.workBoard();
      if (station.kind === STATION.stove) return world.workStove();
      if (station.kind === STATION.plate) return world.addToPlate();
      if (station.kind === STATION.serve) return world.servePlate();
      if (station.kind === STATION.trash) return world.discardCarried();
      return '';
    },

    takeFromPantry(station) {
      if (world.carry.length >= MAX_CARRY) {
        world.addMessage('Hands full!', 'bad');
        return 'wrong';
      }
      world.carry.push(station.ingredient);
      world.lastAction = `Picked up ${station.label}`;
      return 'pickup';
    },

    workBoard() {
      const boardState = world.kitchen.board;
      if (boardState.item) {
        boardState.progress += 0.8;
        if (boardState.progress >= 2.4) {
          const done = choppedResult(boardState.item);
          boardState.item = null;
          boardState.progress = 0;
          if (world.carry.length < MAX_CARRY) {
            world.carry.push(done);
            world.addMessage(`${done.split('.')[0]} chopped!`, 'good');
          }
          return 'chopDone';
        }
        return 'chop';
      }
      const index = world.carry.findIndex((item) => choppedResult(item));
      if (index === -1) {
        world.addMessage('Nothing here needs chopping', 'bad');
        return 'wrong';
      }
      boardState.item = world.carry.splice(index, 1)[0];
      boardState.progress = 0;
      world.lastAction = `Chopping ${INGREDIENTS[boardState.item].name}`;
      return 'pickup';
    },

    workStove() {
      const pots = world.kitchen.pots;
      const burntIndex = pots.findIndex((pot) => pot.state === 'burnt');
      if (burntIndex !== -1) {
        pots[burntIndex] = { item: null, progress: 0, state: 'empty' };
        world.addMessage('Burnt pot cleared', 'info');
        return 'wrong';
      }
      const readyIndex = pots.findIndex((pot) => pot.state === 'ready');
      if (readyIndex !== -1) {
        if (world.carry.length >= MAX_CARRY) {
          world.addMessage('Hands full!', 'bad');
          return 'wrong';
        }
        const pot = pots[readyIndex];
        world.carry.push(cookedResult(pot.item));
        world.addMessage(`${INGREDIENTS[pot.item].name} cooked!`, 'good');
        pots[readyIndex] = { item: null, progress: 0, state: 'empty' };
        return 'ding';
      }
      const carryIndex = world.carry.findIndex((item) => cookedResult(item));
      if (carryIndex === -1) {
        world.addMessage('Nothing here needs cooking', 'bad');
        return 'wrong';
      }
      const emptyIndex = pots.findIndex((pot) => pot.state === 'empty');
      if (emptyIndex === -1) {
        world.addMessage('Both pots are busy!', 'bad');
        return 'wrong';
      }
      pots[emptyIndex] = { item: world.carry.splice(carryIndex, 1)[0], progress: 0, state: 'cooking' };
      world.lastAction = `Cooking ${INGREDIENTS[pots[emptyIndex].item].name}`;
      return 'sizzle';
    },

    addToPlate() {
      if (world.carry.length === 0) {
        world.addMessage('Carry something to plate it', 'bad');
        return 'wrong';
      }
      const item = world.carry.shift();
      world.kitchen.plate.push(item);
      world.lastAction = `Plated ${item}`;
      const match = world.board.findMatchingOrder(world.kitchen.plate);
      if (match) world.addMessage(`${match.name} is ready to serve!`, 'good');
      return 'pickup';
    },

    servePlate() {
      const plate = world.kitchen.plate;
      if (plate.length === 0) {
        world.addMessage('The plate is empty', 'bad');
        return 'wrong';
      }
      const order = world.board.findMatchingOrder(plate);
      if (!order) {
        world.addMessage('No order matches this plate!', 'bad');
        world.score = Math.max(0, world.score - 5);
        return 'wrong';
      }
      const tip = world.board.tipFor(order);
      world.combo = world.comboTimer > 0 ? world.combo + 1 : 1;
      world.comboTimer = 20;
      const multiplier = 1 + Math.min(2, world.combo - 1) * 0.25;
      const earned = Math.round((order.base + tip) * multiplier);
      world.score += earned;
      world.coins += earned;
      world.served += 1;
      world.board.removeOrder(order);
      world.kitchen.plate = [];
      world.addMessage(`Served ${order.name}! +${earned} coins${world.combo > 1 ? ` (combo x${world.combo})` : ''}`, 'good');
      return 'serve';
    },

    discardCarried() {
      if (world.carry.length === 0 && world.kitchen.plate.length === 0) {
        world.addMessage('Nothing to throw away', 'bad');
        return 'wrong';
      }
      if (world.carry.length > 0) world.carry.pop();
      else world.kitchen.plate.pop();
      world.addMessage('Tossed it', 'info');
      return 'wrong';
    },

    // Move the chef one fixed step. Keyboard direction wins over a
    // click-to-move target; walls and counters block the way.
    step(dt, move) {
      if (world.screen !== SCREEN_PLAY) return;
      world.elapsed += dt;
      world.timeLeft -= dt;
      world.comboTimer = Math.max(0, world.comboTimer - dt);
      const newLevel = 1 + Math.floor(world.elapsed / LEVEL_SECONDS);
      if (newLevel !== world.level) {
        world.level = newLevel;
        world.addMessage(`Rush level ${world.level} — orders come faster!`, 'warn');
      }
      const expired = world.board.update(dt, world.level);
      for (const order of expired) {
        world.hearts -= 1;
        world.combo = 0;
        world.addMessage(`${order.name} walked out! -1 heart`, 'bad');
      }
      const events = [];
      updateKitchenStations(world.kitchen, dt, events);
      for (const event of events) {
        if (event.type === 'potReady') world.addMessage('A pot is ready!', 'good');
        if (event.type === 'potBurnt') world.addMessage('A pot burnt! Clear it!', 'bad');
      }
      for (let index = world.messages.length - 1; index >= 0; index -= 1) {
        world.messages[index].life -= dt;
        if (world.messages[index].life <= 0) world.messages.splice(index, 1);
      }
      let dx = move.x;
      let dy = move.y;
      if (dx === 0 && dy === 0 && world.moveTarget) {
        const tx = world.moveTarget.x - world.chef.x;
        const ty = world.moveTarget.y - world.chef.y;
        const length = Math.hypot(tx, ty);
        if (length < 8) world.moveTarget = null;
        else { dx = tx / length; dy = ty / length; }
      }
      if (dx !== 0 || dy !== 0) {
        const length = Math.hypot(dx, dy) || 1;
        const speed = CHEF.speed * dt;
        world.chef.x += (dx / length) * speed;
        world.chef.y += (dy / length) * speed;
        world.chef.facing = dx < 0 ? -1 : dx > 0 ? 1 : world.chef.facing;
        world.chef.x = Math.max(30, Math.min(920, world.chef.x));
        world.chef.y = Math.max(FIELD.topBar + 130, Math.min(FIELD.height - 30, world.chef.y));
      }
      if (world.timeLeft <= 0 || world.hearts <= 0) {
        world.timeLeft = Math.max(0, world.timeLeft);
        world.screen = SCREEN_OVER;
        if (world.score > world.best) world.best = world.score;
      }
    },
  };
  world.reset();
  world.screen = SCREEN_TITLE;
  return world;
}

// The shift timer as mm:ss, for the HUD.
export function formatShiftTime(seconds) {
  const total = Math.max(0, Math.ceil(seconds));
  const minutes = Math.floor(total / 60);
  const rest = total % 60;
  return `${minutes}:${String(rest).padStart(2, '0')}`;
}

export { COOK_TIME, READY_WINDOW, STEP };
