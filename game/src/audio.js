// Skyline Courier — sound, all synthesised with WebAudio: no audio files,
// no network. A low engine hum that follows the throttle, a chime when a
// ring is threaded, a thud for a crash and a little fanfare for a landing.
export function createAudio() {
  let context = null;
  let engineOsc = null;
  let engineGain = null;
  let muted = false;

  function ensure() {
    if (context !== null) return true;
    try {
      const AudioContextClass = window.AudioContext ?? window.webkitAudioContext;
      if (AudioContextClass === undefined) return false;
      context = new AudioContextClass();
      engineOsc = context.createOscillator();
      engineOsc.type = 'sawtooth';
      engineOsc.frequency.value = 62;
      const filter = context.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 320;
      engineGain = context.createGain();
      engineGain.gain.value = 0;
      engineOsc.connect(filter);
      filter.connect(engineGain);
      engineGain.connect(context.destination);
      engineOsc.start();
      return true;
    } catch {
      return false;
    }
  }

  function tone(frequency, seconds, type, volume, when = 0) {
    if (context === null || muted) return;
    const start = context.currentTime + when;
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.type = type;
    osc.frequency.value = frequency;
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(volume, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + seconds);
    osc.connect(gain);
    gain.connect(context.destination);
    osc.start(start);
    osc.stop(start + seconds + 0.05);
  }

  return {
    /** Call from a user gesture so the browser lets the sound start. */
    unlock() {
      if (ensure() && context.state === 'suspended') context.resume();
    },
    /** The engine hum follows the throttle, 0..1. */
    engine(throttle, flying) {
      if (!ensure() || muted) return;
      // A context the browser suspended (no gesture yet) is woken here so
      // the hum starts on the first frame the pilot is actually flying.
      if (context.state === 'suspended') context.resume();
      const target = flying ? 0.035 + throttle * 0.05 : 0;
      engineGain.gain.setTargetAtTime(target, context.currentTime, 0.12);
      engineOsc.frequency.setTargetAtTime(58 + throttle * 64, context.currentTime, 0.1);
    },
    /** Two bright notes when a ring is threaded. */
    ring() {
      tone(880, 0.16, 'sine', 0.16);
      tone(1318, 0.24, 'sine', 0.14, 0.09);
    },
    /** A short blip when a route is picked on the title screen. */
    click() {
      tone(660, 0.07, 'sine', 0.1);
    },
    /** A low thud for a crash. */
    crash() {
      tone(70, 0.5, 'triangle', 0.3);
      tone(48, 0.7, 'sine', 0.28, 0.05);
    },
    /** A rising three-note fanfare for a landing. */
    landing() {
      tone(523, 0.18, 'sine', 0.16);
      tone(659, 0.18, 'sine', 0.16, 0.14);
      tone(784, 0.4, 'sine', 0.18, 0.28);
    },
    toggleMute() {
      muted = !muted;
      if (engineGain !== null && context !== null) {
        engineGain.gain.setTargetAtTime(0, context.currentTime, 0.05);
      }
      return muted;
    },
  };
}
