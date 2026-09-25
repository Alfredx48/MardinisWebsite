import { useState } from "react";
import { toast } from "react-toastify";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
	faBan,
	faCalendarDay,
	faCircleInfo,
	faCommentDots,
	faPrint,
	faRotate,
	faVolumeHigh,
	faVolumeXmark,
	faWifi,
} from "@fortawesome/free-solid-svg-icons";
import { formatDate, formatTime, minutesAgo, money, todayInRestaurant } from "../format";
import { EmptyState, Spinner } from "../components/ui";
import { useAdmin } from "./AdminContext";
import OrderDetail, { CancelDialog, nextActionLabel } from "./OrderDetail";
import { OverflowMenu, PageHeader, PaymentBadge, useNow } from "./adminUi";
import { NEXT_STATUS, STATUS_LABELS, amountDue, placedAt, restaurantDate } from "./adminUtils";

const COLUMNS = [
	{ status: "new", title: "New", empty: "No new orders. You'll hear a chime when one arrives." },
	{ status: "preparing", title: "Preparing", empty: "Nothing in progress." },
	{ status: "ready", title: "Ready", empty: "Nothing waiting for pickup." },
];
const LATE_MINUTES = 15;

// After a ticket advances it jumps to the next column, and whatever slides under the
// finger could be another order's button. Swallow taps that follow too quickly.
let lastAdvanceAt = 0;

function PickupInfo({ order }) {
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

function Ticket({ order, onOpen, onCancel }) {
	const { updateOrder, printOrder } = useAdmin();
	const [busy, setBusy] = useState(false);
	const age = minutesAgo(placedAt(order));
	const next = NEXT_STATUS[order.status];
	const due = amountDue(order);
	const scheduledLater = order.pickup_at && new Date(order.pickup_at).getTime() - Date.now() > 45 * 60000;
	const late = order.status === "new" && age >= LATE_MINUTES && !scheduledLater;
	const readyAge = order.status === "ready" && order.ready_at ? minutesAgo(order.ready_at) : null;

	const undo = async (updated, previous) => {
		try {
			await updateOrder(updated, { status: previous });
			toast.info(`#${order.number} moved back to ${STATUS_LABELS[previous]}`);
		} catch (e) {
			toast.error(e.message);
		}
	};

	const advance = async () => {
		if (Date.now() - lastAdvanceAt < 700) return;
		lastAdvanceAt = Date.now();
		setBusy(true);
		const previous = order.status;
		try {
			const updated = await updateOrder(order, { status: next });
			toast.success(
				({ closeToast }) => (
					<span className="adm-toast-undo">
						#{order.number} → {STATUS_LABELS[next]}
						<button
							type="button"
							className="link-btn"
							onClick={() => {
								closeToast();
								undo(updated, previous);
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
			setBusy(false);
		}
	};

	return (
		<article className={`adm-ticket is-${order.status}${late ? " is-late" : ""}`} aria-label={`Order ${order.number}`}>
			<header className="adm-ticket-head">
				<button type="button" className="adm-ticket-number" onClick={() => onOpen(order)}>
					#{order.number}
				</button>
				<span className={`adm-age${late ? " is-late" : ""}`} title={`Placed at ${formatTime(placedAt(order))}`}>
					{age < 1 ? "just now" : `${age} min ago`}
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
				{order.items.map((item) => (
					<li key={item.id}>
						<span className="adm-ticket-qty">{item.quantity}×</span>
						<span>
							{item.name}
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
					onClick={advance}
					disabled={busy}
				>
					{nextActionLabel(order)}
				</button>
			)}
		</article>
	);
}

export default function LiveOrders() {
	const { orders, ordersError, refreshOrders, soundOn, setSoundOn, audioReady, enableAudio } = useAdmin();
	const [detail, setDetail] = useState(null);
	const [cancelling, setCancelling] = useState(null);
	const [mobileColumn, setMobileColumn] = useState("new");
	useNow(30000);

	const byStatus = (status) => (orders || []).filter((o) => o.status === status);

	return (
		<div className="adm-page adm-page-wide">
			<PageHeader title="Live orders" subtitle="Updates automatically every 10 seconds.">
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

			{ordersError && (
				<div className="notice adm-mb" role="alert">
					<FontAwesomeIcon icon={faWifi} />
					<span>
						Can't reach the server — orders may be out of date. Retrying automatically. ({ordersError.message})
					</span>
				</div>
			)}

			{!orders ? (
				ordersError ? (
					<EmptyState title="Couldn't load orders">
						<button type="button" className="btn btn-secondary" onClick={refreshOrders}>
							Try again
						</button>
					</EmptyState>
				) : (
					<Spinner label="Loading orders" />
				)
			) : (
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
				</>
			)}

			{detail && <OrderDetail order={detail} onClose={() => setDetail(null)} />}
			{cancelling && <CancelDialog order={cancelling} onClose={() => setCancelling(null)} />}
		</div>
	);
}
