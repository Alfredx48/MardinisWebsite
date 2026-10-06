import { Fragment, useEffect, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
	faBan,
	faBell,
	faCalendarDays,
	faCircleInfo,
	faClock,
	faCommentDots,
	faPrint,
} from "@fortawesome/free-solid-svg-icons";
import { api } from "../api";
import { useRestaurant } from "../context/RestaurantContext";
import { formatDate, formatTime, minutesAgo, money, todayInRestaurant } from "../format";
import { groupByName, nameCounts } from "../itemNames";
import { modifierGroups } from "../modifiers";
import { EmptyState, Spinner } from "../components/ui";
import { useAdmin } from "./AdminContext";
import { PickupInfo, urgency, useAdvanceOrder } from "./LiveOrders";
import OrderDetail, { CancelDialog } from "./OrderDetail";
import { CateringBadge, OverflowMenu, PaymentBadge, useNow } from "./adminUi";
import { amountDue, placedAt, playChime, restaurantDate } from "./adminUtils";
import { daysUntil, dueReminders, isUpcoming } from "./upcoming";

// The kitchen screen's orders, laid out like the DoorDash and Uber Eats tablets: the orders
// being made in a list on the left, the selected order large on the right, and a full-screen
// popup for each new order. "Got it" on the popup starts it; "Ready" under the selected order
// marks it done (picked up, and paid if paying at pickup). No toasts on this screen; a manager
// can reopen an order marked done by mistake from Admin → History. Orders for later days wait in
// Upcoming until their pickup day, with reminders 3 days and 1 day before.
const EMPTY = { orders: "Nothing being made right now. New orders pop up here with a chime.", upcoming: "No orders for later days." };

// Ready is the last step on this screen. An order already marked ready elsewhere (the admin
// board) just needs picking up.
const doneLabel = (order) => (order.status === "ready" ? "Picked up" : "Ready");

const itemCount = (order) => order.items.reduce((n, i) => n + i.quantity, 0);
const itemsLabel = (order) => `${itemCount(order)} ${itemCount(order) === 1 ? "item" : "items"}`;

function Elapsed({ order }) {
	if (isUpcoming(order)) {
		const days = daysUntil(order);
		return <span className="adm-k-elapsed is-later">{days === 1 ? "Tomorrow" : `In ${days} days`}</span>;
	}
	if (order.status === "ready" && order.ready_at) {
		return <span className="adm-k-elapsed is-ready">Ready {Math.max(0, minutesAgo(order.ready_at))} min</span>;
	}
	const age = minutesAgo(placedAt(order));
	return (
		<span className={`adm-k-elapsed is-urgency-${urgency(order)}`}>{age < 1 ? "Just now" : `${age} min`}</span>
	);
}

// Every line with its choices grouped ("Bread Choice: Sliced Rye"); "No …" choices
// stand out because they're the easiest to miss.
export function ItemList({ order }) {
	return (
		<ul className="adm-k-items">
			{groupByName(order.items).map((item) => (
				<li key={item.groupKey} className="adm-k-item">
					<span className={`adm-k-qty${item.quantity > 1 ? " is-multi" : ""}`}>{item.quantity}</span>
					<div className="adm-k-item-body">
						<div className="adm-k-item-name">{item.name}</div>
						<NameTags names={item.names} />
						{modifierGroups(item.modifiers).map((g) => (
							<div key={g.group} className="adm-k-mod">
								<span className="adm-k-mod-group">{g.group}:</span>
								<span className="adm-k-mod-options">
									{g.options.map((option) => (
										<span key={option} className={/^no\b/i.test(option) ? "is-no" : undefined}>
											{option}
										</span>
									))}
								</span>
							</div>
						))}
						{item.special_request && <div className="adm-k-special">“{item.special_request}”</div>}
					</div>
				</li>
			))}
		</ul>
	);
}

// The names to write on the items (group orders), as name tags.
function NameTags({ names }) {
	const { named, unnamed } = nameCounts(names);
	if (!named.length) return null;
	return (
		<div className="adm-k-names">
			<span className="adm-k-names-for">For:</span>
			{named.map((n) => (
				<span key={n.name} className="adm-k-label">
					{n.name}
					{n.count > 1 && <span className="adm-k-label-count"> ×{n.count}</span>}
				</span>
			))}
			{unnamed > 0 && <span className="adm-k-names-for">+{unnamed} no name</span>}
		</div>
	);
}

function OrderNotes({ order }) {
	return (
		<>
			{order.custom_request && (
				<div className="adm-k-note">
					<FontAwesomeIcon icon={faCommentDots} />
					<div>
						<strong>Order note</strong>
						<div>{order.custom_request}</div>
					</div>
				</div>
			)}
			{order.admin_notes && <div className="adm-staff-note adm-k-staff-note">Staff: {order.admin_notes}</div>}
		</>
	);
}

function OrderCard({ order, selected, onSelect }) {
	return (
		<button
			type="button"
			className={`adm-k-card is-${order.status} is-urgency-${urgency(order)}${selected ? " is-selected" : ""}`}
			aria-pressed={selected}
			onClick={() => onSelect(order.id)}
		>
			<span className="adm-k-card-top">
				<span className="adm-k-card-num">#{order.number}</span>
				{order.status === "new" && <span className="adm-k-newtag">New</span>}
				<Elapsed order={order} />
			</span>
			<span className="adm-k-card-name">{order.customer_name}</span>
			<span className="adm-k-card-meta">
				<CateringBadge order={order} /> {itemsLabel(order)} · <PickupInfo order={order} />
			</span>
		</button>
	);
}

// `onDone` is missing for Upcoming orders: they're made on their day.
function OrderPanel({ order, busy, onDone, onOpen, onCancel }) {
	const { printOrder } = useAdmin();
	const due = amountDue(order);
	return (
		<section className="adm-k-panel" aria-label={`Order ${order.number}`}>
			<header className="adm-k-panel-head">
				<div className="adm-k-panel-title">
					<div className="adm-k-panel-num">
						#{order.number} <Elapsed order={order} />
					</div>
					<h2 className="adm-k-panel-name">{order.customer_name}</h2>
					<div className="adm-k-panel-meta">
						<span>
							Pickup <PickupInfo order={order} />
						</span>
						<span>{itemsLabel(order)}</span>
						<CateringBadge order={order} />
						<PaymentBadge order={order} />
						{due > 0 && <span className="adm-due-amount">Due {money(due)}</span>}
					</div>
				</div>
				<OverflowMenu
					label={`More actions for order ${order.number}`}
					items={[
						{ label: "View details", icon: faCircleInfo, onClick: () => onOpen(order) },
						{ label: "Print ticket", icon: faPrint, onClick: () => printOrder(order) },
						{ label: "Cancel order", icon: faBan, danger: true, onClick: () => onCancel(order) },
					]}
				/>
			</header>
			<div className="adm-k-panel-body">
				<OrderNotes order={order} />
				<ItemList order={order} />
			</div>
			{onDone && (
				<footer className="adm-k-panel-foot">
					<button
						type="button"
						className="btn btn-lg btn-block adm-advance is-preparing"
						onClick={() => onDone(order)}
						disabled={busy}
					>
						{doneLabel(order)}
					</button>
				</footer>
			)}
		</section>
	);
}

// `later`: the order is for a later day, so it goes to Upcoming instead of the line.
function NewOrderPopup({ order, more, busy, later, onStart, onGotIt }) {
	return (
		<div className="adm-k-popup" role="alertdialog" aria-modal="true" aria-label={`New order ${order.number}`}>
			<div className="adm-k-popup-card">
				<header className="adm-k-popup-head">
					<FontAwesomeIcon icon={faBell} className="adm-k-popup-bell" />
					<div>
						<div className="adm-k-popup-kicker">
							{later ? `New order for ${formatDate(order.pickup_at, { weekday: "long" })}` : "New order"}
						</div>
						<div className="adm-k-popup-title">
							#{order.number} · {order.customer_name}
						</div>
					</div>
					{more > 0 && <span className="adm-k-popup-more">+{more} more</span>}
				</header>
				<div className="adm-k-popup-meta">
					<span>
						Pickup <PickupInfo order={order} />
					</span>
					<span>{itemsLabel(order)}</span>
					<CateringBadge order={order} />
					<PaymentBadge order={order} />
				</div>
				<div className="adm-k-popup-body">
					<OrderNotes order={order} />
					<ItemList order={order} />
				</div>
				{later ? (
					<footer className="adm-k-popup-foot is-single">
						<button type="button" className="btn btn-lg adm-advance is-new" onClick={onGotIt}>
							Got it · it's in Upcoming
						</button>
					</footer>
				) : (
					<footer className="adm-k-popup-foot is-single">
						<button type="button" className="btn btn-lg adm-advance is-new" onClick={onStart} disabled={busy}>
							Got it
						</button>
					</footer>
				)}
			</div>
		</div>
	);
}

export default function KitchenOrders() {
	const { orders, ordersError, refreshOrders, newAlerts, acknowledgeAlerts, applyOrder, soundOn } = useAdmin();
	const { restaurant } = useRestaurant();
	const { advance, busyId } = useAdvanceOrder({ quiet: true });
	const [view, setView] = useState("orders"); // or "upcoming"
	const [selectedId, setSelectedId] = useState(null);
	const [detail, setDetail] = useState(null);
	const [cancelling, setCancelling] = useState(null);
	const [seenHere, setSeenHere] = useState([]); // reminders tapped here, hidden before the server answers
	useNow(30000);

	const today = todayInRestaurant();
	// Reminders pop up once the restaurant opens, not at midnight on an empty kitchen.
	const reminders = restaurant?.open_now && orders ? dueReminders(orders, today).filter((r) => !seenHere.includes(r.key)) : [];
	const reminder = newAlerts.length === 0 ? reminders[0] : null;

	// Chime once for each reminder as it comes up.
	const chimed = useRef(new Set());
	useEffect(() => {
		if (!reminder || chimed.current.has(reminder.key)) return;
		chimed.current.add(reminder.key);
		if (soundOn) playChime({ loud: true });
	}, [reminder, soundOn]);

	if (!orders) {
		return ordersError ? (
			<EmptyState title="Couldn't load orders">
				<button type="button" className="btn btn-secondary" onClick={refreshOrders}>
					Try again
				</button>
			</EmptyState>
		) : (
			<div className="adm-k-loading">
				<Spinner label="Loading orders" />
			</div>
		);
	}

	const upcoming = orders
		.filter((o) => isUpcoming(o, today))
		.sort((a, b) => Date.parse(a.pickup_at) - Date.parse(b.pickup_at));
	// Every order for today, oldest first (new ones not yet started too, e.g. after a reload).
	const making = orders.filter((o) => !isUpcoming(o, today));
	const list = view === "upcoming" ? upcoming : making;
	// Falls back to the oldest order, so finishing one opens the next.
	const selected = list.find((o) => o.id === selectedId) || list[0] || null;
	const empty = EMPTY[view];
	const done = view === "upcoming" ? null : (order) => advance(order, "completed");
	const popup = newAlerts[0];
	const popupLater = popup && isUpcoming(popup, today);

	const seeReminder = async ({ order, days, key }) => {
		setSeenHere((keys) => [...keys, key]);
		setView(isUpcoming(order, today) ? "upcoming" : "orders");
		setSelectedId(order.id);
		try {
			applyOrder(await api.post(`/admin/orders/${order.id}/reminder`, { days }));
		} catch {
			// Shows again on the next visit; nothing else depends on it.
		}
	};

	const startPopupOrder = async () => {
		acknowledgeAlerts([popup.id]);
		setView("orders");
		setSelectedId(popup.id);
		await advance(popup, "preparing");
	};

	return (
		<div className="adm-k-orders">
			<aside className="adm-k-side">
				<button
					type="button"
					className={`adm-k-upcoming${view === "upcoming" ? " is-active" : ""}`}
					aria-pressed={view === "upcoming"}
					onClick={() => setView("upcoming")}
				>
					<FontAwesomeIcon icon={faCalendarDays} />
					<span className="adm-k-upcoming-title">Upcoming</span>
					<span className="adm-k-upcoming-count">{upcoming.length}</span>
					{upcoming[0] && <span className="adm-k-upcoming-next">Next: {formatDate(upcoming[0].pickup_at)}</span>}
				</button>
				<div className="adm-k-tabs is-single">
					<button type="button" className="adm-k-tab" aria-pressed={view === "orders"} onClick={() => setView("orders")}>
						<span className="adm-k-tab-count">{making.length}</span>
						<span className="adm-k-tab-title">Being made</span>
					</button>
				</div>
				{list.length === 0 ? (
					<p className="adm-k-empty">{empty}</p>
				) : (
					<div className="adm-k-list">
						{list.map((o, i) => (
							<Fragment key={o.id}>
								{/* Upcoming orders are grouped under their pickup day. */}
								{view === "upcoming" && (i === 0 || restaurantDate(o.pickup_at) !== restaurantDate(list[i - 1].pickup_at)) && (
									<h3 className="adm-k-day">{formatDate(o.pickup_at, { weekday: "long" })}</h3>
								)}
								<OrderCard order={o} selected={o.id === selected?.id} onSelect={setSelectedId} />
							</Fragment>
						))}
					</div>
				)}
			</aside>

			{selected ? (
				<OrderPanel
					order={selected}
					busy={busyId === selected.id}
					onDone={done}
					onOpen={setDetail}
					onCancel={setCancelling}
				/>
			) : (
				<section className="adm-k-panel adm-k-panel-empty">
					<p>{empty}</p>
				</section>
			)}

			{popup && (
				<NewOrderPopup
					order={popup}
					more={newAlerts.length - 1}
					busy={busyId === popup.id}
					later={popupLater}
					onStart={startPopupOrder}
					onGotIt={() => {
						acknowledgeAlerts([popup.id]);
						setView("upcoming");
						setSelectedId(popup.id);
					}}
				/>
			)}
			{reminder && <ReminderPopup reminder={reminder} today={today} more={reminders.length - 1} onSeen={() => seeReminder(reminder)} />}
			{detail && <OrderDetail order={detail} onClose={() => setDetail(null)} />}
			{cancelling && <CancelDialog order={cancelling} onClose={() => setCancelling(null)} />}
		</div>
	);
}

// "Coming up in 3 days": what's ordered and when, so the kitchen can plan and prep.
function ReminderPopup({ reminder, today, more, onSeen }) {
	const { order } = reminder;
	const days = daysUntil(order, today);
	return (
		<div className="adm-k-popup" role="alertdialog" aria-modal="true" aria-label={`Reminder for order ${order.number}`}>
			<div className="adm-k-popup-card adm-k-reminder">
				<header className="adm-k-popup-head">
					<FontAwesomeIcon icon={faClock} className="adm-k-popup-bell" />
					<div>
						<div className="adm-k-popup-kicker">Reminder · {days === 1 ? "tomorrow" : `in ${days} days`}</div>
						<div className="adm-k-popup-title">
							#{order.number} · {order.customer_name}
						</div>
					</div>
					{more > 0 && <span className="adm-k-popup-more">+{more} more</span>}
				</header>
				<div className="adm-k-popup-meta">
					<span>
						Pickup{" "}
						<strong>
							{formatDate(order.pickup_at, { weekday: "long" })} at {formatTime(order.pickup_at)}
						</strong>
					</span>
					<span>{itemsLabel(order)}</span>
					<CateringBadge order={order} />
					<PaymentBadge order={order} />
				</div>
				<div className="adm-k-popup-body">
					<OrderNotes order={order} />
					<ItemList order={order} />
				</div>
				<footer className="adm-k-popup-foot is-single">
					<button type="button" className="btn btn-lg adm-advance is-new" onClick={onSeen}>
						Got it
					</button>
				</footer>
			</div>
		</div>
	);
}
