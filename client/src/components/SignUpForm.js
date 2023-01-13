import React from "react";

function SignUpForm({
	formData,
	handleChange,
	setCurrentUser,
	setErrors,
	navigate,
	handleBlur,
	handleFocus,
	active
}) {
	function handleSubmit(e) {
		e.preventDefault();
		const user = {
			name: formData.name,
			address: formData.address,
			email: formData.email,
			password: formData.password,
			password_confirmation: formData.passwordConfirmation,
			phone: formData.phone,
			admin: formData.admin,
		};
		fetch(`/api/users`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(user),
		}).then((r) => {
			if (r.ok) {
				r.json()
					.then((user) => {
						setCurrentUser(user);
						setErrors([]);
					})
					.then(navigate("/"));
			} else {
				r.json().then((err) => setErrors(err.errors));
			}
		});
	}

	return (
		<div className="New-user-card">
			<form className="login-form" onSubmit={handleSubmit}>
				<label className="login-label" htmlFor="name">
					Name:
				</label>
				<input
					className={`input ${active ? "" : "pulse"}`}
					onFocus={handleFocus}
					onBlur={handleBlur}
					type="text"
					name="name"
					value={formData.name}
					onChange={(e) => handleChange(e)}
				/>
				<label className="login-label" htmlFor="address">
					Address:
				</label>
				<input
					className={`input ${active ? "" : "pulse"}`}
					onFocus={handleFocus}
					onBlur={handleBlur}
					type="text"
					name="address"
					value={formData.address}
					onChange={(e) => handleChange(e)}
				/>
				<label className="login-label" htmlFor="email">
					Email:
				</label>
				<input
					className={`input ${active ? "" : "pulse"}`}
					onFocus={handleFocus}
					onBlur={handleBlur}
					type="text"
					name="email"
					value={formData.email}
					onChange={(e) => handleChange(e)}
				/>
				<label className="login-label" htmlFor="phone">
					Phone Number:
				</label>
				<input
					className={`input ${active ? "" : "pulse"}`}
					onFocus={handleFocus}
					onBlur={handleBlur}
					type="integer"
					name="phone"
					value={formData.phone}
					onChange={(e) => handleChange(e)}
				/>
				<label className="login-label" htmlFor="password">
					Password:
				</label>
				<input
					className={`input ${active ? "" : "pulse"}`}
					onFocus={handleFocus}
					onBlur={handleBlur}
					type="password"
					name="password"
					value={formData.password}
					onChange={(e) => handleChange(e)}
				/>
				<label className="login-label" htmlFor="password_confirmation">
					Confirm Password:
				</label>
				<input
					className={`input ${active ? "" : "pulse"}`}
					onFocus={handleFocus}
					onBlur={handleBlur}
					type="password"
					id="password_confirmation"
					name="passwordConfirmation"
					value={formData.passwordConfirmation}
					onChange={(e) => handleChange(e)}
				/>
				<input className="login-button" type="submit" />
			</form>
		</div>
	);
}

export default SignUpForm;
