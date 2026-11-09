/**
 * Sounds, live erzeugt mit der Web Audio API (keine Audio-Dateien, keine Lizenzen, offline).
 * Wird erst nach der ersten Berührung aktiviert (Vorgabe von iOS/Safari).
 */
export type Sfx = "click" | "press" | "thud" | "deal" | "chip" | "win" | "bigwin" | "loss" | "push" | "spin" | "tick" | "boom" | "coin" | "reveal" | "toggle" | "whoosh" | "fanfare" | "slide";

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let enabled = true;
let volume = 0.7;
const last: Partial<Record<Sfx, number>> = {};

export function setSound(on: boolean, vol: number) {
  enabled = on;
  volume = Math.max(0, Math.min(1, vol));
  if (master) master.gain.value = volume * 0.5;
}

function ac(): AudioContext | null {
  if (!enabled) return null;
  if (!ctx) {
    const C = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!C) return null;
    ctx = new C();
    master = ctx.createGain();
    master.gain.value = volume * 0.5;
    master.connect(ctx.destination);
  }
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  return ctx;
}

// Audio bei der ersten Berührung freischalten + Klick-Sound für alle Bedienelemente
if (typeof window !== "undefined") {
  const unlock = () => { ac(); window.removeEventListener("pointerdown", unlock); };
  window.addEventListener("pointerdown", unlock);
  document.addEventListener("pointerdown", (e) => {
    const el = (e.target as Element | null)?.closest?.("button, a, [role=switch], input, select, label");
    if (!el || (el as HTMLButtonElement).disabled) return;
    if (el.matches("[role=switch]")) play("toggle");
    else if (el.matches("input[type=range]")) play("slide");
    else play("click");
  }, { passive: true });
  document.addEventListener("input", (e) => {
    if ((e.target as Element | null)?.matches?.("input[type=range]")) play("slide");
  }, { passive: true });
}

function tone(freq: number, dur: number, opts: { type?: OscillatorType; at?: number; gain?: number; slide?: number; attack?: number } = {}) {
  const c = ac(); if (!c || !master) return;
  const t = c.currentTime + (opts.at ?? 0);
  const o = c.createOscillator(), g = c.createGain();
  o.type = opts.type ?? "sine";
  o.frequency.setValueAtTime(freq, t);
  if (opts.slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq * opts.slide), t + dur);
  const peak = opts.gain ?? 0.3;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + (opts.attack ?? 0.005));
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(master);
  o.start(t); o.stop(t + dur + 0.02);
}

function noise(dur: number, opts: { at?: number; gain?: number; filter?: number; q?: number } = {}) {
  const c = ac(); if (!c || !master) return;
  const t = c.currentTime + (opts.at ?? 0);
  const buf = c.createBuffer(1, Math.ceil(c.sampleRate * dur), c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
  const src = c.createBufferSource(); src.buffer = buf;
  const f = c.createBiquadFilter(); f.type = "bandpass"; f.frequency.value = opts.filter ?? 2000; f.Q.value = opts.q ?? 0.8;
  const g = c.createGain(); g.gain.value = opts.gain ?? 0.3;
  src.connect(f).connect(g).connect(master);
  src.start(t);
}

export function play(s: Sfx) {
  if (!enabled) return;
  const now = performance.now();
  if (now - (last[s] ?? 0) < (s === "deal" ? 60 : s === "slide" ? 45 : 25)) return; // Überlagerung vermeiden
  last[s] = now;
  switch (s) {
    case "click": tone(1800, 0.03, { type: "square", gain: 0.06 }); break;
    case "press": tone(900, 0.06, { type: "triangle", gain: 0.12, slide: 0.7 }); break;
    case "thud": tone(140, 0.25, { type: "sine", gain: 0.45, slide: 0.5 }); noise(0.15, { gain: 0.15, filter: 300 }); break;
    case "deal": noise(0.07, { gain: 0.22, filter: 3500, q: 1.2 }); break;
    case "chip": tone(2400, 0.05, { type: "triangle", gain: 0.12 }); tone(3100, 0.06, { type: "triangle", gain: 0.09, at: 0.025 }); break;
    case "tick": tone(2600, 0.02, { type: "square", gain: 0.05 }); break;
    case "reveal": tone(660, 0.12, { type: "triangle", gain: 0.15, slide: 1.5 }); break;
    case "coin": tone(1320, 0.08, { type: "square", gain: 0.1 }); tone(1980, 0.18, { type: "square", gain: 0.1, at: 0.07 }); break;
    case "win": [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.18, { type: "triangle", gain: 0.18, at: i * 0.07 })); break;
    case "bigwin":
      [523, 659, 784, 1047, 1319, 1568].forEach((f, i) => tone(f, 0.3, { type: "triangle", gain: 0.2, at: i * 0.08 }));
      for (let i = 0; i < 10; i++) tone(2000 + Math.random() * 1500, 0.06, { type: "square", gain: 0.05, at: 0.5 + i * 0.07 });
      break;
    case "loss": tone(330, 0.2, { type: "sine", gain: 0.16, slide: 0.6 }); tone(247, 0.3, { type: "sine", gain: 0.14, at: 0.14, slide: 0.6 }); break;
    case "push": tone(440, 0.14, { type: "sine", gain: 0.12 }); break;
    case "boom": noise(0.6, { gain: 0.5, filter: 180, q: 0.5 }); tone(90, 0.5, { gain: 0.4, slide: 0.4 }); break;
    case "toggle": tone(1200, 0.04, { type: "triangle", gain: 0.12 }); tone(1600, 0.05, { type: "triangle", gain: 0.1, at: 0.04 }); break;
    case "slide": tone(1400, 0.015, { type: "square", gain: 0.035 }); break;
    case "whoosh": noise(0.22, { gain: 0.14, filter: 1200, q: 0.6 }); break;
    case "fanfare":
      [392, 523, 659, 784].forEach((f, i) => tone(f, 0.22, { type: "sawtooth", gain: 0.08, at: i * 0.12 }));
      [523, 659, 784, 1047].forEach((f) => tone(f, 0.9, { type: "triangle", gain: 0.12, at: 0.5 }));
      break;
    case "spin": {
      // Ratterndes Abbremsen über ~3 Sekunden (Rad, Roulette)
      let t = 0, gap = 0.04;
      while (t < 3) { tone(2200, 0.018, { type: "square", gain: 0.04, at: t }); t += gap; gap *= 1.07; }
      break;
    }
  }
}

/* Steigender Motor-Ton für Crash: folgt dem Multiplikator */
let riser: { o: OscillatorNode; g: GainNode } | null = null;
export function riserStart() {
  const c = ac(); if (!c || !master || riser) return;
  const o = c.createOscillator(), g = c.createGain();
  o.type = "sawtooth"; o.frequency.value = 110;
  const f = c.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 900;
  g.gain.value = 0.0001; g.gain.exponentialRampToValueAtTime(0.06, c.currentTime + 0.2);
  o.connect(f).connect(g).connect(master); o.start();
  riser = { o, g };
}
export function riserSet(mult: number) {
  if (!riser || !ctx) return;
  riser.o.frequency.setTargetAtTime(110 * Math.min(8, Math.pow(mult, 0.9)), ctx.currentTime, 0.05);
}
export function riserStop() {
  if (!riser || !ctx) return;
  const { o, g } = riser; riser = null;
  g.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.04);
  o.stop(ctx.currentTime + 0.3);
}
