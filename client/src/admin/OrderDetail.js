import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBan, faPrint, faRotateLeft } from "@fortawesome/free-solid-svg-icons";
import { api } from "../api";
import { formatDateTime, formatTime, money, telHref, todayInRestaurant } from "../format";
import { Modal } from "../components/ui";
import { useAdmin } from "./AdminContext";
import { FormErrors, PaymentBadge, StatusBadge } from "./adminUi";
import {
	NEXT_ACTION_LABELS,
	NEXT_STATUS,
	PAYMENT_LABELS,
	STATUS_LABELS,
	amountDue,
	canRefund,
	errorList,
	placedAt,
	restaurantDate,
} from "./adminUtils";

const CANCEL_REASONS = ["Customer asked to cancel", "Item sold out", "Closing early", "Duplicate order", "No-show"];

export function pickupLabel(order) {
	if (!order.pickup_at) return "ASAP";
	if (restaurantDate(order.pickup_at) === todayInRestaurant()) return formatTime(order.pickup_at);
	return formatDateTime(order.pickup_at);
}

export function nextActionLabel(order) {
	if (order.status === "ready" && amountDue(order) > 0) return `Collect ${money(amountDue(order))} & complete`;
	return NEXT_ACTION_LABELS[order.status];
}

// Reason picker used by the board's cancel dialog and the detail modal.
function CancelForm({ order, onDone, onBack }) {
	const { updateOrder, refundOrder } = useAdmin();
	const [reason, setReason] = useState("");
	const [busy, setBusy] = useState(false);
	const [errors, setErrors] = useState(null);
	const paidOnline = canRefund(order);

	const submit = async (refund) => {
		setBusy(true);
		setErrors(null);
		try {
			const updated = refund
				? await refundOrder(order, reason.trim() || undefined)
				: await updateOrder(order, { status: "cancelled", cancel_reason: reason.trim() });
			toast.success(refund ? `Order #${order.number} refunded and cancelled` : `Order #${order.number} cancelled`);
			onDone(updated);
		} catch (e) {
			setErrors(errorList(e));
			setBusy(false);
		}
	};

	return (
		<>
			<div className="modal-body">
				<h2 className="adm-modal-title">Cancel order #{order.number}?</h2>
				<p className="muted">
					{order.customer_name} will see this order as cancelled on their tracking page
					{order.customer_phone ? " — consider giving them a call too." : "."}
				</p>
				<div className="field">
					<span className="label" id={`reason-chips-${order.id}`}>
						Reason
					</span>
					<div className="adm-chips" role="group" aria-labelledby={`reason-chips-${order.id}`}>
						{CANCEL_REASONS.map((r) => (
							<button
								type="button"
								key={r}
								className="adm-chip"
								aria-pressed={reason === r}
								onClick={() => setReason(r)}
							>
								{r}
							</button>
						))}
					</div>
					<label className="sr-only" htmlFor={`reason-${order.id}`}>
						Reason (shown to the customer)
					</label>
					<textarea
						id={`reason-${order.id}`}
						className="textarea"
						rows={2}
						maxLength={250}
						placeholder="Or type a reason (shown to the customer)"
						value={reason}
						onChange={(e) => setReason(e.target.value)}
					/>
				</div>
				{paidOnline && (
					<div className="notice adm-mt">
						This order was paid online ({money(order.total)}). Cancelling alone does <strong>not</strong> refund the
						card — choose “Refund &amp; cancel” to return the money.
					</div>
				)}
				<FormErrors errors={errors} />
			</div>
			<div className="modal-footer adm-footer-wrap">
				<button type="button" className="btn btn-secondary" onClick={onBack} disabled={busy}>
					Go back
				</button>
				<span className="spacer" />
				{paidOnline && (
					<button type="button" className="btn btn-danger" onClick={() => submit(true)} disabled={busy}>
						Refund &amp; cancel
					</button>
				)}
				<button
					type="button"
					className={`btn ${paidOnline ? "btn-secondary" : "btn-danger"}`}
					onClick={() => submit(false)}
					disabled={busy}
				>
					{busy ? "Cancelling…" : paidOnline ? "Cancel without refund" : "Cancel order"}
				</button>
			</div>
		</>
	);
}

export function CancelDialog({ order, onClose, onDone }) {
	return (
		<Modal onClose={onClose} label={`Cancel order ${order.number}`} className="adm-modal-md">
			<CancelForm
				order={order}
				onBack={onClose}
				onDone={(updated) => {
					onDone?.(updated);
					onClose();
				}}
			/>
		</Modal>
	);
}

function RefundConfirm({ order, onBack, onDone }) {
	const { refundOrder } = useAdmin();
	const [busy, setBusy] = useState(false);
	const [errors, setErrors] = useState(null);

	const refund = async () => {
		setBusy(true);
		setErrors(null);
		try {
			const updated = await refundOrder(order);
			toast.success(`Refunded ${money(order.total)} to ${order.customer_name}`);
			onDone(updated);
		} catch (e) {
			setErrors(errorList(e));
			setBusy(false);
		}
	};

	return (
		<>
			<div className="modal-body">
				<h2 className="adm-modal-title">Refund order #{order.number}?</h2>
				<p>
					This refunds the full <strong>{money(order.total)}</strong> to {order.customer_name}'s card through Stripe
					and marks the order as cancelled. It can't be undone.
				</p>
				<p className="muted small">Refunds usually show up on the customer's statement within 5–10 business days.</p>
				<FormErrors errors={errors} />
			</div>
			<div className="modal-footer">
				<button type="button" className="btn btn-secondary" onClick={onBack} disabled={busy}>
					Go back
				</button>
				<span className="spacer" />
				<button type="button" className="btn btn-danger" onClick={refund} disabled={busy}>
					{busy ? "Refunding…" : `Refund ${money(order.total)}`}
				</button>
			</div>
		</>
	);
}

function Timeline({ order }) {
	const steps = [
		["Placed", placedAt(order)],
		["Ready", order.ready_at],
		["Completed", order.completed_at],
	];
	return (
		<ol className="adm-timeline">
			{steps.map(([label, at]) => (
				<li key={label} className={at ? "is-done" : ""}>
					<span className="adm-timeline-label">{label}</span>
					<span className="muted small">{at ? formatDateTime(at) : "—"}</span>
				</li>
			))}
			{order.status === "cancelled" && (
				<li className="is-cancelled">
					<span className="adm-timeline-label">Cancelled</span>
					<span className="muted small">{order.cancel_reason || "No reason given"}</span>
				</li>
			)}
		</ol>
	);
}

function NotesEditor({ order, onSaved }) {
	const { updateOrder } = useAdmin();
	const [notes, setNotes] = useState(order.admin_notes || "");
	const [saving, setSaving] = useState(false);
	const dirty = notes !== (order.admin_notes || "");

	useEffect(() => {
		setNotes(order.admin_notes || "");
	}, [order.admin_notes]);

	const save = async () => {
		setSaving(true);
		try {
			const updated = await updateOrder(order, { admin_notes: notes });
			onSaved(updated);
			toast.success("Notes saved");
		} catch (e) {
			toast.error(e.message);
		} finally {
			setSaving(false);
		}
	};

	return (
		<div className="field">
			<label htmlFor={`notes-${order.id}`}>Staff notes</label>
			<textarea
				id={`notes-${order.id}`}
				className="textarea"
				rows={3}
				maxLength={1000}
				value={notes}
				onChange={(e) => setNotes(e.target.value)}
				placeholder="Only visible to staff (e.g. “Called customer, will be 10 min late”)"
			/>
			{dirty && (
				<div className="row">
					<button type="button" className="btn btn-sm btn-primary" onClick={save} disabled={saving}>
						{saving ? "Saving…" : "Save notes"}
					</button>
					<button
						type="button"
						className="btn btn-sm btn-ghost"
						onClick={() => setNotes(order.admin_notes || "")}
						disabled={saving}
					>
						Discard
					</button>
				</div>
			)}
		</div>
	);
}

// Full order view. `onUpdated(order)` lets the opener refresh its own copy.
export default function OrderDetail({ order: initial, onClose, onUpdated }) {
	const { updateOrder, printOrder } = useAdmin();
	const [order, setOrder] = useState(initial);
	const [mode, setMode] = useState("view");
	const [busy, setBusy] = useState(false);

	useEffect(() => {
		let cancelled = false;
		api.get(`/admin/orders/${initial.id}`)
			.then((fresh) => !cancelled && setOrder(fresh))
			.catch(() => {});
		return () => {
			cancelled = true;
		};
	}, [initial.id]);

	const changed = (updated) => {
		setOrder(updated);
		onUpdated?.(updated);
	};

	const setStatus = async (status) => {
		if (status === order.status) return;
		if (status === "cancelled") {
			setMode("cancel");
			return;
		}
		setBusy(true);
		try {
			changed(await updateOrder(order, { status }));
			toast.success(`Order #${order.number} → ${STATUS_LABELS[status]}`);
		} catch (e) {
			toast.error(e.message);
		} finally {
			setBusy(false);
		}
	};

	const next = NEXT_STATUS[order.status];
	const due = amountDue(order);

	let content;
	if (mode === "cancel") {
		content = (
			<CancelForm
				order={order}
				onBack={() => setMode("view")}
				onDone={(u) => {
					changed(u);
					setMode("view");
				}}
			/>
		);
	} else if (mode === "refund") {
		content = (
			<RefundConfirm
				order={order}
				onBack={() => setMode("view")}
				onDone={(u) => {
					changed(u);
					setMode("view");
				}}
			/>
		);
	} else {
		content = (
			<>
				<div className="modal-body adm-detail">
					<div className="adm-detail-head">
						<h2 className="adm-modal-title">Order #{order.number}</h2>
						<div className="row">
							<StatusBadge status={order.status} />
							<PaymentBadge order={order} />
						</div>
					</div>

					<div className="adm-detail-grid">
						<div>
							<div className="adm-kicker">Customer</div>
							<div className="adm-strong">{order.customer_name}</div>
							{order.customer_phone && (
								<div>
									<a href={telHref(order.customer_phone)}>{order.customer_phone}</a>
								</div>
							)}
							{order.customer_email && (
								<div className="adm-break">
									<a href={`mailto:${order.customer_email}`}>{order.customer_email}</a>
								</div>
							)}
							{order.user_id ? (
								<div className="muted small">Has an account</div>
							) : (
								<div className="muted small">Guest checkout</div>
							)}
						</div>
						<div>
							<div className="adm-kicker">Pickup</div>
							<div className="adm-strong">{pickupLabel(order)}</div>
							<div className="muted small">Placed {formatDateTime(placedAt(order))}</div>
							<div className="muted small">{PAYMENT_LABELS[order.payment_method]}</div>
						</div>
					</div>

					<table className="adm-items-table">
						<thead>
							<tr>
								<th scope="col">Qty</th>
								<th scope="col">Item</th>
								<th scope="col" className="num">
									Each
								</th>
								<th scope="col" className="num">
									Total
								</th>
							</tr>
						</thead>
						<tbody>
							{order.items.map((item) => (
								<tr key={item.id}>
									<td className="adm-qty">{item.quantity}×</td>
									<td>
										{item.name}
										{item.special_request && <div className="adm-special">{item.special_request}</div>}
									</td>
									<td className="num">{money(item.unit_price)}</td>
									<td className="num">{money(item.line_total)}</td>
								</tr>
							))}
						</tbody>
					</table>

					{order.custom_request && (
						<div className="adm-request">
							<strong>Order note:</strong> {order.custom_request}
						</div>
					)}

					<div className="adm-summary">
						<div className="summary-row">
							<span>Subtotal</span>
							<span>{money(order.subtotal)}</span>
						</div>
						<div className="summary-row">
							<span>Tax</span>
							<span>{money(order.tax)}</span>
						</div>
						<div className="summary-row">
							<span>Tip</span>
							<span>{money(order.tip)}</span>
						</div>
						<div className="summary-row total">
							<span>Total</span>
							<span>{money(order.total)}</span>
						</div>
						{due > 0 && order.status !== "cancelled" && (
							<div className="summary-row adm-due">
								<span>Due at pickup</span>
								<span>{money(due)}</span>
							</div>
						)}
					</div>

					<Timeline order={order} />

					<div className="adm-detail-controls">
						<div className="field">
							<label htmlFor={`status-${order.id}`}>Status</label>
							<select
								id={`status-${order.id}`}
								className="select"
								value={order.status}
								disabled={busy}
								onChange={(e) => setStatus(e.target.value)}
							>
								{order.status === "awaiting_payment" && (
									<option value="awaiting_payment">{STATUS_LABELS.awaiting_payment}</option>
								)}
								{["new", "preparing", "ready", "completed", "cancelled"].map((s) => (
									<option
										key={s}
										value={s}
										disabled={order.status === "awaiting_payment" && s !== "cancelled"}
									>
										{STATUS_LABELS[s]}
									</option>
								))}
							</select>
						</div>
						<NotesEditor order={order} onSaved={changed} />
					</div>
				</div>
				<div className="modal-footer adm-footer-wrap">
					<button type="button" className="btn btn-secondary" onClick={() => printOrder(order)}>
						<FontAwesomeIcon icon={faPrint} />
						Print
					</button>
					{order.status !== "cancelled" && (
						<button type="button" className="btn btn-ghost adm-text-danger" onClick={() => setMode("cancel")}>
							<FontAwesomeIcon icon={faBan} />
							Cancel
						</button>
					)}
					{canRefund(order) && (
						<button type="button" className="btn btn-ghost adm-text-danger" onClick={() => setMode("refund")}>
							<FontAwesomeIcon icon={faRotateLeft} />
							Refund
						</button>
					)}
					<span className="spacer" />
					{next && (
						<button type="button" className="btn btn-primary" onClick={() => setStatus(next)} disabled={busy}>
							{nextActionLabel(order)}
						</button>
					)}
				</div>
			</>
		);
	}

	return (
		<Modal onClose={onClose} label={`Order ${order.number}`} className="adm-modal-lg">
			{content}
		</Modal>
	);
}
