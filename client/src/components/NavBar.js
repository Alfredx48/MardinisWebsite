import React from "react";
import { Link, useNavigate } from "react-router-dom";

function NavBar({setCurrentUser , currentUser, setCartId}) {
  const navigate = useNavigate()

  function handleLogOut() {
		fetch("/api/logout", {
			method: "DELETE",
		})
			.then(() => setCurrentUser(""))
			.then(navigate('/'));

		setCartId([])
		localStorage.removeItem("cartId")
	}


return (
    <div className="nav-bar">
		{/* {!currentUser ? null : `Welcome ${currentUser.name}` }	 */}
			<Link className="nav-link" to="/">
				Home
			</Link>
			<Link className="nav-link" to="/about">
				About
			</Link>
			<Link className="nav-link" to="/order-now">
				Order Now
			</Link>
			{ !currentUser ? <Link className="nav-link" to="/login">
				Login
      </Link> :
			<button className="nav-link" onClick={handleLogOut}>Log Out</button>}
		<Link className="nav-link" to="/cart"> Cart </Link>
		</div>
	);
}

export default NavBar;
