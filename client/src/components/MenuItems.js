import MenuItemCard from "./MenuItemCard";
import { useState, useEffect } from "react";
import "../css/menuItem.css"
// import { AnimatePresence, motion } from "framer-motion";

function MenuItems({ restaurant, setCartId }) {
	const [menuItems, setMenuItems] = useState([]);

	useEffect(() => {
		if (restaurant) {
			setMenuItems(restaurant.menu_items);
		}
	}, [restaurant]);

	if (!menuItems) return <h1>...loading</h1>;

	const mappedMenuItems = () => {
		return menuItems.map((mItem) => (
			<MenuItemCard setCartId={setCartId} key={mItem.id} mItem={mItem} />
		));
	};
	return (
		<div className="menuItems">
		<div className="dish-card">{mappedMenuItems()}</div>
	</div>
	);
}

export default MenuItems;
