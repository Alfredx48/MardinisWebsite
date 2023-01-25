import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import CartItems from "./CartItems";
import "../css/cart.css";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

function Cart({ cartId, setCartId, currentUser, cart, setCart, setNewOrder }) {
	const TAX_RATE = 0.095;
	const formatter = new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: "USD",
	});
	const navigate = useNavigate();
	function calculateTotals(cart) {
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
		
    return { cart_total, cart_items} ;
	}
	
	const subTotal = () => {
		return (cart_total * (1 + TAX_RATE)).toFixed(2);
	}

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
				setCartId([]);
				setCart([]);
				localStorage.removeItem("cartId");
			}
		});
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
			return (
				<div className="no-cart">
					{" "}
					<h2>No items in the cart</h2>
				</div>
			);
		}
	};
	const { cart_total, cart_items } = calculateTotals(cart);
	// debugger

	const submitOrder = () => {
		if (cart.total_cost || cart.total_items <= 0) {
			return toast.error("Order can't be submitted with 0 items or cost ");
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
		console.log(order);
		fetch("/api/orders", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(order),
		})
			.then((response) => response.json())
			.then((order) => {
				console.log(order);
				localStorage.removeItem("cartId");
				setCartId([]);
				setCart([]);
				deleteCart();
				setNewOrder(true);
				toast(" Your Order has been Submit!", {
					position: "top-center",
					autoClose: 3000,
					hideProgressBar: false,
					closeOnClick: true,
					pauseOnHover: true,
					draggable: true,
					progress: undefined,
					theme: "light",
				});
				// navigate("/");
			})
			.catch((error) => {
				console.log(error);
			});
	};

		


	return (
		<div className="cart-c">
			<div className="cart">
				<div className="button-div">
					<button className="top-button" onClick={() => navigate("/order-now")}>
						Add More Items
					</button>
					<button className="top-button" onClick={submitOrder}>
						{" "}
						submit order{" "}
					</button>
				</div>
				{mappedCartItems()}
				<div>
					<div className="total-container">
						<div className="total">
							{cart.cart_items && cart.cart_items.length > 0 ? (
								<h4>Sub Total:</h4>
							) : null}
							{cart.cart_items && cart.cart_items.length > 0 ? (
								<h4>Total Cost:</h4>
							) : null}
							{cart.cart_items && cart.cart_items.length > 0 ? (
								<h4>Total Items: </h4>
							) : null}
						</div>
						<div className="total-num">
							{/* {cart.cart_items && cart.cart_items.length > 0 ? (
								<button className="remove-all" onClick={deleteCart}>
									{" "}
									Remove all Items
								</button>
							) : null} */}
							{cart_total && cart.cart_items && cart.cart_items.length > 0 ? (
								<h4>{ formatter.format(subTotal())}</h4>
							) : null}
							{cart.cart_items && cart.cart_items.length > 0 ? (
								<h4>{formatter.format(cart_total)}</h4>
							) : null}
							{cart.cart_items && cart.cart_items.length > 0 ? (
								<h4> {cart_items}</h4>
							) : null}
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}

export default Cart;
