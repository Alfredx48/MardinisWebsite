import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-toastify";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBullhorn, faCircleExclamation, faCopy } from "@fortawesome/free-solid-svg-icons";
import { DAYS } from "../format";
import { Spinner, Switch } from "../components/ui";
import { useAdmin } from "./AdminContext";
import { FormErrors, PageHeader } from "./adminUi";
import { errorList } from "./adminUtils";

const TEXT_FIELDS = [
	"name",
	"tagline",
	"phone",
	"email",
	"address",
	"description",
	"announcement",
	"hero_image",
	"logo_image",
];

function toForm(s) {
	const form = {};
	TEXT_FIELDS.forEach((key) => {
		form[key] = s[key] || "";
	});
	form.prep_time_minutes = String(s.prep_time_minutes ?? "");
	form.tax_percent = String(parseFloat(((Number(s.tax_rate) || 0) * 100).toFixed(4)));
	form.card_payments_enabled = !!s.card_payments_enabled;
	form.pay_in_store_enabled = !!s.pay_in_store_enabled;
	form.tips_enabled = !!s.tips_enabled;
	form.hours = {};
	DAYS.forEach(([key]) => {
		const h = (s.hours || {})[key] || {};
		form.hours[key] = { open: h.open || "09:00", close: h.close || "21:00", closed: !!h.closed };
	});
	return form;
}

function toPayload(form) {
	const payload = {};
	TEXT_FIELDS.forEach((key) => {
		payload[key] = form[key].trim();
	});
	payload.prep_time_minutes = form.prep_time_minutes === "" ? null : Number(form.prep_time_minutes);
	payload.tax_rate = form.tax_percent === "" ? null : Number((Number(form.tax_percent) / 100).toFixed(6));
	payload.card_payments_enabled = form.card_payments_enabled;
	payload.pay_in_store_enabled = form.pay_in_store_enabled;
	payload.tips_enabled = form.tips_enabled;
	payload.hours = form.hours;
	return payload;
}

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

function ToggleRow({ id, title, children, checked, onChange, disabled }) {
	return (
		<div className={`adm-toggle-row${disabled ? " is-disabled" : ""}`}>
			<div>
				<div className="adm-strong" id={`${id}-label`}>
					{title}
				</div>
				<div className="muted small">{children}</div>
			</div>
			<Switch checked={checked} onChange={onChange} disabled={disabled} label={title} />
		</div>
	);
}

function ImageField({ id, label, value, onChange, hint }) {
	const [failed, setFailed] = useState(false);
	useEffect(() => setFailed(false), [value]);
	const url = value.trim();
	return (
		<div className="field">
			<label htmlFor={id}>{label}</label>
			<input id={id} className="input" type="url" placeholder="https://…" value={value} onChange={onChange} />
			{hint && <span className="hint">{hint}</span>}
			{/^https?:\/\/\S+$/.test(url) && (
				<div className="adm-settings-img">
					{failed ? (
						<span className="muted small">Couldn't load this image. Check the link.</span>
					) : (
						<img src={url} alt={`${label} preview`} onError={() => setFailed(true)} />
					)}
				</div>
			)}
		</div>
	);
}

function OrderingSwitch() {
	const { settings, saveSettings } = useAdmin();
	const [busy, setBusy] = useState(false);
	const on = settings.accepting_orders;

	const toggle = async (value) => {
		setBusy(true);
		try {
			await saveSettings({ accepting_orders: value });
			toast.success(value ? "Online ordering is on" : "Online ordering paused");
		} catch (e) {
			toast.error(e.message);
		} finally {
			setBusy(false);
		}
	};

	return (
		<div className={`adm-ordering${on ? " is-on" : " is-off"}`}>
			<div>
				<div className="adm-ordering-title">{on ? "Taking online orders" : "Online ordering is paused"}</div>
				<p className="small">
					{on
						? "Customers can order for pickup during your opening hours. Pause this if the kitchen is slammed or you need to close early."
						: "Customers can still see the menu, but checkout is turned off until you switch this back on."}
				</p>
				<p className="small muted">This switch takes effect immediately.</p>
			</div>
			<button
				type="button"
				role="switch"
				aria-checked={on}
				className={`adm-big-switch${on ? " is-on" : ""}`}
				onClick={() => toggle(!on)}
				disabled={busy}
			>
				<span className="adm-big-switch-track" aria-hidden="true" />
				<span>{busy ? "Saving…" : on ? "On" : "Paused"}</span>
			</button>
		</div>
	);
}

export default function Settings() {
	const { settings, saveSettings } = useAdmin();
	const baseline = useMemo(() => settings && toForm(settings), [settings]);
	const [form, setForm] = useState(null);
	const [saving, setSaving] = useState(false);
	const [errors, setErrors] = useState(null);
	const previousBaseline = useRef(null);

	// Pick up outside changes (e.g. the "Resume" button) unless there are unsaved edits.
	useEffect(() => {
		if (!baseline) return;
		setForm((f) => (!f || same(f, previousBaseline.current) ? baseline : f));
		previousBaseline.current = baseline;
	}, [baseline]);

	const dirty = !!form && !!baseline && !same(form, baseline);

	useEffect(() => {
		if (!dirty) return undefined;
		const warn = (e) => {
			e.preventDefault();
			e.returnValue = "";
		};
		window.addEventListener("beforeunload", warn);
		return () => window.removeEventListener("beforeunload", warn);
	}, [dirty]);

	if (!settings || !form) return <Spinner label="Loading settings" />;

	const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
	const setBool = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));
	const setDay = (day, changes) =>
		setForm((f) => ({ ...f, hours: { ...f.hours, [day]: { ...f.hours[day], ...changes } } }));
	const copyMonday = () =>
		setForm((f) => {
			const hours = {};
			DAYS.forEach(([key]) => {
				hours[key] = { ...f.hours.mon };
			});
			return { ...f, hours };
		});

	const save = async (e) => {
		e?.preventDefault();
		setSaving(true);
		setErrors(null);
		try {
			const updated = await saveSettings(toPayload(form));
			setForm(toForm(updated));
			toast.success("Settings saved");
		} catch (err) {
			setErrors(errorList(err));
			toast.error("Couldn't save — see the message at the bottom");
		} finally {
			setSaving(false);
		}
	};

	const discard = () => {
		setForm(baseline);
		setErrors(null);
	};

	const cardAvailable = settings.stripe_configured && form.card_payments_enabled;
	const noPayments = !cardAvailable && !form.pay_in_store_enabled;

	return (
		<form className={`adm-page adm-settings${dirty ? " is-dirty" : ""}`} onSubmit={save} noValidate>
			<PageHeader title="Settings" subtitle="Changes appear on the website as soon as you save." />

			<section className="card adm-card" aria-labelledby="set-ordering">
				<h2 className="adm-card-title" id="set-ordering">
					Online ordering
				</h2>
				<OrderingSwitch />

				<div className="adm-settings-rows">
					<div className="field adm-field-narrow">
						<label htmlFor="set-prep">Prep time (minutes)</label>
						<input
							id="set-prep"
							className="input"
							type="number"
							inputMode="numeric"
							min="0"
							max="240"
							step="1"
							value={form.prep_time_minutes}
							onChange={set("prep_time_minutes")}
						/>
						<span className="hint">Earliest pickup is this many minutes after ordering. Raise it when you're busy.</span>
					</div>

					<ToggleRow
						id="set-card"
						title="Card payments online"
						checked={form.card_payments_enabled && settings.stripe_configured}
						onChange={setBool("card_payments_enabled")}
						disabled={!settings.stripe_configured}
					>
						{settings.stripe_configured
							? "Customers pay by card at checkout (through Stripe)."
							: "Not set up yet. Add STRIPE_SECRET_KEY and STRIPE_PUBLISHABLE_KEY to the server's environment to enable."}
					</ToggleRow>
					<ToggleRow
						id="set-instore"
						title="Pay in store"
						checked={form.pay_in_store_enabled}
						onChange={setBool("pay_in_store_enabled")}
					>
						Customers order online and pay when they pick up.
					</ToggleRow>
					<ToggleRow id="set-tips" title="Tips" checked={form.tips_enabled} onChange={setBool("tips_enabled")}>
						Show tip options at checkout.
					</ToggleRow>
					{noPayments && (
						<div className="notice" role="alert">
							<FontAwesomeIcon icon={faCircleExclamation} />
							<span>
								No payment method is turned on, so customers won't be able to check out. Turn on at least one.
							</span>
						</div>
					)}
				</div>
			</section>

			<section className="card adm-card" aria-labelledby="set-banner">
				<h2 className="adm-card-title" id="set-banner">
					Announcement banner
				</h2>
				<div className="field">
					<label htmlFor="set-announcement">Message at the top of the website</label>
					<input
						id="set-announcement"
						className="input"
						maxLength={200}
						placeholder="e.g. Closed Thanksgiving Day — happy holidays!"
						value={form.announcement}
						onChange={set("announcement")}
					/>
					<span className="hint">Leave empty to hide the banner.</span>
				</div>
				<div className="adm-banner-preview" aria-label="Preview">
					<span className="adm-kicker">Preview</span>
					{form.announcement.trim() ? (
						<div className="adm-banner-sample">
							<FontAwesomeIcon icon={faBullhorn} /> {form.announcement.trim()}
						</div>
					) : (
						<div className="muted small">No banner will be shown.</div>
					)}
				</div>
			</section>

			<section className="card adm-card" aria-labelledby="set-hours">
				<div className="row adm-card-head">
					<h2 className="adm-card-title" id="set-hours">
						Opening hours
					</h2>
					<span className="spacer" />
					<button type="button" className="btn btn-sm btn-secondary" onClick={copyMonday}>
						<FontAwesomeIcon icon={faCopy} /> Copy Monday to all days
					</button>
				</div>
				<p className="muted small">Online pickup times are offered only during these hours.</p>
				<div className="adm-hours">
					{DAYS.map(([key, name]) => {
						const day = form.hours[key];
						const overnight = !day.closed && day.open && day.close && day.close <= day.open;
						return (
							<fieldset key={key} className={`adm-hours-row${day.closed ? " is-closed" : ""}`}>
								<legend className="adm-hours-day">{name}</legend>
								<div className="adm-hours-times">
									<label className="sr-only" htmlFor={`open-${key}`}>
										{name} opens
									</label>
									<input
										id={`open-${key}`}
										className="input"
										type="time"
										step="900"
										value={day.open}
										disabled={day.closed}
										onChange={(e) => setDay(key, { open: e.target.value })}
									/>
									<span className="muted" aria-hidden="true">
										to
									</span>
									<label className="sr-only" htmlFor={`close-${key}`}>
										{name} closes
									</label>
									<input
										id={`close-${key}`}
										className="input"
										type="time"
										step="900"
										value={day.close}
										disabled={day.closed}
										onChange={(e) => setDay(key, { close: e.target.value })}
									/>
								</div>
								<label className="checkbox adm-hours-closed">
									<input
										type="checkbox"
										checked={day.closed}
										onChange={(e) => setDay(key, { closed: e.target.checked })}
									/>
									Closed
								</label>
								{overnight && <span className="adm-hours-note small">Closes after midnight</span>}
							</fieldset>
						);
					})}
				</div>
			</section>

			<section className="card adm-card" aria-labelledby="set-tax">
				<h2 className="adm-card-title" id="set-tax">
					Sales tax
				</h2>
				<div className="field adm-field-narrow">
					<label htmlFor="set-tax-rate">Tax rate (%)</label>
					<div className="adm-input-suffix">
						<input
							id="set-tax-rate"
							className="input"
							type="number"
							inputMode="decimal"
							min="0"
							max="24.99"
							step="0.001"
							value={form.tax_percent}
							onChange={set("tax_percent")}
						/>
						<span aria-hidden="true">%</span>
					</div>
					<span className="hint">Enter a percentage, e.g. 9.375. Applied to every order subtotal.</span>
				</div>
			</section>

			<section className="card adm-card" aria-labelledby="set-info">
				<h2 className="adm-card-title" id="set-info">
					Restaurant info
				</h2>
				<div className="adm-form">
					<div className="grid-2">
						<div className="field">
							<label htmlFor="set-name">Restaurant name</label>
							<input id="set-name" className="input" value={form.name} onChange={set("name")} required />
						</div>
						<div className="field">
							<label htmlFor="set-tagline">Tagline</label>
							<input id="set-tagline" className="input" value={form.tagline} onChange={set("tagline")} />
						</div>
						<div className="field">
							<label htmlFor="set-phone">Phone</label>
							<input id="set-phone" className="input" type="tel" value={form.phone} onChange={set("phone")} />
						</div>
						<div className="field">
							<label htmlFor="set-email">Email</label>
							<input id="set-email" className="input" type="email" value={form.email} onChange={set("email")} />
						</div>
					</div>
					<div className="field">
						<label htmlFor="set-address">Address</label>
						<input id="set-address" className="input" value={form.address} onChange={set("address")} />
					</div>
					<div className="field">
						<label htmlFor="set-description">About the restaurant</label>
						<textarea
							id="set-description"
							className="textarea"
							rows={4}
							value={form.description}
							onChange={set("description")}
						/>
					</div>
					<div className="grid-2">
						<ImageField
							id="set-hero"
							label="Home page photo"
							value={form.hero_image}
							onChange={set("hero_image")}
							hint="A wide photo works best."
						/>
						<ImageField
							id="set-logo"
							label="Logo"
							value={form.logo_image}
							onChange={set("logo_image")}
							hint="Optional. Leave empty to show the name in text."
						/>
					</div>
				</div>
			</section>

			{(dirty || errors) && (
				<div className="adm-savebar" role="region" aria-label="Unsaved changes">
					<div className="adm-savebar-inner">
						{errors ? <FormErrors errors={errors} /> : <span className="adm-strong">You have unsaved changes</span>}
						<span className="spacer" />
						<button type="button" className="btn btn-ghost" onClick={discard} disabled={saving || !dirty}>
							Discard
						</button>
						<button type="submit" className="btn btn-primary" disabled={saving || !dirty}>
							{saving ? "Saving…" : "Save changes"}
						</button>
					</div>
				</div>
			)}
		</form>
	);
}
