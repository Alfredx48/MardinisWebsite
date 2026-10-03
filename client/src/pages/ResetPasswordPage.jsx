import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import { api } from "../api";
import { useAuth } from "../context/AuthContext";
import { PasswordInput, Spinner } from "../components/ui";

export default function ResetPasswordPage() {
	const [params] = useSearchParams();
	const token = params.get("token") || "";
	const { resetPassword } = useAuth();
	const navigate = useNavigate();
	const [check, setCheck] = useState(null); // { name } or { error }
	const [password, setPassword] = useState("");
	const [confirmation, setConfirmation] = useState("");
	const [errors, setErrors] = useState([]);
	const [busy, setBusy] = useState(false);

	useEffect(() => {
		let cancelled = false;
		api.get(`/password/reset?token=${encodeURIComponent(token)}`)
			.then((data) => !cancelled && setCheck(data))
			.catch((e) => !cancelled && setCheck({ error: e.message }));
		return () => {
			cancelled = true;
		};
	}, [token]);

	const submit = async (e) => {
		e.preventDefault();
		if (password !== confirmation) return setErrors(["Passwords don't match."]);
		setBusy(true);
		setErrors([]);
		try {
			const user = await resetPassword(token, password, confirmation);
			toast.success("Password updated. You're signed in.");
			navigate(user.admin ? "/admin" : user.kitchen ? "/kitchen" : "/", { replace: true });
		} catch (err) {
			setErrors(err.errors?.length ? err.errors : [err.message]);
			setBusy(false);
		}
	};

	if (!check) return <Spinner />;

	return (
		<div className="container page auth-page">
			<div className="card auth-card">
				<h1 className="auth-title">Choose a new password</h1>
				{check.error ? (
					<>
						<p>{check.error}</p>
						<Link to="/forgot-password" className="btn btn-primary btn-block">
							Get a new link
						</Link>
					</>
				) : (
					<form onSubmit={submit} className="stack">
						{check.name && <p className="muted">Hi {check.name}! Pick a password with at least 8 characters.</p>}
						<div className="field">
							<label htmlFor="r-pass">New password</label>
							<PasswordInput
								id="r-pass"
								className="input"
								required
								minLength={8}
								autoComplete="new-password"
								value={password}
								onChange={(e) => setPassword(e.target.value)}
							/>
						</div>
						<div className="field">
							<label htmlFor="r-pass2">Confirm new password</label>
							<PasswordInput
								id="r-pass2"
								className="input"
								required
								autoComplete="new-password"
								value={confirmation}
								onChange={(e) => setConfirmation(e.target.value)}
							/>
						</div>
						{errors.length > 0 && (
							<div className="form-error" role="alert">
								{errors.map((m) => (
									<div key={m}>{m}</div>
								))}
							</div>
						)}
						<p className="muted small">This signs you out on your other devices.</p>
						<button className="btn btn-primary btn-lg btn-block" disabled={busy}>
							{busy ? "Saving…" : "Save new password"}
						</button>
					</form>
				)}
			</div>
		</div>
	);
}
