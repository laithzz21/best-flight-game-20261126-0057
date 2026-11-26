// Skyline Courier — the world under the wings: a seeded terrain height
// function, the fields and trees that make it recognisable, the river, and
// the rings and runways laid along each route. Everything is pure data from
// the mission seed, so the same mission always builds the same valley.
import { HOME_RUNWAY } from './config.js';

/** Control points every STEP_X pixels; heights are blended with a cosine. */
const STEP_X = 400;

function smoothBlend(a, b, t) {
  const u = (1 - Math.cos(t * Math.PI)) / 2;
  return a + (b - a) * u;
}

/**
 * Build one route's terrain from a mission and a seeded random source.
 * Returns the height function, the rings, the far runway and the decoration
 * lists the renderer paints.
 */
export function buildTerrain(mission, random) {
  const length = mission.routeLength;
  const points = Math.ceil(length / STEP_X) + 3;
  const heights = [];
  let height = mission.terrain.base;
  for (let i = 0; i < points; i += 1) {
    const target = mission.terrain.base + random.range(0, mission.terrain.amp);
    // The first stretch stays low and flat so takeoff is easy.
    const eased = i < 3 ? mission.terrain.base * 0.6 + target * 0.4 : target;
    height += (eased - height) * mission.terrain.rough;
    heights.push(height);
  }

  // The river, where the mission has one: two dips where the ground drops
  // to the water and the banks rise again on either side.
  const rivers = [];
  if (mission.terrain.river) {
    rivers.push({ x0: length * 0.3, x1: length * 0.42, water: 34 });
    rivers.push({ x0: length * 0.68, x1: length * 0.8, water: 30 });
  }

  // The far runway sits on a flattened strip at the end of the route.
  const farRunway = { x: length + 260, length: 460, y: 0 };

  /** Ground height in world pixels above the baseline at world x. */
  function groundHeight(x) {
    const clamped = Math.max(0, Math.min(x, (points - 1) * STEP_X));
    const index = Math.floor(clamped / STEP_X);
    const t = (clamped - index * STEP_X) / STEP_X;
    let base = smoothBlend(heights[index], heights[Math.min(index + 1, points - 1)], t);
    for (const river of rivers) {
      if (x > river.x0 && x < river.x1) {
        const edge = Math.min((x - river.x0) / 160, (river.x1 - x) / 160, 1);
        base = base * edge + river.water * (1 - edge);
      }
    }
    // The approach to the far runway is graded flat, like a real airfield:
    // a pilot coming in low must not meet a hill just short of the strip.
    // The flat corridor starts well short of the runway so even the mountain
    // route's high ground has levelled out before the final descent.
    const flatStart = farRunway.x - 1400;
    if (x > flatStart) {
      const blend = (1 - Math.cos(Math.min(1, (x - flatStart) / 700) * Math.PI)) / 2;
      base = base * (1 - blend) + 96 * blend;
    }
    return base;
  }

  // Rings hang along a gentle flight path over the route: each one sits a
  // little higher or lower than the last, never below a safe clearance.
  const rings = [];
  const gap = (length - 1400) / mission.rings;
  for (let i = 0; i < mission.rings; i += 1) {
    const x = 1100 + i * gap + random.range(-60, 60);
    const h = groundHeight(x);
    const y = h + random.range(mission.ringHeight.min, mission.ringHeight.max);
    rings.push({ x, y, collected: false, index: i });
  }

  // Fields: coloured patches of farmland scattered along the route.
  const fields = [];
  for (let x = 700; x < length; x += 260) {
    if (random.bool(0.62)) {
      fields.push({
        x: x + random.range(-40, 40),
        width: random.range(160, 300),
        color: random.pick(['#7fae4e', '#a8b545', '#c2a95a', '#6f9e46', '#b5a05e']),
      });
    }
  }

  // Trees and cottages, placed once per seed so they never jump around.
  const trees = [];
  for (let x = 500; x < length + 500; x += 90) {
    if (random.bool(0.5)) trees.push({ x: x + random.range(-30, 30), size: random.range(10, 20) });
  }
  const cottages = [];
  for (let x = 900; x < length; x += 1400) {
    if (random.bool(0.7)) cottages.push({ x: x + random.range(-80, 80) });
  }

  return {
    length,
    groundHeight,
    rings,
    farRunway,
    rivers,
    fields,
    trees,
    cottages,
    /** The far runway's ground, flattened so landings read as landings. */
    runwayGroundHeight(x) {
      if (x >= farRunway.x && x <= farRunway.x + farRunway.length) return 96;
      if (x >= HOME_RUNWAY.x && x <= HOME_RUNWAY.x + HOME_RUNWAY.length) return 96;
      return groundHeight(x);
    },
    /** True when world x is over a runway strip. */
    overRunway(x) {
      return (
        (x >= HOME_RUNWAY.x && x <= HOME_RUNWAY.x + HOME_RUNWAY.length) ||
        (x >= farRunway.x && x <= farRunway.x + farRunway.length)
      );
    },
  };
}
