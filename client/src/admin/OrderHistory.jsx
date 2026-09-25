import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronLeft, faChevronRight, faFileArrowDown, faMagnifyingGlass, faReceipt } from "@fortawesome/free-solid-svg-icons";
import { api, queryString } from "../api";
import { formatDateTime, money, shiftDate, todayInRestaurant } from "../format";
import { EmptyState, Spinner } from "../components/ui";
import OrderDetail, { pickupLabel } from "./OrderDetail";
import { PageHeader, PaymentBadge, StatusBadge, useDebounced } from "./adminUi";
import { PAYMENT_LABELS, STATUS_LABELS, downloadFile, placedAt, toCsv } from "./adminUtils";

const EXPORT_CAP = 1000;

function presets() {
	const today = todayInRestaurant();
	return [
		{ key: "today", label: "Today", from: today, to: today },
		{ key: "7", label: "7 days", from: shiftDate(today, -6), to: today },
		{ key: "30", label: "30 days", from: shiftDate(today, -29), to: today },
		{ key: "all", label: "All time", from: "", to: "" },
	];
}

function apiParams(filters, page) {
	return {
		q: filters.q,
		status: filters.status,
		payment_method: filters.payment_method,
		from: filters.from,
		to: filters.to,
		include_unpaid: filters.status === "awaiting_payment" ? "true" : undefined,
		page,
	};
}

function csvFor(orders) {
	const header = [
		"Order #",
		"Placed",
		"Status",
		"Customer",
		"Phone",
		"Email",
		"Pickup",
		"Payment method",
		"Payment status",
		"Items",
		"Subtotal",
		"Tax",
		"Tip",
		"Total",
		"Refunded",
		"Customer note",
		"Cancel reason",
		"Staff notes",
	];
	const rows = orders.map((o) => [
		o.number,
		formatDateTime(placedAt(o)),
		STATUS_LABELS[o.status] || o.status,
		o.customer_name,
		o.customer_phone,
		o.customer_email,
		pickupLabel(o),
		PAYMENT_LABELS[o.payment_method] || o.payment_method,
		o.payment_status,
		o.items.map((i) => `${i.quantity}x ${i.name}${i.special_request ? ` (${i.special_request})` : ""}`).join("; "),
		o.subtotal,
		o.tax,
		o.tip,
		o.total,
		o.refunded_amount,
		o.custom_request,
		o.cancel_reason,
		o.admin_notes,
	]);
	return toCsv([header, ...rows]);
}

export default function OrderHistory() {
	const [params, setParams] = useSearchParams();
	const today = todayInRestaurant();
	const filters = {
		q: params.get("q") || "",
		status: params.get("status") || "",
		payment_method: params.get("payment") || "",
		from: params.has("from") ? params.get("from") : shiftDate(today, -6),
		to: params.has("to") ? params.get("to") : today,
	};
	const page = Math.max(1, Number(params.get("page")) || 1);

	const [qInput, setQInput] = useState(filters.q);
	const debouncedQ = useDebounced(qInput, 350);
	const [data, setData] = useState(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [detail, setDetail] = useState(null);
	const [exporting, setExporting] = useState(false);

	const update = useCallback(
		(changes) => {
			setParams(
				(prev) => {
					const next = new URLSearchParams(prev);
					Object.entries(changes).forEach(([key, value]) => next.set(key, value));
					if (!("page" in changes)) next.delete("page");
					["q", "status", "payment", "page"].forEach((key) => next.get(key) === "" && next.delete(key));
					return next;
				},
				{ replace: true }
			);
		},
		[setParams]
	);

	useEffect(() => {
		if (debouncedQ !== filters.q) update({ q: debouncedQ });
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [debouncedQ]);

	const key = queryString(apiParams(filters, page));
	useEffect(() => {
		let cancelled = false;
		setLoading(true);
		api.get(`/admin/orders${key}`)
			.then((d) => {
				if (cancelled) return;
				setData(d);
				setError(null);
			})
			.catch((e) => !cancelled && setError(e))
			.finally(() => !cancelled && setLoading(false));
		return () => {
			cancelled = true;
		};
	}, [key]);

	const replaceOrder = (updated) => {
		setData((d) => d && { ...d, orders: d.orders.map((o) => (o.id === updated.id ? updated : o)) });
	};

	const exportCsv = async () => {
		setExporting(true);
		try {
			const all = [];
			let p = 1;
			let totalPages = 1;
			do {
				const d = await api.get(`/admin/orders${queryString(apiParams(filters, p))}`);
				all.push(...d.orders);
				totalPages = d.total_pages;
				p += 1;
			} while (p <= totalPages && all.length < EXPORT_CAP);
			const rows = all.slice(0, EXPORT_CAP);
			const range = filters.from || filters.to ? `${filters.from || "start"}_to_${filters.to || today}` : "all";
			downloadFile(`mardinis-orders-${range}.csv`, csvFor(rows));
			toast.success(
				data && data.total_count > EXPORT_CAP
					? `Exported the ${EXPORT_CAP} most recent orders (narrow the dates for the rest)`
					: `Exported ${rows.length} orders`
			);
		} catch (e) {
			toast.error(e.message);
		} finally {
			setExporting(false);
		}
	};

	const activePreset = presets().find((p) => p.from === filters.from && p.to === filters.to)?.key;
	const orders = data?.orders || [];

	return (
		<div className="adm-page">
			<PageHeader
				title="Order history"
				subtitle={data ? `${data.total_count} ${data.total_count === 1 ? "order" : "orders"} match` : " "}
			>
				<button
					type="button"
					className="btn btn-secondary"
					onClick={exportCsv}
					disabled={exporting || !data || data.total_count === 0}
				>
					<FontAwesomeIcon icon={faFileArrowDown} />
					{exporting ? "Exporting…" : "Export CSV"}
				</button>
			</PageHeader>

			<div className="card adm-filters">
				<div className="adm-search">
					<FontAwesomeIcon icon={faMagnifyingGlass} aria-hidden="true" />
					<label className="sr-only" htmlFor="history-q">
						Search orders
					</label>
					<input
						id="history-q"
						className="input"
						type="search"
						placeholder="Name, phone, email or order #"
						value={qInput}
						onChange={(e) => setQInput(e.target.value)}
					/>
				</div>
				<div className="adm-filter-row">
					<div className="field">
						<label htmlFor="history-status">Status</label>
						<select
							id="history-status"
							className="select"
							value={filters.status}
							onChange={(e) => update({ status: e.target.value })}
						>
							<option value="">All statuses</option>
							{Object.entries(STATUS_LABELS).map(([value, label]) => (
								<option key={value} value={value}>
									{label}
								</option>
							))}
						</select>
					</div>
					<div className="field">
						<label htmlFor="history-payment">Payment</label>
						<select
							id="history-payment"
							className="select"
							value={filters.payment_method}
							onChange={(e) => update({ payment: e.target.value })}
						>
							<option value="">All payments</option>
							{Object.entries(PAYMENT_LABELS).map(([value, label]) => (
								<option key={value} value={value}>
									{label}
								</option>
							))}
						</select>
					</div>
					<div className="field">
						<label htmlFor="history-from">From</label>
						<input
							id="history-from"
							className="input"
							type="date"
							value={filters.from}
							max={filters.to || undefined}
							onChange={(e) => update({ from: e.target.value })}
						/>
					</div>
					<div className="field">
						<label htmlFor="history-to">To</label>
						<input
							id="history-to"
							className="input"
							type="date"
							value={filters.to}
							min={filters.from || undefined}
							onChange={(e) => update({ to: e.target.value })}
						/>
					</div>
				</div>
				<div className="adm-chips" role="group" aria-label="Date range">
					{presets().map((p) => (
						<button
							type="button"
							key={p.key}
							className="adm-chip"
							aria-pressed={activePreset === p.key}
							onClick={() => update({ from: p.from, to: p.to })}
						>
							{p.label}
						</button>
					))}
				</div>
			</div>

			{error && !loading ? (
				<EmptyState title="Couldn't load orders">
					<p>{error.message}</p>
				</EmptyState>
			) : !data ? (
				<Spinner label="Loading orders" />
			) : orders.length === 0 ? (
				<EmptyState icon={faReceipt} title="No orders found">
					<p>Try a different search or a wider date range.</p>
				</EmptyState>
			) : (
				<div className={`adm-results${loading ? " is-loading" : ""}`} aria-busy={loading}>
					<div className="card adm-table-card">
						<table className="adm-table adm-hide-mobile">
							<thead>
								<tr>
									<th scope="col">Order</th>
									<th scope="col">Placed</th>
									<th scope="col">Customer</th>
									<th scope="col">Items</th>
									<th scope="col">Status</th>
									<th scope="col">Payment</th>
									<th scope="col" className="num">
										Total
									</th>
								</tr>
							</thead>
							<tbody>
								{orders.map((o) => (
									<tr
										key={o.id}
										className="adm-row-click"
										onClick={() => setDetail(o)}
									>
										<td>
											<button
												type="button"
												className="adm-row-link"
												onClick={(e) => {
													e.stopPropagation();
													setDetail(o);
												}}
											>
												#{o.number}
											</button>
										</td>
										<td className="adm-nowrap">{formatDateTime(placedAt(o))}</td>
										<td>
											<div className="adm-strong">{o.customer_name}</div>
											<div className="muted small">{o.customer_phone}</div>
										</td>
										<td>{o.total_items}</td>
										<td>
											<StatusBadge status={o.status} />
										</td>
										<td>
											<PaymentBadge order={o} />
										</td>
										<td className="num money adm-strong">{money(o.total)}</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>

					<ul className="adm-cards adm-show-mobile">
						{orders.map((o) => (
							<li key={o.id}>
								<button type="button" className="adm-order-card" onClick={() => setDetail(o)}>
									<div className="row">
										<span className="adm-strong">#{o.number}</span>
										<span className="adm-strong">{o.customer_name}</span>
										<span className="spacer" />
										<span className="money adm-strong">{money(o.total)}</span>
									</div>
									<div className="muted small">
										{formatDateTime(placedAt(o))} · {o.total_items} {o.total_items === 1 ? "item" : "items"}
									</div>
									<div className="row adm-gap-sm">
										<StatusBadge status={o.status} />
										<PaymentBadge order={o} />
									</div>
								</button>
							</li>
						))}
					</ul>

					{data.total_pages > 1 && (
						<nav className="adm-pager" aria-label="Pages">
							<button
								type="button"
								className="btn btn-secondary btn-sm"
								disabled={page <= 1 || loading}
								onClick={() => update({ page: String(page - 1) })}
							>
								<FontAwesomeIcon icon={faChevronLeft} /> Newer
							</button>
							<span className="muted small">
								Page {page} of {data.total_pages}
							</span>
							<button
								type="button"
								className="btn btn-secondary btn-sm"
								disabled={page >= data.total_pages || loading}
								onClick={() => update({ page: String(page + 1) })}
							>
								Older <FontAwesomeIcon icon={faChevronRight} />
							</button>
						</nav>
					)}
				</div>
			)}

			{detail && <OrderDetail order={detail} onClose={() => setDetail(null)} onUpdated={replaceOrder} />}
		</div>
	);
}
