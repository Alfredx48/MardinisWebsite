// Orders for later days on the kitchen screen: they wait in Upcoming until
// their pickup day, with reminders 3 days and 1 day before.
import { shiftDate, todayInRestaurant } from "../format";
import { placedAt, restaurantDate } from "./adminUtils";

// A new order picked up on a later day (catering, or scheduled ahead).
export function isUpcoming(order, today = todayInRestaurant()) {
	return order.status === "new" && Boolean(order.pickup_at) && restaurantDate(order.pickup_at) > today;
}

export const daysUntil = (order, today = todayInRestaurant()) =>
	Math.round((Date.parse(`${restaurantDate(order.pickup_at)}T12:00:00Z`) - Date.parse(`${today}T12:00:00Z`)) / 86400000);

// Reminders due today, as [{ order, days, key }], soonest pickup first:
// - 1 day before: the day before pickup.
// - 3 days before: from 3 days before until it's the 1-day reminder's turn
//   (so one missed while closed still shows the next day).
// Orders placed on or after a reminder's day skip it: the kitchen just saw them come in.
export function dueReminders(orders, today = todayInRestaurant()) {
	const due = [];
	orders.forEach((order) => {
		if (!order.pickup_at || !["new", "preparing"].includes(order.status)) return;
		const pickupDay = restaurantDate(order.pickup_at);
		const placedDay = restaurantDate(placedAt(order));
		const seen = order.reminders_seen || {};
		const dayBefore = shiftDate(pickupDay, -1);
		const threeBefore = shiftDate(pickupDay, -3);
		if (today === dayBefore) {
			if (!seen[1] && placedDay < dayBefore) due.push({ order, days: 1, key: `${order.id}:1` });
		} else if (today >= threeBefore && today < dayBefore) {
			if (!seen[3] && placedDay < threeBefore) due.push({ order, days: 3, key: `${order.id}:3` });
		}
	});
	return due.sort((a, b) => Date.parse(a.order.pickup_at) - Date.parse(b.order.pickup_at));
}
