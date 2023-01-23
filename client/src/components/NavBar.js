import React from "react";
import "../css/navBar.css";
import { Link } from "react-router-dom";

function NavBar({ currentUser }) {
	return (
		<div className="nav-bar-container">
			<div className="nav-bar">
				<Link className="nav-link" to="/about">
					about
				</Link>
				<Link className="nav-link" to="/">
					Home
				</Link>
				<Link className="nav-link" to="/order-now">
					Menu
				</Link>

				<Link className="nav-link" to="/cart">
					Cart
				</Link>
				{!currentUser ? (
					<Link className="logout-button" to="/login">
						Login
					</Link>
				) : null}
				{currentUser && currentUser.admin === true ? (
					<Link className="nav-link" to="/admin">
						Admin Portal
					</Link>
				) : null}
			</div>
		</div>
	);
}

export default NavBar;
