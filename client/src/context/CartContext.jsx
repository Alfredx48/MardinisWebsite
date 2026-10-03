import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { cents } from "../format";
import { fitNames, padNames } from "../itemNames";
import { apiToPicks, picksLabel, picksProblem, picksTotal } from "../modifiers";
import { useRestaurant } from "./RestaurantContext";

const STORAGE_KEY = "mardinis-cart-v1";
const MAX_QUANTITY = 50;

// Exported so a group order can swap in its own shared cart (see GroupOrderPage).
export const CartContext = createContext(null);

const lineKey = (menuItemId, request, size, modifiers) =>
	`${menuItemId}:${size || ""}:${JSON.stringify(modifiers || [])}:${(request || "").trim().toLowerCase()}`;

// Adds `quantity` more of a line that's already in the cart, keeping each unit's name.
function mergeInto(line, quantity, labels) {
	const total = Math.min(MAX_QUANTITY, line.quantity + quantity);
	return {
		...line,
		quantity: total,
		labels: fitNames([...padNames(line.labels, line.quantity), ...padNames(labels, quantity)], total),
	};
}

function loadCart() {
	try {
		const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
		if (!Array.isArray(saved)) return [];
		// Carts saved before names were per unit had one `label` per line, in the key.
		return saved.reduce((lines, line) => {
			const labels = line.labels || (line.label ? Array(line.quantity).fill(line.label) : []);
			const key = lineKey(line.menu_item_id, line.special_request, line.size, line.modifiers);
			const existing = lines.find((l) => l.key === key);
			if (existing) return lines.map((l) => (l === existing ? mergeInto(l, line.quantity, labels) : l));
			const { label: _old, ...rest } = line;
			return [...lines, { ...rest, key, labels }];
		}, []);
	} catch {
		return [];
	}
}

// The cart lives in the browser. Prices shown here are for display only; the
// server re-prices everything at checkout.
export function CartProvider({ children }) {
	const { menu } = useRestaurant();
	const [lines, setLines] = useState(loadCart);
	const [drawerOpen, setDrawerOpen] = useState(false);

	useEffect(() => {
		try {
			localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
		} catch {
			// Private browsing etc. The cart still works for this visit.
		}
	}, [lines]);

	// Sync names/prices/availability with the live menu.
	const menuIndex = useMemo(() => {
		const index = {};
		(menu || []).forEach((c) => c.items.forEach((i) => (index[i.id] = i)));
		return index;
	}, [menu]);

	const items = useMemo(
		() =>
			lines.map((line) => {
				const live = menuIndex[line.menu_item_id];
				// A sized item needs a size that's still on the menu (and vice versa).
				const liveSize = line.size ? live?.sizes?.find((s) => s.name === line.size) : null;
				const sizeGone = live ? (live.sizes?.length ? !liveSize : Boolean(line.size)) : false;
				const baseName = live?.name || line.name;
				// Options are re-checked and re-priced against the live menu too.
				const picks = apiToPicks(line.modifiers);
				const optionsChanged = live ? Boolean(picksProblem(live, picks)) : false;
				const basePrice = liveSize ? Number(liveSize.price) : live && !sizeGone ? Number(live.price) : null;
				return {
					...line,
					name: line.size ? `${baseName} (${line.size})` : baseName,
					price: basePrice === null || optionsChanged ? Number(line.price) : basePrice + picksTotal(live, picks),
					options_label: live && !optionsChanged ? picksLabel(live, picks) : line.options_label || "",
					image: live?.image ?? line.image,
					unavailable: menu ? !live || !live.available || sizeGone || optionsChanged : false,
					// Still on the menu, but its options changed (or it has new required ones).
					needsOptions: Boolean(menu && live && live.available && !sizeGone && optionsChanged),
				};
			}),
		[lines, menuIndex, menu]
	);

	// `size` is a size name, required for items that come in sizes. `modifiers`
	// are the chosen options in API form: [{ group_id, options: [name] }]. `labels` are
	// names to write on the items (group orders), one per unit.
	const addItem = useCallback((menuItem, quantity = 1, specialRequest = "", size = null, modifiers = [], labels = []) => {
		const key = lineKey(menuItem.id, specialRequest, size, modifiers);
		const sizePrice = menuItem.sizes?.find((s) => s.name === size)?.price;
		const picks = apiToPicks(modifiers);
		setLines((prev) => {
			const existing = prev.find((l) => l.key === key);
			if (existing) return prev.map((l) => (l === existing ? mergeInto(l, quantity, labels) : l));
			return [
				...prev,
				{
					key,
					menu_item_id: menuItem.id,
					name: menuItem.name,
					size,
					modifiers,
					options_label: picksLabel(menuItem, picks),
					price: Number(sizePrice ?? menuItem.price) + picksTotal(menuItem, picks),
					image: menuItem.image,
					quantity: Math.min(MAX_QUANTITY, quantity),
					special_request: specialRequest.trim(),
					labels: fitNames(labels, Math.min(MAX_QUANTITY, quantity)),
				},
			];
		});
	}, []);

	const setQuantity = useCallback((key, quantity) => {
		setLines((prev) =>
			quantity <= 0
				? prev.filter((l) => l.key !== key)
				: prev.map((l) => {
						if (l.key !== key) return l;
						const next = Math.min(MAX_QUANTITY, quantity);
						return { ...l, quantity: next, labels: fitNames(l.labels, next) };
					})
		);
	}, []);

	// One name per unit of the line ("" = no name).
	const setLabels = useCallback((key, labels) => {
		setLines((prev) => prev.map((l) => (l.key === key ? { ...l, labels: fitNames(labels, l.quantity) } : l)));
	}, []);

	const removeItem = useCallback((key) => setLines((prev) => prev.filter((l) => l.key !== key)), []);
	const clear = useCallback(() => setLines([]), []);

	const subtotal = cents(items.reduce((sum, l) => sum + l.price * l.quantity, 0));
	const count = items.reduce((sum, l) => sum + l.quantity, 0);
	const hasUnavailable = items.some((l) => l.unavailable);

	const value = {
		items,
		count,
		subtotal,
		hasUnavailable,
		addItem,
		setQuantity,
		setLabels,
		removeItem,
		clear,
		drawerOpen,
		openDrawer: () => setDrawerOpen(true),
		closeDrawer: () => setDrawerOpen(false),
	};

	return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export const useCart = () => useContext(CartContext);
export { MAX_QUANTITY };
