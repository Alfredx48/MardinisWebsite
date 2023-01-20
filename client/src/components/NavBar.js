import React from "react";
import { Link } from "react-router-dom";

function NavBar({ currentUser }) {
	return (
		<div className="nav-bar">
			<Link className="nav-link" to="/">
				Home
			</Link>
			<Link className="nav-link" to="/about">
				About
			</Link>
			<Link className="nav-link" to="/order-now">
				Order Now
			</Link>
			<Link className="nav-link" to="/cart">
				Cart
			</Link>

			{currentUser && currentUser.admin === true ? (
				<Link className="nav-link" to="/admin">
					Admin Portal
				</Link>
			) : null}
			{!currentUser ? (
				<Link className="nav-link" to="/login">
					Login
				</Link>
			) : null}
		</div>
	);
}

export default NavBar;
