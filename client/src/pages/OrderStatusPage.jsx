import { useCallback, useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCircleCheck, faFireBurner, faBagShopping, faReceipt, faLocationDot, faPhone } from "@fortawesome/free-solid-svg-icons";
import { api } from "../api";
import { useCart } from "../context/CartContext";
import { useRestaurant } from "../context/RestaurantContext";
import { EmptyState, Modal, Spinner } from "../components/ui";
import { formatDateTime, formatTime, money, ORDER_STATUS_LABELS, telHref } from "../format";
import { PENDING_ORDER_KEY } from "./CheckoutPage";

const STEPS = [
	["new", "Received", faReceipt],
	["preparing", "Preparing", faFireBurner],
	["ready", "Ready", faBagShopping],
	["completed", "Picked up", faCircleCheck],
];
const FINAL = ["completed", "cancelled"];

export default function OrderStatusPage() {
	const { token } = useParams();
	const { state } = useLocation();
	const { restaurant } = useRestaurant();
	const { clear } = useCart();
	const [order, setOrder] = useState(null);
	const [error, setError] = useState(null);

	const load = useCallback(async () => {
		try {
			const o = await api.get(`/orders/${token}`);
			setOrder(o);
			// Returning from a Stripe redirect: empty the cart once payment lands.
			if (o.status !== "awaiting_payment" && sessionStorage.getItem(PENDING_ORDER_KEY) === token) {
				sessionStorage.removeItem(PENDING_ORDER_KEY);
				clear();
			}
		} catch (e) {
			setError(e);
		}
	}, [token, clear]);

	useEffect(() => {
		load();
	}, [load]);

	useEffect(() => {
		if (!order || FINAL.includes(order.status)) return;
		const id = setInterval(() => document.visibilityState === "visible" && load(), order.status === "awaiting_payment" ? 4000 : 15000);
		return () => clearInterval(id);
	}, [order, load]);

	if (error) {
		return (
			<div className="container page narrow">
				<EmptyState icon={faReceipt} title="We couldn't find that order">
					<p>Double-check the link, or give us a call and we'll look it up.</p>
					<Link to="/menu" className="btn btn-primary">
						Back to the menu
					</Link>
				</EmptyState>
			</div>
		);
	}
	if (!order) return <Spinner label="Loading order" />;

	const stepIndex = STEPS.findIndex(([s]) => s === order.status);
	const pickup = order.pickup_at ? formatDateTime(order.pickup_at) : null;

	return (
		<div className="container page narrow order-status">
			<div className="page-header">
				<span className="eyebrow">Order #{order.number}</span>
				<h1>
					{order.status === "awaiting_payment"
						? "Confirming your payment…"
						: order.status === "cancelled"
						? "This order was cancelled"
						: order.status === "ready"
						? `Your order is ready, ${order.customer_name.split(" ")[0]}!`
						: order.status === "completed"
						? "Enjoy your meal!"
						: `Thanks, ${order.customer_name.split(" ")[0]}!`}
				</h1>
				{state?.justPlaced && order.status === "new" && (
					<p>We've got your order{order.payment_method === "card" ? " and payment" : ""}. This page updates automatically.</p>
				)}
			</div>

			{order.status === "cancelled" ? (
				<div className="notice">
					{order.cancel_reason ? `Reason: ${order.cancel_reason}. ` : ""}
					{Number(order.refunded_amount) > 0 &&
						`${money(order.refunded_amount)} has been refunded to your card. It usually shows up within 5–10 business days. `}
					Questions? Call us at <a href={telHref(restaurant?.phone)}>{restaurant?.phone}</a>.
				</div>
			) : order.status === "awaiting_payment" ? (
				<div className="card">
					<Spinner label="Confirming payment" />
					<p className="muted" style={{ textAlign: "center" }}>
						This usually takes a few seconds. If it doesn't update, call us and we'll sort it out.
					</p>
				</div>
			) : (
				<div className="card">
					<ol className="progress-steps">
						{STEPS.map(([key, label, icon], i) => (
							<li key={key} className={i < stepIndex ? "is-done" : i === stepIndex ? "is-current" : ""}>
								<span className="progress-icon">
									<FontAwesomeIcon icon={icon} />
								</span>
								<span>{label}</span>
							</li>
						))}
					</ol>
					<p className="pickup-line">
						{order.status === "ready"
							? "Head to the counter. Your order is waiting."
							: pickup
							? `Scheduled for pickup ${pickup}`
							: restaurant
							? `Estimated ready around ${formatTime(new Date(new Date(order.placed_at).getTime() + restaurant.prep_time_minutes * 60000).toISOString())}`
							: ""}
					</p>
				</div>
			)}

			<div className="card" style={{ marginTop: 20 }}>
				<h2 className="card-title">Order details</h2>
				{order.items.map((i) => (
					<div key={i.id} className="order-line">
						<div className="summary-row">
							<span>
								{i.quantity} × {i.name}
							</span>
							<span>{money(i.line_total)}</span>
						</div>
						{i.special_request && <p className="cart-line-note">“{i.special_request}”</p>}
					</div>
				))}
				{order.custom_request && <p className="cart-line-note">Note: {order.custom_request}</p>}
				<hr className="divider" />
				<div className="summary-row">
					<span>Subtotal</span>
					<span>{money(order.subtotal)}</span>
				</div>
				<div className="summary-row">
					<span>Tax</span>
					<span>{money(order.tax)}</span>
				</div>
				{Number(order.tip) > 0 && (
					<div className="summary-row">
						<span>Tip</span>
						<span>{money(order.tip)}</span>
					</div>
				)}
				<div className="summary-row total">
					<span>Total</span>
					<span>{money(order.total)}</span>
				</div>
				{Number(order.refunded_amount) > 0 && (
					<div className="summary-row refund-row">
						<span>Refunded</span>
						<span>−{money(order.refunded_amount)}</span>
					</div>
				)}
				<p className="small muted" style={{ marginTop: 12 }}>
					{order.payment_status === "paid"
						? "Paid online"
						: order.payment_status === "refunded"
						? "Refunded"
						: order.payment_status === "partially_refunded"
						? "Paid online, partly refunded"
						: order.status === "cancelled"
						? "Not charged"
						: "Pay at the counter when you pick up"}
					{" · "}
					{ORDER_STATUS_LABELS[order.status]}
				</p>
			</div>

			{restaurant && (
				<div className="card pickup-card" style={{ marginTop: 20 }}>
					<div>
						<FontAwesomeIcon icon={faLocationDot} /> {restaurant.address}
					</div>
					<div className="row">
						<a
							className="btn btn-secondary btn-sm"
							target="_blank"
							rel="noreferrer"
							href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(restaurant.address)}`}
						>
							Directions
						</a>
						<a className="btn btn-secondary btn-sm" href={telHref(restaurant.phone)}>
							<FontAwesomeIcon icon={faPhone} /> Call
						</a>
					</div>
				</div>
			)}
			{order.can_cancel && order.status === "new" && (
				<CancelOrderCard order={order} onCancelled={setOrder} phone={restaurant?.phone} />
			)}

			<p className="small muted" style={{ marginTop: 16 }}>
				Bookmark this page to check on your order anytime. See our{" "}
				<Link to="/policies">ordering &amp; refund policy</Link>.
			</p>
		</div>
	);
}

function CancelOrderCard({ order, onCancelled, phone }) {
	const [confirming, setConfirming] = useState(false);
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState(null);
	const paidOnline = order.payment_status === "paid";

	const cancel = async () => {
		setBusy(true);
		setError(null);
		try {
			const updated = await api.post(`/orders/${order.token}/cancel`);
			onCancelled(updated);
			setConfirming(false);
			window.scrollTo({ top: 0, behavior: "smooth" });
			toast.success(paidOnline ? "Order cancelled and refunded" : "Order cancelled");
		} catch (e) {
			setError(e.message);
			setBusy(false);
		}
	};

	return (
		<>
			<div className="card cancel-card">
				<div>
					<strong>Need to cancel?</strong>
					<p className="small muted">
						You can cancel online until we start preparing your order
						{paidOnline ? ", and we'll refund your card in full." : "."}
					</p>
				</div>
				<button className="btn btn-secondary" onClick={() => setConfirming(true)}>
					Cancel order
				</button>
			</div>

			{confirming && (
				<Modal onClose={() => !busy && setConfirming(false)} label="Cancel your order" className="cancel-modal">
					<div className="modal-body">
						<h2 className="item-modal-title">Cancel order #{order.number}?</h2>
						{paidOnline ? (
							<p>
								We'll refund the full <strong>{money(order.total)}</strong> to your card. Refunds usually appear
								within 5–10 business days, depending on your bank.
							</p>
						) : (
							<p>You haven't been charged, so there's nothing to refund.</p>
						)}
						<p className="small muted">This can't be undone. You're welcome to place a new order anytime.</p>
						{error && (
							<div className="form-error" role="alert">
								{error}
								{phone && (
									<>
										{" "}
										<a href={telHref(phone)}>Call {phone}</a>
									</>
								)}
							</div>
						)}
					</div>
					<div className="modal-footer">
						<button className="btn btn-secondary" onClick={() => setConfirming(false)} disabled={busy}>
							Keep my order
						</button>
						<span className="spacer" />
						<button className="btn btn-danger" onClick={cancel} disabled={busy}>
							{busy ? "Cancelling…" : paidOnline ? `Cancel & refund ${money(order.total)}` : "Cancel order"}
						</button>
					</div>
				</Modal>
			)}
		</>
	);
}
