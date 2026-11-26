// Skyline Courier — boot and the one loop: input is read every frame, the
// world advances in fixed 1/60 s steps (several in a slow frame, none in a
// fast one), the engine hum follows the throttle, and the renderer paints
// what is there. The game moves between four screens: title, play, paused
// and game over. On the title screen 1/2/3 (or a click) picks a route.
//
// ?seed=N fixes nothing about the world (missions carry their own seeds) but
// ?shot=start|play|end stages that scene instead of running the loop, paints
// it twice and sets window.__shotReady for a screenshot.
import { BEST_KEY, STEP } from './config.js';
import { createWorld, EVENT_CRASHED, EVENT_LANDED, EVENT_OVER, EVENT_RING } from './world.js';
import { createInput } from './input.js';
import { createAudio } from './audio.js';
import { createRenderer, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE } from './render.js';
import { stageShot } from './shots.js';

/** The longest frame the loop catches up on; a longer stall is dropped. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const audio = createAudio();
const renderer = createRenderer(canvas);
let world = createWorld(0);

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

function runShot(name) {
  const scene = stageShot(name, world);
  renderer.setSelectedMission(0);
  renderer.snapTo(world.state);
  let painted = 0;
  function paint() {
    renderer.draw(world.state, scene.screen, scene.best, performance.now() / 1000, null);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();

  function describe() {
    const state = world.state;
    if (screen === SCREEN_TITLE) return 'Skyline Courier. Pick a route with 1, 2 or 3, then press Enter to fly.';
    if (screen === SCREEN_OVER) {
      return state.overReason === 'landed'
        ? `Delivered. ${state.score} points. Press Enter to fly again.`
        : `Sortie over. ${state.score} points. Press Enter to fly again.`;
    }
    if (screen === SCREEN_PAUSED) return 'Paused. Press P to continue.';
    return `${state.mission.name}. ${state.ringsCollected} of ${state.mission.rings} rings, ${state.score} points, ${Math.ceil(state.timeLeft)} seconds left.`;
  }

  function frame(now) {
    const elapsed = Math.min(MAX_FRAME, (now - last) / 1000);
    last = now;
    const planeScreen = { x: 420, y: 330 };
    const snap = input.snapshot(planeScreen);
    if (snap.mute) {
      audio.unlock();
      audio.toggleMute();
    }
    if (snap.mission >= 0 && (screen === SCREEN_TITLE || screen === SCREEN_OVER)) {
      renderer.setSelectedMission(snap.mission);
      world.reset(snap.mission);
      audio.click();
    }
    if (snap.pause && (screen === SCREEN_PLAY || screen === SCREEN_PAUSED)) {
      screen = screen === SCREEN_PLAY ? SCREEN_PAUSED : SCREEN_PLAY;
    }
    if (screen === SCREEN_TITLE || screen === SCREEN_OVER) {
      if (snap.interact) {
        audio.unlock();
        world.reset(renderer.selectedMission);
        screen = SCREEN_PLAY;
      }
    } else if (screen === SCREEN_PLAY) {
      accumulator += elapsed;
      while (accumulator >= STEP) {
        accumulator -= STEP;
        const events = world.step(STEP, { pitch: snap.pitch, throttle: snap.throttle });
        if (events & EVENT_RING) audio.ring();
        if (events & EVENT_LANDED) {
          audio.landing();
          screen = SCREEN_OVER;
          best = Math.max(best, world.state.score);
          saveBest(best);
          break;
        }
        if (events & EVENT_CRASHED) {
          audio.crash();
          screen = SCREEN_OVER;
          best = Math.max(best, world.state.score);
          saveBest(best);
          break;
        }
        if (events & EVENT_OVER) {
          screen = SCREEN_OVER;
          best = Math.max(best, world.state.score);
          saveBest(best);
          break;
        }
      }
      audio.engine(world.state.plane.throttle, screen === SCREEN_PLAY);
    } else if (screen === SCREEN_PAUSED || screen === SCREEN_TITLE || screen === SCREEN_OVER) {
      // The engine goes quiet whenever the plane is not flying.
      audio.engine(0, false);
    }
    renderer.draw(world.state, screen, best, now / 1000, snap.click);
    status.textContent = describe();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

if (shot !== null) runShot(shot);
else runGame();
