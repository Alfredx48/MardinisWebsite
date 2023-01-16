import React from "react";

function HomePage({ currentUser }) {
	// debugger
	return <div>{!currentUser ? null : `Welcome ${currentUser.name}`}</div>;
}

export default HomePage;
