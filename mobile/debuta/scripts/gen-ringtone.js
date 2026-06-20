/**
 * Genera un tono de llamada (ringtone) sintético y libre de copyright.
 * Arpegio tipo campana/arpa (La mayor) con cola de resonancia, en bucle.
 * Salida: assets/sounds/ringtone.wav  (PCM 16-bit, mono, 44.1 kHz)
 *
 * Ejecutar:  node scripts/gen-ringtone.js
 */
const fs = require('fs');
const path = require('path');

const SAMPLE_RATE = 44100;
const DURATION = 2.6;            // duración del bucle en segundos
const N = Math.floor(SAMPLE_RATE * DURATION);

// Arpegio de La mayor (brillante y agradable)
const NOTES = [
  { f: 440.00, t: 0.00 }, // A4
  { f: 554.37, t: 0.16 }, // C#5
  { f: 659.25, t: 0.32 }, // E5
  { f: 880.00, t: 0.48 }, // A5
  { f: 659.25, t: 0.78 }, // E5
  { f: 880.00, t: 0.94 }, // A5 (remate)
];
const DECAY = 5.2; // caída exponencial de cada campana

// Voz de campana: fundamental + armónicos con leve inarmonicidad
function bell(f, dt) {
  if (dt < 0) return 0;
  const env = Math.exp(-DECAY * dt);
  const w = 2 * Math.PI * f * dt;
  return env * (
    1.00 * Math.sin(w) +
    0.50 * Math.sin(2.01 * w) +
    0.25 * Math.sin(3.01 * w) +
    0.12 * Math.sin(4.02 * w)
  );
}

const samples = new Float32Array(N);
let peak = 0;
for (let i = 0; i < N; i++) {
  const t = i / SAMPLE_RATE;
  let s = 0;
  for (const note of NOTES) s += bell(note.f, t - note.t);
  samples[i] = s;
  const a = Math.abs(s);
  if (a > peak) peak = a;
}

// Normalizar a -3 dBFS y aplicar fades cortos para evitar clicks en el loop
const gain = (0.707 * 0.99) / (peak || 1);
const fade = Math.floor(SAMPLE_RATE * 0.01);
const data = Buffer.alloc(N * 2);
for (let i = 0; i < N; i++) {
  let v = samples[i] * gain;
  if (i < fade) v *= i / fade;
  if (i > N - fade) v *= (N - i) / fade;
  let s = Math.max(-1, Math.min(1, v));
  data.writeInt16LE((s * 32767) | 0, i * 2);
}

// Cabecera WAV (PCM 16-bit mono)
function wavHeader(dataLen) {
  const h = Buffer.alloc(44);
  h.write('RIFF', 0);
  h.writeUInt32LE(36 + dataLen, 4);
  h.write('WAVE', 8);
  h.write('fmt ', 12);
  h.writeUInt32LE(16, 16);
  h.writeUInt16LE(1, 20);              // PCM
  h.writeUInt16LE(1, 22);              // mono
  h.writeUInt32LE(SAMPLE_RATE, 24);
  h.writeUInt32LE(SAMPLE_RATE * 2, 28); // byte rate
  h.writeUInt16LE(2, 32);              // block align
  h.writeUInt16LE(16, 34);             // bits
  h.write('data', 36);
  h.writeUInt32LE(dataLen, 40);
  return h;
}

const out = path.join(__dirname, '..', 'assets', 'sounds', 'ringtone.wav');
fs.writeFileSync(out, Buffer.concat([wavHeader(data.length), data]));
console.log(`ringtone.wav generado: ${(fs.statSync(out).size / 1024).toFixed(0)} KB, ${DURATION}s en bucle`);
