// Names written on items for group and office orders ("Sarah", "Mike").
// A cart line keeps one name per unit in `labels` ("" = no name), so 3 wraps
// stay one line. Orders store one line per distinct name, and staff screens
// group those lines back together.

export const NAME_MAX = 40;

export const isBlank = (name) => !(name || "").trim();

// Exactly `count` names, blank where none was given.
export const padNames = (names, count) => Array.from({ length: count }, (_, i) => names?.[i] || "");

// Fits names to a new quantity: unnamed slots go first, then the last names.
// Trailing blanks are dropped so an unnamed line stores [].
export function fitNames(names, count) {
	const list = (names || []).map((n) => (n || "").slice(0, NAME_MAX));
	while (list.length > count) {
		let blank = -1;
		for (let i = list.length - 1; i >= 0; i--) {
			if (isBlank(list[i])) {
				blank = i;
				break;
			}
		}
		list.splice(blank >= 0 ? blank : list.length - 1, 1);
	}
	while (list.length && isBlank(list[list.length - 1])) list.pop();
	return list;
}

// { named: [{ name, count }], unnamed } in the order names were given.
export function nameCounts(names, quantity = names.length) {
	const named = [];
	let unnamed = 0;
	padNames(names, quantity).forEach((raw) => {
		const name = raw.trim();
		if (!name) return (unnamed += 1);
		const found = named.find((n) => n.name === name);
		if (found) found.count += 1;
		else named.push({ name, count: 1 });
	});
	return { named, unnamed };
}

// A cart line as order lines: one per distinct name, unnamed units together.
export function splitByName(quantity, names) {
	const { named, unnamed } = nameCounts(names || [], quantity);
	return [
		...named.map((n) => ({ label: n.name, quantity: n.count })),
		...(unnamed ? [{ label: "", quantity: unnamed }] : []),
	];
}

// Order lines that differ only by name, merged back into one line with `names`
// (one per unit, "" = no name), so the kitchen sees "3 Falafel Wrap" once.
export function groupByName(items) {
	const groups = [];
	items.forEach((item) => {
		const key = [item.menu_item_id, item.name, JSON.stringify(item.modifiers || []), item.special_request || ""].join("|");
		const names = Array(item.quantity).fill(item.label || "");
		const group = groups.find((g) => g.groupKey === key);
		if (group) {
			group.quantity += item.quantity;
			group.line_total = (Number(group.line_total) + Number(item.line_total)).toFixed(2);
			group.names.push(...names);
		} else {
			groups.push({ ...item, groupKey: key, names });
		}
	});
	return groups;
}

// "Sarah, Mike ×2 · 1 no name" for staff screens; "" when nobody is named.
export function namesText(names) {
	const { named, unnamed } = nameCounts(names);
	if (!named.length) return "";
	const list = named.map((n) => (n.count > 1 ? `${n.name} ×${n.count}` : n.name)).join(", ");
	return unnamed ? `${list} · ${unnamed} no name` : list;
}
