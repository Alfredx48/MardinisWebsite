import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
	faArrowUpRightFromSquare,
	faBars,
	faBellConcierge,
	faChampagneGlasses,
	faCirclePause,
	faClockRotateLeft,
	faGaugeHigh,
	faGear,
	faRightFromBracket,
	faUsers,
	faUtensils,
	faVolumeHigh,
	faVolumeXmark,
	faXmark,
} from "@fortawesome/free-solid-svg-icons";
import { useAuth } from "../context/AuthContext";
import { useDismiss } from "../components/ui";
import { useAdmin } from "./AdminContext";

function NavItems({ newOrderCount, newCatering }) {
	const links = [
		{ to: "/admin", label: "Dashboard", icon: faGaugeHigh, end: true },
		{ to: "/admin/orders", label: "Live Orders", icon: faBellConcierge, count: newOrderCount, urgent: true },
		{ to: "/admin/history", label: "Order History", icon: faClockRotateLeft },
		{ to: "/admin/menu", label: "Menu", icon: faUtensils },
		{ to: "/admin/catering", label: "Catering", icon: faChampagneGlasses, count: newCatering },
		{ to: "/admin/users", label: "Customers", icon: faUsers },
		{ to: "/admin/settings", label: "Settings", icon: faGear },
	];
	return (
		<ul className="adm-nav">
			{links.map((link) => (
				<li key={link.to}>
					<NavLink to={link.to} end={link.end} className="adm-nav-link">
						<FontAwesomeIcon icon={link.icon} fixedWidth />
						<span>{link.label}</span>
						{link.count > 0 && (
							<span className={`adm-count${link.urgent ? " is-urgent" : ""}`}>
								{link.count}
								<span className="sr-only"> new</span>
							</span>
						)}
					</NavLink>
				</li>
			))}
		</ul>
	);
}

function SoundToggle() {
	const { soundOn, setSoundOn, audioReady, enableAudio } = useAdmin();
	if (soundOn && !audioReady) {
		return (
			<button type="button" className="adm-sound is-blocked" onClick={enableAudio}>
				<FontAwesomeIcon icon={faVolumeHigh} fixedWidth />
				Enable sound
			</button>
		);
	}
	return (
		<button
			type="button"
			className={`adm-sound${soundOn ? " is-on" : ""}`}
			onClick={() => setSoundOn(!soundOn)}
			aria-pressed={soundOn}
		>
			<FontAwesomeIcon icon={soundOn ? faVolumeHigh : faVolumeXmark} fixedWidth />
			{soundOn ? "Order sound on" : "Order sound off"}
		</button>
	);
}

function Sidebar({ onNavigate }) {
	const { user, logout } = useAuth();
	const { settings, newOrderCount, newCatering } = useAdmin();
	const navigate = useNavigate();

	const signOut = async () => {
		await logout();
		navigate("/");
	};

	return (
		<nav className="adm-sidebar-inner" aria-label="Admin" onClick={(e) => e.target.closest("a") && onNavigate?.()}>
			<div className="adm-brand">
				<span className="adm-brand-name">{settings?.name || "Mardini's"}</span>
				<span className="adm-brand-sub">Back office</span>
			</div>
			<NavItems newOrderCount={newOrderCount} newCatering={newCatering} />
			<div className="adm-sidebar-foot">
				<SoundToggle />
				<Link to="/" className="adm-nav-link adm-nav-plain">
					<FontAwesomeIcon icon={faArrowUpRightFromSquare} fixedWidth />
					<span>View site</span>
				</Link>
				<div className="adm-user">
					<div className="adm-user-name">{user?.name}</div>
					<div className="adm-user-email">{user?.email}</div>
					<button type="button" className="btn btn-ghost btn-sm adm-logout" onClick={signOut}>
						<FontAwesomeIcon icon={faRightFromBracket} />
						Log out
					</button>
				</div>
			</div>
		</nav>
	);
}

function MobileDrawer({ onClose }) {
	useDismiss(onClose);
	return (
		<>
			<div className="adm-drawer-overlay" onClick={onClose} />
			<aside className="adm-drawer" aria-label="Admin menu">
				<button type="button" className="adm-icon-btn adm-drawer-close" onClick={onClose} aria-label="Close menu">
					<FontAwesomeIcon icon={faXmark} />
				</button>
				<Sidebar onNavigate={onClose} />
			</aside>
		</>
	);
}

function PausedBanner() {
	const { settings, saveSettings } = useAdmin();
	const [busy, setBusy] = useState(false);
	if (!settings || settings.accepting_orders) return null;

	const resume = async () => {
		setBusy(true);
		try {
			await saveSettings({ accepting_orders: true });
			toast.success("Online ordering resumed");
		} catch (e) {
			toast.error(e.message);
		} finally {
			setBusy(false);
		}
	};

	return (
		<div className="adm-paused" role="status">
			<FontAwesomeIcon icon={faCirclePause} />
			<span>
				<strong>Online ordering paused.</strong>
				<span className="adm-paused-extra"> Customers can browse the menu but can't place orders.</span>
			</span>
			<button type="button" className="btn btn-sm btn-primary" onClick={resume} disabled={busy}>
				{busy ? "Resuming…" : "Resume ordering"}
			</button>
		</div>
	);
}

export default function AdminLayout() {
	const [menuOpen, setMenuOpen] = useState(false);
	const { settings, newOrderCount } = useAdmin();
	const { pathname } = useLocation();

	useEffect(() => {
		setMenuOpen(false);
		window.scrollTo(0, 0);
	}, [pathname]);

	return (
		<div className="adm">
			<a className="adm-skip" href="#adm-main">
				Skip to content
			</a>
			<aside className="adm-sidebar">
				<Sidebar />
			</aside>

			<header className="adm-topbar">
				<button
					type="button"
					className="adm-icon-btn"
					onClick={() => setMenuOpen(true)}
					aria-label="Open menu"
					aria-expanded={menuOpen}
				>
					<FontAwesomeIcon icon={faBars} />
					{newOrderCount > 0 && <span className="adm-topbar-dot" aria-hidden="true" />}
				</button>
				<span className="adm-topbar-title">{settings?.name || "Mardini's"} admin</span>
				{newOrderCount > 0 && (
					<NavLink to="/admin/orders" className="adm-count is-urgent adm-topbar-count">
						{newOrderCount} new
					</NavLink>
				)}
			</header>
			{menuOpen && <MobileDrawer onClose={() => setMenuOpen(false)} />}

			<div className="adm-main-wrap">
				<PausedBanner />
				<main id="adm-main" className="adm-main">
					<Outlet />
				</main>
			</div>
		</div>
	);
}
