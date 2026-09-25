import { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const EMPTY = { name: "", email: "", phone: "", password: "", password_confirmation: "" };

export default function LoginPage() {
	const { user, login, signup } = useAuth();
	const navigate = useNavigate();
	const location = useLocation();
	const [mode, setMode] = useState("login");
	const [form, setForm] = useState(EMPTY);
	const [errors, setErrors] = useState([]);
	const [busy, setBusy] = useState(false);

	const destination = location.state?.from || "/";
	if (user) return <Navigate to={destination} replace />;

	const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

	const switchMode = (next) => {
		setMode(next);
		setErrors([]);
	};

	const submit = async (e) => {
		e.preventDefault();
		setErrors([]);
		if (mode === "signup" && form.password !== form.password_confirmation) {
			return setErrors(["Passwords don't match."]);
		}
		setBusy(true);
		try {
			const u = mode === "login" ? await login(form.email, form.password) : await signup(form);
			navigate(u.admin && destination === "/" ? "/admin" : destination, { replace: true });
		} catch (err) {
			setErrors(err.errors?.length ? err.errors : [err.message]);
			setBusy(false);
		}
	};

	return (
		<div className="container page auth-page">
			<div className="card auth-card">
				<div className="auth-tabs" role="tablist">
					<button role="tab" aria-selected={mode === "login"} onClick={() => switchMode("login")}>
						Sign in
					</button>
					<button role="tab" aria-selected={mode === "signup"} onClick={() => switchMode("signup")}>
						Create account
					</button>
				</div>
				<p className="muted small">
					{mode === "login"
						? "Welcome back! Sign in to see your orders and check out faster."
						: "Save your details and keep track of your orders. You can always check out as a guest, too."}
				</p>

				<form onSubmit={submit} className="stack">
					{mode === "signup" && (
						<div className="field">
							<label htmlFor="a-name">Name</label>
							<input id="a-name" className="input" required autoComplete="name" value={form.name} onChange={set("name")} />
						</div>
					)}
					<div className="field">
						<label htmlFor="a-email">Email</label>
						<input id="a-email" className="input" type="email" required autoComplete="email" value={form.email} onChange={set("email")} />
					</div>
					{mode === "signup" && (
						<div className="field">
							<label htmlFor="a-phone">Phone</label>
							<input id="a-phone" className="input" type="tel" required autoComplete="tel" value={form.phone} onChange={set("phone")} />
						</div>
					)}
					<div className="field">
						<label htmlFor="a-password">Password</label>
						<input
							id="a-password"
							className="input"
							type="password"
							required
							minLength={mode === "signup" ? 8 : undefined}
							autoComplete={mode === "login" ? "current-password" : "new-password"}
							value={form.password}
							onChange={set("password")}
						/>
						{mode === "signup" && <span className="hint">At least 8 characters</span>}
					</div>
					{mode === "signup" && (
						<div className="field">
							<label htmlFor="a-password2">Confirm password</label>
							<input id="a-password2" className="input" type="password" required autoComplete="new-password"
								value={form.password_confirmation} onChange={set("password_confirmation")} />
						</div>
					)}
					{errors.length > 0 && (
						<div className="form-error" role="alert">
							{errors.map((m) => (
								<div key={m}>{m}</div>
							))}
						</div>
					)}
					<button className="btn btn-primary btn-lg btn-block" disabled={busy}>
						{busy ? "One moment…" : mode === "login" ? "Sign in" : "Create account"}
					</button>
				</form>
			</div>
		</div>
	);
}
