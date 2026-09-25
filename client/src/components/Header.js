import { useEffect, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBagShopping, faBars, faBullhorn, faUser, faXmark } from "@fortawesome/free-solid-svg-icons";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { useRestaurant } from "../context/RestaurantContext";

const LINKS = [
	["/menu", "Menu"],
	["/catering", "Catering"],
	["/about", "Visit Us"],
];

export default function Header() {
	const { restaurant } = useRestaurant();
	const { user, logout } = useAuth();
	const { count, openDrawer } = useCart();
	const [menuOpen, setMenuOpen] = useState(false);
	const [scrolled, setScrolled] = useState(false);
	const location = useLocation();
	const navigate = useNavigate();
	const onHome = location.pathname === "/";

	useEffect(() => {
		setMenuOpen(false);
	}, [location.pathname]);

	useEffect(() => {
		const onScroll = () => setScrolled(window.scrollY > 24);
		onScroll();
		window.addEventListener("scroll", onScroll, { passive: true });
		return () => window.removeEventListener("scroll", onScroll);
	}, []);

	const handleLogout = async () => {
		await logout();
		navigate("/");
	};

	const transparent = onHome && !scrolled && !menuOpen;

	return (
		<>
			{restaurant?.announcement && (
				<div className="announcement">
					<FontAwesomeIcon icon={faBullhorn} />
					<span>{restaurant.announcement}</span>
				</div>
			)}
			<header className={`site-header${transparent ? " is-transparent" : ""}`}>
				<div className="container header-inner">
					<Link to="/" className="brand" aria-label="Mardini's home">
						<span className="brand-name">Mardini's</span>
						<span className="brand-sub">Deli Cafe</span>
					</Link>

					<nav className={`main-nav${menuOpen ? " is-open" : ""}`} aria-label="Main">
						{LINKS.map(([to, label]) => (
							<NavLink key={to} to={to} className="nav-link">
								{label}
							</NavLink>
						))}
						<div className="nav-account">
							{user ? (
								<>
									{user.admin && (
										<Link to="/admin" className="nav-link nav-admin">
											Admin
										</Link>
									)}
									<NavLink to="/account" className="nav-link">
										<FontAwesomeIcon icon={faUser} /> {user.name.split(" ")[0]}
									</NavLink>
									<button className="nav-link link-plain" onClick={handleLogout}>
										Log out
									</button>
								</>
							) : (
								<NavLink to="/login" className="nav-link">
									Sign in
								</NavLink>
							)}
						</div>
					</nav>

					<div className="header-actions">
						{restaurant && (
							<span className={`open-pill ${restaurant.open_now ? "is-open" : ""}`}>
								{restaurant.open_now ? "Open now" : "Closed"}
							</span>
						)}
						<Link to="/menu" className="btn btn-primary btn-sm header-order">
							Order online
						</Link>
						<button className="icon-btn cart-btn" onClick={openDrawer} aria-label={`Cart, ${count} items`}>
							<FontAwesomeIcon icon={faBagShopping} />
							{count > 0 && <span className="cart-count">{count}</span>}
						</button>
						<button
							className="icon-btn menu-toggle"
							onClick={() => setMenuOpen((o) => !o)}
							aria-expanded={menuOpen}
							aria-label="Menu"
						>
							<FontAwesomeIcon icon={menuOpen ? faXmark : faBars} />
						</button>
					</div>
				</div>
			</header>
		</>
	);
}
