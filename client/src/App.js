import "./App.css";
import { useEffect, useState } from "react";
import HomePage from "./components/HomePage";
import { Routes, Route } from "react-router-dom";
import AboutPage from "./components/AboutPage";
import NavBar from "./components/NavBar";
import LoginPage from "./components/LoginPage";
import MenuItems from "./components/MenuItems";
import Cart from "./components/Cart";
import AdminPage from "./components/AdminPage";
import Catering from "./components/Catering";
import { ToastContainer } from "react-toastify";
import UserOrders from "./components/UserOrders";

function App() {
	const [currentUser, setCurrentUser] = useState({});
	const [restaurant, setRestaurant] = useState([]);
	const [cartId, setCartId] = useState([]);
	const [cart, setCart] = useState([]);
	const [newOrder, setNewOrder] = useState(false);
	const [dataFetched, setDataFetched] = useState(false);

	useEffect(() => {
		if (newOrder || !dataFetched) {
			fetch("/api/me").then((r) => {
				if (r.ok) {
					r.json().then((user) => {
						setCurrentUser(user);
						setNewOrder(false);
					});
				}
			});
		}
	}, [newOrder, dataFetched, setNewOrder, setDataFetched]);

	useEffect(() => {
		if (newOrder || !dataFetched) {
			fetch("/api/restaurants/1").then((r) => {
				if (r.ok) {
					r.json().then((rest) => {
						setRestaurant(rest);
						setNewOrder(false);
					});
				}
			});
		}
	}, [newOrder, dataFetched, setNewOrder, setDataFetched]);

	return (
		<>
			<ToastContainer
				position="top-center"
				autoClose={2000}
				// limit={1}
				hideProgressBar={false}
				newestOnTop
				closeOnClick
				rtl={false}
				pauseOnFocusLoss
				draggable
				pauseOnHover
				theme="light"
			/>
			<div className=".header-top"></div>
			<div className="App">
				<NavBar
					setCart={setCart}
					setCartId={setCartId}
					currentUser={currentUser}
					setCurrentUser={setCurrentUser}
				/>

				<Routes>
					<Route
						path="/admin"
						element={
							<AdminPage
								setNewOrder={setNewOrder}
								restaurant={restaurant}
								currentUser={currentUser}
							/>
						}
					/>
					<Route
						path="/my-orders"
						element={<UserOrders currentUser={currentUser} />}
					/>
					<Route path="/catering" element={<Catering rest={restaurant} />} />
					<Route
						path="/"
						element={
							<HomePage
								className="home"
								currentUser={currentUser}
								setCurrentUser={setCurrentUser}
							/>
						}
					/>
					<Route
						path="/about"
						element={<AboutPage restaurant={restaurant} />}
					/>
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
						element={
							<MenuItems  restaurant={restaurant} setCartId={setCartId} />
						}
					/>
					<Route
						path="/cart"
						element={
							<Cart
								setNewOrder={setNewOrder}
								cart={cart}
								setCart={setCart}
								currentUser={currentUser}
								cartId={cartId}
								setCartId={setCartId}
							/>
						}
					/>
				</Routes>
			</div>
		</>
	);
}

export default App;
