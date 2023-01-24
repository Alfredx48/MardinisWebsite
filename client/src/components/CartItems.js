import React, { useState } from "react";
import Quantity from "./Quantity";
import "../css/cart.css";

function CartItems({ cartItem, setCart, formatter }) {
	// const [updatedQuan, setUpatedQuan] = useState(cartItem.quantity);
	async function removeItem(cartItemId) {
		try {
			const response = await fetch(`/api/cart_items/${cartItemId}`, {
				method: "DELETE",
				headers: {
					"Content-Type": "application/json",
				},
			});
			const data = await response.json();
			if (data.message === "Item removed from cart.") {
				setCart((prevCart) => {
					const updatedCartItems = prevCart.cart_items.filter(
						(item) => item.id !== cartItemId
					);
					return { ...prevCart, cart_items: updatedCartItems };
				});
			}
		} catch (error) {
			console.error(error);
		}
	}
	return (
		<div className="cart-items">
			<button onClick={() => removeItem(cartItem.id)}> Remove Item</button>
			<h3>
				{cartItem.quantity} {cartItem.item_name}
				<span> {formatter.format(cartItem.item_total)} </span>
			</h3>
			<p>{cartItem.special_request}</p>
			{/* <Quantity quantity={updatedQuan} setQuantity={setUpatedQuan} /> */}
		</div>
	);
}

export default CartItems;
