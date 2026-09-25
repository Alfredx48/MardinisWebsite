// Helpers shared by the admin screens (no React components here).
import { money } from "../format";

const TIME_ZONE = "America/Los_Angeles";

export const STATUS_LABELS = {
	awaiting_payment: "Awaiting payment",
	new: "New",
	preparing: "Preparing",
	ready: "Ready",
	completed: "Completed",
	cancelled: "Cancelled",
};

export const STATUS_BADGES = {
	awaiting_payment: "",
	new: "badge-terracotta",
	preparing: "badge-warning",
	ready: "badge-success",
	completed: "badge-olive",
	cancelled: "badge-danger",
};

// Mirrors Order::KITCHEN_FLOW on the server.
export const NEXT_STATUS = { new: "preparing", preparing: "ready", ready: "completed" };

export const NEXT_ACTION_LABELS = {
	new: "Start preparing",
	preparing: "Mark ready",
	ready: "Picked up",
};

export const PAYMENT_LABELS = { card: "Card (online)", in_store: "Pay in store" };

export const CATERING_STATUSES = [
	["new", "New"],
	["contacted", "Contacted"],
	["booked", "Booked"],
	["closed", "Closed"],
];

// YYYY-MM-DD of a timestamp in restaurant time.
export function restaurantDate(iso) {
	return new Date(iso).toLocaleDateString("en-CA", { timeZone: TIME_ZONE });
}

// "Oct 3, 2026" for a plain YYYY-MM-DD date (no time zone shifting).
export function plainDate(isoDate, options = {}) {
	if (!isoDate) return "";
	return new Date(`${isoDate}T12:00:00Z`).toLocaleDateString("en-US", {
		weekday: "short",
		month: "short",
		day: "numeric",
		year: "numeric",
		timeZone: "UTC",
		...options,
	});
}

export function placedAt(order) {
	return order.placed_at || order.created_at;
}

export function amountDue(order) {
	if (order.payment_status !== "unpaid") return 0;
	return Number(order.total) || 0;
}

export function paymentBadge(order) {
	if (order.payment_status === "refunded") return { label: "Refunded", className: "badge-info" };
	if (order.payment_status === "partially_refunded") {
		return { label: `Partly refunded (${money(order.refunded_amount)})`, className: "badge-info" };
	}
	if (order.payment_status === "paid") {
		return { label: order.payment_method === "card" ? "Paid online" : "Paid", className: "badge-success" };
	}
	if (order.payment_method === "in_store") return { label: "Pay at pickup", className: "badge-warning" };
	return { label: "Unpaid", className: "badge-danger" };
}

// Card orders paid online with money left to refund.
export function canRefund(order) {
	return order.payment_method === "card" && Number(order.refundable_amount ?? 0) > 0;
}

export const REFUND_REASONS = ["Missing item", "Wrong item", "Quality issue", "Long wait", "Customer cancelled", "Other"];

export function errorList(e) {
	if (e && Array.isArray(e.errors) && e.errors.length) return e.errors;
	return [e?.message || "Something went wrong. Please try again."];
}

function loadImage(file) {
	return new Promise((resolve, reject) => {
		const url = URL.createObjectURL(file);
		const img = new Image();
		img.onload = () => {
			URL.revokeObjectURL(url);
			resolve(img);
		};
		img.onerror = () => {
			URL.revokeObjectURL(url);
			reject(new Error("Couldn't read that photo. Please use a JPG, PNG or WebP image."));
		};
		img.src = url;
	});
}

// Scales a photo down to at most `maxSize` px on its longest side and
// re-encodes it as JPEG, so phone pictures upload and load quickly. Browsers
// apply the camera's rotation when drawing an <img>, so photos stay upright.
export async function shrinkPhoto(file, maxSize = 1600, quality = 0.85) {
	const img = await loadImage(file);
	const scale = Math.min(1, maxSize / Math.max(img.naturalWidth, img.naturalHeight));
	const canvas = document.createElement("canvas");
	canvas.width = Math.round(img.naturalWidth * scale);
	canvas.height = Math.round(img.naturalHeight * scale);
	const ctx = canvas.getContext("2d");
	ctx.fillStyle = "#fff"; // JPEG has no transparency
	ctx.fillRect(0, 0, canvas.width, canvas.height);
	ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
	const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
	if (!blob) throw new Error("Couldn't process that photo. Please try another one.");
	return blob;
}

export function downloadFile(filename, content, type = "text/csv;charset=utf-8") {
	const blob = new Blob([content], { type });
	const url = URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = url;
	a.download = filename;
	document.body.appendChild(a);
	a.click();
	a.remove();
	setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function toCsv(rows) {
	const cell = (value) => {
		const str = value === null || value === undefined ? "" : String(value);
		return /[",\n\r]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
	};
	return rows.map((row) => row.map(cell).join(",")).join("\r\n");
}

/* ------------------------------------------------------------------ storage */
export function readPref(key, fallback) {
	try {
		const value = window.localStorage.getItem(`mardinis.admin.${key}`);
		return value === null ? fallback : JSON.parse(value);
	} catch {
		return fallback;
	}
}

export function writePref(key, value) {
	try {
		window.localStorage.setItem(`mardinis.admin.${key}`, JSON.stringify(value));
	} catch {
		// Storage can be unavailable (private mode); the preference just won't persist.
	}
}

/* -------------------------------------------------------------------- chime */
let audioContext = null;

export function getAudioContext() {
	if (!audioContext) {
		const AudioCtx = window.AudioContext || window.webkitAudioContext;
		if (!AudioCtx) return null;
		audioContext = new AudioCtx();
	}
	return audioContext;
}

// Browsers only allow audio after a user gesture; call this from a click handler.
export async function unlockAudio() {
	const ctx = getAudioContext();
	if (!ctx) return false;
	if (ctx.state === "suspended") {
		try {
			await ctx.resume();
		} catch {
			return false;
		}
	}
	return ctx.state === "running";
}

// A bright two-note "ding-dong", repeated twice so it's hard to miss over a busy counter.
export function playChime() {
	const ctx = getAudioContext();
	if (!ctx || ctx.state !== "running") return;
	const notes = [
		[0, 880],
		[0.18, 1318.5],
		[0.6, 880],
		[0.78, 1318.5],
	];
	notes.forEach(([offset, freq]) => {
		const start = ctx.currentTime + offset;
		const osc = ctx.createOscillator();
		const gain = ctx.createGain();
		osc.type = "sine";
		osc.frequency.value = freq;
		gain.gain.setValueAtTime(0.0001, start);
		gain.gain.exponentialRampToValueAtTime(0.35, start + 0.02);
		gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.5);
		osc.connect(gain).connect(ctx.destination);
		osc.start(start);
		osc.stop(start + 0.55);
	});
}
