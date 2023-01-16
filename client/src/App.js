import "./App.css";
import { useEffect, useState } from "react";
import HomePage from "./components/HomePage";
import { Routes, Route, useNavigate } from "react-router-dom";
import AboutPage from "./components/AboutPage";
import NavBar from "./components/NavBar";
import LoginPage from "./components/LoginPage";
import MenuItems from "./components/MenuItems";
import Cart from "./components/Cart";

function App() {
	// const navigate = useNavigate()
	const [currentUser, setCurrentUser] = useState({});
	const [restaurant, setRestaurant] = useState([]);
	const [cartId, setCartId] = useState([]);
	// const [quantity, setQuantity] = useState(1);

	useEffect(() => {
		fetch("/api/me").then((r) => {
			if (r.ok) {
				r.json().then((user) => setCurrentUser(user));
			}
		});
	}, []);

	useEffect(() => {
		fetch("/api/restaurants").then((r) => {
			if (r.ok) {
				r.json().then((rest) => setRestaurant(rest));
			}
		});
	}, []);

	// const handleAddToCart = (mItem) => {
		
	// 	let cart_item = {
	// 		menu_item_id: mItem.id,
	// 		quantity: quantity,
	// 		special_request: "",
	// 	};
	// 	fetch("/api/carts", {
	// 		method: "POST",
	// 		headers: { "Content-Type": "application/json" },
	// 		body: JSON.stringify(cart_item),
	// 	})
	// 		.then((response) => response.json())
	// 		.then((cart) => {
	// 			console.log(cart.cart_id);
	// 			setCartId(cart.cart_id);
	// 			localStorage.setItem("cartId", cart.cart_id);
	// 			navigate(`/cart`)
	// 			// console.log(cart);
	// 			// update the cart with the added item
	// 		})
	// 		.catch((error) => {
	// 			console.log(error);
	// 		});
	// };

	return (
		<div className="App">
			<NavBar currentUser={currentUser} setCurrentUser={setCurrentUser} />
			<Routes>
				<Route
					path="/"
					element={
						<HomePage
							currentUser={currentUser}
							setCurrentUser={setCurrentUser}
						/>
					}
				/>
				<Route path="/about" element={<AboutPage restaurant={restaurant} />} />
				<Route
					path="/login"
					element={
						<LoginPage
							currentUser={currentUser}
							setCurrentUser={setCurrentUser}
						/>
					}
				/>
				<Route
					path="/order-now"
					element={restaurant.map((rest, idx) => (
						<MenuItems
							key={idx}
							rest={rest}
							restaurant={restaurant}
						/>
					))}
				/>
				<Route path="/cart" element={<Cart cartId={cartId} setCartId={setCartId} />} />
			</Routes>
		</div>
	);
}

export default App;
