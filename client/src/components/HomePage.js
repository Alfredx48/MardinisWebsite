import React from "react";
import "../css/hompage.css"

function HomePage({ currentUser }) {
	// debugger
	return <div className="home">{!currentUser ? null : `Welcome ${currentUser.name}`}</div>;
}

export default HomePage;
