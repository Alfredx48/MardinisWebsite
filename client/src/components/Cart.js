import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import CartItems from "./CartItems";

function Cart({ cartId, setCartId }) {
  const navigate = useNavigate()
	const [cart, setCart] = useState([]);
	console.log(cartId);

  const mappedCartItems = () => {
		if (cart.cart_items && cart.cart_items.length>0) {
			return cart.cart_items.map((cartItem, idx) => (
        <CartItems  cartId={cartId} key={idx} cartItem={cartItem}  />
			));
		} else {
			return <h2>No items in the cart</h2>;
		}
  };
  
	useEffect(() => {
		const storedCartId = JSON.parse(localStorage.getItem("cartId"));
		if (storedCartId) {
			setCartId(storedCartId);
		}
	}, [setCartId]);

	useEffect(() => {
		fetch(`/api/carts/${cartId}`).then((r) => {
			if (r.ok) {
				r.json().then((data) => setCart(data));
			}
		});
	}, [cartId]);

	const deleteCart = () => {
    fetch(`/api/carts/${cartId}`, {
      method: "DELETE",
    }).then((r) => {
      if (r.ok) {
        setCartId(JSON.parse(localStorage.getItem("cartId")));
        setCart([]);
      }
    });
    localStorage.removeItem("cartId");
  };

	return (
		<div>
			<button onClick={deleteCart}> delete cart</button>
        <button onClick = {() => navigate("/order-now")}>add more items</button>
      {mappedCartItems()}
      <h4>Total Cost:  {cart.total_cost}</h4>
      <h4> Total items: {cart.total_items}</h4>
		</div>
	);
}

export default Cart;
