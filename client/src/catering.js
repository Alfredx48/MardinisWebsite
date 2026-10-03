// Catering pickup times: any 15-minute slot during opening hours, from the
// notice period (24 hours) up to `days_ahead` days out. Worked out here from
// the opening hours; the server checks the chosen time again.
import { shiftDate, todayInRestaurant } from "./format";

const TIME_ZONE = "America/Los_Angeles";
const WEEKDAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
const SLOT_MINUTES = 15;

// "2026-10-03 14:30" in the restaurant's time zone.
function restaurantClock(ms) {
	const parts = new Intl.DateTimeFormat("en-CA", {
		timeZone: TIME_ZONE,
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
		hourCycle: "h23",
	}).formatToParts(new Date(ms));
	const part = (type) => parts.find((p) => p.type === type).value;
	return `${part("year")}-${part("month")}-${part("day")} ${part("hour")}:${part("minute")}`;
}

const toMinutes = (hhmm) => {
	const [h, m] = hhmm.split(":").map(Number);
	return h * 60 + m;
};
const toClock = (minutes) => `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;

// [{ date: "2026-10-03", times: ["09:15", …] }] for days with any time left.
export function cateringDays(restaurant, now = Date.now()) {
	if (!restaurant?.catering) return [];
	const { notice_hours: noticeHours, days_ahead: daysAhead } = restaurant.catering;
	const earliest = restaurantClock(now + noticeHours * 3600 * 1000);
	const today = todayInRestaurant();
	const days = [];
	for (let offset = 0; offset <= daysAhead; offset++) {
		const date = shiftDate(today, offset);
		const day = restaurant.hours?.[WEEKDAYS[new Date(`${date}T12:00:00Z`).getUTCDay()]];
		if (!day || day.closed) continue;
		const open = toMinutes(day.open);
		let close = toMinutes(day.close);
		if (close <= open) close = 24 * 60 - SLOT_MINUTES; // open past midnight: stop at 11:45 PM
		const times = [];
		for (let m = open + SLOT_MINUTES; m <= close; m += SLOT_MINUTES) {
			const time = toClock(m);
			if (`${date} ${time}` >= earliest) times.push(time);
		}
		if (times.length) days.push({ date, times });
	}
	return days;
}
