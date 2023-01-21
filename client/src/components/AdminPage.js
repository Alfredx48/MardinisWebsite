import React, { useState, useEffect } from "react";
import PendingOrders from "./PendingOrders";

function AdminPage({ restaurant , setNewOrder }) {
	const [orders, setOrders] = useState([]);

	useEffect(() => {
		if (restaurant) {
			setOrders(restaurant.orders);
		}
  }, [restaurant]);
  

	return (
		<div>
			AdminPage
			{orders && orders.length ? (
				orders.map((order) => <PendingOrders key={order.id} order={order} />)
			) : (
				<h1>...loading</h1>
			)}
		</div>
	);
}

export default AdminPage;
