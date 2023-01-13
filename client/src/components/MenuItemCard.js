import React from "react";
import { motion } from "framer-motion";

function MenuItemCard({ mItems }) {
	const mappedMenuItems = () =>
		mItems.menu_items.map((dish) => {
			return (
				<div key={dish.id}>
					<img src={dish.image} alt={dish.name} />
					<h1 key={dish.id}>{dish.name}</h1>
					<p>{dish.description}</p>
					<p>{dish.price}</p>
				</div>
			);
		});
	return (
		<div className="dish-card">
			{" "}
			{mappedMenuItems().map((card, index) => (
				<motion.div
					className="dishes"
					key={Math.random() * 1000000}
					initial={{ y: -50 }}
					animate={{ y: 0 }}
					exit={{ y: 50 }}
          // transition={{ delay: index * 0.1, duration: 0.5 }}
          transition={{ type: "spring", stiffness: 400, damping: 10 }}
          // transition={{
          //   delay: 0.5,
          //   x: { duration: 1 },
          //   default: { ease: "linear" }
          // }}
          whileHover={{ scale: 1.2 }}
				>
					{card}
				</motion.div>
			))}
		</div>
	);
}

export default MenuItemCard;
