// Group orders: helpers shared by the start, group and checkout pages.
import { dayLabel, formatTime, money } from "./format";
import { apiToPicks, picksLabel, picksTotal } from "./modifiers";

// Each browser keeps its keys per group: `host` (the organizer's private key)
// and `participant` (this person's key for their own items).
const storageKey = (token) => `mardinis.group.${token}`;

export function loadKeys(token) {
	try {
		return JSON.parse(localStorage.getItem(storageKey(token))) || {};
	} catch {
		return {};
	}
}

export function saveKeys(token, keys) {
	const next = { ...loadKeys(token), ...keys };
	try {
		localStorage.setItem(storageKey(token), JSON.stringify(next));
	} catch {
		// Private browsing: the keys last for this visit only.
	}
	return next;
}

export function keyHeaders(keys) {
	const headers = {};
	if (keys.host) headers["X-Group-Host"] = keys.host;
	if (keys.participant) headers["X-Group-Key"] = keys.participant;
	return headers;
}

export const shareUrl = (token) => `${window.location.origin}/group/${token}`;

// "today at 11:30 AM" (or "Fri, Oct 3 at…"). Lowercase, as it's always mid-sentence.
export function deadlineLabel(iso) {
	const date = new Date(iso).toLocaleDateString("en-CA", { timeZone: "America/Los_Angeles" });
	const day = dayLabel(date).replace(/^(Today|Tomorrow)$/, (d) => d.toLowerCase());
	return `${day} at ${formatTime(iso)}`;
}

export const groupTitle = (group) => group.note || `${group.host_name.split(" ")[0]}'s group order`;

// A group item named and priced from the live menu, for display. The server
// prices everything again at checkout.
export function describeItem(item, menuIndex) {
	const live = menuIndex[item.menu_item_id];
	const size = item.size ? live?.sizes?.find((s) => s.name === item.size) : null;
	const picks = apiToPicks(item.modifiers);
	const unitPrice = live ? Number(size?.price ?? live.price) + picksTotal(live, picks) : 0;
	return {
		...item,
		name: live ? (item.size ? `${live.name} (${item.size})` : live.name) : "No longer on the menu",
		options_label: live ? picksLabel(live, picks) : "",
		image: live?.image,
		unitPrice,
		total: unitPrice * item.quantity,
		unavailable: !live || !live.available,
	};
}

export function menuIndexOf(menu) {
	const index = {};
	(menu || []).forEach((c) => c.items.forEach((i) => (index[i.id] = i)));
	return index;
}

// Opens the organizer's own email app with the invite written for them.
export function inviteMailto(group, restaurantName) {
	const lines = [
		"Hi all,",
		"",
		`I'm putting together a group order from ${restaurantName}. Add what you'd like here, under your name:`,
		shareUrl(group.token),
		"",
	];
	if (group.deadline_at) lines.push(`Please add your order by ${deadlineLabel(group.deadline_at)}.`);
	if (group.per_person_limit) lines.push(`Up to ${money(group.per_person_limit)} each (before tax).`);
	lines.push("", "Thanks!", group.host_name.split(" ")[0]);
	const subject = group.note ? `${group.note}: order from ${restaurantName}` : `Group order from ${restaurantName}`;
	return `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines.join("\n"))}`;
}
