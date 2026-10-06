import { useCallback, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
	faBan,
	faCalendarDay,
	faCircleInfo,
	faCommentDots,
	faPrint,
	faRotate,
	faTabletScreenButton,
	faVolumeHigh,
	faVolumeXmark,
	faWifi,
} from "@fortawesome/free-solid-svg-icons";
import { formatDate, formatTime, minutesAgo, money, todayInRestaurant } from "../format";
import { EmptyState, Spinner } from "../components/ui";
import { useAdmin } from "./AdminContext";
import OrderDetail, { CancelDialog, nextActionLabel } from "./OrderDetail";
import { CateringBadge, OverflowMenu, PageHeader, PaymentBadge, useNow } from "./adminUi";
import { NEXT_STATUS, STATUS_LABELS, amountDue, placedAt, restaurantDate } from "./adminUtils";
import { groupByName, namesText } from "../itemNames";
import { modifierText } from "../modifiers";

const COLUMNS = [
	{ status: "new", title: "New", empty: "No new orders. You'll hear a chime when one arrives." },
	{ status: "preparing", title: "Preparing", empty: "Nothing in progress." },
	{ status: "ready", title: "Ready", empty: "Nothing waiting for pickup." },
];
const LATE_MINUTES = 15;

// 0 (on track) to 3 (overdue): colors the kitchen screen's tickets. ASAP orders go by
// how long ago they were placed; scheduled ones by how soon they're due.
export function urgency(order) {
	if (order.status === "ready") return 0;
	if (order.pickup_at) {
		const minutesLeft = (new Date(order.pickup_at).getTime() - Date.now()) / 60000;
		if (minutesLeft > 15) return 0;
		if (minutesLeft > 5) return 1;
		return minutesLeft > 0 ? 2 : 3;
	}
	const age = minutesAgo(placedAt(order));
	if (age < 5) return 0;
	if (age < 10) return 1;
	return age < LATE_MINUTES ? 2 : 3;
}

// After a ticket advances it jumps to the next column, and whatever slides under the
// finger could be another order's button. Swallow taps that follow too quickly.
let lastAdvanceAt = 0;

export function PickupInfo({ order }) {
	if (!order.pickup_at) {
		return <span className="adm-pickup is-asap">ASAP</span>;
	}
	const laterDay = restaurantDate(order.pickup_at) !== todayInRestaurant();
	if (laterDay) {
		return (
			<span className="adm-pickup is-later">
				<FontAwesomeIcon icon={faCalendarDay} /> {formatDate(order.pickup_at)} · {formatTime(order.pickup_at)}
			</span>
		);
	}
	const minutesUntil = Math.round((new Date(order.pickup_at).getTime() - Date.now()) / 60000);
	return (
		<span className="adm-pickup">
			{formatTime(order.pickup_at)}
			{minutesUntil > 0 && <span className="adm-pickup-in"> · in {minutesUntil} min</span>}
		</span>
	);
}

// Moves an order to its next kitchen status with an Undo toast. `busyId` is the order
// being moved, so its button can be disabled.
// `quiet`: no success/Undo toast (the kitchen screen shows no toasts).
export function useAdvanceOrder({ quiet = false } = {}) {
	const { updateOrder } = useAdmin();
	const [busyId, setBusyId] = useState(null);

	const advance = useCallback(
		// `to` skips ahead (the kitchen screen's Ready goes straight to completed).
		async (order, to) => {
			if (Date.now() - lastAdvanceAt < 700) return;
			lastAdvanceAt = Date.now();
			const previous = order.status;
			const next = to || NEXT_STATUS[previous];
			if (!next) return;
			const undo = async (updated) => {
				try {
					await updateOrder(updated, { status: previous });
					toast.info(`#${order.number} moved back to ${STATUS_LABELS[previous]}`);
				} catch (e) {
					toast.error(e.message);
				}
			};
			setBusyId(order.id);
			try {
				const updated = await updateOrder(order, { status: next });
				if (quiet) return;
				toast.success(
					({ closeToast }) => (
						<span className="adm-toast-undo">
							#{order.number} → {STATUS_LABELS[next]}
							<button
								type="button"
								className="link-btn"
								onClick={() => {
									closeToast();
									undo(updated);
								}}
							>
								Undo
							</button>
						</span>
					),
					{ autoClose: 5000 }
				);
			} catch (e) {
				toast.error(e.message);
			} finally {
				setBusyId(null);
			}
		},
		[updateOrder, quiet]
	);

	return { advance, busyId };
}

function Ticket({ order, onOpen, onCancel }) {
	const { printOrder } = useAdmin();
	const { advance, busyId } = useAdvanceOrder();
	const busy = busyId === order.id;
	const age = minutesAgo(placedAt(order));
	const next = NEXT_STATUS[order.status];
	const due = amountDue(order);
	const scheduledLater = order.pickup_at && new Date(order.pickup_at).getTime() - Date.now() > 45 * 60000;
	const late = order.status === "new" && age >= LATE_MINUTES && !scheduledLater;
	const readyAge = order.status === "ready" && order.ready_at ? minutesAgo(order.ready_at) : null;

	return (
		<article
			className={`adm-ticket is-${order.status} is-urgency-${urgency(order)}${late ? " is-late" : ""}`}
			aria-label={`Order ${order.number}`}
		>
			<header className="adm-ticket-head">
				<button type="button" className="adm-ticket-number" onClick={() => onOpen(order)}>
					#{order.number}
				</button>
				<span className={`adm-age${late ? " is-late" : ""}`} title={`Placed at ${formatTime(placedAt(order))}`}>
					{age < 1 ? (
						"just now"
					) : (
						<>
							{age} min<span className="adm-age-ago"> ago</span>
						</>
					)}
				</span>
				<OverflowMenu
					label={`More actions for order ${order.number}`}
					items={[
						{ label: "View details", icon: faCircleInfo, onClick: () => onOpen(order) },
						{ label: "Print ticket", icon: faPrint, onClick: () => printOrder(order) },
						{ label: "Cancel order", icon: faBan, danger: true, onClick: () => onCancel(order) },
					]}
				/>
			</header>

			<div className="adm-ticket-name">{order.customer_name}</div>
			<div className="adm-ticket-pickup">
				<span className="muted small">Pickup</span> <PickupInfo order={order} />
			</div>
			{readyAge !== null && readyAge >= 1 && (
				<div className="muted small">Ready for {readyAge} min</div>
			)}

			<ul className="adm-ticket-items">
				{groupByName(order.items).map((item) => (
					<li key={item.groupKey}>
						<span className="adm-ticket-qty">{item.quantity}×</span>
						<span>
							{item.name}
							{namesText(item.names) && <span className="adm-item-label">For: {namesText(item.names)}</span>}
							{item.modifiers?.length > 0 && <span className="adm-modifiers">{modifierText(item.modifiers)}</span>}
							{item.special_request && <span className="adm-special">{item.special_request}</span>}
						</span>
					</li>
				))}
			</ul>

			{order.custom_request && (
				<div className="adm-request">
					<FontAwesomeIcon icon={faCommentDots} /> {order.custom_request}
				</div>
			)}
			{order.admin_notes && <div className="adm-staff-note">Staff: {order.admin_notes}</div>}

			<div className="adm-ticket-pay">
				<CateringBadge order={order} />
				<PaymentBadge order={order} />
				<span className="spacer" />
				{due > 0 ? (
					<span className="adm-due-amount">Due {money(due)}</span>
				) : (
					<span className="money adm-strong">{money(order.total)}</span>
				)}
			</div>

			{next && (
				<button
					type="button"
					className={`btn btn-lg btn-block adm-advance is-${order.status}`}
					onClick={() => advance(order)}
					disabled={busy}
				>
					{nextActionLabel(order)}
				</button>
			)}
		</article>
	);
}

// The New / Preparing / Ready columns, shared by Live Orders and the kitchen screen.
export function OrderBoard() {
	const { orders, ordersError, refreshOrders } = useAdmin();
	const [detail, setDetail] = useState(null);
	const [cancelling, setCancelling] = useState(null);
	const [mobileColumn, setMobileColumn] = useState("new");
	useNow(30000);

	if (!orders) {
		return ordersError ? (
			<EmptyState title="Couldn't load orders">
				<button type="button" className="btn btn-secondary" onClick={refreshOrders}>
					Try again
				</button>
			</EmptyState>
		) : (
			<Spinner label="Loading orders" />
		);
	}

	const byStatus = (status) => orders.filter((o) => o.status === status);

	return (
		<>
			<div className="segmented adm-board-tabs" role="group" aria-label="Show column">
				{COLUMNS.map((c) => (
					<button
						type="button"
						key={c.status}
						aria-pressed={mobileColumn === c.status}
						onClick={() => setMobileColumn(c.status)}
					>
						{c.title} ({byStatus(c.status).length})
					</button>
				))}
			</div>
			<div className="adm-board">
				{COLUMNS.map((c) => {
					const list = byStatus(c.status);
					return (
						<section
							key={c.status}
							className={`adm-column is-${c.status}${mobileColumn === c.status ? " is-current" : ""}`}
							aria-label={`${c.title} orders`}
						>
							<h2 className="adm-column-title">
								{c.title}
								<span className="adm-column-count">{list.length}</span>
							</h2>
							{list.length === 0 ? (
								<p className="adm-column-empty">{c.empty}</p>
							) : (
								<div className="adm-column-list">
									{list.map((o) => (
										<Ticket key={o.id} order={o} onOpen={setDetail} onCancel={setCancelling} />
									))}
								</div>
							)}
						</section>
					);
				})}
			</div>

			{detail && <OrderDetail order={detail} onClose={() => setDetail(null)} />}
			{cancelling && <CancelDialog order={cancelling} onClose={() => setCancelling(null)} />}
		</>
	);
}

export default function LiveOrders() {
	const { orders, ordersError, refreshOrders, soundOn, setSoundOn, audioReady, enableAudio } = useAdmin();

	return (
		<div className="adm-page adm-page-wide">
			<PageHeader title="Live orders" subtitle="Updates automatically every 10 seconds.">
				<Link to="/kitchen" className="btn btn-secondary">
					<FontAwesomeIcon icon={faTabletScreenButton} />
					Kitchen screen
				</Link>
				{soundOn && !audioReady ? (
					<button type="button" className="btn btn-primary" onClick={enableAudio}>
						<FontAwesomeIcon icon={faVolumeHigh} />
						Enable sound
					</button>
				) : (
					<button
						type="button"
						className="btn btn-secondary"
						onClick={() => setSoundOn(!soundOn)}
						aria-pressed={soundOn}
					>
						<FontAwesomeIcon icon={soundOn ? faVolumeHigh : faVolumeXmark} />
						{soundOn ? "Sound on" : "Sound off"}
					</button>
				)}
				<button type="button" className="btn btn-ghost" onClick={refreshOrders} aria-label="Refresh orders now">
					<FontAwesomeIcon icon={faRotate} />
				</button>
			</PageHeader>

			{ordersError && orders && (
				<div className="notice adm-mb" role="alert">
					<FontAwesomeIcon icon={faWifi} />
					<span>
						Can't reach the server — orders may be out of date. Retrying automatically. ({ordersError.message})
					</span>
				</div>
			)}

			<OrderBoard />
		</div>
	);
}
