import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import CartItems from "./CartItems";
import "../css/cart.css";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { AnimatePresence, motion } from "framer-motion";
import { CardElement, useStripe, useElements, PaymentElement } from "@stripe/react-stripe-js";


function Cart({ cartId, setCartId, currentUser, cart, setCart, setNewOrder }) {
	const [customRequest, setCustomRequest] = useState("");
	const TAX_RATE = 0.095;
	const formatter = new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: "USD",
	});
	const navigate = useNavigate();
	const stripe = useStripe();
	const elements = useElements();
	console.log(stripe, elements)
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

		return { cart_total, cart_items };
	}

	const subTotal = () => {
		return (cart_total * (1 + TAX_RATE)).toFixed(2);
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

	const submitOrder = (paymentMethodId) => {
		if (!cart.total_cost || cart.total_items <= 0) {
			return toast.error("Order can't be submitted with 0 items or cost ");
		}
		const userId = currentUser ? currentUser.id : null;
		const cartID = currentUser ? cart.id : cartId;
		const order = {
			cart_id: cartID,
			user_id: userId,
			total_cost: subTotal(),
			total_items: cart.total_items,
			status: "pending",
			custom_request: customRequest,
			payment_method_id: paymentMethodId,
		};
		// console.log(order);
		fetch("/api/orders", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(order),
		})
			.then((response) => response.json())
			.then((order) => {
				// console.log(order);
				localStorage.removeItem("cartId");
				setCartId([]);
				setCart([]);
				deleteCart();
				setNewOrder(true);
				setCustomRequest("");
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
			})
			.catch((error) => {
				console.log(error);
			});
	};

	const handlePayment = async (event) => {
		event.preventDefault();
		if (!stripe || !elements) {
			return;
		}

		const cardElement = elements.getElement(CardElement);

		const { error, paymentMethod } = await stripe.createPaymentMethod({
			type: "card",
			card: cardElement,
		});

		if (error) {
			console.error("Error:", error);
		} else {
			const paymentIntentResponse = await fetch(
				"/api/create_payment_intent",
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ total_cost: subTotal() }),
				}
			);

			const paymentIntentData = await paymentIntentResponse.json();
			const confirmResult = await stripe.confirmCardPayment(
				paymentIntentData.client_secret,
				{
					payment_method: paymentMethod.id,
				}
			);

			if (confirmResult.error) {
				console.error("Error:", confirmResult.error);
			} else {
				if (confirmResult.paymentIntent.status === "succeeded") {
					submitOrder(paymentMethod.id);
				}
			}
		}
	};

	return (
		<AnimatePresence>
			<div className="cart-c">
				<motion.div
					initial={{ opacity: 0 }}
					animate={{ opacity: 1, transition: { duration: 1 } }}
					exit={{ opacity: 0, transition: { duration: 1 } }}
				>
					<div className="cart">
						<div className="button-div">
							<button
								className="add-button"
								onClick={() => navigate("/order-now")}
							>
								Add More Items
							</button>
						</div>
						<div className="cart-div">{mappedCartItems()}</div>
						<div className="requests">
							<textarea
								onChange={(e) => setCustomRequest(e.target.value)}
								placeholder="Special Requests ?"
								value={customRequest}
							></textarea>
						</div>
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
									{cart.cart_items && cart.cart_items.length > 0 ? (
										<h4>{formatter.format(cart_total)}</h4>
									) : null}
									{cart_total &&
									cart.cart_items &&
									cart.cart_items.length > 0 ? (
										<h4>{formatter.format(subTotal())}</h4>
									) : null}
									{cart.cart_items && cart.cart_items.length > 0 ? (
										<h4> {cart_items}</h4>
									) : null}
								</div>
							</div>
						</div>
						<div className="stripe-div">
							<form onSubmit={handlePayment}>
								<CardElement />
								<button type="submit" disabled={!stripe}>
									Submit Order
								</button>
							</form>
						</div>
					</div>
				</motion.div>
			</div>
		</AnimatePresence>
	);
}

export default Cart;
