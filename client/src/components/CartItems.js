import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTrash } from "@fortawesome/free-solid-svg-icons";
import "../css/cart.css";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

function CartItems({ cartItem, setCart, formatter }) {
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
					toast.success("Item Removed", {
						position: "top-right",
						autoClose: 500,
						hideProgressBar: false,
						closeOnClick: true,
						pauseOnHover: true,
						draggable: true,
						progress: undefined,
						theme: "light",
					});
					return { ...prevCart, cart_items: updatedCartItems };
				});
			}
		} catch (error) {
			console.error(error);
		}
	}
	return (
		<div className="cart-items">
			<span>{cartItem.item_name}</span>
			<span>
				<span>x</span> {cartItem.quantity}
			</span>
			<span className="item-price">
				{" "}
				{formatter.format(cartItem.item_total)}{" "}
			</span>
			<p>{cartItem.special_request}</p>
			<div className="trash-div">
				<button className="trash" onClick={() => removeItem(cartItem.id)}>
					<FontAwesomeIcon icon={faTrash} size="lg" />
				</button>
			</div>
		</div>
	);
}

export default CartItems;
