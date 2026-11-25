// The kitchen stations: where everything on the floor lives and what each
// station holds while it works. The pantry bins, the chopping board, the two
// stove pots, the plating counter and the serve window are fixed rectangles;
// the board and the pots carry progress that the world advances each step.
import { CHOP_TIME, COOK_TIME, FIELD, INGREDIENTS, PANTRY, READY_WINDOW } from './config.js';

export const STATION = {
  pantry: 'pantry',
  board: 'board',
  stove: 'stove',
  plate: 'plate',
  serve: 'serve',
  trash: 'trash',
};

// Layout of the kitchen floor, in playfield pixels. The pantry runs along the
// top wall, the board and stove sit in the middle, and plating and serving
// share the bottom counter so the route between them is one short walk.
export function createKitchenLayout() {
  const pantryBins = PANTRY.map((ingredient, index) => ({
    kind: STATION.pantry,
    ingredient,
    x: 24 + index * 108,
    y: FIELD.topBar + 16,
    width: 96,
    height: 64,
    label: INGREDIENTS[ingredient].name,
  }));
  return {
    pantryBins,
    board: { kind: STATION.board, x: 60, y: 300, width: 220, height: 120 },
    stove: { kind: STATION.stove, x: 360, y: 300, width: 260, height: 120 },
    plate: { kind: STATION.plate, x: 680, y: 300, width: 220, height: 120 },
    serve: { kind: STATION.serve, x: 700, y: 500, width: 200, height: 110 },
    trash: { kind: STATION.trash, x: 60, y: 500, width: 120, height: 90 },
  };
}

export function createKitchenState() {
  return {
    board: { item: null, progress: 0 },
    pots: [
      { item: null, progress: 0, state: 'empty' },
      { item: null, progress: 0, state: 'empty' },
    ],
    plate: [],
    steam: [],
  };
}

// Advance cooking. Returns events the world turns into sounds and floating
// text: a pot finishing and a pot burning. Chopping advances only when the
// player presses E at the board, so it stays in the world's hands.
export function updateKitchenStations(kitchen, dt, events) {
  for (let index = 0; index < kitchen.pots.length; index += 1) {
    const pot = kitchen.pots[index];
    if (pot.state !== 'cooking' && pot.state !== 'ready') continue;
    pot.progress += dt;
    if (pot.state === 'cooking' && pot.progress >= COOK_TIME) {
      pot.state = 'ready';
      pot.progress = COOK_TIME;
      events.push({ type: 'potReady', pot: index });
    } else if (pot.state === 'ready' && pot.progress >= COOK_TIME + READY_WINDOW) {
      pot.state = 'burnt';
      events.push({ type: 'potBurnt', pot: index });
    }
  }
  // Steam puffs above pots that are cooking, for the sizzle to read at a glance.
  for (let index = 0; index < kitchen.pots.length; index += 1) {
    const pot = kitchen.pots[index];
    if (pot.state === 'cooking' && Math.random() < dt * 6) {
      kitchen.steam.push({ x: 400 + index * 130 + Math.random() * 60, y: 320, life: 0.9, max: 0.9 });
    }
  }
  for (let index = kitchen.steam.length - 1; index >= 0; index -= 1) {
    const puff = kitchen.steam[index];
    puff.life -= dt;
    puff.y -= 28 * dt;
    if (puff.life <= 0) kitchen.steam.splice(index, 1);
  }
}

// What a raw ingredient becomes on each station, and whether the station
// accepts it at all.
export function choppedResult(itemId) {
  const base = INGREDIENTS[itemId.split('.')[0]];
  if (!base || base.prep !== 'chop' || itemId.includes('.')) return null;
  return `${itemId}.chopped`;
}

export function cookedResult(itemId) {
  const base = INGREDIENTS[itemId.split('.')[0]];
  if (!base || base.prep !== 'cook' || itemId.includes('.')) return null;
  return `${itemId}.cooked`;
}

// A pot's cooked item: potatoes boil, everything else fries, but the id is
// the same ".cooked" either way, so recipes stay simple.
export function potLabel(pot) {
  if (!pot.item) return '';
  if (pot.state === 'burnt') return 'Burnt!';
  if (pot.state === 'ready') return 'Ready!';
  return 'Cooking…';
}
