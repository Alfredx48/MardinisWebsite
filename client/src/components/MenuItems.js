import MenuItemCard from "./MenuItemCard";
import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from "framer-motion";

function MenuItems({ restaurant, setCartId }) {
	const [menuItems, setMenuItems] = useState([]);

  useEffect(() => {
    if (restaurant) {
      setMenuItems(restaurant.menu_items);
    }
  }, [restaurant]);

  if (!menuItems) return <h1>...loading</h1>

	const mappedMenuItems = () => {
		return menuItems.map((mItem) => (
			<MenuItemCard setCartId={setCartId} key={mItem.id} mItem={mItem} />
		));
	};
	return (
		<div>
			<AnimatePresence>
				<div className="dish-card">
					{mappedMenuItems().map((card, index) => (
						<motion.div
							className="dishes"
							key={Math.random() * 1000000}
							initial={{ y: -50 }}
							animate={{ y: 0 }}
							exit={{ y: 50 }}
							transition={{
								delay: index * 0.1,
								type: "spring",
								stiffness: 400,
								damping: 25,
							}}
						>
							{card}
						</motion.div>
					))}
				</div>
			</AnimatePresence>
		</div>
	);
}

export default MenuItems;
