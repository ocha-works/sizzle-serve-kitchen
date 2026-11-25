// Orders: the tickets on the order board. Each one names a recipe, carries a
// patience bar that drains while it waits, and pays a tip that shrinks as the
// patience runs out. Spawning, expiry and matching all live here.
import { MAX_ORDERS, ORDER_PATIENCE, ORDER_SPAWN_SECONDS, RECIPES } from './config.js';
import { pickRandom } from './random.js';

export function createOrderBoard(random) {
  let nextId = 1;
  let spawnIn = 3;
  const board = {
    orders: [],

    reset() {
      board.orders = [];
      nextId = 1;
      spawnIn = 3;
    },

    spawnOrder(recipeId) {
      const recipe = RECIPES.find((entry) => entry.id === recipeId)
        || pickRandom(random, RECIPES);
      const order = {
        id: nextId,
        recipeId: recipe.id,
        name: recipe.name,
        items: recipe.items.slice(),
        base: recipe.base,
        patience: ORDER_PATIENCE,
        maxPatience: ORDER_PATIENCE,
        fresh: true,
      };
      nextId += 1;
      board.orders.push(order);
      return order;
    },

    // Advance the spawn clock and drain every patience bar. Returns the list
    // of orders whose patience just ran out.
    update(dt, level) {
      const expired = [];
      spawnIn -= dt;
      if (spawnIn <= 0 && board.orders.length < MAX_ORDERS) {
        board.spawnOrder();
        spawnIn = Math.max(6, ORDER_SPAWN_SECONDS - level);
      }
      for (let index = board.orders.length - 1; index >= 0; index -= 1) {
        const order = board.orders[index];
        order.patience -= dt;
        order.fresh = false;
        if (order.patience <= 0) {
          board.orders.splice(index, 1);
          expired.push(order);
        }
      }
      return expired;
    },

    // The tip for serving now: up to +20 coins when the ticket is still fresh.
    tipFor(order) {
      return Math.round(20 * Math.max(0, order.patience / order.maxPatience));
    },

    // Find the open order whose recipe matches this plate exactly, in any
    // order. A plate with extra or missing items matches nothing.
    findMatchingOrder(plateItems) {
      for (const order of board.orders) {
        if (order.items.length !== plateItems.length) continue;
        const wanted = order.items.slice().sort();
        const given = plateItems.slice().sort();
        let matches = true;
        for (let index = 0; index < wanted.length; index += 1) {
          if (wanted[index] !== given[index]) { matches = false; break; }
        }
        if (matches) return order;
      }
      return null;
    },

    removeOrder(order) {
      const index = board.orders.indexOf(order);
      if (index !== -1) board.orders.splice(index, 1);
    },

    // How much of this order's recipe the plate already covers, for the
    // progress dots drawn on each ticket.
    plateProgress(order, plateItems) {
      let covered = 0;
      const remaining = order.items.slice();
      for (const item of plateItems) {
        const at = remaining.indexOf(item);
        if (at !== -1) { remaining.splice(at, 1); covered += 1; }
      }
      return { covered, total: order.items.length };
    },
  };
  return board;
}
