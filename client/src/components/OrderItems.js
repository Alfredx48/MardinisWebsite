import React from "react";

function OrderItems({ orderItem }) {
	console.log(orderItem);
	return (
    <div>
      Items: 
      {" "}
			<span>{orderItem.quantity}</span> <span>{orderItem.name}</span>
		</div>
	);
}

export default OrderItems;
