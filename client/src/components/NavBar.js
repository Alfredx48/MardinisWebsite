import React from "react";
import "../css/navBar.css";
import { Link } from "react-router-dom";
import Logout from "./Logout";

function NavBar({ currentUser, setCart, setCartId, setCurrentUser }) {
	return (
		<div className="nav-bar-container">
			<div className="nav-bar">
				<Link className="nav-link" to="/">
					Home
				</Link>
				<Link className="nav-link" to="/order-now">
					Menu
				</Link>
				<Link className="nav-link" to="/catering">
					Catering
				</Link>

				<Link className="nav-link" to="/about">
					about
				</Link>
				<Link className="nav-link" to="/cart">
					Cart
				</Link>
		{	 currentUser ? 	<Link className="nav-link" to="/my-orders">
					MyOrders
				</Link> : null}
				{currentUser && currentUser.admin ? (
					<Link className="nav-link" to="/admin">
						Admin
					</Link>
				) : null}
				{!currentUser ? (
					<Link className="logout-button" to="/login">
						Login
					</Link>
				) : (
					<Logout
						setCart={setCart}
						setCartId={setCartId}
						currentUser={currentUser}
						setCurrentUser={setCurrentUser}
					/>
				)}
			</div>
		</div>
	);
}

export default NavBar;
