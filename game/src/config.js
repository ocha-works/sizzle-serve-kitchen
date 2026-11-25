// Every tuning number, colour and recipe in one place, so the kitchen's rules
// can be read without opening the simulation. The playfield is a fixed
// 1280x720 logical area; the renderer scales it to the window, so no rule
// below depends on the screen size.
export const FIELD = { width: 1280, height: 720, topBar: 64 };

export const STEP = 1 / 60;
export const SHIFT_SECONDS = 180;
export const MAX_CARRY = 3;
export const MAX_ORDERS = 4;
export const MAX_HEARTS = 3;

export const CHEF = { radius: 22, speed: 300, interactRange: 96 };

export const CHOP_TIME = 2.4;
export const COOK_TIME = 6;
export const READY_WINDOW = 6;
export const ORDER_PATIENCE = 75;
export const ORDER_SPAWN_SECONDS = 14;
export const LEVEL_SECONDS = 45;

export const PALETTE = {
  backdrop: '#171310',
  floorA: '#8a5a34',
  floorB: '#7d502e',
  wall: '#4a2c1a',
  topBar: '#2b1d12',
  counter: '#c98f4e',
  counterEdge: '#8a5a2a',
  steel: '#b9c2cc',
  steelDark: '#7d8894',
  board: '#e8c98a',
  boardEdge: '#b8935a',
  stove: '#3a3f47',
  flame: '#ff9a2e',
  flameHot: '#ff5a1e',
  plate: '#f5f0e6',
  ticket: '#fff6d8',
  ticketEdge: '#d8b96a',
  text: '#fff8ec',
  darkText: '#2b1d12',
  muted: '#cbb49a',
  good: '#7ed957',
  warn: '#ffb02e',
  bad: '#ff5a4e',
  accent: '#ffcf3f',
  tomato: '#e5484d',
  lettuce: '#7ed957',
  carrot: '#ff8a2e',
  potato: '#e8c98a',
  noodle: '#f2d06b',
  bun: '#d89a4e',
  patty: '#8a5a34',
  egg: '#fff3b0',
};

// One entry per raw ingredient. `prep` says which station transforms it and
// what it becomes: chop turns it into a chopped item, cook into a cooked one,
// and `none` means it is served as it is.
export const INGREDIENTS = {
  tomato: { name: 'Tomato', color: PALETTE.tomato, prep: 'chop', label: 'T' },
  lettuce: { name: 'Lettuce', color: PALETTE.lettuce, prep: 'chop', label: 'L' },
  carrot: { name: 'Carrot', color: PALETTE.carrot, prep: 'chop', label: 'C' },
  potato: { name: 'Potato', color: PALETTE.potato, prep: 'cook', label: 'P' },
  noodle: { name: 'Noodles', color: PALETTE.noodle, prep: 'cook', label: 'N' },
  patty: { name: 'Patty', color: PALETTE.patty, prep: 'cook', label: 'B' },
  bun: { name: 'Bun', color: PALETTE.bun, prep: 'none', label: 'U' },
  egg: { name: 'Egg', color: PALETTE.egg, prep: 'cook', label: 'E' },
};

// Pantry bins, left to right across the top of the kitchen floor.
export const PANTRY = ['tomato', 'lettuce', 'carrot', 'potato', 'noodle', 'patty', 'bun', 'egg'];

// A prepared item id is "raw" or "raw.chopped" / "raw.cooked".
export function preparedName(itemId) {
  const [raw, how] = itemId.split('.');
  const base = INGREDIENTS[raw];
  if (!base) return itemId;
  if (how === 'chopped') return `Chopped ${base.name}`;
  if (how === 'cooked') return `Cooked ${base.name}`;
  if (how === 'boiled') return `Boiled ${base.name}`;
  return base.name;
}

export function preparedColor(itemId) {
  const [raw] = itemId.split('.');
  return (INGREDIENTS[raw] && INGREDIENTS[raw].color) || '#ffffff';
}

// The menu: five original dishes, each a small set of prepared items. A plate
// serves when its items match one open order's recipe exactly, in any order.
export const RECIPES = [
  { id: 'salad', name: 'Garden Salad', items: ['tomato.chopped', 'lettuce.chopped'], base: 20, minutes: '2 min' },
  { id: 'pasta', name: 'Tomato Pasta', items: ['noodle.cooked', 'tomato.chopped'], base: 25, minutes: '3 min' },
  { id: 'burger', name: 'Sunny Burger', items: ['bun', 'patty.cooked', 'lettuce.chopped'], base: 30, minutes: '4 min' },
  { id: 'soup', name: 'Veggie Soup', items: ['potato.cooked', 'carrot.chopped'], base: 25, minutes: '3 min' },
  { id: 'omelette', name: 'Farm Omelette', items: ['egg.cooked', 'tomato.chopped', 'lettuce.chopped'], base: 35, minutes: '5 min' },
];

export function findRecipe(id) {
  return RECIPES.find((recipe) => recipe.id === id);
}

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';
export const BEST_KEY = 'sizzle-and-serve.best';
