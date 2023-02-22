import React, { useState, useEffect } from "react";
import PendingOrders from "./PendingOrders";

function AdminPage({ restaurant, setNewOrder, currentUser }) {
	const [orders, setOrders] = useState([]);

	useEffect(() => {
		if (restaurant) {
			setOrders(restaurant.orders);
		}
	}, [restaurant]);

	return (
		<>
			{currentUser && currentUser.admin ? (
				<div>
					{orders && orders.length ? (
						orders.map((order) => (
							<PendingOrders
								currentUser={currentUser}
								setNewOrder={setNewOrder}
								key={order.id}
								order={order}
							/>
						))
					) : (
						<h1>...loading</h1>
					)}
				</div>
			) : (
				<h1>Not Authorized</h1>
			)}
		</>
	);
}

export default AdminPage;
