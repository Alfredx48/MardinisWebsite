import React from "react";
import Quantity from "./Quantity";

function CartItems({ cartItem}) {
	// debugger
	return (
		<div>
			<h1>
				{cartItem.item_name} <span> x {cartItem.quantity}</span>{" "}
				<span> {cartItem.item_total}</span>
			</h1>
			<p>{cartItem.price}</p>
      <p>{cartItem.special_request}</p>
      <Quantity /> 
		</div>
	);
}

export default CartItems;
