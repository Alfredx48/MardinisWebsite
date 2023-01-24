import React from "react";

function OrderItems({ orderItem }) {
	console.log(orderItem);
	return (
		<div>
			<span>{orderItem.quantity}</span> <span>{orderItem.name}</span>
		</div>
	);
}

export default OrderItems;
