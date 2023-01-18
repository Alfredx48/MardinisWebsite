import {useState} from "react";
import Quantity from "./Quantity";

function MenuItemCard({ mItem, setCartId}) {
	const [quantity, setQuantity] = useState(1);

	const handleAddToCart = (mItem) => {
		let cart_item = {
			menu_item_id: mItem.id,
			quantity: parseInt(quantity),
			special_request: "",
		};
		if (isNaN(quantity) || quantity < 1 || quantity > 100) {
			alert(
				"Invalid quantity, please enter a valid quantity between 1 and 100"
			);
			return;
		}
		fetch("/api/carts", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(cart_item),
		})
			.then((response) => response.json())
			.then((cart) => {
				setCartId(cart.cart_id);
				localStorage.setItem("cartId", cart.cart_id);
				console.log(cart);
			})
			.catch((error) => {
				console.log(error);
			});
	};


	return (
		<div>
			<div key={mItem.id}>
				<img src={mItem.image} alt={mItem.name} />
				<h1 key={mItem.id}>{mItem.name}</h1>
				<p>{mItem.description}</p>
				<p>{mItem.formatted_price}</p>
				<br />
				<Quantity quantity={quantity} setQuantity={setQuantity} />
				<button onClick={() => handleAddToCart(mItem)}>Add To Cart</button>
			</div>
		</div>
	);
}

export default MenuItemCard;
