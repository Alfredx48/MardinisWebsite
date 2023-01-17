import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Quantity from "./Quantity";
// import { motion } from "framer-motion";

function MenuItemCard({ mItem, setCartId }) {
	const navigate = useNavigate();
	const [quantity, setQuantity] = useState(1);

	const handleAddToCart = (mItem) => {
		let cart_item = {
			menu_item_id: mItem.id,
			quantity: quantity,
			special_request: "",
		};
		fetch("/api/carts", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(cart_item),
		})
			.then((response) => response.json())
			.then((cart) => {
				// console.log(cart.cart_id);
				setCartId(cart.cart_id);
				localStorage.setItem("cartId", cart.cart_id);
				navigate(`/cart`);
				console.log(cart);
			})
			.catch((error) => {
				console.log(error);
			});
	};

	return (
		<div>
			<div key={mItem.id}>
				<img src={mItem.image} alt={mItem.name} />
				<h1 key={mItem.id}>{mItem.name}</h1>
				<p>{mItem.description}</p>
				<p>{mItem.formatted_price}</p>
				<Quantity quantity={quantity} setQuantity={setQuantity} />
				{/* <button onClick={noNegQuant}>-</button>
				<input
					// type="number"
					min="1"
					max="100"
					value={quantity}
					onChange={(e) => {
						setQuantity(e.target.value);
					}}
					onInput={(e) => {
						if (e.target.value < 0) e.target.value = quantity;
						if (e.target.value > 100) e.target.value = 100;
					}}
				/>
				{/* <span>{quantity}</span> */}
			
			{/* <button onClick={noQuantOver}>+</button>  */}
				<br />
				<button onClick={() => handleAddToCart(mItem)}>Add To Cart</button>
			</div>
		</div>
	);
}

export default MenuItemCard;
