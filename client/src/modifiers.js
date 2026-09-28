// Helpers for an item's option groups (bread choice, extras, "no onions"...).
// In the browser a customer's choices are `picks`: { [groupId]: [optionName] }.
// The API takes them as [{ group_id, options: [optionName] }]. The server
// re-checks every choice and prices it; these helpers are for display only.
import { money } from "./format";

export function ruleLabel({ min, max }) {
	if (min > 0 && max === min) return `Choose ${min}`;
	if (min > 0) return max ? `Choose ${min} to ${max}` : `Choose at least ${min}`;
	if (max === 1) return "Optional, pick 1";
	return max ? `Optional, up to ${max}` : "Optional";
}

const groupsOf = (item) => item?.modifier_groups || [];

// What still needs choosing, or null when the picks are complete and valid.
export function picksProblem(item, picks) {
	for (const g of groupsOf(item)) {
		const chosen = picks[g.id] || [];
		if (chosen.some((name) => !g.options.some((o) => o.name === name))) return `${g.name} has changed`;
		if (chosen.length < g.min) return g.min === 1 ? `Choose ${g.name}` : `Choose ${g.min} for ${g.name}`;
		if (g.max && chosen.length > g.max) return `Choose up to ${g.max} for ${g.name}`;
	}
	const known = new Set(groupsOf(item).map((g) => String(g.id)));
	if (Object.entries(picks).some(([id, names]) => names.length && !known.has(String(id)))) return "Options have changed";
	return null;
}

function chosenOptions(item, picks) {
	return groupsOf(item).flatMap((g) =>
		(picks[g.id] || []).map((name) => g.options.find((o) => o.name === name)).filter(Boolean)
	);
}

export function picksTotal(item, picks) {
	return chosenOptions(item, picks).reduce((sum, o) => sum + Number(o.price), 0);
}

// "Rye · Swiss · Extra Bacon (+$3.00)"
export function picksLabel(item, picks) {
	return chosenOptions(item, picks)
		.map((o) => (Number(o.price) > 0 ? `${o.name} (+${money(o.price)})` : o.name))
		.join(" · ");
}

export function picksToApi(item, picks) {
	return groupsOf(item)
		.filter((g) => (picks[g.id] || []).length)
		.map((g) => ({ group_id: g.id, options: picks[g.id] }));
}

export function apiToPicks(list) {
	const picks = {};
	(list || []).forEach((m) => {
		picks[m.group_id] = [...(picks[m.group_id] || []), ...(m.options || [m.option])];
	});
	return picks;
}

// Order lines (server snapshots) for tickets and receipts: "Rye · Swiss · No Onion"
export function modifierText(modifiers) {
	return (modifiers || []).map((m) => m.option).join(" · ");
}

// An order line's choices grouped for the kitchen:
// [{ group: "Bread Choice", options: ["Sliced Rye"] }, { group: "Removed Ingredients", options: ["No Onion", "No Mayo"] }]
export function modifierGroups(modifiers) {
	const groups = [];
	(modifiers || []).forEach((m) => {
		const group = groups.find((g) => g.group === m.group);
		if (group) group.options.push(m.option);
		else groups.push({ group: m.group, options: [m.option] });
	});
	return groups;
}
