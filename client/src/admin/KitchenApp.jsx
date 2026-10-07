import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
	faDownload,
	faExpand,
	faGaugeHigh,
	faKey,
	faRightFromBracket,
	faRotate,
	faVolumeHigh,
	faVolumeLow,
	faVolumeXmark,
	faWifi,
} from "@fortawesome/free-solid-svg-icons";
import { Modal, PasswordInput, Spinner } from "../components/ui";
import { useAuth } from "../context/AuthContext";
import { isKitchenApp, nativeAlarm, nativeApp } from "../native";
import { AdminProvider, useAdmin } from "./AdminContext";
import { CancelledBanner } from "./AdminLayout";
import KitchenOrders from "./KitchenOrders";
import { PushStatusBanner, useKitchenPush } from "./kitchenPush";
import { ConfirmDialog, OverflowMenu, useNow } from "./adminUi";
import { ALARM_LEVELS, alarmLevel, writePref } from "./adminUtils";
import "./admin.css";
import "./kitchen.css";

// Orders older than this are shown as possibly out of date (polling runs every 10s).
const STALE_SECONDS = 35;
// The Android app checks this often for a new deploy of the site...
const VERSION_CHECK_MS = 5 * 60 * 1000;
// ...and reloads once nobody has touched the screen for this long.
const IDLE_BEFORE_RELOAD_MS = 2 * 60 * 1000;
// Never reload while one of these is open: popups, dialogs, menus, the cancelled-order banner.
const BUSY_SELECTOR = '[role="alertdialog"], [role="dialog"], [role="menu"], .adm-cancelled';
// Web deploys reach the Android app by themselves, native changes need a new APK. The kitchen asks
// for an update while the app's versionCode (kitchen-android/android/app/build.gradle) is lower.
// Raise it when the web code starts relying on a new app's native code. 4 = app 1.3.
const MIN_APP_VERSION = 4;

const isIos = () =>
	/iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

// True when opened from the home-screen icon or the Android app rather than a browser tab.
const isInstalled = () =>
	isKitchenApp() ||
	window.matchMedia("(display-mode: standalone)").matches ||
	window.matchMedia("(display-mode: fullscreen)").matches ||
	navigator.standalone === true;

const canFullscreen = () =>
	!isInstalled() && Boolean(document.fullscreenEnabled || document.webkitFullscreenEnabled);

function toggleFullscreen() {
	const el = document.documentElement;
	if (document.fullscreenElement || document.webkitFullscreenElement) {
		(document.exitFullscreen || document.webkitExitFullscreen).call(document);
	} else {
		const request = el.requestFullscreen || el.webkitRequestFullscreen;
		Promise.resolve(request?.call(el)).catch(() => {});
	}
}

/* ------------------------------------------------------------------- hooks */
// Swaps in the kitchen's manifest and home-screen details, so installing from this
// page creates a "Kitchen" app that opens straight to /kitchen.
function useKitchenHead() {
	useEffect(() => {
		const undo = [
			setHeadTag("link", "rel", "manifest", "href", "/kitchen-manifest.json"),
			setHeadTag("link", "rel", "apple-touch-icon", "href", "/kitchen-icon-180.png"),
			setHeadTag("meta", "name", "apple-mobile-web-app-title", "content", "Kitchen"),
			setHeadTag("meta", "name", "apple-mobile-web-app-capable", "content", "yes"),
			setHeadTag("meta", "name", "mobile-web-app-capable", "content", "yes"),
		];
		return () => undo.forEach((fn) => fn());
	}, []);
}

function setHeadTag(tag, keyAttr, key, attr, value) {
	let el = document.head.querySelector(`${tag}[${keyAttr}="${key}"]`);
	const created = !el;
	if (created) {
		el = document.createElement(tag);
		el.setAttribute(keyAttr, key);
		document.head.appendChild(el);
	}
	const previous = el.getAttribute(attr);
	el.setAttribute(attr, value);
	return () => (created ? el.remove() : el.setAttribute(attr, previous));
}

// Chrome/Android's install prompt, saved so the "Install app" button can show it.
function useInstallPrompt() {
	const [prompt, setPrompt] = useState(null);
	useEffect(() => {
		const onPrompt = (e) => {
			e.preventDefault();
			setPrompt(e);
		};
		const onInstalled = () => setPrompt(null);
		window.addEventListener("beforeinstallprompt", onPrompt);
		window.addEventListener("appinstalled", onInstalled);
		return () => {
			window.removeEventListener("beforeinstallprompt", onPrompt);
			window.removeEventListener("appinstalled", onInstalled);
		};
	}, []);
	return prompt;
}

// Keeps the screen on while the board is open. The browser drops the lock whenever
// the app is hidden, so ask again each time it comes back.
function useWakeLock(enabled) {
	const [active, setActive] = useState(false);
	useEffect(() => {
		if (!enabled || !("wakeLock" in navigator)) return undefined;
		let lock = null;
		let pending = false;
		let stopped = false;
		const request = async () => {
			if (document.hidden || lock || pending) return;
			pending = true;
			try {
				const next = await navigator.wakeLock.request("screen");
				if (stopped) {
					next.release();
					return;
				}
				lock = next;
				setActive(true);
				next.addEventListener("release", () => {
					lock = null;
					setActive(false);
				});
			} catch {
				setActive(false);
			} finally {
				pending = false;
			}
		};
		const onVisibility = () => !document.hidden && request();
		request();
		document.addEventListener("visibilitychange", onVisibility);
		return () => {
			stopped = true;
			document.removeEventListener("visibilitychange", onVisibility);
			lock?.release();
		};
	}, [enabled]);
	return active;
}

// The built page's main script ("/assets/index-<hash>.js"); it changes with every deploy.
// The Vite dev server has none, so this is off in development.
function mainScript(doc) {
	return doc.querySelector('script[type="module"][src^="/assets/"]')?.getAttribute("src") || null;
}

// The live site's main script, or null if the site can't be reached right now.
async function liveScript() {
	try {
		const res = await fetch("/kitchen", { cache: "no-store", headers: { Accept: "text/html" } });
		if (!res.ok) return null;
		return mainScript(new DOMParser().parseFromString(await res.text(), "text/html"));
	} catch {
		return null;
	}
}

// The Android app stays open all day, so it reloads itself after a deploy instead of running
// old code until someone restarts it. It waits until no order popup, dialog or banner is up
// and the screen has been left alone for a while, and checks the site is reachable right
// before reloading. The sign-in cookie survives the reload. Only in the app with the native
// alarm: after a reload a browser needs another tap before it can play sound.
function useReloadOnDeploy(enabled, busy) {
	const busyRef = useRef(busy);
	busyRef.current = busy;
	useEffect(() => {
		const running = mainScript(document);
		if (!enabled || !running) return undefined;
		let lastTouch = Date.now();
		let lastCheck = Date.now();
		let updateReady = false;
		const touched = () => {
			lastTouch = Date.now();
		};
		const canReload = () =>
			Date.now() - lastTouch >= IDLE_BEFORE_RELOAD_MS && !busyRef.current && !document.querySelector(BUSY_SELECTOR);
		const tick = async () => {
			if (!updateReady && Date.now() - lastCheck >= VERSION_CHECK_MS) {
				lastCheck = Date.now();
				const latest = await liveScript();
				updateReady = Boolean(latest) && latest !== running;
			}
			if (!updateReady || !canReload()) return;
			// Only reload while the site answers, so a Wi-Fi drop never leaves an error page.
			const latest = await liveScript();
			if (latest && latest !== running && canReload()) window.location.reload();
		};
		document.addEventListener("pointerdown", touched, { capture: true });
		document.addEventListener("keydown", touched, { capture: true });
		const id = setInterval(tick, 30000);
		return () => {
			clearInterval(id);
			document.removeEventListener("pointerdown", touched, { capture: true });
			document.removeEventListener("keydown", touched, { capture: true });
		};
	}, [enabled]);
}

const subscribeOnline = (cb) => {
	window.addEventListener("online", cb);
	window.addEventListener("offline", cb);
	return () => {
		window.removeEventListener("online", cb);
		window.removeEventListener("offline", cb);
	};
};
const useOnline = () => useSyncExternalStore(subscribeOnline, () => navigator.onLine);

/* -------------------------------------------------------------- components */
function secondsLabel(seconds) {
	if (seconds < 60) return `${seconds}s`;
	return `${Math.floor(seconds / 60)} min`;
}

function useConnection() {
	const { ordersError, ordersUpdatedAt } = useAdmin();
	const online = useOnline();
	const now = useNow(5000);
	const age = ordersUpdatedAt ? Math.max(0, Math.round((now - ordersUpdatedAt) / 1000)) : null;
	if (!online) return { ok: false, label: "No internet", age };
	if (age === null && !ordersError) return { ok: false, connecting: true, label: "Connecting…", age };
	if (age === null) return { ok: false, label: "Can't connect", age };
	if (ordersError || age > STALE_SECONDS) return { ok: false, label: "Reconnecting…", age };
	return { ok: true, label: "Live", age };
}

function ConnectionPill() {
	const { ok, label, age } = useConnection();
	return (
		<span className={`adm-k-conn${ok ? " is-ok" : " is-bad"}`} role="status">
			<span className="adm-k-conn-dot" aria-hidden="true" />
			<span>{label}</span>
			{age !== null && <span className="adm-k-conn-age">· {secondsLabel(age)} ago</span>}
		</span>
	);
}

function OfflineBanner() {
	const { ok, connecting, age } = useConnection();
	if (ok || connecting) return null;
	return (
		<div className="adm-k-offline" role="alert">
			<FontAwesomeIcon icon={faWifi} />
			<span>
				<strong>Can't reach the server, so new orders may be missing.</strong>{" "}
				{age === null ? "No orders have loaded yet." : `Orders on screen are from ${secondsLabel(age)} ago.`} Retrying
				every 10 seconds. Check the tablet's Wi-Fi.
			</span>
		</div>
	);
}

// In the Android app: the installed app's version, or versionCode 0 for apps from before 1.3,
// which can't report it. Null until known, and in browsers.
function useAppVersion() {
	const [version, setVersion] = useState(null);
	useEffect(() => {
		if (!isKitchenApp()) return undefined;
		const app = nativeApp();
		if (!app) {
			setVersion({ versionCode: 0, versionName: "1.2 or older" });
			return undefined;
		}
		let stopped = false;
		app
			.info()
			.then((info) => !stopped && setVersion(info))
			.catch(() => {});
		return () => {
			stopped = true;
		};
	}, []);
	return version;
}

function AppUpdateBanner() {
	const version = useAppVersion();
	if (!version || version.versionCode >= MIN_APP_VERSION) return null;
	return (
		<div className="adm-k-pushwarn" role="status">
			<FontAwesomeIcon icon={faDownload} />
			<span>
				<strong>Update the Kitchen app.</strong> This tablet has version {version.versionName}, and the kitchen
				needs a newer one. Ask the manager to install the update.
			</span>
		</div>
	);
}

function Clock() {
	const now = useNow(10000);
	return (
		<span className="adm-k-clock">
			{new Date(now).toLocaleTimeString("en-US", {
				hour: "numeric",
				minute: "2-digit",
				timeZone: "America/Los_Angeles",
			})}
		</span>
	);
}

// Browsers only play sound after a tap, and iPads take that back whenever the app
// goes to the background, so the screen asks for a tap on launch and on return.
function StartOverlay({ resuming, onStart }) {
	return (
		<button type="button" className="adm-k-start" onClick={onStart} autoFocus>
			<span className="adm-k-start-icon" aria-hidden="true">
				<FontAwesomeIcon icon={faVolumeHigh} />
			</span>
			<span className="adm-k-start-title">{resuming ? "Tap to turn sound back on" : "Tap to start"}</span>
			<span className="adm-k-start-sub">
				{resuming
					? "The tablet paused the order sound while the app was in the background."
					: "Turns on the new-order sound and keeps the screen awake."}
			</span>
		</button>
	);
}

function InstallHelp({ installPrompt, onClose }) {
	const ios = isIos();
	const install = async () => {
		installPrompt.prompt();
		await installPrompt.userChoice.catch(() => {});
		onClose();
	};
	return (
		<Modal onClose={onClose} label="Install the kitchen app" className="adm-modal-md">
			<div className="modal-body adm-k-help">
				<h2 className="adm-modal-title">Install the kitchen app</h2>
				{installPrompt ? (
					<p>Adds a “Kitchen” icon to the home screen that opens straight to this board, full screen.</p>
				) : ios ? (
					<ol>
						<li>
							Open this page in <strong>Safari</strong>.
						</li>
						<li>
							Tap the <strong>Share</strong> button (the square with an arrow), then{" "}
							<strong>Add to Home Screen</strong>.
						</li>
						<li>Open “Kitchen” from the home screen and sign in once.</li>
					</ol>
				) : (
					<ol>
						<li>
							Open this page in <strong>Chrome</strong>.
						</li>
						<li>
							Tap the <strong>⋮</strong> menu, then <strong>Install app</strong> or{" "}
							<strong>Add to Home screen</strong>.
						</li>
						<li>Open “Kitchen” from the home screen and sign in once.</li>
					</ol>
				)}
				<h3>Tablet setup</h3>
				<ul>
					<li>Keep it plugged in and turn the volume all the way up.</li>
					<li>
						{ios
							? "Settings → Display & Brightness → Auto-Lock → Never."
							: "Settings → Display → Screen timeout → the longest option."}{" "}
						The app also tries to keep the screen on by itself.
					</li>
					<li>Turn off notifications from other apps, so they don't cover the board.</li>
				</ul>
			</div>
			<div className="modal-footer">
				<span className="spacer" />
				<button type="button" className="btn btn-secondary" onClick={onClose}>
					Close
				</button>
				{installPrompt && (
					<button type="button" className="btn btn-primary" onClick={install}>
						<FontAwesomeIcon icon={faDownload} />
						Install
					</button>
				)}
			</div>
		</Modal>
	);
}

// Alarm loudness for this device: Loud / Medium / Quiet, or Off (the same as Sound off).
// Picking a level plays the alarm once at that level.
function LoudnessDialog({ level, onLevel, onClose }) {
	const { soundOn, setSoundOn, enableAudio } = useAdmin();
	const choose = (id) => {
		if (id === "off") {
			setSoundOn(false);
			return;
		}
		writePref("alarmLevel", id);
		onLevel(id);
		// Both play the alarm at the level just saved.
		if (soundOn) enableAudio();
		else setSoundOn(true);
	};
	const current = soundOn ? level : "off";
	return (
		<Modal onClose={onClose} label="Alarm loudness" className="adm-modal-md">
			<div className="modal-body adm-k-help">
				<h2 className="adm-modal-title">Alarm loudness</h2>
				<p>How loud new orders and reminders ring on this device.</p>
				<div className="segmented">
					{[...ALARM_LEVELS, { id: "off", label: "Off" }].map(({ id, label }) => (
						<button key={id} type="button" aria-pressed={current === id} onClick={() => choose(id)}>
							{label}
						</button>
					))}
				</div>
			</div>
			<div className="modal-footer">
				<span className="spacer" />
				<button type="button" className="btn btn-primary" onClick={onClose}>
					Done
				</button>
			</div>
		</Modal>
	);
}

function KitchenScreen() {
	const { user, logout } = useAuth();
	const { newAlerts, refreshOrders, soundOn, setSoundOn, audioReady, enableAudio } = useAdmin();
	// The Android app's native alarm plays without a tap, so there's no "Tap to start" there.
	const [started, setStarted] = useState(() => Boolean(nativeAlarm()));
	// This browser refused sound even after a tap; don't keep covering the board.
	const [audioBlocked, setAudioBlocked] = useState(false);
	const [showInstall, setShowInstall] = useState(false);
	const [showLoudness, setShowLoudness] = useState(false);
	const [level, setLevel] = useState(() => alarmLevel().id);
	const [confirmLogout, setConfirmLogout] = useState(false);
	const navigate = useNavigate();
	const installPrompt = useInstallPrompt();
	// The Android app keeps the screen on by itself.
	const inApp = isKitchenApp();
	const awake = useWakeLock(started && !inApp);
	useReloadOnDeploy(Boolean(nativeAlarm()), newAlerts.length > 0);
	const unregisterPush = useKitchenPush(level);
	const signOut = useCallback(async () => {
		await unregisterPush(); // while still signed in
		await logout();
	}, [unregisterPush, logout]);

	const start = useCallback(async () => {
		setStarted(true);
		if (soundOn) setAudioBlocked(!(await enableAudio()));
	}, [soundOn, enableAudio]);

	const needsTap = !started || (soundOn && !audioReady && !audioBlocked);
	const installed = isInstalled();

	const menuItems = [
		{ label: "Refresh now", icon: faRotate, onClick: refreshOrders },
		{ label: "Test sound", icon: faVolumeHigh, onClick: enableAudio },
		{ label: "Alarm loudness", icon: faVolumeLow, onClick: () => setShowLoudness(true) },
		...(user.admin ? [{ label: "Open admin", icon: faGaugeHigh, onClick: () => navigate("/admin/orders") }] : []),
		...(canFullscreen() ? [{ label: "Full screen", icon: faExpand, onClick: toggleFullscreen }] : []),
		...(installed ? [] : [{ label: "Install app", icon: faDownload, onClick: () => setShowInstall(true) }]),
		{ label: "Change password", icon: faKey, onClick: () => navigate("/account") },
		{ label: "Log out", icon: faRightFromBracket, onClick: () => setConfirmLogout(true) },
	];

	return (
		<div className={`adm-kitchen${newAlerts.length ? " is-alerting" : ""}`}>
			<header className="adm-k-bar">
				<div className="adm-k-brand">
					<span className="adm-k-brand-name">Mardini's</span>
					<span className="adm-k-brand-sub">Kitchen</span>
				</div>
				<Clock />
				<ConnectionPill />
				<span className="spacer" />
				{started && !awake && !inApp && (
					<span className="adm-k-hint" title="Set the tablet's screen timeout to Never">
						Screen may sleep
					</span>
				)}
				{soundOn && !audioReady ? (
					<button type="button" className="adm-k-btn is-off" onClick={start}>
						<FontAwesomeIcon icon={faVolumeXmark} />
						<span>Sound blocked, tap to retry</span>
					</button>
				) : (
					<button
						type="button"
						className={`adm-k-btn${soundOn ? "" : " is-off"}`}
						onClick={() => setSoundOn(!soundOn)}
						aria-pressed={soundOn}
					>
						<FontAwesomeIcon icon={soundOn ? faVolumeHigh : faVolumeXmark} />
						<span>{soundOn ? `Sound on${level === "loud" ? "" : ` · ${alarmLevel(level).label}`}` : "Sound off"}</span>
					</button>
				)}
				{!installed && (
					<button type="button" className="adm-k-btn adm-k-hide-narrow" onClick={() => setShowInstall(true)}>
						<FontAwesomeIcon icon={faDownload} />
						<span>Install app</span>
					</button>
				)}
				{user.admin && (
					<Link to="/admin/orders" className="adm-k-btn adm-k-hide-narrow">
						<FontAwesomeIcon icon={faGaugeHigh} />
						<span>Admin</span>
					</Link>
				)}
				<OverflowMenu label="Kitchen menu" items={menuItems} />
			</header>

			<CancelledBanner />
			<OfflineBanner />
			<AppUpdateBanner />
			<PushStatusBanner />

			<main className="adm-k-main">
				<KitchenOrders />
			</main>

			{needsTap && <StartOverlay resuming={started} onStart={start} />}
			{showInstall && <InstallHelp installPrompt={installPrompt} onClose={() => setShowInstall(false)} />}
			{showLoudness && <LoudnessDialog level={level} onLevel={setLevel} onClose={() => setShowLoudness(false)} />}
			{confirmLogout && (
				<ConfirmDialog
					title="Log out of the kitchen screen?"
					confirmLabel="Log out"
					onConfirm={signOut}
					onClose={() => setConfirmLogout(false)}
				>
					<p>New orders won't show up here until someone signs in again.</p>
				</ConfirmDialog>
			)}
		</div>
	);
}

function KitchenLogin() {
	const { user, login, logout } = useAuth();
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState(null);
	const [busy, setBusy] = useState(false);

	const submit = async (e) => {
		e.preventDefault();
		setBusy(true);
		setError(null);
		try {
			await login(email, password);
		} catch (err) {
			setError(err.message);
			setBusy(false);
		}
	};

	return (
		<div className="adm-k-login">
			<div className="card adm-k-login-card">
				<div className="adm-k-login-brand">
					<span className="adm-k-brand-name">Mardini's</span>
					<span className="adm-k-brand-sub">Kitchen</span>
				</div>
				{user ? (
					<>
						<p>
							<strong>{user.name}</strong> doesn't have kitchen access. The owner can turn it on in Admin →
							Customers.
						</p>
						<button type="button" className="btn btn-secondary btn-lg btn-block" onClick={logout}>
							Use a different account
						</button>
					</>
				) : (
					<form onSubmit={submit} className="stack">
						<p className="muted">Sign in once on this tablet. It stays signed in.</p>
						<div className="field">
							<label htmlFor="k-email">Email</label>
							<input
								id="k-email"
								className="input"
								type="email"
								required
								autoComplete="username"
								value={email}
								onChange={(e) => setEmail(e.target.value)}
							/>
						</div>
						<div className="field">
							<label htmlFor="k-password">Password</label>
							<PasswordInput
								id="k-password"
								className="input"
								required
								autoComplete="current-password"
								value={password}
								onChange={(e) => setPassword(e.target.value)}
							/>
						</div>
						{error && (
							<div className="form-error" role="alert">
								{error}
							</div>
						)}
						<button className="btn btn-primary btn-lg btn-block" disabled={busy}>
							{busy ? "Signing in…" : "Sign in"}
						</button>
						<Link to="/forgot-password" state={{ email }} className="link-btn adm-k-forgot">
							Forgot password?
						</Link>
					</form>
				)}
			</div>
		</div>
	);
}

export default function KitchenApp() {
	const { user, loading } = useAuth();
	useKitchenHead();

	useEffect(() => {
		// Makes the app installable and shows a friendly page if it's opened offline.
		navigator.serviceWorker?.register("/sw.js").catch(() => {});
	}, []);

	if (loading) return <Spinner />;
	if (!user?.admin && !user?.kitchen) return <KitchenLogin />;
	return (
		<AdminProvider kitchen title="Mardini's Kitchen">
			<KitchenScreen />
		</AdminProvider>
	);
}
