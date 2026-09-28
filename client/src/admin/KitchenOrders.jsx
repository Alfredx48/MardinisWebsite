import { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBan, faBell, faCircleInfo, faCommentDots, faPrint } from "@fortawesome/free-solid-svg-icons";
import { minutesAgo, money } from "../format";
import { modifierGroups } from "../modifiers";
import { EmptyState, Spinner } from "../components/ui";
import { useAdmin } from "./AdminContext";
import { PickupInfo, urgency, useAdvanceOrder } from "./LiveOrders";
import OrderDetail, { CancelDialog, nextActionLabel } from "./OrderDetail";
import { OverflowMenu, PaymentBadge, useNow } from "./adminUi";
import { NEXT_STATUS, amountDue, placedAt } from "./adminUtils";

// The kitchen screen's orders, laid out like the DoorDash and Uber Eats tablets: a list
// of one status at a time on the left, the selected order large on the right, and a
// full-screen popup for each new order.
const TABS = [
	{ status: "new", title: "New", empty: "No new orders. They pop up here with a chime." },
	{ status: "preparing", title: "Preparing", empty: "Nothing being made right now." },
	{ status: "ready", title: "Ready", empty: "Nothing waiting for pickup." },
];

const itemCount = (order) => order.items.reduce((n, i) => n + i.quantity, 0);
const itemsLabel = (order) => `${itemCount(order)} ${itemCount(order) === 1 ? "item" : "items"}`;

function Elapsed({ order }) {
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
			{order.items.map((item) => (
				<li key={item.id} className="adm-k-item">
					<span className={`adm-k-qty${item.quantity > 1 ? " is-multi" : ""}`}>{item.quantity}</span>
					<div className="adm-k-item-body">
						<div className="adm-k-item-name">{item.name}</div>
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
				<Elapsed order={order} />
			</span>
			<span className="adm-k-card-name">{order.customer_name}</span>
			<span className="adm-k-card-meta">
				{itemsLabel(order)} · <PickupInfo order={order} />
			</span>
		</button>
	);
}

function OrderPanel({ order, busy, onAdvance, onOpen, onCancel }) {
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
			{NEXT_STATUS[order.status] && (
				<footer className="adm-k-panel-foot">
					<button
						type="button"
						className={`btn btn-lg btn-block adm-advance is-${order.status}`}
						onClick={() => onAdvance(order)}
						disabled={busy}
					>
						{nextActionLabel(order)}
					</button>
				</footer>
			)}
		</section>
	);
}

function NewOrderPopup({ order, more, busy, onStart, onLater }) {
	return (
		<div className="adm-k-popup" role="alertdialog" aria-modal="true" aria-label={`New order ${order.number}`}>
			<div className="adm-k-popup-card">
				<header className="adm-k-popup-head">
					<FontAwesomeIcon icon={faBell} className="adm-k-popup-bell" />
					<div>
						<div className="adm-k-popup-kicker">New order</div>
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
					<PaymentBadge order={order} />
				</div>
				<div className="adm-k-popup-body">
					<OrderNotes order={order} />
					<ItemList order={order} />
				</div>
				<footer className="adm-k-popup-foot">
					<button type="button" className="btn btn-lg btn-secondary" onClick={onLater}>
						Later
					</button>
					<button type="button" className="btn btn-lg adm-advance is-new" onClick={onStart} disabled={busy}>
						Start preparing
					</button>
				</footer>
			</div>
		</div>
	);
}

export default function KitchenOrders() {
	const { orders, ordersError, refreshOrders, newAlerts, acknowledgeAlerts } = useAdmin();
	const { advance, busyId } = useAdvanceOrder();
	const [tab, setTab] = useState("preparing");
	const [selectedId, setSelectedId] = useState(null);
	const [detail, setDetail] = useState(null);
	const [cancelling, setCancelling] = useState(null);
	useNow(30000);

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

	const byStatus = (status) => orders.filter((o) => o.status === status);
	const list = byStatus(tab);
	// Falls back to the oldest order, so finishing one opens the next.
	const selected = list.find((o) => o.id === selectedId) || list[0] || null;
	const current = TABS.find((t) => t.status === tab);
	const popup = newAlerts[0];

	const startPopupOrder = async () => {
		acknowledgeAlerts([popup.id]);
		setTab("preparing");
		setSelectedId(popup.id);
		await advance(popup);
	};

	return (
		<div className="adm-k-orders">
			<aside className="adm-k-side">
				<div className="adm-k-tabs" role="group" aria-label="Show orders">
					{TABS.map((t) => {
						const count = byStatus(t.status).length;
						return (
							<button
								type="button"
								key={t.status}
								className={`adm-k-tab${t.status === "new" && count > 0 && tab !== "new" ? " is-waiting" : ""}`}
								aria-pressed={tab === t.status}
								onClick={() => setTab(t.status)}
							>
								<span className="adm-k-tab-count">{count}</span>
								<span className="adm-k-tab-title">{t.title}</span>
							</button>
						);
					})}
				</div>
				{list.length === 0 ? (
					<p className="adm-k-empty">{current.empty}</p>
				) : (
					<div className="adm-k-list">
						{list.map((o) => (
							<OrderCard key={o.id} order={o} selected={o.id === selected?.id} onSelect={setSelectedId} />
						))}
					</div>
				)}
			</aside>

			{selected ? (
				<OrderPanel
					order={selected}
					busy={busyId === selected.id}
					onAdvance={advance}
					onOpen={setDetail}
					onCancel={setCancelling}
				/>
			) : (
				<section className="adm-k-panel adm-k-panel-empty">
					<p>{current.empty}</p>
				</section>
			)}

			{popup && (
				<NewOrderPopup
					order={popup}
					more={newAlerts.length - 1}
					busy={busyId === popup.id}
					onStart={startPopupOrder}
					onLater={() => acknowledgeAlerts([popup.id])}
				/>
			)}
			{detail && <OrderDetail order={detail} onClose={() => setDetail(null)} />}
			{cancelling && <CancelDialog order={cancelling} onClose={() => setCancelling(null)} />}
		</div>
	);
}
