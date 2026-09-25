const TIME_ZONE = "America/Los_Angeles";

const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

// "$5.88", or "from $5.88" for items that come in several sizes.
export function priceLabel(item) {
	return item.sizes?.length ? `from ${money(item.price)}` : money(item.price);
}

export function money(value) {
	return currency.format(Number(value) || 0);
}

// Round to cents the same way the server does.
export function cents(value) {
	return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

export function formatTime(iso) {
	if (!iso) return "";
	return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: TIME_ZONE });
}

export function formatDate(iso, options = {}) {
	if (!iso) return "";
	return new Date(iso).toLocaleDateString("en-US", {
		weekday: "short",
		month: "short",
		day: "numeric",
		timeZone: TIME_ZONE,
		...options,
	});
}

export function formatDateTime(iso) {
	if (!iso) return "";
	return `${formatDate(iso)}, ${formatTime(iso)}`;
}

// "Today", "Tomorrow" or "Fri, Sep 25" for a YYYY-MM-DD string in restaurant time.
export function dayLabel(isoDate) {
	const today = todayInRestaurant();
	const tomorrow = shiftDate(today, 1);
	if (isoDate === today) return "Today";
	if (isoDate === tomorrow) return "Tomorrow";
	return formatDate(`${isoDate}T12:00:00`, { timeZone: "UTC" });
}

export function todayInRestaurant() {
	return new Date().toLocaleDateString("en-CA", { timeZone: TIME_ZONE });
}

export function shiftDate(isoDate, days) {
	const d = new Date(`${isoDate}T12:00:00Z`);
	d.setUTCDate(d.getUTCDate() + days);
	return d.toISOString().slice(0, 10);
}

export function minutesAgo(iso) {
	if (!iso) return 0;
	return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));
}

export const DAYS = [
	["mon", "Monday"],
	["tue", "Tuesday"],
	["wed", "Wednesday"],
	["thu", "Thursday"],
	["fri", "Friday"],
	["sat", "Saturday"],
	["sun", "Sunday"],
];

// "9:00 AM" from "09:00"
export function clock(hhmm) {
	if (!hhmm) return "";
	const [h, m] = hhmm.split(":").map(Number);
	const suffix = h >= 12 ? "PM" : "AM";
	const hour = h % 12 || 12;
	return m ? `${hour}:${String(m).padStart(2, "0")} ${suffix}` : `${hour} ${suffix}`;
}

export function hoursLabel(day) {
	if (!day || day.closed) return "Closed";
	return `${clock(day.open)} – ${clock(day.close)}`;
}

// Collapses consecutive days with identical hours: [["Mon – Sat", "9 AM – 9 PM"], ["Sun", ...]]
export function groupedHours(hours) {
	if (!hours) return [];
	const groups = [];
	DAYS.forEach(([key, name]) => {
		const label = hoursLabel(hours[key]);
		const last = groups[groups.length - 1];
		if (last && last.label === label) {
			last.end = name.slice(0, 3);
		} else {
			groups.push({ start: name.slice(0, 3), end: null, label });
		}
	});
	return groups.map((g) => [g.end ? `${g.start} – ${g.end}` : g.start, g.label]);
}

export const ORDER_STATUS_LABELS = {
	awaiting_payment: "Awaiting payment",
	new: "Received",
	preparing: "Being prepared",
	ready: "Ready for pickup",
	completed: "Picked up",
	cancelled: "Cancelled",
};

export function telHref(phone) {
	return `tel:${(phone || "").replace(/[^\d+]/g, "")}`;
}
