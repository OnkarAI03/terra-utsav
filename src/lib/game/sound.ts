"use client";

/**
 * Tiny synthesised sound effects (no audio files). Nothing plays unless the player has turned
 * sound on; the AudioContext is created on that first tap so browsers allow it.
 */
let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

function tone(freq: number, start: number, duration: number, type: OscillatorType = "triangle", gain = 0.12, slideTo?: number) {
  const ac = audio();
  if (!ac) return;
  const t0 = ac.currentTime + start;
  const osc = ac.createOscillator();
  const amp = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + duration);
  amp.gain.setValueAtTime(0.0001, t0);
  amp.gain.exponentialRampToValueAtTime(gain, t0 + 0.012);
  amp.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  osc.connect(amp).connect(ac.destination);
  osc.start(t0);
  osc.stop(t0 + duration + 0.02);
}

export const sfx = {
  unlock() {
    audio();
  },
  catch() {
    tone(660, 0, 0.09, "triangle", 0.14, 990);
    tone(990, 0.07, 0.12, "triangle", 0.1);
  },
  decoy() {
    tone(220, 0, 0.22, "sawtooth", 0.07, 110);
  },
  miss() {
    tone(320, 0, 0.05, "sine", 0.04);
  },
  tick() {
    tone(880, 0, 0.05, "square", 0.04);
  },
  go() {
    tone(1046, 0, 0.18, "triangle", 0.12);
  },
  levelUp() {
    [523, 659, 784, 1046].forEach((f, i) => tone(f, i * 0.09, 0.16, "triangle", 0.11));
  },
  lose() {
    [392, 330, 262].forEach((f, i) => tone(f, i * 0.14, 0.2, "sine", 0.1));
  },
};
