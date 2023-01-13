import { useState } from "react";
import { useNavigate } from "react-router-dom";
import LoginForm from "./LoginForm";
import SignUpForm from "./SignUpForm";
import { motion } from "framer-motion";

function LoginPage({ currentUser, setCurrentUser }) {
	const navigate = useNavigate();
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
		setErrors([]);
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

	const handleRender = () => {
		if (display === "login") {
			return (
				<LoginForm
					email={formData.email}
					password={formData.password}
					handleChange={handleChange}
					errors={errors}
					setErrors={setErrors}
					setCurrentUser={setCurrentUser}
					navigate={navigate}
				/>
			);
		} else if (display === "signup") {
			return (
				<SignUpForm
					formData={formData}
					errors={errors}
					setErrors={setErrors}
					handleChange={handleChange}
					setCurrentUser={setCurrentUser}
					navigate={navigate}
				/>
			);
		}
	};
	return (
		<div className="login-card">
			<motion.div
				initial={{ x: "-100%", opacity: 0 }}
				animate={{ x: 0, opacity: 1 }}
				// transition={{ type: "tween", duration: 0.5, ease: "easeOut" }}
				transition={{ type: "spring", stiffness: 300, damping: 20 }}
				// transition={{ type: 'spring', restSpeed: 0.5 }}

				exit={{ x: "-100%", opacity: 0 }}
			>
				<div className="error-wrapper">
					<div className="errors">
						{!errors
							? null
							: errors.map((error, idx) => (
									<motion.p
										key={idx}
										variants={{
											flash: {
												y: [-10, 10],
												transition: {
													duration: 0.5,
													yoyo: Infinity,
												},
											},
											exit: { opacity: 0, y: -10 },
										}}
										animate="flash"
										exit="exit"
										className="error"
									>
										{error}
									</motion.p>
							  ))}
					</div>
				</div>
				<br />
				{handleRender()}
				<br />
				<motion.button
				whileHover={{
					animate: { scale: [1, 1.1, 1] },
					transition: { duration: 2, ease: "easeInOut", loop: Infinity, repeatDelay: 1 }
				}}
				whileTap={{ scale: 0.95 }}
					className="button"
					onClick={handleNew}
				>
					Create New User
				</motion.button>
				<br />
				<motion.button
					animate={{ scale: [1, 1.1, 1] }}
					transition={{
						duration: 2,
						ease: "easeInOut",
						loop: Infinity,
						repeatDelay: 1,
					}}
					whileTap={{ scale: 0.95 }}
					className="button"
					onClick={handleLog}
				>
					Login to Your Account
				</motion.button>
			</motion.div>
		</div>
	);
}

export default LoginPage;
