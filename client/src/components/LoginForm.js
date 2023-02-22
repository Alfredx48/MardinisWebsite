import React from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "../css/login.css";

function LoginForm({
	email,
	password,
	handleChange,
	setErrors,
	setCurrentUser,
}) {
	const navigate = useNavigate();

	function handleSubmit(e) {
		e.preventDefault();
		const userObj = {
			email: email,
			password: password,
		};

		fetch(`/api/login`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(userObj),
		}).then((r) => {
			if (r.ok) {
				r.json()
					.then((user) => {
						// console.log(user);
						setCurrentUser(user);
						setErrors([]);
					})
					.then(navigate("/"));
			} else {
				r.json().then((err) => {
					setErrors(err.errors);
					err.errors.forEach((error) => {
						toast.error(`${error}`, {
							position: "top-center",
							autoClose: 4500,
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
		<div className="login-form-div">
			<form className="login-form" onSubmit={handleSubmit} autoComplete="off">
				<label>Email: </label>
				<input
					className="input"
					type="email"
					id="email"
					name="email"
					value={email}
					onChange={(e) => handleChange(e)}
					required
				/>
				<label>Password: </label>
				<input
					className="input"
					type="password"
					name="password"
					id="password"
					value={password}
					onChange={(e) => handleChange(e)}
					required
				/>
				<button className="login-button" type="submit" value="Login">
					Login
				</button>
			</form>
		</div>
	);
}

export default LoginForm;
