import React from "react";
import MenuItemCard from "./MenuItemCard";

function MenuItems({ restaurant }) {
	const menuItems = () => {
		return restaurant.map((mItems) => <MenuItemCard key={mItems.id} mItems={mItems} />);
	};

	return <div >{menuItems()}</div>;
}

export default MenuItems;
