import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import CartItems from "./CartItems";

function Cart({ cartId, setCartId, currentUser, cart, setCart }) {
	const navigate = useNavigate();
	const calculateTotals = (cart) => {
		let cart_total = 0;
		let cart_items = 0;
		if (cart && cart.cart_items && cart.cart_items.length > 0) {
			cart.cart_items.forEach((item) => {
				cart_total += parseFloat(item.item_total.replace("$", ""));
				cart_items += item.quantity;
			});
		}
		return { cart_total: cart_total.toFixed(2), cart_items };
	};

	useEffect(() => {
		const storedCartId = localStorage.getItem("cartId")
			? localStorage.getItem("cartId")
			: null;
		if (storedCartId) {
			setCartId(storedCartId);
		}
	}, [setCartId, cartId]);

	useEffect(() => {
		if (currentUser && currentUser.carts && currentUser.carts[0].id) {
			fetch(`/api/carts/${currentUser.carts[0].id}`).then((r) => {
				if (r.ok) {
					r.json().then((data) => setCart(data));
				}
			});
		} else if (cartId) {
			fetch(`/api/carts/${cartId}`).then((r) => {
				if (r.ok) {
					r.json().then((data) => setCart(data));
				}
			});
		}
	}, [currentUser, cartId, setCart]);

	const deleteCart = () => {
		fetch(`/api/carts/${cartId}`, {
			method: "DELETE",
		}).then((r) => {
			if (r.ok) {
				setCartId(null);
				setCart([]);
			}
		});
		localStorage.removeItem("cartId");
	};

	const mappedCartItems = () => {
		if (cart.cart_items && cart.cart_items.length > 0) {
			return cart.cart_items.map((cartItem, idx) => (
				<CartItems
					setCart={setCart}
					cartId={cartId}
					key={idx}
					cartItem={cartItem}
				/>
			));
		} else {
			return <h2>No items in the cart</h2>;
		}
	};
	const { cart_total, cart_items } = calculateTotals(cart);
	return (
		<div>
			<button onClick={deleteCart}> delete cart</button>
			<button onClick={() => navigate("/order-now")}>add more items</button>
			{mappedCartItems()}
			{cart.cart_items && cart.cart_items.length > 0 ? (
				<h4>Total Cost: ${cart_total}</h4>
			) : null}
			{cart.cart_items && cart.cart_items.length > 0 ? (
				<h4> Total items: {cart_items}</h4>
			) : null}
		</div>
	);
}

export default Cart;
