// Skyline Courier — the flight model: one fixed step of the plane. Throttle
// pushes the nose, drag and gravity pull back, climbing bleeds speed and
// diving gives it back, and below stall speed the plane sinks and its nose
// drops. It also decides what touching the ground means: a gentle touchdown
// on a runway is a landing, anything else is a crash.
import { PLANE, RING_RADIUS } from './config.js';

/** Clamp a value into [min, max]. */
export function clamp(value, min, max) {
  return value < min ? min : value > max ? max : value;
}

/**
 * Advance the plane one step. `plane` holds x, y, angle, speed and throttle;
 * `control` holds the pilot's pitch (-1..1, positive pitches the nose up)
 * and throttle target (0..1). Returns 'flying', 'landed' or 'crashed'.
 */
export function stepPlane(plane, control, dt, groundHeight, overRunway) {
  // Throttle spools toward its target instead of snapping to it.
  plane.throttle += clamp(control.throttle - plane.throttle, -dt * 1.6, dt * 1.2);

  // Pitch authority grows with speed: a fast plane answers, a slow one wallows.
  const authority = clamp(plane.speed / 160, 0.35, 1);
  plane.angle += control.pitch * PLANE.turnRate * authority * dt;

  // Speed: thrust forward, drag back, gravity stealing speed on the climb
  // and giving it back on the dive.
  const along = Math.sin(plane.angle);
  plane.speed += (plane.throttle * PLANE.thrustAccel - PLANE.drag * plane.speed - along * PLANE.climbBleed) * dt;
  plane.speed = clamp(plane.speed, 0, PLANE.maxSpeed);

  // Below stall speed the wing gives up: the plane sinks and the nose drops.
  // But not while it is still on its wheels: a parked plane does not stall,
  // and a plane on its takeoff roll holds the attitude its pilot sets.
  let sink = 0;
  if (plane.airborne && plane.speed < PLANE.stallSpeed) {
    const stall = 1 - plane.speed / PLANE.stallSpeed;
    sink = PLANE.stallSink * stall;
    plane.angle -= stall * 0.55 * dt;
  }

  plane.x += Math.cos(plane.angle) * plane.speed * dt;
  plane.y += Math.sin(plane.angle) * plane.speed * dt - sink * dt;
  // Gravity still pulls the plane down when it is parked on the ground.
  if (plane.speed < 8) plane.y -= PLANE.gravity * 0.18 * dt;

  const ground = groundHeight(plane.x);
  // Once the plane has climbed clear of the ground it counts as airborne,
  // and only then can touching down be a landing: a plane rolling along its
  // home runway at the start of a sortie has not landed, it has not left.
  if (plane.y - ground > 100) plane.airborne = true;
  if (plane.y <= ground + 14) {
    plane.y = ground + 14;
    if (!plane.airborne) return 'flying';
    const verticalSpeed = Math.abs(Math.sin(plane.angle) * plane.speed) + sink;
    // Level, in either direction: eastbound (angle near 0) or westbound
    // (angle near PI, after an overshoot turn back onto the strip).
    const levelAngle = Math.atan2(Math.sin(plane.angle), Math.cos(plane.angle));
    const level = Math.abs(levelAngle) < PLANE.safeLandingAngle
      || Math.abs(Math.abs(levelAngle) - Math.PI) < PLANE.safeLandingAngle;
    const gentle = verticalSpeed < PLANE.crashVerticalSpeed
      && plane.speed < PLANE.safeLandingSpeed
      && level
      && overRunway(plane.x);
    if (gentle) return 'landed';
    return 'crashed';
  }
  return 'flying';
}

/** How far the plane is above the ground it is over, in world pixels. */
export function groundClearance(plane, groundHeight) {
  return plane.y - groundHeight(plane.x);
}

/** The next ring the pilot should aim for, or null when all are collected. */
export function nextRing(rings) {
  return rings.find((ring) => !ring.collected) ?? null;
}

/** True when the plane's centre is inside a ring's hoop. */
export function insideRing(plane, ring) {
  const dx = plane.x - ring.x;
  const dy = plane.y - ring.y;
  return Math.hypot(dx, dy) < RING_RADIUS + 12;
}
