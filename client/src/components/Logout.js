import React from "react";
import { useNavigate } from "react-router-dom";

function Logout({ setCart, setCartId, setCurrentUser }) {
	const navigate = useNavigate();
	function handleLogOut() {
		fetch("/api/logout", {
			method: "DELETE",
		})
			.then(() => setCurrentUser({}))
			.then(navigate("/"));

		setCartId([]);
		setCart([]);
		localStorage.removeItem("cartId");
	}

	return (
		<div>
			<button className="logout-button" onClick={handleLogOut}>
				Log Out
			</button>
		</div>
	);
}

export default Logout;
