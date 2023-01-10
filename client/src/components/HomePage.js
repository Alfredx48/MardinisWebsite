import React, { useState } from "react";
import LoginForm from "./LoginForm";
import SignUpForm from "./SignUpForm";

function HomePage() {
	const [errors, setErrors] = useState([]);
	const [display, setDisplay] = useState("login");
	const [formData, setFormData] = useState({
		email: "",
		password: "",
		password_confirmation: "",
		name: "",
		address: "",
		phone: "",
		admin: "",
	});

	const handleChange = (e) => {
		const value = e.target.value;
		const name = e.target.name;
		setFormData((formData) => ({
			...formData,
			[name]: value,
		}));
	};

	const handleRender = () => {
		if (display === "login") {
			return (
				<LoginForm
					email={formData.email}
					password={formData.password}
					handleChange={handleChange}
				/>
			);
		} else if (display === "signup") {
			return <SignUpForm handleChange={handleChange} />;
		}
	};
  return <div>{handleRender}</div>;
}

export default HomePage;
