import { useState } from "react";
import Quantity from "./Quantity";
import "../css/menuItemCard.css";
import { toast } from "react-toastify";
// import 'react-toastify/dist/ReactToastify.css';

function MenuItemCard({ mItem, setCartId }) {
	const [quantity, setQuantity] = useState(1);

	const handleAddToCart = (mItem) => {
		let cart_item = {
			menu_item_id: mItem.id,
			quantity: parseInt(quantity),
			special_request: "",
		};
		if (isNaN(quantity) || quantity < 1 || quantity > 50) {
			toast.error("Invalid Quantity, please enter a valid Quantity between 1 and 50", {
				position: "top-right",
				autoClose: 500,
				hideProgressBar: false,
				closeOnClick: true,
				pauseOnHover: true,
				draggable: true,
				progress: undefined,
				theme: "light",
			});
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
				setQuantity(1)
				localStorage.setItem("cartId", cart.cart_id);
				console.log(cart);
				toast.success("Item added to cart!", {
					position: "top-right",
					autoClose: 500,
					hideProgressBar: false,
					closeOnClick: true,
					pauseOnHover: true,
					draggable: true,
					progress: undefined,
					theme: "light",
				});
			})
			.catch((error) => {
				console.log(error);
			});
	};

	return (
		<div className="menu-item">
			{/* <img src={mItem.image} alt={mItem.name} /> */}
			<h4>{mItem.name}</h4>
			<p>{mItem.description}</p>
			<p className="price">{mItem.formatted_price}</p>
			<Quantity
				className="quantity"
				setQuantity={setQuantity}
				quantity={quantity}
			/>
			<button className="add-cart" onClick={() => handleAddToCart(mItem)}>
				Add
			</button>
		</div>
	);
}

export default MenuItemCard;
