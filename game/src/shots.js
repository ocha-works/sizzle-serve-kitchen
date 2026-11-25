// Staged screenshot scenes. Each one builds a real game state — orders on
// the board, ingredients on the counters, a dish mid-assembly, a pot cooking
// and a plate ready to serve — then leaves the renderer to paint it, so the
// screenshots are honest renders of the game itself. ?shot=start|play|rush|serve
// (with &seed=N) picks the scene; anything else runs the game normally.
import { SCREEN_PLAY } from './world.js';

function placeForShot(world, setup) {
  world.reset();
  // reset() opens with two starter tickets; a staged scene brings its own.
  world.board.orders = [];
  setup(world);
  world.screen = SCREEN_PLAY;
  window.__shotReady = true;
}

function orderWithPatience(world, recipeId, patience) {
  const order = world.board.spawnOrder(recipeId);
  order.patience = patience;
  return order;
}

export function stageShot(name, world) {
  if (name === 'play') {
    placeForShot(world, (state) => {
      orderWithPatience(state, 'salad', 58);
      orderWithPatience(state, 'pasta', 44);
      orderWithPatience(state, 'burger', 66);
      state.kitchen.board.item = 'tomato';
      state.kitchen.board.progress = 1.4;
      state.kitchen.pots[0] = { item: 'noodle', progress: 3.2, state: 'cooking' };
      state.kitchen.plate = ['tomato.chopped'];
      state.carry = ['lettuce.chopped'];
      state.chef.x = 470;
      state.chef.y = 470;
      state.score = 45;
      state.coins = 45;
      state.served = 2;
      state.timeLeft = 142;
      state.addMessage('Tomato Pasta is almost ready!', 'info');
    });
    return;
  }
  if (name === 'rush') {
    placeForShot(world, (state) => {
      orderWithPatience(state, 'burger', 16);
      orderWithPatience(state, 'omelette', 24);
      orderWithPatience(state, 'soup', 33);
      orderWithPatience(state, 'pasta', 12);
      state.kitchen.board.item = 'lettuce';
      state.kitchen.board.progress = 2.0;
      state.kitchen.pots[0] = { item: 'patty', progress: 6, state: 'ready' };
      state.kitchen.pots[1] = { item: 'egg', progress: 4.1, state: 'cooking' };
      state.kitchen.plate = ['bun', 'patty.cooked'];
      state.carry = ['lettuce.chopped'];
      state.chef.x = 760;
      state.chef.y = 460;
      state.score = 130;
      state.coins = 130;
      state.served = 5;
      state.timeLeft = 58;
      state.level = 3;
      state.combo = 2;
      state.comboTimer = 12;
      state.addMessage('Rush level 3 — orders come faster!', 'warn');
    });
    return;
  }
  if (name === 'serve') {
    placeForShot(world, (state) => {
      orderWithPatience(state, 'salad', 52);
      orderWithPatience(state, 'soup', 38);
      state.kitchen.plate = ['tomato.chopped', 'lettuce.chopped'];
      state.chef.x = 630;
      state.chef.y = 580;
      state.score = 70;
      state.coins = 70;
      state.served = 3;
      state.timeLeft = 121;
      state.addMessage('Garden Salad is ready to serve!', 'good');
    });
    return;
  }
  // Default: the start scene — a calm kitchen before the first rush, with two
  // tickets up, a tomato half-chopped and a pot already on the stove.
  placeForShot(world, (state) => {
    orderWithPatience(state, 'salad', 70);
    orderWithPatience(state, 'pasta', 62);
    state.kitchen.board.item = 'carrot';
    state.kitchen.board.progress = 0.9;
    state.kitchen.pots[0] = { item: 'potato', progress: 2.2, state: 'cooking' };
    state.chef.x = 200;
    state.chef.y = 470;
    state.timeLeft = 175;
    state.addMessage('Welcome to the Hearthside Kitchen!', 'info');
  });
}
