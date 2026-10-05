// Renders the kitchen sounds to WAV for the Android app, from the same notes and timings as
// the Web Audio versions in client/src/admin/adminUtils.js (playKitchenAlarm, playChime).
// If those change, change them here too and run:  node kitchen-android/sounds/render-sounds.mjs
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const RATE = 44100;
const RAW = fileURLToPath(new URL("../android/app/src/main/res/raw/", import.meta.url));

// Band-limited square wave with peak 1, like Web Audio's "square" oscillator (odd harmonics
// up to Nyquist, normalized).
function squareWave(freq, seconds) {
	const n = Math.ceil(seconds * RATE);
	const out = new Float64Array(n);
	for (let h = 1; h * freq < RATE / 2; h += 2) {
		const w = (2 * Math.PI * h * freq) / RATE;
		const a = 1 / h;
		for (let i = 0; i < n; i++) out[i] += a * Math.sin(w * i);
	}
	const peak = out.reduce((m, v) => Math.max(m, Math.abs(v)), 0);
	return out.map((v) => v / peak);
}

function sineWave(freq, seconds) {
	const n = Math.ceil(seconds * RATE);
	const w = (2 * Math.PI * freq) / RATE;
	return Float64Array.from({ length: n }, (_, i) => Math.sin(w * i));
}

// Adds `wave` shaped by `envelope(t)` (t in seconds from the note's start) at `start` seconds.
function mix(buffer, start, wave, envelope) {
	const offset = Math.round(start * RATE);
	wave.forEach((v, i) => {
		buffer[offset + i] += v * envelope(i / RATE);
	});
}

// playKitchenAlarm: three ding-dongs of square waves held at 0.9.
function alarm() {
	const PEAK = 0.9;
	const NOTE = 0.2;
	const pairs = 3;
	const length = (pairs * 2 - 1) * (NOTE + 0.05) + (pairs - 1) * 0.25 + NOTE + 0.05;
	const buffer = new Float64Array(Math.ceil(length * RATE));
	for (let i = 0; i < pairs * 2; i++) {
		const start = i * (NOTE + 0.05) + Math.floor(i / 2) * 0.25;
		const freq = i % 2 ? 1568 : 1046.5;
		mix(buffer, start, squareWave(freq, NOTE), (t) => {
			if (t < 0.008) return (PEAK * t) / 0.008;
			if (t < NOTE - 0.015) return PEAK;
			return Math.max(0, (PEAK * (NOTE - t)) / 0.015);
		});
	}
	return buffer;
}

// playChime (not loud): the softer sine "ding-dong", twice. Admin pages use it.
function chime() {
	const notes = [
		[0, 880],
		[0.18, 1318.5],
		[0.6, 880],
		[0.78, 1318.5],
	];
	const buffer = new Float64Array(Math.ceil((0.78 + 0.55 + 0.05) * RATE));
	const exp = (from, to, t, span) => from * (to / from) ** (t / span);
	for (const [start, freq] of notes) {
		mix(buffer, start, sineWave(freq, 0.55), (t) => (t < 0.02 ? exp(0.0001, 0.35, t, 0.02) : exp(0.35, 0.0001, Math.min(t, 0.5) - 0.02, 0.48)));
	}
	return buffer;
}

function writeWav(file, samples) {
	const data = Buffer.alloc(samples.length * 2);
	samples.forEach((v, i) => data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, v)) * 32767), i * 2));
	const header = Buffer.alloc(44);
	header.write("RIFF", 0);
	header.writeUInt32LE(36 + data.length, 4);
	header.write("WAVEfmt ", 8);
	header.writeUInt32LE(16, 16); // fmt chunk size
	header.writeUInt16LE(1, 20); // PCM
	header.writeUInt16LE(1, 22); // mono
	header.writeUInt32LE(RATE, 24);
	header.writeUInt32LE(RATE * 2, 28); // byte rate
	header.writeUInt16LE(2, 32); // block align
	header.writeUInt16LE(16, 34); // bits per sample
	header.write("data", 36);
	header.writeUInt32LE(data.length, 40);
	writeFileSync(RAW + file, Buffer.concat([header, data]));
	console.log(`${file}: ${(samples.length / RATE).toFixed(2)}s`);
}

writeWav("kitchen_alarm.wav", alarm());
writeWav("kitchen_chime.wav", chime());
