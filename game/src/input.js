// Skyline Courier — input: keyboard and mouse, read fresh every frame.
// Arrows or WASD fly the plane (up/down for throttle, left/right to pitch),
// Enter starts and restarts, P pauses, M mutes, 1/2/3 pick a route on the
// title screen, and the mouse steers toward the pointer while held.
import { CRUISE_THROTTLE } from './config.js';

export function createInput(canvas) {
  const keys = new Set();
  let mouse = { x: 0, y: 0, down: false, clicked: false, clickX: 0, clickY: 0 };
  let interactPressed = false;
  let pausePressed = false;
  let mutePressed = false;
  let missionPressed = -1;

  function keyDown(event) {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.key)) {
      event.preventDefault();
    }
    if (event.repeat) return;
    keys.add(event.key.toLowerCase());
    if (event.key === 'Enter' || event.key === ' ') interactPressed = true;
    if (event.key.toLowerCase() === 'p') pausePressed = true;
    if (event.key.toLowerCase() === 'm') mutePressed = true;
    if (event.key === '1' || event.key === '2' || event.key === '3') {
      missionPressed = Number(event.key) - 1;
    }
  }

  function keyUp(event) {
    keys.delete(event.key.toLowerCase());
  }

  function mouseMove(event) {
    const rect = canvas.getBoundingClientRect();
    mouse.x = event.clientX - rect.left;
    mouse.y = event.clientY - rect.top;
  }

  function mouseDown(event) {
    mouseMove(event);
    mouse.down = true;
    mouse.clicked = true;
    mouse.clickX = mouse.x;
    mouse.clickY = mouse.y;
  }

  function mouseUp() {
    mouse.down = false;
  }

  window.addEventListener('keydown', keyDown);
  window.addEventListener('keyup', keyUp);
  canvas.addEventListener('pointermove', mouseMove);
  canvas.addEventListener('pointerdown', mouseDown);
  window.addEventListener('pointerup', mouseUp);

  return {
    /** The pilot's pitch and throttle this frame, plus one-shot buttons. */
    snapshot(planeScreen) {
      const up = keys.has('arrowup') || keys.has('w');
      const down = keys.has('arrowdown') || keys.has('s');
      const left = keys.has('arrowleft') || keys.has('a');
      const right = keys.has('arrowright') || keys.has('d');

      // Arrows fly like the plane points: up climbs, down dives, right opens
      // the throttle and left closes it.
      let pitch = 0;
      let throttle = null;
      if (up) pitch += 1;
      if (down) pitch -= 1;
      if (right) throttle = 1;
      if (left) throttle = 0;

      // Mouse: hold to steer the nose toward the pointer and open the
      // throttle; the pointer's height above or below the plane pitches it.
      if (mouse.down && planeScreen !== undefined) {
        const dy = planeScreen.y - mouse.y;
        pitch = Math.max(-1, Math.min(1, dy / 120));
        throttle = 1;
      }

      const snap = {
        pitch,
        throttle: throttle ?? CRUISE_THROTTLE,
        interact: interactPressed,
        pause: pausePressed,
        mute: mutePressed,
        mission: missionPressed,
        click: mouse.clicked ? { x: mouse.clickX, y: mouse.clickY } : null,
        mouseDown: mouse.down,
      };
      interactPressed = false;
      pausePressed = false;
      mutePressed = false;
      missionPressed = -1;
      mouse.clicked = false;
      return snap;
    },
  };
}
