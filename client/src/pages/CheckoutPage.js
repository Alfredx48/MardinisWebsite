import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
// The "pure" entry only loads Stripe.js when a customer reaches payment.
import { loadStripe } from "@stripe/stripe-js/pure";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowLeft, faBagShopping, faCreditCard, faLock, faStore, faTrashCan } from "@fortawesome/free-solid-svg-icons";
import { api } from "../api";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { useRestaurant } from "../context/RestaurantContext";
import { DishImage, EmptyState, QuantityStepper, Spinner } from "../components/ui";
import { cents, dayLabel, formatTime, money, telHref } from "../format";

export const PENDING_ORDER_KEY = "mardinis-pending-order";
const TIP_PERCENTS = [0, 10, 15, 20];

const stripePromises = {};
function getStripe(key) {
	if (!key) return null;
	stripePromises[key] = stripePromises[key] || loadStripe(key);
	return stripePromises[key];
}

export default function CheckoutPage() {
	const { restaurant } = useRestaurant();
	const { items } = useCart();
	const [payment, setPayment] = useState(null); // { order, clientSecret } once the order exists

	if (!restaurant) return <Spinner />;

	if (!payment && items.length === 0) {
		return (
			<div className="container page narrow">
				<EmptyState icon={faBagShopping} title="Your bag is empty">
					<p>Add something delicious and come back to check out.</p>
					<Link to="/menu" className="btn btn-primary">
						Browse the menu
					</Link>
				</EmptyState>
			</div>
		);
	}

	return (
		<div className="container page checkout">
			<div className="page-header">
				<span className="eyebrow">Pickup order</span>
				<h1>{payment ? "Payment" : "Checkout"}</h1>
			</div>
			{payment ? (
				<PaymentStep payment={payment} restaurant={restaurant} onBack={() => setPayment(null)} />
			) : (
				<DetailsStep restaurant={restaurant} onPaymentNeeded={setPayment} />
			)}
		</div>
	);
}

function DetailsStep({ restaurant, onPaymentNeeded }) {
	const { user } = useAuth();
	const { items, subtotal, setQuantity, removeItem, hasUnavailable, clear } = useCart();
	const navigate = useNavigate();

	const [contact, setContact] = useState({ name: "", phone: "", email: "" });
	const [when, setWhen] = useState(restaurant.accepting_asap ? "asap" : "later");
	const slots = useMemo(() => restaurant.pickup_slots || [], [restaurant.pickup_slots]);
	const [day, setDay] = useState(slots[0]?.date || "");
	const [time, setTime] = useState("");
	const [tipPercent, setTipPercent] = useState(restaurant.tips_enabled ? 15 : 0);
	const [customTip, setCustomTip] = useState("");
	const [notes, setNotes] = useState("");
	const methods = restaurant.payments;
	const [method, setMethod] = useState(methods.card ? "card" : "in_store");
	const [submitting, setSubmitting] = useState(false);
	const [errors, setErrors] = useState([]);

	useEffect(() => {
		if (user) setContact((c) => ({ name: c.name || user.name, phone: c.phone || user.phone || "", email: c.email || user.email }));
	}, [user]);

	const times = useMemo(() => slots.find((s) => s.date === day)?.times || [], [slots, day]);
	useEffect(() => {
		if (!times.includes(time)) setTime(times[0] || "");
	}, [times, time]);

	const tip = !restaurant.tips_enabled
		? 0
		: tipPercent === "custom"
		? cents(Math.max(0, Number(customTip) || 0))
		: cents((subtotal * tipPercent) / 100);
	const tax = cents(subtotal * restaurant.tax_rate);
	const total = cents(subtotal + tax + tip);

	const canOrder = restaurant.accepting_orders && (restaurant.accepting_asap || slots.length > 0);
	const noPayment = !methods.card && !methods.in_store;

	const submit = async (e) => {
		e.preventDefault();
		setErrors([]);
		if (when === "later" && !time) return setErrors(["Please choose a pickup time."]);
		setSubmitting(true);
		try {
			const result = await api.post("/orders", {
				customer: contact,
				items: items.map((l) => ({
					menu_item_id: l.menu_item_id,
					size: l.size,
					quantity: l.quantity,
					special_request: l.special_request,
				})),
				pickup_at: when === "asap" ? "asap" : time,
				tip: tip.toFixed(2),
				custom_request: notes,
				payment_method: method,
			});
			if (result.client_secret) {
				sessionStorage.setItem(PENDING_ORDER_KEY, result.order.token);
				onPaymentNeeded({ order: result.order, clientSecret: result.client_secret });
				window.scrollTo(0, 0);
			} else {
				clear();
				navigate(`/order/${result.order.token}`, { state: { justPlaced: true } });
			}
		} catch (err) {
			setErrors(err.errors?.length ? err.errors : [err.message]);
			setSubmitting(false);
		}
	};

	return (
		<form className="checkout-grid" onSubmit={submit}>
			<div className="stack">
				{!canOrder && (
					<div className="notice">
						Online ordering isn't available right now. Please call us at{" "}
						<a href={telHref(restaurant.phone)}>{restaurant.phone}</a>.
					</div>
				)}

				<section className="card">
					<h2 className="card-title">Your order</h2>
					<ul className="checkout-lines">
						{items.map((line) => (
							<li key={line.key} className={`cart-line${line.unavailable ? " is-unavailable" : ""}`}>
								<DishImage src={line.image} name={line.name} className="cart-line-img" />
								<div className="cart-line-info">
									<div className="cart-line-top">
										<strong>{line.name}</strong>
										<span className="money">{money(line.price * line.quantity)}</span>
									</div>
									{line.special_request && <p className="cart-line-note">“{line.special_request}”</p>}
									{line.unavailable && <p className="cart-line-warn">Sold out, please remove to continue</p>}
									<div className="cart-line-actions">
										<QuantityStepper small min={0} value={line.quantity} onChange={(q) => setQuantity(line.key, q)} />
										<button type="button" className="icon-btn" onClick={() => removeItem(line.key)} aria-label={`Remove ${line.name}`}>
											<FontAwesomeIcon icon={faTrashCan} />
										</button>
									</div>
								</div>
							</li>
						))}
					</ul>
					<Link to="/menu" className="link-arrow">
						+ Add more items
					</Link>
				</section>

				<section className="card">
					<h2 className="card-title">Pickup time</h2>
					<div className="segmented">
						<button type="button" aria-pressed={when === "asap"} disabled={!restaurant.accepting_asap} onClick={() => setWhen("asap")}>
							ASAP{restaurant.accepting_asap ? ` · ~${restaurant.prep_time_minutes} min` : " (closed now)"}
						</button>
						<button type="button" aria-pressed={when === "later"} disabled={!slots.length} onClick={() => setWhen("later")}>
							Schedule for later
						</button>
					</div>
					{when === "later" && slots.length > 0 && (
						<div className="grid-2 pickup-pickers">
							<div className="field">
								<label htmlFor="pickup-day">Day</label>
								<select id="pickup-day" className="select" value={day} onChange={(e) => setDay(e.target.value)}>
									{slots.map((s) => (
										<option key={s.date} value={s.date}>
											{dayLabel(s.date)}
										</option>
									))}
								</select>
							</div>
							<div className="field">
								<label htmlFor="pickup-time">Time</label>
								<select id="pickup-time" className="select" value={time} onChange={(e) => setTime(e.target.value)}>
									{times.map((t) => (
										<option key={t} value={t}>
											{formatTime(t)}
										</option>
									))}
								</select>
							</div>
						</div>
					)}
					<p className="small muted pickup-address">Pickup at {restaurant.address}</p>
				</section>

				<section className="card">
					<h2 className="card-title">Contact details</h2>
					{!user && (
						<p className="small muted">
							Checking out as a guest. <Link to="/login" state={{ from: "/checkout" }}>Sign in</Link> to save your order history.
						</p>
					)}
					<div className="grid-2">
						<div className="field">
							<label htmlFor="c-name">Name</label>
							<input id="c-name" className="input" required autoComplete="name" value={contact.name}
								onChange={(e) => setContact({ ...contact, name: e.target.value })} />
						</div>
						<div className="field">
							<label htmlFor="c-phone">Phone</label>
							<input id="c-phone" className="input" type="tel" required autoComplete="tel" value={contact.phone}
								onChange={(e) => setContact({ ...contact, phone: e.target.value })} />
							<span className="hint">In case we have a question about your order</span>
						</div>
					</div>
					<div className="field" style={{ marginTop: 16 }}>
						<label htmlFor="c-email">Email (for your receipt)</label>
						<input id="c-email" className="input" type="email" autoComplete="email" value={contact.email}
							onChange={(e) => setContact({ ...contact, email: e.target.value })} />
					</div>
					<div className="field" style={{ marginTop: 16 }}>
						<label htmlFor="c-notes">Notes for the kitchen (optional)</label>
						<textarea id="c-notes" className="textarea" maxLength={500} value={notes}
							placeholder="Allergies, utensils, anything else we should know"
							onChange={(e) => setNotes(e.target.value)} />
					</div>
				</section>

				{restaurant.tips_enabled && (
					<section className="card">
						<h2 className="card-title">Add a tip for the team</h2>
						<div className="segmented">
							{TIP_PERCENTS.map((p) => (
								<button type="button" key={p} aria-pressed={tipPercent === p} onClick={() => setTipPercent(p)}>
									{p === 0 ? "No tip" : `${p}%`}
									{p > 0 && <span className="choice-sub">{money((subtotal * p) / 100)}</span>}
								</button>
							))}
							<button type="button" aria-pressed={tipPercent === "custom"} onClick={() => setTipPercent("custom")}>
								Custom
							</button>
						</div>
						{tipPercent === "custom" && (
							<div className="field tip-custom">
								<label htmlFor="tip-custom">Tip amount ($)</label>
								<input id="tip-custom" className="input" type="number" min="0" step="0.01" inputMode="decimal"
									value={customTip} onChange={(e) => setCustomTip(e.target.value)} />
							</div>
						)}
					</section>
				)}

				<section className="card">
					<h2 className="card-title">Payment</h2>
					{noPayment ? (
						<div className="notice">Online payment is unavailable right now. Please call to order.</div>
					) : (
						<div className="payment-choices">
							{methods.card && (
								<button type="button" className="choice payment-choice" aria-pressed={method === "card"} onClick={() => setMethod("card")}>
									<FontAwesomeIcon icon={faCreditCard} />
									<span>
										<strong>Pay now</strong>
										<small>Card, Apple Pay or Google Pay</small>
									</span>
								</button>
							)}
							{methods.in_store && (
								<button type="button" className="choice payment-choice" aria-pressed={method === "in_store"} onClick={() => setMethod("in_store")}>
									<FontAwesomeIcon icon={faStore} />
									<span>
										<strong>Pay at pickup</strong>
										<small>Cash or card at the counter</small>
									</span>
								</button>
							)}
						</div>
					)}
				</section>
			</div>

			<aside className="checkout-summary">
				<div className="card">
					<h2 className="card-title">Summary</h2>
					<div className="summary-row">
						<span>Subtotal</span>
						<span>{money(subtotal)}</span>
					</div>
					<div className="summary-row">
						<span>Tax</span>
						<span>{money(tax)}</span>
					</div>
					{restaurant.tips_enabled && (
						<div className="summary-row">
							<span>Tip</span>
							<span>{money(tip)}</span>
						</div>
					)}
					<div className="summary-row total">
						<span>Total</span>
						<span>{money(total)}</span>
					</div>
					{errors.length > 0 && (
						<div className="form-error" role="alert" style={{ marginTop: 16 }}>
							{errors.map((m) => (
								<div key={m}>{m}</div>
							))}
						</div>
					)}
					<button
						type="submit"
						className="btn btn-primary btn-lg btn-block"
						style={{ marginTop: 18 }}
						disabled={submitting || !canOrder || noPayment || hasUnavailable || items.length === 0}
					>
						{submitting ? "Placing order…" : method === "card" ? "Continue to payment" : `Place order · ${money(total)}`}
					</button>
					<p className="small muted summary-fine">
						By placing your order, you agree to our <Link to="/policies">ordering &amp; refund policy</Link>. You can
						cancel online until we start preparing it.
					</p>
					<p className="small muted summary-fine">
						<FontAwesomeIcon icon={faLock} /> Final prices are confirmed by the restaurant when you place your order.
					</p>
				</div>
			</aside>
		</form>
	);
}

function PaymentStep({ payment, restaurant, onBack }) {
	// The server's key must win: it always matches the secret key that created the payment.
	const key = restaurant.payments.stripe_publishable_key || process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY;
	const stripePromise = getStripe(key);
	const options = useMemo(
		() => ({
			clientSecret: payment.clientSecret,
			appearance: {
				theme: "stripe",
				variables: {
					colorPrimary: "#b4452c",
					colorText: "#231d17",
					borderRadius: "8px",
					fontFamily: '"DM Sans", system-ui, sans-serif',
				},
			},
			fonts: [{ cssSrc: "https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&display=swap" }],
		}),
		[payment.clientSecret]
	);

	if (!stripePromise) {
		return <div className="notice">Card payments aren't configured. Please go back and choose pay at pickup.</div>;
	}

	return (
		<div className="checkout-grid">
			<div className="card">
				<Elements stripe={stripePromise} options={options}>
					<PaymentForm order={payment.order} onBack={onBack} />
				</Elements>
			</div>
			<aside className="checkout-summary">
				<div className="card">
					<h2 className="card-title">Order #{payment.order.number}</h2>
					{payment.order.items.map((i) => (
						<div className="summary-row" key={i.id}>
							<span>
								{i.quantity} × {i.name}
							</span>
							<span>{money(i.line_total)}</span>
						</div>
					))}
					<hr className="divider" />
					<div className="summary-row">
						<span>Subtotal</span>
						<span>{money(payment.order.subtotal)}</span>
					</div>
					<div className="summary-row">
						<span>Tax</span>
						<span>{money(payment.order.tax)}</span>
					</div>
					{Number(payment.order.tip) > 0 && (
						<div className="summary-row">
							<span>Tip</span>
							<span>{money(payment.order.tip)}</span>
						</div>
					)}
					<div className="summary-row total">
						<span>Total</span>
						<span>{money(payment.order.total)}</span>
					</div>
				</div>
			</aside>
		</div>
	);
}

function PaymentForm({ order, onBack }) {
	const stripe = useStripe();
	const elements = useElements();
	const { clear } = useCart();
	const navigate = useNavigate();
	const [paying, setPaying] = useState(false);
	const [error, setError] = useState(null);

	const pay = async (e) => {
		e.preventDefault();
		if (!stripe || !elements) return;
		setPaying(true);
		setError(null);

		const returnUrl = `${window.location.origin}/order/${order.token}`;
		const result = await stripe.confirmPayment({
			elements,
			confirmParams: { return_url: returnUrl },
			redirect: "if_required",
		});

		if (result.error) {
			setError(result.error.message);
			setPaying(false);
			return;
		}

		try {
			await api.post(`/orders/${order.token}/confirm_payment`);
		} catch {
			// The status page re-checks with Stripe, so fall through either way.
		}
		clear();
		sessionStorage.removeItem(PENDING_ORDER_KEY);
		navigate(`/order/${order.token}`, { state: { justPlaced: true } });
	};

	return (
		<form onSubmit={pay} className="stack">
			<button type="button" className="btn btn-ghost btn-sm back-btn" onClick={onBack} disabled={paying}>
				<FontAwesomeIcon icon={faArrowLeft} /> Edit order
			</button>
			<PaymentElement options={{ layout: "tabs" }} />
			{error && (
				<div className="form-error" role="alert">
					{error}
				</div>
			)}
			<button type="submit" className="btn btn-primary btn-lg btn-block" disabled={!stripe || paying}>
				<FontAwesomeIcon icon={faLock} /> {paying ? "Processing…" : `Pay ${money(order.total)}`}
			</button>
			<p className="small muted">Payments are processed securely by Stripe. We never see your card number.</p>
		</form>
	);
}
