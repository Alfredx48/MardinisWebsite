import React from "react";
import { useNavigate } from "react-router-dom";

function LoginForm({
	email,
	password,
	handleChange,
	errors,
	setErrors,
  setCurrentUser
}) {

	const navigate = useNavigate()

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
						console.log(user)
						setCurrentUser(user)
						setErrors([])
					})
					.then(navigate("/"));
       
			} else {
				r.json().then((err) => setErrors(err.errors));
			}
		});
  }
  
  function handleLogOut() {
		fetch("/api/logout", {
			method: "DELETE",
		})
			.then(() => setCurrentUser([]))
			.then(navigate('/'));
	}
  
	return (
		<div className="login-form-div">
			<form className="login-form" onSubmit={handleSubmit} >
				<label>Email: </label>
				<input
					className="login-input"
					type="text"
          id="email"
          name="email"
					value={email}
					onChange={(e) => handleChange(e)}
				/>
				<label>Password: </label>
				<input
					className="login-input"
          type="password"
          name="password"
					id="password"
					value={password}
					onChange={(e) => handleChange(e)}
				/>
				<button className="login-button" type="submit" value="Login">
					Login
        </button>
			</form>
		</div>
	);
}

export default LoginForm;
