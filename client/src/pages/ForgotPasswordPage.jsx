import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { api } from "../api";
import { useRestaurant } from "../context/RestaurantContext";
import { telHref } from "../format";

export default function ForgotPasswordPage() {
	const { restaurant } = useRestaurant();
	const location = useLocation();
	const [email, setEmail] = useState(location.state?.email || "");
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState(null);
	const [result, setResult] = useState(null); // { email_enabled }
	const phone = restaurant?.phone || "(650) 324-4316";

	const submit = async (e) => {
		e.preventDefault();
		setBusy(true);
		setError(null);
		try {
			setResult(await api.post("/password/forgot", { email }));
		} catch (err) {
			setError(err.message);
		} finally {
			setBusy(false);
		}
	};

	return (
		<div className="container page auth-page">
			<div className="card auth-card">
				<h1 className="auth-title">Forgot your password?</h1>
				{result?.email_enabled ? (
					<>
						<p>
							If there's an account for <strong>{email}</strong>, we just emailed it a link to choose a new
							password. The link works for 1 hour.
						</p>
						<p className="muted small">Nothing there? Check your spam folder, or try again in a minute.</p>
						<Link to="/login" className="btn btn-secondary btn-block">
							Back to sign in
						</Link>
					</>
				) : result ? (
					<>
						<p>
							Password reset by email isn't available yet. Call us at <a href={telHref(phone)}>{phone}</a> and
							we'll send you a reset link.
						</p>
						<Link to="/login" className="btn btn-secondary btn-block">
							Back to sign in
						</Link>
					</>
				) : (
					<form onSubmit={submit} className="stack">
						<p className="muted">Enter your account's email and we'll send you a link to choose a new password.</p>
						<div className="field">
							<label htmlFor="f-email">Email</label>
							<input
								id="f-email"
								className="input"
								type="email"
								required
								autoComplete="email"
								value={email}
								onChange={(e) => setEmail(e.target.value)}
							/>
						</div>
						{error && (
							<div className="form-error" role="alert">
								{error}
							</div>
						)}
						<button className="btn btn-primary btn-lg btn-block" disabled={busy}>
							{busy ? "Sending…" : "Email me a reset link"}
						</button>
						<Link to="/login" className="link-btn auth-back">
							Back to sign in
						</Link>
					</form>
				)}
			</div>
		</div>
	);
}
