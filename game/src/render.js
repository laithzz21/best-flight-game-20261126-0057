// Skyline Courier — the renderer: every pixel the pilot sees. A side chase
// view over a layered valley (sky, sun, clouds, far peaks, near hills, the
// ground with its fields, river, trees and runways), the little courier plane
// with its spinning prop, the glowing rings, a top HUD with altitude, speed
// and heading, a lit instrument panel along the bottom, and the title, pause
// and end screens. Nothing here steps the world; it only paints a state.
import { VIEW_HEIGHT, VIEW_WIDTH, altitudeFeet, headingDegrees, speedKnots } from './config.js';
import { createRandom } from './random.js';
import { MISSIONS } from './config.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';

const TOP_BAR = 62;
const PANEL_HEIGHT = 96;

/** Clouds placed once, drifting with a slow parallax against the camera. */
function makeClouds() {
  const random = createRandom(99);
  const clouds = [];
  for (let i = 0; i < 16; i += 1) {
    clouds.push({
      x: random.range(0, 1600),
      y: random.range(50, 300),
      scale: random.range(0.7, 1.6),
      speed: random.range(2, 7),
    });
  }
  return clouds;
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  const clouds = makeClouds();
  let camX = 0;
  let camY = 0;
  let selectedMission = 0;

  function resize() {
    canvas.width = canvas.clientWidth * (window.devicePixelRatio || 1);
    canvas.height = canvas.clientHeight * (window.devicePixelRatio || 1);
  }
  resize();
  window.addEventListener('resize', resize);

  /** World x to screen x, world y (up) to screen y (down). */
  function toScreen(x, y) {
    return { x: x - camX, y: VIEW_HEIGHT - 90 - (y - camY) };
  }

  function drawSky(time) {
    const sky = ctx.createLinearGradient(0, 0, 0, VIEW_HEIGHT);
    sky.addColorStop(0, '#2b6cb0');
    sky.addColorStop(0.45, '#7fb8dd');
    sky.addColorStop(0.75, '#cfe9f2');
    sky.addColorStop(1, '#e8f3ee');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);

    // Sun with a soft halo, top right.
    const glow = ctx.createRadialGradient(1060, 92, 8, 1060, 92, 130);
    glow.addColorStop(0, 'rgba(255, 244, 200, 0.95)');
    glow.addColorStop(0.35, 'rgba(255, 230, 150, 0.55)');
    glow.addColorStop(1, 'rgba(255, 230, 150, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(900, -40, 320, 280);
    ctx.fillStyle = '#fff3c4';
    ctx.beginPath();
    ctx.arc(1060, 92, 34, 0, Math.PI * 2);
    ctx.fill();

    // Clouds, wrapped so they never run out.
    ctx.fillStyle = 'rgba(255, 255, 255, 0.88)';
    for (const cloud of clouds) {
      const cx = (((cloud.x + time * cloud.speed - camX * 0.18) % 1700) + 1700) % 1700 - 200;
      const cy = cloud.y;
      const s = cloud.scale;
      ctx.beginPath();
      ctx.ellipse(cx, cy, 62 * s, 20 * s, 0, 0, Math.PI * 2);
      ctx.ellipse(cx + 44 * s, cy + 6 * s, 44 * s, 15 * s, 0, 0, Math.PI * 2);
      ctx.ellipse(cx - 46 * s, cy + 7 * s, 40 * s, 14 * s, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Far peaks, a blue ridge with snow caps on the real summits, slow parallax.
    ctx.fillStyle = '#5d7ea6';
    ctx.beginPath();
    ctx.moveTo(0, VIEW_HEIGHT);
    for (let sx = 0; sx <= VIEW_WIDTH; sx += 16) {
      const wx = sx + camX * 0.32;
      const peak = 190 + 95 * Math.sin(wx * 0.0016) + 55 * Math.sin(wx * 0.0041 + 2);
      ctx.lineTo(sx, VIEW_HEIGHT - 150 - peak * 0.55);
    }
    ctx.lineTo(VIEW_WIDTH, VIEW_HEIGHT);
    ctx.closePath();
    ctx.fill();
    // One snow cap per summit, where the ridge is a local maximum.
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    const ridge = [];
    for (let sx = 0; sx <= VIEW_WIDTH; sx += 16) {
      const wx = sx + camX * 0.32;
      ridge.push(190 + 95 * Math.sin(wx * 0.0016) + 55 * Math.sin(wx * 0.0041 + 2));
    }
    for (let i = 1; i < ridge.length - 1; i += 1) {
      if (ridge[i] > 265 && ridge[i] >= ridge[i - 1] && ridge[i] >= ridge[i + 1]) {
        const top = VIEW_HEIGHT - 150 - ridge[i] * 0.55;
        ctx.beginPath();
        ctx.moveTo(i * 16 - 26, top + 30);
        ctx.lineTo(i * 16, top);
        ctx.lineTo(i * 16 + 26, top + 30);
        ctx.closePath();
        ctx.fill();
      }
    }

    // Nearer green hills, faster parallax.
    ctx.fillStyle = '#6a9a58';
    ctx.beginPath();
    ctx.moveTo(0, VIEW_HEIGHT);
    for (let sx = 0; sx <= VIEW_WIDTH; sx += 16) {
      const wx = sx + camX * 0.6;
      const hill = 120 + 60 * Math.sin(wx * 0.0022 + 5) + 30 * Math.sin(wx * 0.005 + 1);
      ctx.lineTo(sx, VIEW_HEIGHT - 60 - hill * 0.5);
    }
    ctx.lineTo(VIEW_WIDTH, VIEW_HEIGHT);
    ctx.closePath();
    ctx.fill();
  }

  function drawGround(state) {
    const terrain = state.terrain;
    // The ground itself, sampled across the screen.
    const ground = ctx.createLinearGradient(0, 300, 0, VIEW_HEIGHT);
    ground.addColorStop(0, '#79b34f');
    ground.addColorStop(1, '#4e7d33');
    ctx.fillStyle = ground;
    ctx.beginPath();
    ctx.moveTo(-4, VIEW_HEIGHT + 4);
    for (let sx = -4; sx <= VIEW_WIDTH + 4; sx += 8) {
      const wx = camX + sx;
      const gy = terrain.runwayGroundHeight(wx);
      ctx.lineTo(sx, toScreen(wx, gy).y);
    }
    ctx.lineTo(VIEW_WIDTH + 4, VIEW_HEIGHT + 4);
    ctx.closePath();
    ctx.fill();

    // Field patches, laid along the surface.
    for (const field of terrain.fields) {
      const x0 = field.x - camX;
      const x1 = field.x + field.width - camX;
      if (x1 < -20 || x0 > VIEW_WIDTH + 20) continue;
      ctx.fillStyle = field.color;
      ctx.beginPath();
      ctx.moveTo(x0, toScreen(field.x, terrain.groundHeight(field.x)).y);
      for (let sx = x0; sx <= x1; sx += 16) {
        const wx = camX + sx;
        ctx.lineTo(sx, toScreen(wx, terrain.groundHeight(wx)).y - 2);
      }
      ctx.lineTo(x1, toScreen(field.x + field.width, terrain.groundHeight(field.x + field.width)).y + 22);
      ctx.lineTo(x0, toScreen(field.x, terrain.groundHeight(field.x)).y + 22);
      ctx.closePath();
      ctx.fill();
    }

    // Rivers: a blue band where the ground dips to the water.
    for (const river of terrain.rivers) {
      const x0 = river.x0 - camX;
      const x1 = river.x1 - camX;
      if (x1 < -20 || x0 > VIEW_WIDTH + 20) continue;
      ctx.fillStyle = '#4aa3d8';
      ctx.beginPath();
      ctx.moveTo(x0, toScreen(river.x0, river.water).y);
      ctx.lineTo(x1, toScreen(river.x1, river.water).y);
      ctx.lineTo(x1, toScreen(river.x1, terrain.groundHeight(river.x1)).y + 30);
      ctx.lineTo(x0, toScreen(river.x0, terrain.groundHeight(river.x0)).y + 30);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x0 + 10, toScreen(river.x0, river.water).y + 6);
      ctx.lineTo(x1 - 10, toScreen(river.x1, river.water).y + 6);
      ctx.stroke();
    }

    drawRunway(state, 260, 420, '27');
    drawRunway(state, terrain.farRunway.x, terrain.farRunway.length, '09');
    drawWindsock(state);
    drawTrees(state);
    drawCottages(state);
  }

  function drawRunway(state, x, length, label) {
    const x0 = x - camX;
    const x1 = x + length - camX;
    if (x1 < -20 || x0 > VIEW_WIDTH + 20) return;
    const y = toScreen(x, 96).y;
    ctx.fillStyle = '#5a5f66';
    ctx.fillRect(x0, y - 4, length, 12);
    ctx.fillStyle = '#f5f5f5';
    for (let d = 14; d < length - 20; d += 46) {
      ctx.fillRect(x0 + d, y + 1, 26, 3);
    }
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(label, x0 + 30, y - 12);
  }

  function drawWindsock(state) {
    const x = 700 - camX;
    if (x < -20 || x > VIEW_WIDTH + 20) return;
    const y = toScreen(700, 96).y;
    ctx.strokeStyle = '#3a3a3a';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x, y - 4);
    ctx.lineTo(x, y - 52);
    ctx.stroke();
    ctx.fillStyle = '#ff7a1a';
    ctx.beginPath();
    ctx.moveTo(x, y - 52);
    ctx.lineTo(x + 34, y - 46);
    ctx.lineTo(x, y - 40);
    ctx.closePath();
    ctx.fill();
  }

  function drawTrees(state) {
    for (const tree of state.terrain.trees) {
      const x = tree.x - camX;
      if (x < -30 || x > VIEW_WIDTH + 30) continue;
      // The visible surface is the flattened runway ground where it applies.
      const y = toScreen(tree.x, state.terrain.runwayGroundHeight(tree.x)).y;
      ctx.fillStyle = '#6b4a2f';
      ctx.fillRect(x - 2, y - 12, 4, 12);
      ctx.fillStyle = '#2f6b2f';
      ctx.beginPath();
      ctx.moveTo(x - tree.size * 0.7, y - 10);
      ctx.lineTo(x, y - tree.size - 10);
      ctx.lineTo(x + tree.size * 0.7, y - 10);
      ctx.closePath();
      ctx.fill();
    }
  }

  function drawCottages(state) {
    for (const cottage of state.terrain.cottages) {
      const x = cottage.x - camX;
      if (x < -60 || x > VIEW_WIDTH + 60) continue;
      const y = toScreen(cottage.x, state.terrain.runwayGroundHeight(cottage.x)).y;
      ctx.fillStyle = '#f2e3c2';
      ctx.fillRect(x - 18, y - 26, 36, 26);
      ctx.fillStyle = '#b0492f';
      ctx.beginPath();
      ctx.moveTo(x - 22, y - 26);
      ctx.lineTo(x, y - 44);
      ctx.lineTo(x + 22, y - 26);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#5a3d24';
      ctx.fillRect(x - 5, y - 14, 10, 14);
    }
  }

  function drawRings(state, time) {
    for (const ring of state.terrain.rings) {
      const p = toScreen(ring.x, ring.y);
      if (p.x < -120 || p.x > VIEW_WIDTH + 120 || p.y < -120 || p.y > VIEW_HEIGHT + 120) continue;
      const pulse = 1 + 0.03 * Math.sin(time * 3 + ring.index);
      const radius = 52 * pulse;
      if (ring.collected) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
        ctx.stroke();
        continue;
      }
      ctx.save();
      ctx.shadowColor = '#ff9d00';
      ctx.shadowBlur = 22;
      ctx.strokeStyle = '#ff8c00';
      ctx.lineWidth = 10;
      ctx.beginPath();
      ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 4;
      ctx.setLineDash([18, 14]);
      ctx.beginPath();
      ctx.arc(p.x, p.y, radius, time * 0.4, time * 0.4 + Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      // The ring's label stays off the top bar so it never collides with the HUD.
      if (p.y - radius > TOP_BAR + 26) {
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 15px Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`RING ${ring.index + 1}`, p.x, p.y - radius - 12);
      }
    }
  }

  function drawGuide(state) {
    const ring = state.terrain.rings.find((r) => !r.collected);
    if (ring === undefined) return;
    const p = toScreen(ring.x, ring.y);
    const plane = toScreen(state.plane.x, state.plane.y);
    if (p.x < -40 || p.x > VIEW_WIDTH + 40) {
      // Next ring is off screen: an arrow at the edge points the way.
      const dir = p.x > VIEW_WIDTH ? 1 : -1;
      const ax = dir > 0 ? VIEW_WIDTH - 60 : 60;
      const ay = Math.max(110, Math.min(VIEW_HEIGHT - 160, p.y));
      ctx.fillStyle = '#ff8c00';
      ctx.beginPath();
      ctx.moveTo(ax + dir * 22, ay);
      ctx.lineTo(ax - dir * 10, ay - 14);
      ctx.lineTo(ax - dir * 10, ay + 14);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 14px Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${Math.round(Math.abs(ring.x - state.plane.x) / 100) * 100}m`, ax, ay + 34);
      return;
    }
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 10]);
    ctx.beginPath();
    ctx.moveTo(plane.x, plane.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  function drawPlane(state, time) {
    const plane = state.plane;
    const p = toScreen(plane.x, plane.y);
    // Soft shadow on the ground below, fading with altitude.
    const groundY = toScreen(plane.x, state.terrain.runwayGroundHeight(plane.x)).y;
    const heightAbove = Math.max(0, groundY - p.y);
    const shadowAlpha = Math.max(0, 0.3 - heightAbove / 1400);
    if (shadowAlpha > 0.02) {
      ctx.fillStyle = `rgba(0, 0, 0, ${shadowAlpha})`;
      ctx.beginPath();
      ctx.ellipse(p.x, groundY + 4, 46, 7, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(-plane.angle);
    // Tail.
    ctx.fillStyle = '#0f766e';
    ctx.beginPath();
    ctx.moveTo(-34, -4);
    ctx.lineTo(-52, -26);
    ctx.lineTo(-44, -2);
    ctx.closePath();
    ctx.fill();
    // Rear wing.
    ctx.fillStyle = '#f97316';
    ctx.beginPath();
    ctx.moveTo(-18, 6);
    ctx.lineTo(-34, 26);
    ctx.lineTo(-8, 10);
    ctx.closePath();
    ctx.fill();
    // Fuselage.
    const body = ctx.createLinearGradient(0, -14, 0, 12);
    body.addColorStop(0, '#2dd4bf');
    body.addColorStop(0.55, '#14b8a6');
    body.addColorStop(1, '#0f766e');
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.moveTo(-46, 0);
    ctx.quadraticCurveTo(-40, -13, -8, -13);
    ctx.lineTo(30, -10);
    ctx.quadraticCurveTo(52, -6, 52, 0);
    ctx.quadraticCurveTo(52, 7, 30, 10);
    ctx.lineTo(-8, 12);
    ctx.quadraticCurveTo(-42, 12, -46, 0);
    ctx.closePath();
    ctx.fill();
    // Orange cheatline.
    ctx.fillStyle = '#f97316';
    ctx.fillRect(-40, 2, 78, 4);
    // Cockpit window, lit.
    ctx.fillStyle = '#bfe9ff';
    ctx.beginPath();
    ctx.moveTo(18, -11);
    ctx.quadraticCurveTo(34, -10, 38, -3);
    ctx.lineTo(18, -3);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.beginPath();
    ctx.moveTo(22, -10);
    ctx.lineTo(28, -10);
    ctx.lineTo(24, -4);
    ctx.lineTo(20, -4);
    ctx.closePath();
    ctx.fill();
    // Spinning propeller at the nose.
    const prop = time * (18 + plane.throttle * 30);
    ctx.strokeStyle = 'rgba(40, 40, 40, 0.75)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(52 + Math.cos(prop) * 26, Math.sin(prop) * 26);
    ctx.lineTo(52 - Math.cos(prop) * 26, -Math.sin(prop) * 26);
    ctx.stroke();
    ctx.fillStyle = 'rgba(200, 200, 200, 0.35)';
    ctx.beginPath();
    ctx.ellipse(52, 0, 7, 26, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#334155';
    ctx.beginPath();
    ctx.arc(52, 0, 5, 0, Math.PI * 2);
    ctx.fill();
    // Landing gear, down when slow.
    if (plane.speed < 200) {
      ctx.strokeStyle = '#1f2937';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-14, 11);
      ctx.lineTo(-14, 22);
      ctx.moveTo(22, 10);
      ctx.lineTo(22, 22);
      ctx.stroke();
      ctx.fillStyle = '#1f2937';
      ctx.beginPath();
      ctx.arc(-14, 23, 4, 0, Math.PI * 2);
      ctx.arc(22, 23, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // Speed streaks when the plane is really moving.
    if (plane.speed > 250) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
      ctx.lineWidth = 2;
      const count = Math.floor((plane.speed - 250) / 40);
      for (let i = 0; i < count; i += 1) {
        const sx = ((i * 173 + time * 900) % 1400) - 60;
        const sy = 120 + ((i * 97) % 480);
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(sx - 46, sy);
        ctx.stroke();
      }
    }
  }

  function drawTopHud(state) {
    const plane = state.plane;
    // Altitude above the ground below, not above sea level, and not counting
    // the plane's own height above its wheels: parked reads 0.
    const altitude = Math.max(0, plane.y - state.terrain.runwayGroundHeight(plane.x) - 14);
    ctx.fillStyle = 'rgba(10, 25, 41, 0.82)';
    ctx.fillRect(0, 0, VIEW_WIDTH, TOP_BAR);
    ctx.fillStyle = '#f97316';
    ctx.fillRect(0, TOP_BAR, VIEW_WIDTH, 3);

    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    hudCell(16, 'ALT', `${altitudeFeet(altitude)} ft`);
    hudCell(150, 'SPD', `${speedKnots(plane.speed)} kt`);
    hudCell(284, 'HDG', `${String(Math.round(headingDegrees(plane.angle))).padStart(3, '0')}°`);
    hudCell(418, 'THR', `${Math.round(plane.throttle * 100)}%`);

    // Compass strip, centre top.
    const heading = headingDegrees(plane.angle);
    const cx = VIEW_WIDTH / 2;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.fillRect(cx - 150, 12, 300, 38);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx, 12);
    ctx.lineTo(cx, 50);
    ctx.stroke();
    const labels = [[0, 'N'], [45, 'NE'], [90, 'E'], [135, 'SE'], [180, 'S'], [225, 'SW'], [270, 'W'], [315, 'NW']];
    ctx.font = 'bold 13px Arial, sans-serif';
    ctx.textAlign = 'center';
    for (const [deg, label] of labels) {
      let diff = ((deg - heading + 540) % 360) - 180;
      if (Math.abs(diff) > 75) continue;
      const x = cx + diff * 2;
      ctx.fillStyle = deg % 90 === 0 ? '#ffd166' : '#e2e8f0';
      ctx.fillText(label, x, 40);
    }

    // Right side: score, rings, time, fuel.
    ctx.textAlign = 'right';
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 11px Arial, sans-serif';
    ctx.fillText('SCORE', VIEW_WIDTH - 250, 20);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px Arial, sans-serif';
    ctx.fillText(String(state.score), VIEW_WIDTH - 250, 46);
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 11px Arial, sans-serif';
    ctx.fillText('RINGS', VIEW_WIDTH - 160, 20);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px Arial, sans-serif';
    ctx.fillText(`${state.ringsCollected}/${state.mission.rings}`, VIEW_WIDTH - 160, 46);
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 11px Arial, sans-serif';
    ctx.fillText('TIME', VIEW_WIDTH - 90, 20);
    ctx.fillStyle = state.timeLeft < 20 ? '#ff6b6b' : '#ffffff';
    ctx.font = 'bold 22px Arial, sans-serif';
    ctx.fillText(`${Math.max(0, Math.ceil(state.timeLeft))}s`, VIEW_WIDTH - 90, 46);
  }

  function hudCell(x, label, value) {
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 11px Arial, sans-serif';
    ctx.fillText(label, x, 20);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px Arial, sans-serif';
    ctx.fillText(value, x, 46);
  }

  function drawInstruments(state) {
    const plane = state.plane;
    const y0 = VIEW_HEIGHT - PANEL_HEIGHT;
    ctx.fillStyle = 'rgba(10, 25, 41, 0.88)';
    ctx.fillRect(0, y0, VIEW_WIDTH, PANEL_HEIGHT);
    ctx.fillStyle = '#f97316';
    ctx.fillRect(0, y0, VIEW_WIDTH, 3);

    // Artificial horizon: the ball that shows pitch and bank.
    const cx = 120;
    const cy = y0 + PANEL_HEIGHT / 2;
    const altitude = Math.max(0, plane.y - state.terrain.runwayGroundHeight(plane.x) - 14);
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, 34, 0, Math.PI * 2);
    ctx.clip();
    ctx.translate(cx, cy);
    ctx.rotate(-plane.angle);
    ctx.fillStyle = '#5aa9e6';
    ctx.fillRect(-40, -40 - plane.angle * 30, 80, 40 + plane.angle * 30);
    ctx.fillStyle = '#8a5a2b';
    ctx.fillRect(-40, 0, 80, 40);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-40, 0);
    ctx.lineTo(40, 0);
    ctx.stroke();
    ctx.restore();
    ctx.strokeStyle = '#ffd166';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, 34, 0, Math.PI * 2);
    ctx.stroke();
    // Fixed wings marker.
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cx - 20, cy);
    ctx.lineTo(cx - 6, cy);
    ctx.moveTo(cx + 6, cy);
    ctx.lineTo(cx + 20, cy);
    ctx.stroke();
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 11px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('ATTITUDE', cx, y0 + PANEL_HEIGHT - 8);

    drawDial(250, cy, altitudeFeet(altitude) / 100, 10, 'ALT', 'ft x100');
    drawDial(380, cy, speedKnots(plane.speed), 300, 'AIRSPEED', 'kt');
    drawDial(510, cy, plane.throttle * 100, 100, 'THROTTLE', '%');

    // Fuel gauge, vertical, lit.
    const fx = 600;
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 11px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('FUEL', fx, y0 + 16);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.fillRect(fx - 12, y0 + 24, 24, 52);
    ctx.fillStyle = state.fuel < 25 ? '#ef4444' : '#22c55e';
    const fuelH = 52 * (state.fuel / 100);
    ctx.fillRect(fx - 12, y0 + 76 - fuelH, 24, fuelH);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px Arial, sans-serif';
    ctx.fillText(`${Math.round(state.fuel)}`, fx, y0 + PANEL_HEIGHT - 8);

    // Mission line, right of the panel.
    ctx.textAlign = 'left';
    ctx.fillStyle = '#ffd166';
    ctx.font = 'bold 16px Arial, sans-serif';
    ctx.fillText(state.mission.name, 680, y0 + 30);
    ctx.fillStyle = '#e2e8f0';
    ctx.font = '14px Arial, sans-serif';
    ctx.fillText(state.mission.blurb, 680, y0 + 54);
    const next = state.terrain.rings.find((r) => !r.collected);
    ctx.fillStyle = '#94a3b8';
    ctx.fillText(
      next === undefined ? 'All rings done — land on the far runway!' : `Next: ring ${next.index + 1} of ${state.mission.rings}`,
      680,
      y0 + 78,
    );
  }

  function drawDial(cx, cy, value, max, label, unit) {
    ctx.save();
    ctx.translate(cx, cy);
    // Lit dial face.
    const face = ctx.createRadialGradient(0, 0, 4, 0, 0, 34);
    face.addColorStop(0, '#1e293b');
    face.addColorStop(1, '#0f172a');
    ctx.fillStyle = face;
    ctx.beginPath();
    ctx.arc(0, 0, 34, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffd166';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, 34, 0, Math.PI * 2);
    ctx.stroke();
    for (let i = 0; i <= 8; i += 1) {
      const a = (-Math.PI * 0.75) + (i / 8) * Math.PI * 1.5;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * 28, Math.sin(a) * 28);
      ctx.lineTo(Math.cos(a) * 32, Math.sin(a) * 32);
      ctx.stroke();
    }
    const frac = Math.max(0, Math.min(1, value / max));
    const needle = -Math.PI * 0.75 + frac * Math.PI * 1.5;
    ctx.strokeStyle = '#ff6b6b';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(needle) * 27, Math.sin(needle) * 27);
    ctx.stroke();
    ctx.fillStyle = '#e2e8f0';
    ctx.beginPath();
    ctx.arc(0, 0, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 11px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(label, cx, cy + 48);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 13px Arial, sans-serif';
    ctx.fillText(`${Math.round(value)} ${unit}`, cx, cy - 42);
  }

  function drawMessage(state) {
    if (state.message === null || state.elapsed > state.messageUntil) return;
    ctx.fillStyle = 'rgba(10, 25, 41, 0.85)';
    const text = state.message;
    ctx.font = 'bold 24px Arial, sans-serif';
    const w = ctx.measureText(text).width + 44;
    roundRect(VIEW_WIDTH / 2 - w / 2, TOP_BAR + 18, w, 44, 10);
    ctx.fill();
    ctx.fillStyle = '#ffd166';
    ctx.textAlign = 'center';
    ctx.fillText(text, VIEW_WIDTH / 2, TOP_BAR + 48);
  }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function drawTitle(state, best) {
    ctx.fillStyle = 'rgba(8, 20, 36, 0.45)';
    ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffd166';
    ctx.font = 'bold 20px Arial, sans-serif';
    ctx.fillText('A LITTLE PROP PLANE · THREE DELIVERY ROUTES · ONE SKY', VIEW_WIDTH / 2, 92);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 76px Arial, sans-serif';
    ctx.shadowColor = 'rgba(249, 115, 22, 0.9)';
    ctx.shadowBlur = 24;
    ctx.fillText('SKYLINE COURIER', VIEW_WIDTH / 2, 168);
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#e2e8f0';
    ctx.font = '20px Arial, sans-serif';
    ctx.fillText('Thread the rings, mind your fuel, and land on the far runway.', VIEW_WIDTH / 2, 206);

    const cardW = 350;
    const gap = 26;
    const total = cardW * 3 + gap * 2;
    const x0 = (VIEW_WIDTH - total) / 2;
    MISSIONS.forEach((mission, i) => {
      const x = x0 + i * (cardW + gap);
      const y = 250;
      const selected = i === selectedMission;
      ctx.fillStyle = selected ? 'rgba(249, 115, 22, 0.92)' : 'rgba(10, 25, 41, 0.88)';
      roundRect(x, y, cardW, 190, 12);
      ctx.fill();
      ctx.strokeStyle = selected ? '#ffd166' : 'rgba(255, 255, 255, 0.25)';
      ctx.lineWidth = selected ? 3 : 1;
      ctx.stroke();
      ctx.fillStyle = '#ffd166';
      ctx.font = 'bold 15px Arial, sans-serif';
      ctx.fillText(`ROUTE ${i + 1} — PRESS ${i + 1}`, x + cardW / 2, y + 34);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 26px Arial, sans-serif';
      ctx.fillText(mission.name, x + cardW / 2, y + 74);
      ctx.fillStyle = '#e2e8f0';
      ctx.font = '16px Arial, sans-serif';
      ctx.fillText(mission.blurb, x + cardW / 2, y + 106);
      ctx.fillStyle = '#94a3b8';
      ctx.font = '15px Arial, sans-serif';
      ctx.fillText(`${mission.rings} rings · ${mission.timeLimit}s · fuel ${mission.fuelStart}`, x + cardW / 2, y + 140);
      if (selected) {
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 15px Arial, sans-serif';
        ctx.fillText('▶ SELECTED — press ENTER to fly', x + cardW / 2, y + 168);
      }
    });

    ctx.fillStyle = '#ffffff';
    ctx.font = '17px Arial, sans-serif';
    ctx.fillText('↑ / ↓ pitch    ← / → throttle    Hold mouse to steer    P pause    M mute', VIEW_WIDTH / 2, 492);
    ctx.fillStyle = '#ffd166';
    ctx.font = 'bold 19px Arial, sans-serif';
    ctx.fillText(`Best score: ${best}`, VIEW_WIDTH / 2, 528);
    ctx.fillStyle = '#cbd5e1';
    ctx.font = '15px Arial, sans-serif';
    ctx.fillText('Land gently on a runway — anything else is a crash. Rings pay score and fuel.', VIEW_WIDTH / 2, 560);
  }

  function drawPaused() {
    ctx.fillStyle = 'rgba(8, 20, 36, 0.6)';
    ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 54px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('PAUSED', VIEW_WIDTH / 2, VIEW_HEIGHT / 2 - 10);
    ctx.font = '20px Arial, sans-serif';
    ctx.fillStyle = '#e2e8f0';
    ctx.fillText('Press P to keep flying', VIEW_WIDTH / 2, VIEW_HEIGHT / 2 + 30);
  }

  function drawOver(state, best) {
    ctx.fillStyle = 'rgba(8, 20, 36, 0.62)';
    ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
    const w = 620;
    const h = 400;
    const x = (VIEW_WIDTH - w) / 2;
    const y = (VIEW_HEIGHT - h) / 2;
    ctx.fillStyle = 'rgba(10, 25, 41, 0.94)';
    roundRect(x, y, w, h, 14);
    ctx.fill();
    ctx.strokeStyle = '#f97316';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.textAlign = 'center';
    const titles = {
      landed: 'DELIVERED — CLEAN LANDING!',
      'landed-early': 'LANDED EARLY',
      crashed: 'CRASHED',
      'time-up': 'OUT OF TIME',
      'fuel-out': 'OUT OF FUEL',
    };
    const subtitles = {
      landed: 'Every ring threaded, wheels down on the far runway.',
      'landed-early': 'Safe down — but the mail is still out there.',
      crashed: 'The valley keeps what it catches.',
      'time-up': 'The clock ran out mid-route.',
      'fuel-out': 'The tank ran dry.',
    };
    const title = titles[state.overReason] ?? 'SORTIE OVER';
    ctx.fillStyle = state.overReason === 'landed' ? '#4ade80' : '#ff6b6b';
    ctx.font = 'bold 34px Arial, sans-serif';
    ctx.fillText(title, VIEW_WIDTH / 2, y + 58);
    ctx.fillStyle = '#cbd5e1';
    ctx.font = '18px Arial, sans-serif';
    ctx.fillText(subtitles[state.overReason] ?? '', VIEW_WIDTH / 2, y + 90);
    ctx.fillStyle = '#e2e8f0';
    ctx.font = '18px Arial, sans-serif';
    const lines = [
      `Rings threaded: ${state.ringsCollected} / ${state.mission.rings}  (best combo x${state.bestCombo})`,
      `Landing bonus: +${state.landedBonus}`,
      `Time bonus: +${state.timeBonus}`,
      `Fuel left: ${Math.round(state.fuel)}%`,
    ];
    lines.forEach((line, i) => ctx.fillText(line, VIEW_WIDTH / 2, y + 128 + i * 30));
    ctx.fillStyle = '#ffd166';
    ctx.font = 'bold 40px Arial, sans-serif';
    ctx.fillText(`SCORE  ${state.score}`, VIEW_WIDTH / 2, y + 268);
    ctx.fillStyle = '#ffffff';
    ctx.font = '18px Arial, sans-serif';
    ctx.fillText(`Best score: ${best}`, VIEW_WIDTH / 2, y + 306);
    ctx.fillStyle = '#cbd5e1';
    ctx.font = '17px Arial, sans-serif';
    ctx.fillText('Press ENTER to fly again — or 1 / 2 / 3 for another route', VIEW_WIDTH / 2, y + 346);
  }

  /** Paint one frame. `screen` is one of the SCREEN_* constants. */
  function draw(state, screen, best, time, clickTarget) {
    const scaleX = canvas.width / VIEW_WIDTH;
    const scaleY = canvas.height / VIEW_HEIGHT;
    ctx.setTransform(scaleX, 0, 0, scaleY, 0, 0);

    // Camera chases the plane, easing toward it.
    const targetX = state.plane.x - 420;
    const targetY = Math.max(0, state.plane.y - 400);
    camX += (targetX - camX) * 0.12;
    camY += (targetY - camY) * 0.08;
    if (screen === SCREEN_TITLE) {
      camX = 0;
      camY = 0;
    }

    drawSky(time);
    drawGround(state);
    drawRings(state, time);
    if (screen === SCREEN_PLAY || screen === SCREEN_PAUSED) drawGuide(state);
    drawPlane(state, time);
    drawTopHud(state);
    if (screen === SCREEN_PLAY || screen === SCREEN_PAUSED) drawMessage(state);
    drawInstruments(state);
    if (screen === SCREEN_TITLE) drawTitle(state, best);
    if (screen === SCREEN_PAUSED) drawPaused();
    if (screen === SCREEN_OVER) drawOver(state, best);
    if (clickTarget !== undefined && clickTarget !== null) {
      void clickTarget;
    }
  }

  return {
    draw,
    /** Put the camera straight onto the plane: screenshots paint twice, so
     * the usual easing would still be catching up when the shutter fires. */
    snapTo(state) {
      camX = state.plane.x - 420;
      camY = Math.max(0, state.plane.y - 400);
    },
    /** Which mission the title screen has selected (0, 1 or 2). */
    get selectedMission() {
      return selectedMission;
    },
    setSelectedMission(index) {
      selectedMission = index;
    },
  };
}
