// Drawing only: the world's state and the current screen in, pixels out.
// The 1280x720 playfield is scaled to fit the window and centred. Everything
// is drawn with canvas shapes and text — no image files — so the game loads
// nothing over the network.
import { FIELD, FONT, INGREDIENTS, PALETTE, preparedColor, preparedName } from './config.js';
import { SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE, formatShiftTime } from './world.js';
import { findRecipe } from './config.js';
import { potLabel } from './kitchen.js';

const ORDER_BOARD = { x: 952, y: 80, width: 304, height: 620 };

function roundRect(context, x, y, width, height, radius) {
  context.beginPath();
  context.moveTo(x + radius, y);
  context.arcTo(x + width, y, x + width, y + height, radius);
  context.arcTo(x + width, y + height, x, y + height, radius);
  context.arcTo(x, y + height, x, y, radius);
  context.arcTo(x, y, x + width, y, radius);
  context.closePath();
}

export function createRenderer(canvas) {
  const context = canvas.getContext('2d');
  const view = { scale: 1, x: 0, y: 0 };
  const fonts = new Map();

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    const width = Math.round(window.innerWidth * ratio);
    const height = Math.round(window.innerHeight * ratio);
    canvas.width = width;
    canvas.height = height;
    view.scale = Math.min(width / FIELD.width, height / FIELD.height);
    view.x = (width - FIELD.width * view.scale) / 2;
    view.y = (height - FIELD.height * view.scale) / 2;
  }

  function text(value, x, y, size, color, align, bold) {
    const key = `${size}:${bold ? 1 : 0}`;
    if (!fonts.has(key)) fonts.set(key, `${bold ? '700 ' : ''}${size}px ${FONT}`);
    context.font = fonts.get(key);
    context.fillStyle = color;
    context.textAlign = align || 'left';
    context.textBaseline = 'alphabetic';
    context.fillText(value, x, y);
  }

  function drawIngredientDot(x, y, radius, itemId) {
    const [raw, how] = itemId.split('.');
    const base = INGREDIENTS[raw];
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fillStyle = preparedColor(itemId);
    context.fill();
    context.lineWidth = 2;
    context.strokeStyle = 'rgba(0,0,0,0.35)';
    context.stroke();
    if (base) {
      text(base.label, x, y + radius * 0.38, Math.round(radius * 0.9), '#2b1d12', 'center', true);
    }
    if (how) {
      context.beginPath();
      context.arc(x + radius * 0.7, y - radius * 0.7, radius * 0.42, 0, Math.PI * 2);
      context.fillStyle = how === 'chopped' ? '#fff3b0' : '#ff9a2e';
      context.fill();
      text(how === 'chopped' ? 'C' : 'H', x + radius * 0.7, y - radius * 0.28, Math.round(radius * 0.55), '#2b1d12', 'center', true);
    }
  }

  function drawProgressBar(x, y, width, height, fraction, color) {
    roundRect(context, x, y, width, height, height / 2);
    context.fillStyle = 'rgba(0,0,0,0.45)';
    context.fill();
    if (fraction > 0) {
      roundRect(context, x + 2, y + 2, Math.max(4, (width - 4) * Math.min(1, fraction)), height - 4, (height - 4) / 2);
      context.fillStyle = color;
      context.fill();
    }
  }

  function drawTopBar(state) {
    context.fillStyle = PALETTE.topBar;
    context.fillRect(0, 0, FIELD.width, FIELD.topBar);
    text('SIZZLE & SERVE', 20, 42, 28, PALETTE.accent, 'left', true);
    text(`Score ${state.score}`, 330, 42, 24, PALETTE.text, 'left', true);
    text(`Coins ${state.coins}`, 500, 42, 24, PALETTE.accent, 'left', true);
    text(`Served ${state.served}`, 660, 42, 24, PALETTE.text, 'left', true);
    text(`Day ${state.level}`, 800, 42, 24, PALETTE.text, 'left', true);
    const urgent = state.timeLeft <= 30;
    text(`TIME ${formatShiftTime(state.timeLeft)}`, 900, 42, 26, urgent ? PALETTE.bad : PALETTE.text, 'left', true);
    drawProgressBar(1030, 22, 150, 18, state.timeLeft / 180, urgent ? PALETTE.bad : PALETTE.good);
    const hearts = '♥'.repeat(state.hearts) + '♡'.repeat(3 - state.hearts);
    text(hearts, 1200, 42, 24, PALETTE.bad, 'left', true);
  }

  function drawOrderBoard(state) {
    roundRect(context, ORDER_BOARD.x, ORDER_BOARD.y, ORDER_BOARD.width, ORDER_BOARD.height, 14);
    context.fillStyle = '#3a2417';
    context.fill();
    context.lineWidth = 3;
    context.strokeStyle = PALETTE.ticketEdge;
    context.stroke();
    text('ORDER BOARD', ORDER_BOARD.x + 16, ORDER_BOARD.y + 34, 24, PALETTE.accent, 'left', true);
    text(`${state.board.orders.length} ticket${state.board.orders.length === 1 ? '' : 's'} waiting`, ORDER_BOARD.x + 16, ORDER_BOARD.y + 58, 15, PALETTE.muted);
    let y = ORDER_BOARD.y + 76;
    for (const order of state.board.orders) {
      const recipe = findRecipe(order.recipeId);
      const height = 112;
      roundRect(context, ORDER_BOARD.x + 12, y, ORDER_BOARD.width - 24, height, 10);
      context.fillStyle = PALETTE.ticket;
      context.fill();
      context.lineWidth = 2;
      context.strokeStyle = order.patience < 20 ? PALETTE.bad : PALETTE.ticketEdge;
      context.stroke();
      text(`#${order.id}  ${order.name}`, ORDER_BOARD.x + 24, y + 26, 19, PALETTE.darkText, 'left', true);
      const patienceFraction = Math.max(0, order.patience / order.maxPatience);
      drawProgressBar(ORDER_BOARD.x + 24, y + 34, ORDER_BOARD.width - 48, 8, patienceFraction, patienceFraction < 0.27 ? PALETTE.bad : patienceFraction < 0.55 ? PALETTE.warn : PALETTE.good);
      order.items.forEach((item, index) => {
        const ix = ORDER_BOARD.x + 40 + index * 62;
        drawIngredientDot(ix, y + 58, 17, item);
        text(preparedName(item).replace('Chopped ', '').replace('Cooked ', ''), ix, y + 84, 11, PALETTE.darkText, 'center');
      });
      const progress = state.board.plateProgress(order, state.kitchen.plate);
      text(`on plate: ${progress.covered}/${progress.total}`, ORDER_BOARD.x + 24, y + height - 10, 13, '#5a4028');
      text(`$${order.base} + tip $${state.board.tipFor(order)}`, ORDER_BOARD.x + ORDER_BOARD.width - 24, y + height - 10, 14, '#8a5a2a', 'right', true);
      y += height + 8;
    }
    if (state.board.orders.length === 0) {
      text('No orders yet —', ORDER_BOARD.x + 20, y + 30, 18, PALETTE.muted);
      text('the lunch rush is coming!', ORDER_BOARD.x + 20, y + 56, 18, PALETTE.muted);
    }
    text('Serve the exact recipe', ORDER_BOARD.x + 16, ORDER_BOARD.y + ORDER_BOARD.height - 28, 14, PALETTE.muted);
    text('before patience runs out.', ORDER_BOARD.x + 16, ORDER_BOARD.y + ORDER_BOARD.height - 10, 14, PALETTE.muted);
  }

  function drawPantry(state) {
    text('PANTRY — take ingredients (E)', 24, FIELD.topBar + 14, 14, PALETTE.text, 'left', true);
    for (const bin of state.layout.pantryBins) {
      roundRect(context, bin.x, bin.y, bin.width, bin.height, 10);
      context.fillStyle = PALETTE.counter;
      context.fill();
      context.lineWidth = 3;
      context.strokeStyle = PALETTE.counterEdge;
      context.stroke();
      drawIngredientDot(bin.x + bin.width / 2, bin.y + 26, 15, bin.ingredient);
      text(bin.label, bin.x + bin.width / 2, bin.y + 56, 13, PALETTE.darkText, 'center', true);
    }
  }

  function drawChoppingBoard(state) {
    const boardStation = state.layout.board;
    const kitchenBoard = state.kitchen.board;
    roundRect(context, boardStation.x, boardStation.y, boardStation.width, boardStation.height, 12);
    context.fillStyle = PALETTE.board;
    context.fill();
    context.lineWidth = 3;
    context.strokeStyle = PALETTE.boardEdge;
    context.stroke();
    text('CHOPPING BOARD', boardStation.x + 12, boardStation.y + 24, 16, PALETTE.darkText, 'left', true);
    if (kitchenBoard.item) {
      drawIngredientDot(boardStation.x + 60, boardStation.y + 68, 22, kitchenBoard.item);
      text(preparedName(kitchenBoard.item), boardStation.x + 92, boardStation.y + 64, 15, PALETTE.darkText, 'left', true);
      text('Press E to chop!', boardStation.x + 92, boardStation.y + 88, 14, '#8a5a2a', 'left', true);
      drawProgressBar(boardStation.x + 14, boardStation.y + boardStation.height - 18, boardStation.width - 28, 10, kitchenBoard.progress / 2.4, PALETTE.good);
    } else {
      text('Bring tomato, lettuce', boardStation.x + 12, boardStation.y + 58, 15, '#5a4028');
      text('or carrot here', boardStation.x + 12, boardStation.y + 80, 15, '#5a4028');
    }
  }

  function drawStove(state) {
    const stove = state.layout.stove;
    roundRect(context, stove.x, stove.y, stove.width, stove.height, 12);
    context.fillStyle = PALETTE.stove;
    context.fill();
    context.lineWidth = 3;
    context.strokeStyle = PALETTE.steelDark;
    context.stroke();
    text('STOVE', stove.x + 12, stove.y + 24, 16, '#eef1f5', 'left', true);
    state.kitchen.pots.forEach((pot, index) => {
      const px = stove.x + 30 + index * 130;
      const py = stove.y + 44;
      context.beginPath();
      context.arc(px + 40, py + 26, 34, 0, Math.PI * 2);
      context.fillStyle = pot.state === 'burnt' ? '#2b2b2b' : '#22262c';
      context.fill();
      context.lineWidth = 4;
      context.strokeStyle = pot.state === 'cooking' ? PALETTE.flame : PALETTE.steel;
      context.stroke();
      if (pot.state === 'cooking') {
        context.beginPath();
        context.arc(px + 40, py + 26, 24, 0, Math.PI * 2);
        context.fillStyle = PALETTE.flameHot;
        context.fill();
      }
      if (pot.item) drawIngredientDot(px + 40, py + 26, 16, pot.item);
      text(potLabel(pot) || 'Empty pot', px + 40, py + 78, 13, '#eef1f5', 'center', true);
      if (pot.state === 'cooking' || pot.state === 'ready') {
        const fraction = pot.state === 'ready' ? 1 : pot.progress / 6;
        drawProgressBar(px, py + 88, 80, 8, fraction, pot.state === 'ready' ? PALETTE.good : PALETTE.flame);
      }
    });
    for (const puff of state.kitchen.steam) {
      context.globalAlpha = Math.max(0, puff.life / puff.max) * 0.5;
      context.beginPath();
      context.arc(puff.x, puff.y, 10, 0, Math.PI * 2);
      context.fillStyle = '#ffffff';
      context.fill();
      context.globalAlpha = 1;
    }
  }

  function drawPlatingCounter(state) {
    const counter = state.layout.plate;
    const plate = state.kitchen.plate;
    const match = state.board.findMatchingOrder(plate);
    roundRect(context, counter.x, counter.y, counter.width, counter.height, 12);
    context.fillStyle = match ? '#ffe9a8' : PALETTE.counter;
    context.fill();
    context.lineWidth = match ? 5 : 3;
    context.strokeStyle = match ? PALETTE.good : PALETTE.counterEdge;
    context.stroke();
    text(match ? 'PLATE — READY TO SERVE!' : 'PLATING COUNTER', counter.x + 12, counter.y + 24, 16, PALETTE.darkText, 'left', true);
    if (plate.length === 0) {
      text('Add ingredients here', counter.x + 12, counter.y + 58, 15, '#5a4028');
      text('to build a dish', counter.x + 12, counter.y + 80, 15, '#5a4028');
    } else {
      plate.forEach((item, index) => {
        const ix = counter.x + 34 + index * 58;
        drawIngredientDot(ix, counter.y + 62, 18, item);
        text(preparedName(item).replace('Chopped ', '').replace('Cooked ', ''), ix, counter.y + 96, 11, PALETTE.darkText, 'center');
      });
    }
  }

  function drawServeWindow(state) {
    const serve = state.layout.serve;
    roundRect(context, serve.x, serve.y, serve.width, serve.height, 12);
    context.fillStyle = '#5a3a22';
    context.fill();
    context.lineWidth = 3;
    context.strokeStyle = PALETTE.accent;
    context.stroke();
    text('SERVE WINDOW', serve.x + 12, serve.y + 26, 18, PALETTE.accent, 'left', true);
    text('Bring a finished plate', serve.x + 12, serve.y + 54, 15, PALETTE.text);
    text('here and press E', serve.x + 12, serve.y + 76, 15, PALETTE.text);
    if (state.kitchen.plate.length > 0) {
      const match = state.board.findMatchingOrder(state.kitchen.plate);
      text(match ? `Serves #${match.id} ${match.name}` : 'No order matches yet', serve.x + 12, serve.y + 98, 13, match ? PALETTE.good : PALETTE.warn, 'left', true);
    }
  }

  function drawTrash(state) {
    const trash = state.layout.trash;
    roundRect(context, trash.x, trash.y, trash.width, trash.height, 10);
    context.fillStyle = '#4a4f55';
    context.fill();
    context.lineWidth = 3;
    context.strokeStyle = PALETTE.steelDark;
    context.stroke();
    text('TRASH', trash.x + 12, trash.y + 26, 16, '#eef1f5', 'left', true);
    text('E: toss last item', trash.x + 12, trash.y + 52, 13, '#cbb49a');
  }

  function drawChef(state) {
    const chef = state.chef;
    const highlight = state.nearestStation();
    if (highlight) {
      const centreX = highlight.x + highlight.width / 2;
      const centreY = highlight.y + highlight.height / 2;
      context.save();
      context.strokeStyle = 'rgba(255,207,63,0.9)';
      context.lineWidth = 3;
      context.setLineDash([8, 6]);
      roundRect(context, highlight.x - 4, highlight.y - 4, highlight.width + 8, highlight.height + 8, 12);
      context.stroke();
      context.restore();
    }
    // Shadow, body, apron, head and chef's hat.
    context.beginPath();
    context.ellipse(chef.x, chef.y + 20, 24, 8, 0, 0, Math.PI * 2);
    context.fillStyle = 'rgba(0,0,0,0.3)';
    context.fill();
    context.beginPath();
    context.arc(chef.x, chef.y + 6, 20, 0, Math.PI * 2);
    context.fillStyle = '#f5f0e6';
    context.fill();
    context.beginPath();
    context.arc(chef.x, chef.y - 16, 15, 0, Math.PI * 2);
    context.fillStyle = '#f2c9a0';
    context.fill();
    context.beginPath();
    context.arc(chef.x - 8, chef.y - 30, 9, Math.PI, 0);
    context.arc(chef.x + 8, chef.y - 30, 9, Math.PI, 0);
    context.fillStyle = '#ffffff';
    context.fill();
    context.fillRect(chef.x - 17, chef.y - 32, 34, 8);
    context.beginPath();
    context.arc(chef.x + chef.facing * 5, chef.y - 16, 2.5, 0, Math.PI * 2);
    context.fillStyle = '#2b1d12';
    context.fill();
    // Carried ingredients bob above the chef.
    state.carry.forEach((item, index) => {
      const ix = chef.x - (state.carry.length - 1) * 16 + index * 32;
      drawIngredientDot(ix, chef.y - 48, 13, item);
    });
    if (state.moveTarget) {
      context.beginPath();
      context.arc(state.moveTarget.x, state.moveTarget.y, 8, 0, Math.PI * 2);
      context.strokeStyle = PALETTE.accent;
      context.lineWidth = 2;
      context.stroke();
    }
  }

  function drawFloor() {
    for (let row = 0; row < 9; row += 1) {
      for (let col = 0; col < 12; col += 1) {
        context.fillStyle = (row + col) % 2 === 0 ? PALETTE.floorA : PALETTE.floorB;
        context.fillRect(col * 80, FIELD.topBar + 100 + row * 62, 80, 62);
      }
    }
    context.fillStyle = PALETTE.wall;
    context.fillRect(0, FIELD.topBar, FIELD.width, 100);
    text('— HEARTHSIDE KITCHEN —', 480, FIELD.topBar + 92, 15, 'rgba(255,248,236,0.55)', 'center');
  }

  function drawMessages(state) {
    let y = FIELD.height - 118;
    for (const message of state.messages.slice(-3)) {
      context.globalAlpha = Math.min(1, message.life);
      text(message.text, 480, y, 17, message.kind === 'bad' ? PALETTE.bad : message.kind === 'good' ? PALETTE.good : PALETTE.text, 'center', true);
      context.globalAlpha = 1;
      y += 22;
    }
  }

  function drawHint(state) {
    const hint = state.actionHint();
    roundRect(context, 20, FIELD.height - 44, 920, 32, 8);
    context.fillStyle = 'rgba(0,0,0,0.55)';
    context.fill();
    text(hint, 36, FIELD.height - 22, 16, PALETTE.text);
    text('E interact · Q toss · P pause · M mute · R restart', 924, FIELD.height - 22, 14, PALETTE.muted, 'right');
  }

  function drawPanel(title, lines, prompt) {
    context.fillStyle = 'rgba(0,0,0,0.62)';
    context.fillRect(0, 0, FIELD.width, FIELD.height);
    roundRect(context, 340, 150, 600, 380, 16);
    context.fillStyle = '#2b1d12';
    context.fill();
    context.lineWidth = 3;
    context.strokeStyle = PALETTE.accent;
    context.stroke();
    text(title, 640, 220, 40, PALETTE.accent, 'center', true);
    lines.forEach((line, index) => {
      text(line, 640, 280 + index * 34, 20, PALETTE.text, 'center');
    });
    text(prompt, 640, 480, 18, PALETTE.muted, 'center');
  }

  function draw(state) {
    resize();
    context.setTransform(view.scale, 0, 0, view.scale, view.x, view.y);
    context.fillStyle = PALETTE.backdrop;
    context.fillRect(-view.x / view.scale, -view.y / view.scale, FIELD.width + 2 * view.x / view.scale, FIELD.height + 2 * view.y / view.scale);
    drawFloor();
    drawTopBar(state);
    drawPantry(state);
    drawChoppingBoard(state);
    drawStove(state);
    drawPlatingCounter(state);
    drawServeWindow(state);
    drawTrash(state);
    drawOrderBoard(state);
    if (state.screen === SCREEN_PLAY || state.screen === SCREEN_PAUSED) drawChef(state);
    drawMessages(state);
    drawHint(state);
    if (state.screen === SCREEN_TITLE) {
      drawPanel('SIZZLE & SERVE', [
        'Run the Hearthside Kitchen!',
        'Chop, cook and plate each order',
        'before its patience runs out.',
        'Five recipes · combos pay extra',
      ], 'Press Enter or click to start  ·  WASD / arrows to move, E to work');
    } else if (state.screen === SCREEN_PAUSED) {
      drawPanel('PAUSED', ['The stove is holding its heat.'], 'Press P to keep cooking');
    } else if (state.screen === SCREEN_OVER) {
      const lines = [
        `Score ${state.score}  ·  Served ${state.served} dishes`,
        `Best score ${state.best}`,
        state.hearts <= 0 ? 'Three orders walked out…' : 'The shift is over!',
      ];
      drawPanel(state.hearts <= 0 ? 'SHIFT FAILED' : 'SHIFT COMPLETE', lines, 'Press R to cook another shift');
    }
  }

  return { draw, resize };
}
