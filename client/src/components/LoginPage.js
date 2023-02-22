import { useState } from "react";
import { useNavigate } from "react-router-dom";
import LoginForm from "./LoginForm";
import SignUpForm from "./SignUpForm";
import { motion } from "framer-motion";

function LoginPage({  setCurrentUser }) {
	const navigate = useNavigate();
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

	function handleResets() {
		setFormData({
			email: "",
			password: "",
			password_confirmation: "",
			name: "",
			address: "",
			phone: "",
			admin: "",
		});
	}

	const handleLog = () => {
		handleResets();
		setDisplay("login");
	};
	const handleNew = () => {
		handleResets();
		setDisplay("signup");
	};

	const handleChange = (e) => {
		const value = e.target.value;
		const name = e.target.name;
		setFormData((formData) => ({
			...formData,
			[name]: value,
		}));
	};

	return (
		<div className="login-card">
			<motion.div
				initial={{ x: "-100%", opacity: 0 }}
				animate={{ x: 0, opacity: 1 }}
				transition={{ type: "spring", stiffness: 300, damping: 20 }}
				exit={{ x: "-100%", opacity: 0 }}
			>
				{display === "login" ? (
					<LoginForm
						email={formData.email}
						password={formData.password}
						handleChange={handleChange}
						setCurrentUser={setCurrentUser}
						navigate={navigate}
					/>
				) : null}

				{display === "signup" ? (
					<SignUpForm
						formData={formData}
						handleChange={handleChange}
						setCurrentUser={setCurrentUser}
						navigate={navigate}
					/>
				) : null}
				<br />
				{display === "login" ? (
					<button className="button" onClick={handleNew}>
						{" "}
						Creat Account ?
					</button>
				) : (
					<button className="button" onClick={handleLog}>
						{" "}
						Login ?
					</button>
				)}
			</motion.div>
		</div>
	);
}

export default LoginPage;
