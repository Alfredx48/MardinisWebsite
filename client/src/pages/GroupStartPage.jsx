import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUserGroup } from "@fortawesome/free-solid-svg-icons";
import { api } from "../api";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { useRestaurant } from "../context/RestaurantContext";
import { Spinner } from "../components/ui";
import { dayLabel, shiftDate, todayInRestaurant, telHref } from "../format";
import { keyHeaders, saveKeys } from "../groupOrder";

const STEPS = [
	["Share a link", "Send it to your team by email or chat."],
	["Everyone adds their own", "Each person picks their food. Their name goes on every item."],
	["You check out once", "Pay for everything together, by card or at pickup."],
];

// Starts a group order: the organizer's details, an optional deadline and
// per-person limit. No account needed.
export default function GroupStartPage() {
	const { restaurant } = useRestaurant();
	const { user } = useAuth();
	const { items: bag, clear } = useCart();
	const navigate = useNavigate();
	const [form, setForm] = useState({ name: "", email: "", phone: "", note: "", limit: "" });
	const [hasDeadline, setHasDeadline] = useState(false);
	const [deadlineDay, setDeadlineDay] = useState(todayInRestaurant());
	const [deadlineTime, setDeadlineTime] = useState("11:00");
	const [moveBag, setMoveBag] = useState(true);
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState(null);

	useEffect(() => {
		if (user) setForm((f) => ({ ...f, name: f.name || user.name, email: f.email || user.email, phone: f.phone || user.phone || "" }));
	}, [user]);

	if (!restaurant) return <Spinner />;
	const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });
	const days = [0, 1, 2].map((n) => shiftDate(todayInRestaurant(), n));
	const bagItems = bag.filter((l) => !l.unavailable);

	const submit = async (e) => {
		e.preventDefault();
		setBusy(true);
		setError(null);
		try {
			const result = await api.post("/group_orders", {
				host_name: form.name,
				host_email: form.email,
				host_phone: form.phone,
				note: form.note,
				per_person_limit: form.limit,
				// Read in the restaurant's time zone by the server.
				deadline_at: hasDeadline ? `${deadlineDay} ${deadlineTime}` : "",
			});
			const token = result.group.token;
			const keys = saveKeys(token, { host: result.host_key, participant: result.participant_key });
			if (moveBag && bagItems.length) {
				for (const line of bagItems) {
					await api.post(
						`/group_orders/${token}/items`,
						{
							menu_item_id: line.menu_item_id,
							size: line.size,
							modifiers: line.modifiers || [],
							quantity: line.quantity,
							special_request: line.special_request,
						},
						keyHeaders(keys)
					);
				}
				clear();
			}
			navigate(`/group/${token}`, { state: { justStarted: true } });
		} catch (err) {
			setError(err.message);
			setBusy(false);
		}
	};

	if (!restaurant.accepting_orders) {
		return (
			<div className="container page narrow">
				<div className="notice">
					Online ordering is paused right now. Call <a href={telHref(restaurant.phone)}>{restaurant.phone}</a> to order for
					your group.
				</div>
			</div>
		);
	}

	return (
		<div className="container page group-start">
			<div className="page-header">
				<span className="eyebrow">Group order</span>
				<h1>Order for the whole team</h1>
				<p className="muted">One link for everyone, one order for the kitchen, one payment.</p>
			</div>

			<ol className="group-steps">
				{STEPS.map(([title, text], i) => (
					<li key={title}>
						<span className="group-step-num">{i + 1}</span>
						<strong>{title}</strong>
						<span className="muted small">{text}</span>
					</li>
				))}
			</ol>

			<form className="card stack group-start-form" onSubmit={submit}>
				<h2 className="card-title">
					<FontAwesomeIcon icon={faUserGroup} /> About you, the organizer
				</h2>
				<div className="grid-2">
					<div className="field">
						<label htmlFor="g-name">Your name</label>
						<input id="g-name" className="input" required maxLength={40} autoComplete="name" value={form.name} onChange={set("name")} />
					</div>
					<div className="field">
						<label htmlFor="g-email">Email</label>
						<input id="g-email" className="input" type="email" required autoComplete="email" value={form.email} onChange={set("email")} />
						<span className="hint">We'll email you your organizer link</span>
					</div>
				</div>
				<div className="grid-2">
					<div className="field">
						<label htmlFor="g-phone">Phone (optional)</label>
						<input id="g-phone" className="input" type="tel" autoComplete="tel" value={form.phone} onChange={set("phone")} />
					</div>
					<div className="field">
						<label htmlFor="g-note">What's it for? (optional)</label>
						<input id="g-note" className="input" maxLength={60} placeholder="e.g. Friday team lunch" value={form.note} onChange={set("note")} />
					</div>
				</div>

				<fieldset className="field group-fieldset">
					<legend className="label">Deadline for orders</legend>
					<div className="segmented">
						<button type="button" aria-pressed={!hasDeadline} onClick={() => setHasDeadline(false)}>
							No deadline
						</button>
						<button type="button" aria-pressed={hasDeadline} onClick={() => setHasDeadline(true)}>
							Set a time
						</button>
					</div>
					{hasDeadline && (
						<div className="grid-2 group-deadline">
							<select className="select" aria-label="Deadline day" value={deadlineDay} onChange={(e) => setDeadlineDay(e.target.value)}>
								{days.map((d) => (
									<option key={d} value={d}>
										{dayLabel(d)}
									</option>
								))}
							</select>
							<input className="input" type="time" aria-label="Deadline time" required value={deadlineTime} step={900}
								onChange={(e) => setDeadlineTime(e.target.value)} />
						</div>
					)}
					<span className="hint">After the deadline, people can't add or change items. You can still check out.</span>
				</fieldset>

				<div className="field group-limit">
					<label htmlFor="g-limit">Spending limit per person (optional)</label>
					<div className="input-prefix">
						<span>$</span>
						<input id="g-limit" className="input" type="number" min="1" max="999" step="1" inputMode="decimal"
							placeholder="No limit" value={form.limit} onChange={set("limit")} />
					</div>
					<span className="hint">Before tax. You, the organizer, have no limit.</span>
				</div>

				{bagItems.length > 0 && (
					<label className="checkbox">
						<input type="checkbox" checked={moveBag} onChange={(e) => setMoveBag(e.target.checked)} />
						<span>
							Add the {bagItems.reduce((n, l) => n + l.quantity, 0)} item(s) in my bag as my order
						</span>
					</label>
				)}

				{error && (
					<div className="form-error" role="alert">
						{error}
					</div>
				)}
				<button className="btn btn-primary btn-lg btn-block" disabled={busy}>
					{busy ? "Starting…" : "Start group order"}
				</button>
				<p className="small muted">
					No account needed. <Link to="/policies">Ordering &amp; refund policy</Link>
				</p>
			</form>
		</div>
	);
}
