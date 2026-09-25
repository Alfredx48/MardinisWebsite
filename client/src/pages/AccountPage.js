import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { faReceipt } from "@fortawesome/free-solid-svg-icons";
import { api } from "../api";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { useRestaurant } from "../context/RestaurantContext";
import { EmptyState, Spinner } from "../components/ui";
import { formatDateTime, money, ORDER_STATUS_LABELS } from "../format";

const STATUS_BADGE = {
	new: "badge-info",
	preparing: "badge-warning",
	ready: "badge-success",
	completed: "",
	cancelled: "badge-danger",
};

export default function AccountPage() {
	const [tab, setTab] = useState("orders");
	return (
		<div className="container page narrow">
			<div className="page-header">
				<span className="eyebrow">Your account</span>
				<h1>{tab === "orders" ? "Your orders" : "Profile"}</h1>
			</div>
			<div className="auth-tabs account-tabs" role="tablist">
				<button role="tab" aria-selected={tab === "orders"} onClick={() => setTab("orders")}>
					Orders
				</button>
				<button role="tab" aria-selected={tab === "profile"} onClick={() => setTab("profile")}>
					Profile
				</button>
			</div>
			{tab === "orders" ? <OrderHistory /> : <ProfileForm />}
		</div>
	);
}

function OrderHistory() {
	const [orders, setOrders] = useState(null);
	const { menu } = useRestaurant();
	const { addItem, openDrawer } = useCart();

	useEffect(() => {
		api.get("/orders")
			.then(setOrders)
			.catch((e) => {
				toast.error(e.message);
				setOrders([]);
			});
	}, []);

	const reorder = (order) => {
		const index = {};
		(menu || []).forEach((c) => c.items.forEach((i) => (index[i.id] = i)));
		let skipped = 0;
		order.items.forEach((line) => {
			const item = index[line.menu_item_id];
			if (item && item.available) addItem(item, line.quantity, line.special_request || "");
			else skipped += 1;
		});
		if (skipped) toast.info(`${skipped} item${skipped > 1 ? "s are" : " is"} no longer available and was left out.`);
		openDrawer();
	};

	if (!orders) return <Spinner />;
	if (!orders.length) {
		return (
			<EmptyState icon={faReceipt} title="No orders yet">
				<Link to="/menu" className="btn btn-primary">
					Start an order
				</Link>
			</EmptyState>
		);
	}

	return (
		<ul className="order-history">
			{orders.map((o) => (
				<li key={o.id} className="card order-history-card">
					<div className="row">
						<strong>Order #{o.number}</strong>
						<span className={`badge ${STATUS_BADGE[o.status] || ""}`}>{ORDER_STATUS_LABELS[o.status]}</span>
						<span className="spacer" />
						<strong className="money">{money(o.total)}</strong>
					</div>
					<p className="small muted">{formatDateTime(o.placed_at || o.created_at)}</p>
					<p className="order-history-items">{o.items.map((i) => `${i.quantity} × ${i.name}`).join(", ")}</p>
					<div className="row">
						<Link to={`/order/${o.token}`} className="btn btn-secondary btn-sm">
							View details
						</Link>
						<button className="btn btn-ghost btn-sm" onClick={() => reorder(o)}>
							Order again
						</button>
					</div>
				</li>
			))}
		</ul>
	);
}

function ProfileForm() {
	const { user, updateProfile, logout } = useAuth();
	const navigate = useNavigate();
	const [form, setForm] = useState({
		name: user.name,
		email: user.email,
		phone: user.phone || "",
		password: "",
		password_confirmation: "",
		current_password: "",
	});
	const [errors, setErrors] = useState([]);
	const [saving, setSaving] = useState(false);

	const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });
	const needsCurrent = form.password || form.email.trim().toLowerCase() !== user.email;

	const submit = async (e) => {
		e.preventDefault();
		setErrors([]);
		if (form.password && form.password !== form.password_confirmation) return setErrors(["New passwords don't match."]);
		setSaving(true);
		try {
			await updateProfile(form);
			setForm((f) => ({ ...f, password: "", password_confirmation: "", current_password: "" }));
			toast.success("Profile saved");
		} catch (err) {
			setErrors(err.errors?.length ? err.errors : [err.message]);
		} finally {
			setSaving(false);
		}
	};

	return (
		<form className="card stack" onSubmit={submit}>
			<div className="grid-2">
				<div className="field">
					<label htmlFor="p-name">Name</label>
					<input id="p-name" className="input" required value={form.name} onChange={set("name")} />
				</div>
				<div className="field">
					<label htmlFor="p-phone">Phone</label>
					<input id="p-phone" className="input" type="tel" required value={form.phone} onChange={set("phone")} />
				</div>
			</div>
			<div className="field">
				<label htmlFor="p-email">Email</label>
				<input id="p-email" className="input" type="email" required value={form.email} onChange={set("email")} />
			</div>
			<hr className="divider" />
			<h3>Change password</h3>
			<div className="grid-2">
				<div className="field">
					<label htmlFor="p-pass">New password</label>
					<input id="p-pass" className="input" type="password" minLength={8} autoComplete="new-password"
						value={form.password} onChange={set("password")} />
				</div>
				<div className="field">
					<label htmlFor="p-pass2">Confirm new password</label>
					<input id="p-pass2" className="input" type="password" autoComplete="new-password"
						value={form.password_confirmation} onChange={set("password_confirmation")} />
				</div>
			</div>
			{needsCurrent && (
				<div className="field">
					<label htmlFor="p-current">Current password</label>
					<input id="p-current" className="input" type="password" required autoComplete="current-password"
						value={form.current_password} onChange={set("current_password")} />
					<span className="hint">Required to change your email or password</span>
				</div>
			)}
			{errors.length > 0 && (
				<div className="form-error" role="alert">
					{errors.map((m) => (
						<div key={m}>{m}</div>
					))}
				</div>
			)}
			<div className="row">
				<button className="btn btn-primary" disabled={saving}>
					{saving ? "Saving…" : "Save changes"}
				</button>
				<span className="spacer" />
				<button
					type="button"
					className="btn btn-ghost"
					onClick={async () => {
						await logout();
						navigate("/");
					}}
				>
					Log out
				</button>
			</div>
		</form>
	);
}
