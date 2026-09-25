import { formatDateTime, formatTime, money, todayInRestaurant } from "../format";
import { PAYMENT_LABELS, amountDue, paymentBadge, placedAt, restaurantDate } from "./adminUtils";

// Kitchen ticket. Only rendered into a body-level portal while printing; the
// print stylesheet in admin.css hides everything else on the page.
export default function PrintTicket({ order, restaurantName }) {
	const due = amountDue(order);
	const scheduledDay = order.pickup_at && restaurantDate(order.pickup_at) !== todayInRestaurant();

	return (
		<article className="adm-ticket-print">
			<header>
				<div className="adm-tp-restaurant">{restaurantName || "Mardini's"}</div>
				<div className="adm-tp-number">#{order.number}</div>
				<div className="adm-tp-name">{order.customer_name}</div>
				<div className="adm-tp-pickup">
					{order.pickup_at
						? `PICKUP ${scheduledDay ? formatDateTime(order.pickup_at) : formatTime(order.pickup_at)}`
						: "PICKUP ASAP"}
				</div>
				<div>Placed {formatDateTime(placedAt(order))}</div>
				{order.customer_phone && <div>{order.customer_phone}</div>}
			</header>

			<ul className="adm-tp-items">
				{order.items.map((item) => (
					<li key={item.id}>
						<div className="adm-tp-line">
							<span className="adm-tp-qty">{item.quantity}×</span>
							<span className="adm-tp-item">{item.name}</span>
							<span>{money(item.line_total)}</span>
						</div>
						{item.special_request && <div className="adm-tp-note">** {item.special_request}</div>}
					</li>
				))}
			</ul>

			{order.custom_request && (
				<div className="adm-tp-request">
					<strong>ORDER NOTE:</strong> {order.custom_request}
				</div>
			)}

			<div className="adm-tp-totals">
				<div>
					<span>Subtotal</span>
					<span>{money(order.subtotal)}</span>
				</div>
				<div>
					<span>Tax</span>
					<span>{money(order.tax)}</span>
				</div>
				{Number(order.tip) > 0 && (
					<div>
						<span>Tip</span>
						<span>{money(order.tip)}</span>
					</div>
				)}
				<div className="adm-tp-total">
					<span>Total</span>
					<span>{money(order.total)}</span>
				</div>
			</div>

			<footer>
				<div>
					{PAYMENT_LABELS[order.payment_method]} — {paymentBadge(order).label.toUpperCase()}
				</div>
				{due > 0 && <div className="adm-tp-due">COLLECT {money(due)}</div>}
				{order.admin_notes && <div className="adm-tp-note">Staff note: {order.admin_notes}</div>}
			</footer>
		</article>
	);
}
