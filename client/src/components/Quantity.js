import React from 'react'

function Quantity({quantity, setQuantity}) {

  
  const noNegQuant = () => {
    console.log("hello")
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
    <div>

    <button onClick={noNegQuant}>-</button>
    <input
      // type="number"
      min="1"
      max="100"
      value={quantity}
      onChange={(e) => {
        setQuantity(e.target.value);
      }}
      onInput={(e) => {
        if (e.target.value < 0) e.target.value = quantity;
        if (e.target.value > 100) e.target.value = 100;
      }}
    />
    {/* <span>{quantity}</span> */}
    <button onClick={noQuantOver}>+</button>
      </div>
  )
}

export default Quantity