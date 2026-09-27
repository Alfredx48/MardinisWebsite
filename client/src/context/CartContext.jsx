import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { cents } from "../format";
import { apiToPicks, picksLabel, picksProblem, picksTotal } from "../modifiers";
import { useRestaurant } from "./RestaurantContext";

const STORAGE_KEY = "mardinis-cart-v1";
const MAX_QUANTITY = 50;

const CartContext = createContext(null);

function loadCart() {
	try {
		const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
		return Array.isArray(saved) ? saved : [];
	} catch {
		return [];
	}
}

const lineKey = (menuItemId, request, size, modifiers) =>
	`${menuItemId}:${size || ""}:${JSON.stringify(modifiers || [])}:${(request || "").trim().toLowerCase()}`;

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
				};
			}),
		[lines, menuIndex, menu]
	);

	// `size` is a size name, required for items that come in sizes. `modifiers`
	// are the chosen options in API form: [{ group_id, options: [name] }].
	const addItem = useCallback((menuItem, quantity = 1, specialRequest = "", size = null, modifiers = []) => {
		const key = lineKey(menuItem.id, specialRequest, size, modifiers);
		const sizePrice = menuItem.sizes?.find((s) => s.name === size)?.price;
		const picks = apiToPicks(modifiers);
		setLines((prev) => {
			const existing = prev.find((l) => l.key === key);
			if (existing) {
				return prev.map((l) =>
					l.key === key ? { ...l, quantity: Math.min(MAX_QUANTITY, l.quantity + quantity) } : l
				);
			}
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
				},
			];
		});
	}, []);

	const setQuantity = useCallback((key, quantity) => {
		setLines((prev) =>
			quantity <= 0
				? prev.filter((l) => l.key !== key)
				: prev.map((l) => (l.key === key ? { ...l, quantity: Math.min(MAX_QUANTITY, quantity) } : l))
		);
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
