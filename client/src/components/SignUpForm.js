import React from "react";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "../css/signup.css";

function SignUpForm({
	formData,
	handleChange,
	setCurrentUser,
	setErrors,
	navigate
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
				r.json().then((err) => {
					err.errors.forEach((error) => {
						toast.error(`${error}`, {
							position: "top-center",
							autoClose: 3000,
							hideProgressBar: false,
							closeOnClick: true,
							pauseOnHover: true,
							draggable: true,
							progress: undefined,
							theme: "light",
						});
					});
				});
			}
		});
	}

	return (
		<div className="signup-form-div">
			<form className="signup-form" onSubmit={handleSubmit}>
				<div className="form-row">
					<div className="form-col">
						<label className="signup-label" htmlFor="name">
							Name:
						</label>
						<input
							className="signup-input"
							type="text"
							name="name"
							value={formData.name}
							onChange={(e) => handleChange(e)}
							required
						/>
					</div>
					<div className="form-col">
						<label className="signup-label" htmlFor="email">
							Email:
						</label>
						<input
							className="signup-input"
							type="email"
							name="email"
							value={formData.email}
							onChange={(e) => handleChange(e)}
							required
						/>
					</div>
				</div>
				<div className="form-row">
					<div className="form-col">
						<label className="signup-label" htmlFor="address">
							Street Address:
						</label>
						<input
							className="signup-input"
							type="text"
							name="address"
							value={formData.address}
							onChange={(e) => handleChange(e)}
							required
						/>
					</div>
					<div className="form-col">
						<label className="signup-label" htmlFor="phone">
							Phone Number:
						</label>
						<input
							className="signup-input"
							type="tel"
							name="phone"
							value={formData.phone}
							onChange={(e) => handleChange(e)}
							required
						/>
					</div>
				</div>
				<div className="form-row">
					<div className="form-col">
						<label className="signup-label" htmlFor="password">
							Password:
						</label>
						<input
							className="signup-input"
							type="password"
							name="password"
							value={formData.password}
							onChange={(e) => handleChange(e)}
							required
						/>
					</div>
					<div className="form-col">
						<label className="signup-label" htmlFor="passwordConfirmation">
							Confirm Password:
						</label>
						<input
							className="signup-input"
							type="password"
							name="passwordConfirmation"
							value={formData.passwordConfirmation}
							onChange={(e) => handleChange(e)}
							required
						/>
					</div>
				</div>
				<button className="signup-button" type="submit" value="Create User">
					Create User
				</button>
			</form>
		</div>
	);
}

export default SignUpForm;
