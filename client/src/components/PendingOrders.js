import React, { useEffect, useState } from "react";
import moment from "moment";
import OrderItems from "./OrderItems";
import "../css/orders.css";

function PendingOrders({ order, setNewOrder, currentUser }) {
	const [orderItems, setOrderItems] = useState([]);
	const [displayItems, setDisplatItems] = useState(false);
	const format = "MMMM Do YYYY, h:mm a";
	const date = moment(order.created_at).format(format);

	const formatter = new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: "USD",
	});

	useEffect(() => {
		if (order) setOrderItems(order.order_items);
		console.log(order);
	}, [order]);

	const mappedOrderItems = () => {
		console.log(order);
		if (!orderItems) return <h1>hi</h1>;
		return orderItems.map((orderItem) => (
			<OrderItems key={orderItem.id} orderItem={orderItem} />
		));
	};

	const handleDisplayItems = () => {
		setDisplatItems(!displayItems);
	};

	const handleOrderComplete = () => {
		const orderObj = {
			status: "Complete",
		};
		fetch(`/api/orders/${order.id}`, {
			method: "PATCH",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(orderObj),
		})
			.then((r) => r.json())
			.then((data) => {
				setNewOrder(true);
				console.log(data);
			});
	};
  return (
    <>
		<div className="orders-c">
			<div onClick={handleDisplayItems} className="orders">
				<h2> status: {order.status}</h2>
				<p> Total: {formatter.format(order.total_cost)}</p>
				<p> Items: {order.total_items}</p>
				<p> Requests: {order.custom_request}</p>
				<p>{date}</p>
				<div>
					{displayItems ? (
            <div className="order-items">{mappedOrderItems()}</div>
            ) : null}
        </div>
			</div>
		</div>
        <div className="button-div">

				{currentUser && currentUser.admin ? (
          <button  onClick={handleOrderComplete}> Order is Complete </button>
          ) : null}
          </div>
          </>
	);
}

export default PendingOrders;
