import "./App.css";
import { useEffect, useState } from "react";
import HomePage from "./components/HomePage";
import { Routes, Route} from "react-router-dom";
import AboutPage from "./components/AboutPage";
import NavBar from "./components/NavBar";
import LoginPage from "./components/LoginPage";
import MenuItems from "./components/MenuItems";
import Cart from "./components/Cart";

function App() {

	const [currentUser, setCurrentUser] = useState({});
	const [restaurant, setRestaurant] = useState([]);
	const [cartId, setCartId] = useState([]);


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
				<Route path="/cart" element={<Cart currentUser={currentUser} cartId={cartId} setCartId={setCartId} />} />
			</Routes>
		</div>
	);
}

export default App;
