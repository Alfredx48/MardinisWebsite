import { useCallback, useState } from "react";
import { Link } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowRight, faBellConcierge, faUtensils } from "@fortawesome/free-solid-svg-icons";
import { api } from "../api";
import { money, todayInRestaurant } from "../format";
import { EmptyState, Spinner } from "../components/ui";
import { PageHeader, usePolling } from "./adminUi";
import { plainDate } from "./adminUtils";

function StatTile({ label, value, sub, accent }) {
	return (
		<div className={`adm-stat${accent ? " is-accent" : ""}`}>
			<div className="adm-stat-label">{label}</div>
			<div className="adm-stat-value">{value}</div>
			{sub && <div className="adm-stat-sub">{sub}</div>}
		</div>
	);
}

function niceMax(value) {
	if (value <= 0) return 100;
	const magnitude = 10 ** Math.floor(Math.log10(value));
	const steps = [1, 2, 2.5, 5, 10];
	const step = steps.find((s) => s * magnitude >= value) || 10;
	return step * magnitude;
}

function shortMoney(value) {
	return value >= 1000 ? `$${(value / 1000).toFixed(value % 1000 === 0 ? 0 : 1)}k` : `$${Math.round(value)}`;
}

function RevenueChart({ trend }) {
	const [active, setActive] = useState(null);
	const today = todayInRestaurant();
	const max = niceMax(Math.max(...trend.map((d) => Number(d.revenue))));
	const ticks = [max, max / 2, 0];
	const shown = active !== null ? trend[active] : null;
	const total = trend.reduce((sum, d) => sum + Number(d.revenue), 0);

	return (
		<div className="adm-chart">
			<div className="adm-chart-head">
				<div>
					<h2 className="adm-card-title">Revenue, last 14 days</h2>
					<p className="muted small">{money(total)} total · hover or tap a bar for details</p>
				</div>
			</div>
			<div className="adm-chart-body" onMouseLeave={() => setActive(null)}>
				<div className="adm-chart-axis" aria-hidden="true">
					{ticks.map((t) => (
						<span key={t}>{shortMoney(t)}</span>
					))}
				</div>
				<div className="adm-chart-plot">
					<div className="adm-chart-grid" aria-hidden="true">
						<span />
						<span />
						<span />
					</div>
					<div className="adm-chart-bars">
						{trend.map((d, i) => {
							const pct = (Number(d.revenue) / max) * 100;
							const isToday = d.date === today;
							const label = `${plainDate(d.date, { year: undefined })}: ${money(d.revenue)}, ${d.orders} ${
								d.orders === 1 ? "order" : "orders"
							}`;
							return (
								<button
									type="button"
									key={d.date}
									className={`adm-bar${isToday ? " is-today" : ""}${active === i ? " is-active" : ""}`}
									onMouseEnter={() => setActive(i)}
									onFocus={() => setActive(i)}
									onBlur={() => setActive(null)}
									onClick={() => setActive(i)}
									aria-label={label}
								>
									<span className="adm-bar-fill" style={{ height: `${Math.max(pct, d.revenue > 0 ? 2 : 0)}%` }} />
									{active === i && (
										<span
											className={`adm-bar-tip${i > trend.length - 4 ? " is-left" : ""}${
												i < 3 ? " is-right" : ""
											}`}
											role="presentation"
										>
											<strong>{isToday ? "Today" : plainDate(shown.date, { year: undefined })}</strong>
											<span>{money(shown.revenue)}</span>
											<span className="muted">
												{shown.orders} {shown.orders === 1 ? "order" : "orders"}
											</span>
										</span>
									)}
								</button>
							);
						})}
					</div>
					<div className="adm-chart-labels" aria-hidden="true">
						{trend.map((d, i) => (
							<span key={d.date} className={d.date === today ? "is-today" : ""}>
								{d.date === today
									? "Today"
									: i % 2 === (trend.length - 1) % 2
									? plainDate(d.date, { weekday: undefined, year: undefined, month: "numeric" })
									: ""}
							</span>
						))}
					</div>
				</div>
			</div>
			<table className="sr-only">
				<caption>Daily revenue, last 14 days</caption>
				<thead>
					<tr>
						<th>Date</th>
						<th>Revenue</th>
						<th>Orders</th>
					</tr>
				</thead>
				<tbody>
					{trend.map((d) => (
						<tr key={d.date}>
							<td>{plainDate(d.date)}</td>
							<td>{money(d.revenue)}</td>
							<td>{d.orders}</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}

function TopSellers({ items }) {
	if (!items.length) {
		return <p className="muted">No sales in the last 30 days yet.</p>;
	}
	const maxQty = Math.max(...items.map((i) => i.quantity));
	return (
		<ol className="adm-top">
			{items.map((item, index) => (
				<li key={item.name || index}>
					<span className="adm-top-rank">{index + 1}</span>
					<div className="adm-top-main">
						<div className="adm-top-row">
							<span className="adm-top-name">{item.name || "Unnamed item"}</span>
							<span className="adm-top-sales money">{money(item.sales)}</span>
						</div>
						<div className="adm-top-bar" aria-hidden="true">
							<span style={{ width: `${(item.quantity / maxQty) * 100}%` }} />
						</div>
						<div className="muted small">{item.quantity} sold</div>
					</div>
				</li>
			))}
		</ol>
	);
}

function PaymentMix({ mix }) {
	const card = mix.card || 0;
	const inStore = mix.in_store || 0;
	const total = card + inStore;
	if (!total) return <p className="muted">No orders in the last 30 days yet.</p>;
	const pct = (n) => Math.round((n / total) * 100);
	const rows = [
		{ key: "card", label: "Card (online)", count: card, className: "is-card" },
		{ key: "in_store", label: "Pay in store", count: inStore, className: "is-store" },
	];
	return (
		<div>
			<div className="adm-mix-bar" aria-hidden="true">
				{rows.map(
					(r) =>
						r.count > 0 && (
							<span key={r.key} className={r.className} style={{ flexGrow: r.count }} title={`${r.label}: ${pct(r.count)}%`} />
						)
				)}
			</div>
			<ul className="adm-mix-legend">
				{rows.map((r) => (
					<li key={r.key}>
						<span className={`adm-swatch ${r.className}`} aria-hidden="true" />
						<span>{r.label}</span>
						<span className="spacer" />
						<strong>{pct(r.count)}%</strong>
						<span className="muted small">
							{r.count} {r.count === 1 ? "order" : "orders"}
						</span>
					</li>
				))}
			</ul>
		</div>
	);
}

export default function Dashboard() {
	const [stats, setStats] = useState(null);
	const [error, setError] = useState(null);

	const load = useCallback(async () => {
		try {
			setStats(await api.get("/admin/stats"));
			setError(null);
		} catch (e) {
			setError(e);
		}
	}, []);
	const reload = usePolling(load, 60000);

	if (!stats) {
		if (error) {
			return (
				<EmptyState title="Couldn't load the dashboard">
					<p>{error.message}</p>
					<button type="button" className="btn btn-secondary" onClick={reload}>
						Try again
					</button>
				</EmptyState>
			);
		}
		return <Spinner label="Loading dashboard" />;
	}

	const { today, last_30_days: month } = stats;

	return (
		<div className="adm-page">
			<PageHeader title="Dashboard" subtitle={plainDate(todayInRestaurant(), { month: "long", year: undefined })}>
				<Link to="/admin/orders" className="btn btn-primary">
					<FontAwesomeIcon icon={faBellConcierge} />
					Live orders
					{stats.new_orders > 0 && <span className="adm-btn-count">{stats.new_orders}</span>}
				</Link>
				<Link to="/admin/menu" className="btn btn-secondary">
					<FontAwesomeIcon icon={faUtensils} />
					Menu
				</Link>
			</PageHeader>

			<section className="adm-stats" aria-label="Today at a glance">
				<StatTile label="Today's revenue" value={money(today.revenue)} accent />
				<StatTile label="Today's orders" value={today.orders} />
				<StatTile label="Average order" value={money(today.average_order)} sub="today" />
				<StatTile label="Tips today" value={money(today.tips)} />
				<StatTile
					label="Active orders"
					value={stats.active_orders}
					sub={stats.new_orders ? `${stats.new_orders} waiting to start` : "in the kitchen"}
				/>
				<StatTile label="Last 30 days" value={money(month.revenue)} sub={`${month.orders} orders · avg ${money(month.average_order)}`} />
			</section>

			<section className="card adm-card">
				<RevenueChart trend={stats.trend} />
			</section>

			<div className="adm-grid-2">
				<section className="card adm-card">
					<div className="row adm-card-head">
						<h2 className="adm-card-title">Top sellers</h2>
						<span className="muted small">last 30 days</span>
					</div>
					<TopSellers items={stats.top_items} />
				</section>
				<div className="adm-stack">
					<section className="card adm-card">
						<div className="row adm-card-head">
							<h2 className="adm-card-title">How customers pay</h2>
							<span className="muted small">last 30 days</span>
						</div>
						<PaymentMix mix={stats.payment_mix || {}} />
					</section>
					<section className="card adm-card adm-quick">
						<h2 className="adm-card-title">Quick links</h2>
						<Link to="/admin/orders">
							Live orders <FontAwesomeIcon icon={faArrowRight} />
						</Link>
						<Link to="/admin/menu">
							Mark items sold out <FontAwesomeIcon icon={faArrowRight} />
						</Link>
						<Link to="/admin/catering">
							Catering requests <FontAwesomeIcon icon={faArrowRight} />
						</Link>
						<Link to="/admin/settings">
							Hours &amp; ordering settings <FontAwesomeIcon icon={faArrowRight} />
						</Link>
					</section>
				</div>
			</div>
		</div>
	);
}
