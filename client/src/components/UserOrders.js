import React, { useEffect, useState } from "react";
import PendingOrders from "./PendingOrders";
import { useNavigate } from "react-router-dom";
function UserOrders({ currentUser }) {
	const [userOrders, setUserOrders] = useState([]);
	const navigate = useNavigate();
	useEffect(() => {
		if (currentUser && currentUser.orders) setUserOrders(currentUser.orders);
		console.log(currentUser.orders);
	}, [currentUser]);

	console.log(userOrders);

	return (
		<>
			<div className="button-div">
				<button className="add-button" onClick={() => navigate("/order-now")}>
					Order Now?
				</button>
			</div>
			{!userOrders ? null : (
				<div>
					{userOrders.map((order, idx) => (
						<PendingOrders key={idx} order={order} />
					))}
				</div>
			)}
		</>
	);
}

export default UserOrders;
