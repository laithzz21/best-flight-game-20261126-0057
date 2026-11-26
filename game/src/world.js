// Skyline Courier — the world: one sortie's state, its missions and its
// scoring. It owns the plane, the fuel, the clock, the rings and the reasons
// a sortie ends, and it reports events (ring, landed, crashed, out of time,
// out of fuel) so the renderer and the sounds can answer them.
import {
  FUEL_DRAIN_IDLE,
  FUEL_DRAIN_PER_THROTTLE,
  FUEL_MAX,
  FUEL_PER_RING,
  LANDING_BONUS,
  MISSIONS,
  RING_COMBO_BONUS,
  RING_SCORE,
  SPAWN,
  TIME_BONUS_PER_SECOND,
} from './config.js';
import { buildTerrain } from './terrain.js';
import { createRandom } from './random.js';
import { insideRing, nextRing, stepPlane } from './physics.js';

export const EVENT_NONE = 0;
export const EVENT_RING = 1;
export const EVENT_LANDED = 2;
export const EVENT_CRASHED = 4;
export const EVENT_TIME_UP = 8;
export const EVENT_FUEL_OUT = 16;
export const EVENT_OVER = EVENT_LANDED | EVENT_CRASHED | EVENT_TIME_UP | EVENT_FUEL_OUT;

/** A fresh world for one mission, with its terrain built from the seed. */
export function createWorld(missionIndex) {
  const mission = MISSIONS[missionIndex % MISSIONS.length];
  const terrain = buildTerrain(mission, createRandom(mission.seed));
  const state = freshState(mission, terrain);

  function freshState(missionDef, terrainDef) {
    return {
      mission: missionDef,
      missionIndex,
      terrain: terrainDef,
      plane: {
        x: SPAWN.x,
        y: SPAWN.y,
        angle: SPAWN.angle,
        speed: SPAWN.speed,
        throttle: 0,
        airborne: false,
      },
      fuel: missionDef.fuelStart,
      timeLeft: missionDef.timeLimit,
      elapsed: 0,
      score: 0,
      ringsCollected: 0,
      combo: 0,
      bestCombo: 0,
      over: false,
      overReason: null,
      message: null,
      messageUntil: 0,
      landedBonus: 0,
      timeBonus: 0,
    };
  }

  return {
    state,
    /** Back to the start line: same mission, fresh fuel, clock and rings. */
    reset(nextMissionIndex) {
      const index = nextMissionIndex ?? missionIndex;
      const nextMission = MISSIONS[index % MISSIONS.length];
      const nextTerrain = buildTerrain(nextMission, createRandom(nextMission.seed));
      const fresh = freshState(nextMission, nextTerrain);
      for (const key of Object.keys(fresh)) state[key] = fresh[key];
    },
    /** One fixed step of the sortie. `control` is { pitch, throttle }. */
    step(dt, control) {
      if (state.over) return EVENT_NONE;
      state.elapsed += dt;
      state.timeLeft -= dt;

      const result = stepPlane(
        state.plane,
        control,
        dt,
        (x) => state.terrain.runwayGroundHeight(x),
        (x) => state.terrain.overRunway(x),
      );

      state.fuel = Math.max(
        0,
        state.fuel - (FUEL_DRAIN_IDLE + FUEL_DRAIN_PER_THROTTLE * state.plane.throttle) * dt,
      );

      const ring = nextRing(state.terrain.rings);
      if (ring !== null && insideRing(state.plane, ring)) {
        ring.collected = true;
        state.ringsCollected += 1;
        state.combo += 1;
        state.bestCombo = Math.max(state.bestCombo, state.combo);
        const points = RING_SCORE + (state.combo - 1) * RING_COMBO_BONUS;
        state.score += points;
        state.fuel = Math.min(FUEL_MAX, state.fuel + FUEL_PER_RING);
        state.message = `Ring ${state.ringsCollected}/${state.mission.rings}  +${points}${state.combo > 1 ? `  ·  combo x${state.combo}` : ''}`;
        state.messageUntil = state.elapsed + 1.6;
        return EVENT_RING;
      }

      if (result === 'landed') {
        state.over = true;
        state.overReason = state.ringsCollected >= state.mission.rings ? 'landed' : 'landed-early';
        state.landedBonus = state.ringsCollected >= state.mission.rings ? LANDING_BONUS : 0;
        state.timeBonus = Math.round(Math.max(0, state.timeLeft) * TIME_BONUS_PER_SECOND);
        state.score += state.landedBonus + state.timeBonus;
        return EVENT_LANDED;
      }
      if (result === 'crashed') {
        state.over = true;
        state.overReason = 'crashed';
        state.combo = 0;
        return EVENT_CRASHED;
      }
      if (state.timeLeft <= 0) {
        state.over = true;
        state.overReason = 'time-up';
        return EVENT_TIME_UP;
      }
      if (state.fuel <= 0 && state.plane.speed < 20 && state.plane.y <= state.terrain.runwayGroundHeight(state.plane.x) + 16) {
        state.over = true;
        state.overReason = 'fuel-out';
        return EVENT_FUEL_OUT;
      }
      return EVENT_NONE;
    },
    /** End the sortie as a clean landing, for a staged end screen. */
    completeLanding() {
      state.over = true;
      state.overReason = 'landed';
      state.landedBonus = LANDING_BONUS;
      state.timeBonus = Math.round(Math.max(0, state.timeLeft) * TIME_BONUS_PER_SECOND);
      state.score += state.landedBonus + state.timeBonus;
    },
  };
}
