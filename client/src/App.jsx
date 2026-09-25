import { lazy, Suspense, useEffect } from "react";
import { Navigate, Outlet, Route, Routes, useLocation } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { CartProvider } from "./context/CartContext";
import { RestaurantProvider } from "./context/RestaurantContext";
import Header from "./components/Header";
import Footer from "./components/Footer";
import CartDrawer from "./components/CartDrawer";
import { Spinner } from "./components/ui";
import "./styles/site.css";
import HomePage from "./pages/HomePage";
import MenuPage from "./pages/MenuPage";
import CheckoutPage from "./pages/CheckoutPage";
import OrderStatusPage from "./pages/OrderStatusPage";
import AboutPage from "./pages/AboutPage";
import CateringPage from "./pages/CateringPage";
import LoginPage from "./pages/LoginPage";
import AccountPage from "./pages/AccountPage";
import NotFoundPage from "./pages/NotFoundPage";
import PolicyPage from "./pages/PolicyPage";

const AdminApp = lazy(() => import("./admin/AdminApp"));

function ScrollToTop() {
	const { pathname } = useLocation();
	useEffect(() => {
		window.scrollTo(0, 0);
	}, [pathname]);
	return null;
}

function SiteLayout() {
	return (
		<>
			<a className="skip-link" href="#main">
				Skip to content
			</a>
			<Header />
			<main id="main">
				<Outlet />
			</main>
			<Footer />
			<CartDrawer />
		</>
	);
}

function RequireUser({ admin = false, children }) {
	const { user, loading } = useAuth();
	const location = useLocation();
	if (loading) return <Spinner />;
	if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
	if (admin && !user.admin) return <Navigate to="/" replace />;
	return children;
}

export default function App() {
	return (
		<AuthProvider>
			<RestaurantProvider>
				<CartProvider>
					<ScrollToTop />
					<ToastContainer position="bottom-center" autoClose={2500} hideProgressBar newestOnTop theme="light" />
					<Routes>
						<Route
							path="/admin/*"
							element={
								<RequireUser admin>
									<Suspense fallback={<Spinner />}>
										<AdminApp />
									</Suspense>
								</RequireUser>
							}
						/>
						<Route element={<SiteLayout />}>
							<Route index element={<HomePage />} />
							<Route path="menu" element={<MenuPage />} />
							<Route path="order-now" element={<Navigate to="/menu" replace />} />
							<Route path="checkout" element={<CheckoutPage />} />
							<Route path="cart" element={<Navigate to="/checkout" replace />} />
							<Route path="order/:token" element={<OrderStatusPage />} />
							<Route path="about" element={<AboutPage />} />
							<Route path="catering" element={<CateringPage />} />
							<Route path="policies" element={<PolicyPage />} />
							<Route path="login" element={<LoginPage />} />
							<Route
								path="account"
								element={
									<RequireUser>
										<AccountPage />
									</RequireUser>
								}
							/>
							<Route path="my-orders" element={<Navigate to="/account" replace />} />
							<Route path="*" element={<NotFoundPage />} />
						</Route>
					</Routes>
				</CartProvider>
			</RestaurantProvider>
		</AuthProvider>
	);
}
