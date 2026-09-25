import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api } from "../api";

const RestaurantContext = createContext(null);

// Restaurant info (hours, open/closed, payment options) plus the public menu.
export function RestaurantProvider({ children }) {
	const [restaurant, setRestaurant] = useState(null);
	const [menu, setMenu] = useState(null);
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

	return (
		<RestaurantContext.Provider value={{ restaurant, menu, error, refresh }}>
			{children}
		</RestaurantContext.Provider>
	);
}

export const useRestaurant = () => useContext(RestaurantContext);
