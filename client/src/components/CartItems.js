import React from "react";
import Quantity from "./Quantity";

function CartItems({ cartItem, setCart }) {
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
            setCart(prevCart => {
                const updatedCartItems = prevCart.cart_items.filter(item => item.id !== cartItemId);
                return { ...prevCart, cart_items: updatedCartItems }
            });
        }
    } catch (error) {
        console.error(error);
    }
}
	return (
		<div>
			<h1>
				{cartItem.item_name} <span> x {cartItem.quantity}</span>{" "}
				<span> {cartItem.item_total}</span>
			</h1>
			<p>{cartItem.price}</p>
			<p>{cartItem.special_request}</p>
			<button onClick={() => removeItem(cartItem.id)}> Remove Item</button>
			<Quantity />
		</div>
	);
}

export default CartItems;
