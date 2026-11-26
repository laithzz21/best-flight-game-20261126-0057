// Skyline Courier — the screenshot scenes behind ?shot=start|play|end. Each
// one plays the real rules forward from a fresh world for a fixed number of
// steps, steered by a simple autopilot that flies like a careful pilot: it
// aims at the next ring, climbs when the ground gets close, throttles back
// over the far runway and flares for a landing. The same seed always gives
// the same frame.
import { MISSIONS, STEP } from './config.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './render.js';

const START_SECONDS = 3;
const PLAY_SECONDS = 25;
const END_LIMIT_SECONDS = 420;
const SAMPLE = STEP;

/**
 * What the autopilot wants this step: a pitch (-1..1) and a throttle (0..1).
 * It chases the next ring, or the far runway once the rings are done.
 */
function autopilot(state) {
  const plane = state.plane;
  const terrain = state.terrain;
  const ringsDone = state.ringsCollected >= state.mission.rings;
  // After the last ring, first fly to an approach fix above the runway
  // threshold, then down the final: coming in high and fast is how a
  // landing turns into an overshoot and a turn back at treetop height.
  let target;
  if (!ringsDone) {
    target = state.terrain.rings.find((ring) => !ring.collected);
  } else if (plane.x < terrain.farRunway.x - 1400) {
    // The approach fix: high and well short of the strip, so the final
    // descent is a steady glide instead of a dive at the threshold.
    target = { x: terrain.farRunway.x - 1400, y: 460 };
  } else {
    // The touchdown point is the far end of the strip, BELOW the surface:
    // the plane keeps descending through the runway instead of levelling
    // off at a point it has already flown past and chasing it forever.
    target = { x: terrain.farRunway.x + terrain.farRunway.length - 20, y: 60 };
  }
  if (target === undefined || target === null) return { pitch: 0, throttle: 0.5 };

  const ground = terrain.runwayGroundHeight(plane.x);
  const clearance = plane.y - ground;

  // Aim the nose at the target, in world angle.
  const dx = target.x - plane.x;
  const dy = target.y - plane.y;
  let want = Math.atan2(dy, dx);
  // Never aim below the horizon when the ground is close — unless the
  // target is the runway itself, where a gentle descent is the whole point.
  const onFinal = ringsDone && plane.x > terrain.farRunway.x - 1400;
  if (!onFinal) {
    if (clearance < 150) want = Math.max(want, 0.25);
    if (clearance < 90) want = Math.max(want, 0.55);
  } else {
    // On final: a steady glide that flattens out as the wheels near.
    want = Math.max(-0.28, Math.min(0.22, want));
  }

  // Turn toward the wanted angle, shortest way round.
  let diff = want - plane.angle;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  const pitch = Math.max(-1, Math.min(1, diff * 2.2));

  // Throttle: full on the way out, easing off as the speed builds, and a
  // whisper on final so the plane settles instead of stalling onto the strip.
  let throttle = 0.85;
  if (plane.speed > 260) throttle = 0.55;
  if (ringsDone) {
    throttle = 0.5;
    if (plane.speed > 200) throttle = 0.2;
    if (onFinal) throttle = plane.speed > 170 ? 0.15 : 0.3;
    if (onFinal && clearance < 60) throttle = 0.26;
  }
  return { pitch, throttle };
}

/** One autopilot step. */
function pilotStep(world) {
  return world.step(SAMPLE, autopilot(world.state));
}

/**
 * Set `world` to the named scene (start, play or end; any other name is
 * start) and return the screen to draw over it and the best score to show.
 */
export function stageShot(name, world) {
  world.reset(0);
  if (name !== 'play' && name !== 'end') {
    for (let index = 0; index < START_SECONDS / SAMPLE; index += 1) {
      world.step(SAMPLE, { pitch: 0, throttle: 0 });
    }
    return { screen: SCREEN_TITLE, best: 0 };
  }
  const limit = name === 'end' ? END_LIMIT_SECONDS : PLAY_SECONDS;
  for (let index = 0; index < limit / SAMPLE; index += 1) {
    pilotStep(world);
    if (world.state.over) break;
  }
  if (name === 'end' && !world.state.over) {
    // The autopilot ran out of time without landing: stage the landing the
    // game itself would have scored, through its own completeLanding.
    world.completeLanding();
  }
  const over = world.state.over;
  return { screen: over ? SCREEN_OVER : SCREEN_PLAY, best: world.state.score };
}

/** The mission the screenshots fly, by name, for the title cards. */
export function shotMissionIndex() {
  return MISSIONS.findIndex((mission) => mission.id === 'valley-mail');
}
