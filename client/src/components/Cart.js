import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import CartItems from "./CartItems";

function Cart({ cartId, setCartId, currentUser, cart, setCart, setNewOrder }) {
	const formatter = new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: "USD",
	});
	const navigate = useNavigate();
	const calculateTotals = (cart) => {
		let cart_total = 0;
		let cart_items = 0;
		if (!cart) {
			return {};
		}
		if (!cart.cart_items || cart.cart_items.length === 0) {
			return {};
		}
		cart.cart_items.forEach((item) => {
			cart_total += item.item_total;
			cart_items += item.quantity;
		});
		return { cart_total: formatter.format(cart_total), cart_items };
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
					formatter={formatter}
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
	// debugger

	const submitOrder = () => {

		if (cart_total && cart_items <= 0) {
			return alert("Order can't be submitted with 0 items or cost ")
		}
		const userId = currentUser ? currentUser.id : null;
		const cartID = currentUser ? cart.id : cartId;
		const order = {
			cart_id: cartID,
			user_id: userId,
			total_cost: cart.total_cost,
			total_items: cart.total_items,
			status: "pending",
			custom_request: "",
		};
		console.log(order)
		fetch("/api/orders", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(order),
		})
			.then((response) => response.json())
			.then((order) => {
				console.log(order);
				deleteCart()
				setCart([])
				setNewOrder(true)
				// navigate("/");


			})
			.catch((error) => {
				console.log(error);
			});
	};
	return (
		<div>
			<button onClick={deleteCart}> delete cart</button>
			<button onClick={() => navigate("/order-now")}>add more items</button>
			{mappedCartItems()}
			{cart.cart_items && cart.cart_items.length > 0 ? (
				<h4>Total Cost: {cart_total}</h4>
			) : null}
			{cart.cart_items && cart.cart_items.length > 0 ? (
				<h4> Total items: {cart_items}</h4>
			) : null}
			<button onClick={submitOrder}> submit order </button>
		</div>
	);
}

export default Cart;
