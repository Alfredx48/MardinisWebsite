import React from "react";
import "../css/quantity.css"

function Quantity({quantity, setQuantity}) {

	const noNegQuant = () => {
		if (quantity > 1) {
			setQuantity(quantity - 1);
		}
	};

	const noQuantOver = () => {
		if (quantity < 100) {
			setQuantity(quantity + 1);
		}
	};

	return (
		<div className="quantity-div">
			<button onClick={noNegQuant}>-</button>
			<input
				// min="1"
				// max="100"
				value={quantity}
				onChange={(e) => {
					if (e.target.value.match(/^[0-9]*$/)) {
						setQuantity(e.target.value);
					}
				}}
				onInput={(e) => {
					if (e.target.value < 0) e.target.value = quantity;
					if (e.target.value > 100) e.target.value = 100;
				}}
			/>
			{/* <span>{quantity}</span> */}
			<button onClick={noQuantOver}>+</button>
		</div>
	);
}

export default Quantity;
