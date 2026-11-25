// Keyboard and mouse input, kept apart from the simulation. Keys are read
// every frame as a movement vector plus edge-triggered actions; a click sets
// a walk target (or works a station when the chef is already close).
import { FIELD } from './config.js';

export const ACTION_CONFIRM = 'confirm';
export const ACTION_PAUSE = 'pause';
export const ACTION_RESTART = 'restart';
export const ACTION_MUTE = 'mute';
export const ACTION_DISCARD = 'discard';

const KEY_ACTIONS = {
  e: ACTION_CONFIRM,
  ' ': ACTION_CONFIRM,
  enter: ACTION_CONFIRM,
  p: ACTION_PAUSE,
  escape: ACTION_PAUSE,
  r: ACTION_RESTART,
  m: ACTION_MUTE,
  q: ACTION_DISCARD,
};

export function createInput(canvas, handlers) {
  const held = new Set();
  const pressed = new Set();
  let pointer = { x: 0, y: 0 };

  function keyName(event) {
    return event.key.length === 1 ? event.key.toLowerCase() : event.key.toLowerCase();
  }

  function onKeyDown(event) {
    const key = keyName(event);
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(key)) event.preventDefault();
    if (!event.repeat) pressed.add(key);
    held.add(key);
  }

  function onKeyUp(event) {
    held.delete(keyName(event));
  }

  function canvasPoint(event) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * FIELD.width,
      y: ((event.clientY - rect.top) / rect.height) * FIELD.height,
    };
  }

  function onPointerDown(event) {
    pointer = canvasPoint(event);
    handlers.onPointer(pointer);
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  canvas.addEventListener('pointerdown', onPointerDown);

  return {
    // The movement vector for this frame, from WASD or the arrow keys.
    moveVector() {
      let x = 0;
      let y = 0;
      if (held.has('a') || held.has('arrowleft')) x -= 1;
      if (held.has('d') || held.has('arrowright')) x += 1;
      if (held.has('w') || held.has('arrowup')) y -= 1;
      if (held.has('s') || held.has('arrowdown')) y += 1;
      return { x, y };
    },

    // Actions pressed since the last frame, each reported once.
    takeActions() {
      const actions = [];
      for (const key of pressed) {
        const action = KEY_ACTIONS[key];
        if (action) actions.push(action);
      }
      pressed.clear();
      return actions;
    },

    pointer() { return pointer; },
  };
}
