// Skyline Courier — shared constants: the view, the flight model, the fuel
// and the three delivery routes. Nothing here knows how the game is drawn or
// stepped; it only names the pieces the other files share.
export const VIEW_WIDTH = 1280;
export const VIEW_HEIGHT = 720;
export const STEP = 1 / 60;
export const BEST_KEY = 'skyline-courier-best-score';

// The flight model, tuned so the plane feels like a light courier prop plane:
// it needs speed to climb, dives to gain speed, and stalls when it gets slow.
export const PLANE = {
  maxThrottle: 1,
  thrustAccel: 135,
  drag: 0.32,
  gravity: 96,
  climbBleed: 80,
  turnRate: 1.35,
  stallSpeed: 62,
  stallSink: 46,
  maxSpeed: 320,
  crashVerticalSpeed: 130,
  safeLandingSpeed: 205,
  safeLandingAngle: 0.34,
};

// Fuel: a full tank is about two minutes of cruise. Rings top it up a little,
// so a pilot who flies the rings well never has to worry about the gauge.
export const FUEL_MAX = 100;
export const FUEL_DRAIN_IDLE = 0.22;
export const FUEL_DRAIN_PER_THROTTLE = 0.62;
export const FUEL_PER_RING = 6;

// With no throttle key held, the throttle rests at cruise: the plane keeps
// flying instead of dropping out of the sky the moment a finger lifts.
export const CRUISE_THROTTLE = 0.55;

// Rings: the glowing hoops the pilot threads. Each one pays score and fuel.
export const RING_RADIUS = 52;
export const RING_SCORE = 100;
export const RING_COMBO_BONUS = 25;
export const LANDING_BONUS = 250;
export const TIME_BONUS_PER_SECOND = 4;

// The three delivery routes. Each one is a different job for the courier:
// a gentle valley run, a low river dash against the clock, and a high
// mountain pass where fuel is the real enemy.
export const MISSIONS = [
  {
    id: 'valley-mail',
    name: 'Valley Mail Run',
    blurb: 'Gentle hills, eight rings, land on the far runway.',
    seed: 7,
    rings: 8,
    timeLimit: 150,
    fuelStart: 100,
    routeLength: 9800,
    terrain: { base: 90, amp: 105, rough: 0.55, river: false },
    ringHeight: { min: 240, max: 420 },
  },
  {
    id: 'river-rush',
    name: 'River Rush',
    blurb: 'Low rings over the river. Fast hands, short clock.',
    seed: 21,
    rings: 10,
    timeLimit: 120,
    fuelStart: 100,
    routeLength: 10600,
    terrain: { base: 60, amp: 46, rough: 0.4, river: true },
    ringHeight: { min: 150, max: 300 },
  },
  {
    id: 'mountain-pass',
    name: 'Mountain Pass',
    blurb: 'High rings over the peaks. Fuel is the enemy here.',
    seed: 44,
    rings: 10,
    timeLimit: 150,
    fuelStart: 78,
    routeLength: 11200,
    terrain: { base: 170, amp: 130, rough: 0.8, river: false },
    ringHeight: { min: 330, max: 560 },
  },
];

/** The home runway, where every sortie starts, in world coordinates. */
export const HOME_RUNWAY = { x: 260, length: 420, y: 0 };

/** Where the plane sits parked before takeoff, on the home runway. */
export const SPAWN = { x: 330, y: 132, angle: 0, speed: 0 };

/** Heading in compass degrees from the nose angle (0 = east, up is north). */
export function headingDegrees(angle) {
  const degrees = (90 - (angle * 180) / Math.PI) % 360;
  return degrees < 0 ? degrees + 360 : degrees;
}

/** Feet of altitude from world pixels, for the HUD. */
export function altitudeFeet(y) {
  return Math.max(0, Math.round(y * 3.2));
}

/** Knots of speed from world pixels per second, for the HUD. */
export function speedKnots(speed) {
  return Math.round(speed * 0.85);
}
