import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api } from "../api";

const RestaurantContext = createContext(null);

// Restaurant info (hours, open/closed, payment options) plus the public menu.
// `menu` is the regular menu and `cateringMenu` the catering one (/catering);
// `fullMenu` has both, for the cart. Catering items carry `catering: true`.
export function RestaurantProvider({ children }) {
	const [restaurant, setRestaurant] = useState(null);
	const [fullMenu, setMenu] = useState(null);
	const [error, setError] = useState(null);

	const refresh = useCallback(async () => {
		try {
			const [r, m] = await Promise.all([api.get("/restaurant"), api.get("/menu")]);
			setRestaurant(r);
			setMenu(m);
			setError(null);
		} catch (e) {
			setError(e);
		}
	}, []);

	useEffect(() => {
		refresh();
		// Keep "open now" and sold-out items fresh for long-lived tabs.
		const id = setInterval(refresh, 5 * 60 * 1000);
		return () => clearInterval(id);
	}, [refresh]);

	const menus = useMemo(() => {
		if (!fullMenu) return { menu: null, cateringMenu: null, fullMenu: null };
		const marked = fullMenu.map((c) => (c.catering ? { ...c, items: c.items.map((i) => ({ ...i, catering: true })) } : c));
		return {
			fullMenu: marked,
			menu: marked.filter((c) => !c.catering),
			cateringMenu: marked.filter((c) => c.catering),
		};
	}, [fullMenu]);

	return (
		<RestaurantContext.Provider value={{ restaurant, ...menus, error, refresh }}>
			{children}
		</RestaurantContext.Provider>
	);
}

export const useRestaurant = () => useContext(RestaurantContext);
