import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "react-toastify";
import { api } from "../api";
import { useRestaurant } from "../context/RestaurantContext";
import { usePolling } from "./adminUi";
import { getAudioContext, playChime, readPref, unlockAudio, writePref } from "./adminUtils";
import PrintTicket from "./PrintTicket";

const AdminContext = createContext(null);
const ACTIVE = ["new", "preparing", "ready"];
const ORDER_POLL_MS = 10000;
const CATERING_POLL_MS = 60000;

// Shared state for every admin screen: restaurant settings, the live (active) orders
// feed with new-order alerts, sidebar counts, sound preference and ticket printing.
// Orders are polled here rather than on the board so alerts ring on any admin page.
export function AdminProvider({ children }) {
	const { refresh: refreshSite } = useRestaurant();

	const [settings, setSettings] = useState(null);
	const [orders, setOrders] = useState(null);
	const [ordersError, setOrdersError] = useState(null);
	const [newCatering, setNewCatering] = useState(0);
	const [soundOn, setSoundOnState] = useState(() => readPref("sound", true));
	const [audioReady, setAudioReady] = useState(() => getAudioContext()?.state === "running");
	const [printing, setPrinting] = useState(null);
	// Orders cancelled while they were on the board (e.g. by the customer), shown
	// in a banner until someone in the kitchen acknowledges them.
	const [cancelAlerts, setCancelAlerts] = useState([]);

	const knownIds = useRef(null);
	const mutationVersion = useRef(0);
	// Last list the server sent, and orders this screen took off the board itself,
	// so orders that vanish for other reasons (e.g. a customer cancelling) stand out.
	const lastSeen = useRef(new Map());
	const closedHere = useRef(new Set());
	const soundOnRef = useRef(soundOn);
	soundOnRef.current = soundOn;

	/* ------------------------------------------------------------- settings */
	useEffect(() => {
		api.get("/admin/restaurant")
			.then(setSettings)
			.catch((e) => toast.error(e.message));
	}, []);

	const saveSettings = useCallback(
		async (attrs) => {
			const updated = await api.patch("/admin/restaurant", attrs);
			setSettings(updated);
			refreshSite();
			return updated;
		},
		[refreshSite]
	);

	/* --------------------------------------------------------------- orders */
	// An order left the board without anyone here touching it. If it was cancelled
	// (usually by the customer), make sure the kitchen doesn't keep cooking it.
	const checkVanished = useCallback(async (gone) => {
		for (const order of gone) {
			try {
				const fresh = await api.get(`/admin/orders/${order.id}`);
				if (fresh.status !== "cancelled") continue;
				if (soundOnRef.current) playChime();
				setCancelAlerts((list) => (list.some((a) => a.id === fresh.id) ? list : [...list, fresh]));
			} catch {
				// The next poll will show the current state anyway.
			}
		}
	}, []);

	const announce = useCallback((fresh) => {
		if (soundOnRef.current) playChime();
		if (fresh.length > 3) {
			toast.info(`${fresh.length} new orders just came in`, { autoClose: 8000 });
		} else {
			fresh.forEach((o) =>
				toast.info(`New order #${o.number} from ${o.customer_name}`, { autoClose: 8000 })
			);
		}
	}, []);

	const loadOrders = useCallback(async () => {
		const version = mutationVersion.current;
		try {
			const data = await api.get("/admin/orders?scope=active");
			// A status change happened while this request was in flight; its result may be
			// stale, so drop it and let the next poll reconcile.
			if (version !== mutationVersion.current) return;
			const list = data.orders || [];
			const current = new Set(list.map((o) => o.id));
			const gone = [...lastSeen.current.values()].filter(
				(o) => !current.has(o.id) && !closedHere.current.has(o.id)
			);
			lastSeen.current = new Map(list.map((o) => [o.id, o]));
			if (gone.length) checkVanished(gone);
			if (knownIds.current) {
				const fresh = list.filter((o) => o.status === "new" && !knownIds.current.has(o.id));
				if (fresh.length) announce(fresh);
			} else {
				knownIds.current = new Set();
			}
			list.forEach((o) => knownIds.current.add(o.id));
			setOrders(list);
			setOrdersError(null);
		} catch (e) {
			setOrdersError(e);
		}
	}, [announce, checkVanished]);

	const refreshOrders = usePolling(loadOrders, ORDER_POLL_MS);

	// Put a server (or optimistic) copy of an order into the active list.
	const applyOrder = useCallback((order) => {
		mutationVersion.current += 1;
		knownIds.current?.add(order.id);
		if (!ACTIVE.includes(order.status)) closedHere.current.add(order.id);
		setOrders((prev) => {
			if (!prev) return prev;
			const without = prev.filter((o) => o.id !== order.id);
			if (!ACTIVE.includes(order.status)) return without;
			const index = prev.findIndex((o) => o.id === order.id);
			if (index === -1) return [...prev, order];
			const next = [...prev];
			next[index] = order;
			return next;
		});
	}, []);

	// PATCH an order, updating the board optimistically for status changes.
	const updateOrder = useCallback(
		async (order, attrs) => {
			if (attrs.status) applyOrder({ ...order, status: attrs.status });
			try {
				const updated = await api.patch(`/admin/orders/${order.id}`, attrs);
				applyOrder(updated);
				return updated;
			} catch (e) {
				refreshOrders();
				throw e;
			}
		},
		[applyOrder, refreshOrders]
	);

	// { amount, reason, note } for a partial or full refund; { cancel: true, reason }
	// refunds whatever is left and cancels the order.
	const refundOrder = useCallback(
		async (order, params = {}) => {
			const updated = await api.post(`/admin/orders/${order.id}/refund`, params);
			applyOrder(updated);
			return updated;
		},
		[applyOrder]
	);

	const newOrderCount = orders ? orders.filter((o) => o.status === "new").length : 0;

	// "(2) Mardini's admin" in the tab so new orders are visible from other tabs.
	const baseTitle = useRef(document.title.replace(/^\(\d+\)\s*/, ""));
	useEffect(() => {
		document.title = newOrderCount ? `(${newOrderCount}) ${baseTitle.current}` : baseTitle.current;
	}, [newOrderCount]);
	useEffect(() => {
		const original = baseTitle.current;
		return () => {
			document.title = original;
		};
	}, []);

	/* ------------------------------------------------------------- catering */
	const loadCatering = useCallback(async () => {
		try {
			const list = await api.get("/admin/catering_inquiries?status=new");
			setNewCatering(list.length);
		} catch {
			// Sidebar count only; errors surface on the catering page itself.
		}
	}, []);
	const refreshCatering = usePolling(loadCatering, CATERING_POLL_MS);

	/* ---------------------------------------------------------------- sound */
	useEffect(() => {
		// Any click/tap/keypress in the admin unlocks audio for later chimes.
		const unlock = () => unlockAudio().then(setAudioReady);
		document.addEventListener("pointerdown", unlock, { once: true, capture: true });
		document.addEventListener("keydown", unlock, { once: true, capture: true });
		return () => {
			document.removeEventListener("pointerdown", unlock, { capture: true });
			document.removeEventListener("keydown", unlock, { capture: true });
		};
	}, []);

	const setSoundOn = useCallback(async (on) => {
		setSoundOnState(on);
		writePref("sound", on);
		if (on) {
			const ready = await unlockAudio();
			setAudioReady(ready);
			if (ready) playChime();
		}
	}, []);

	const enableAudio = useCallback(async () => {
		const ready = await unlockAudio();
		setAudioReady(ready);
		if (ready) playChime();
		else toast.error("This browser blocked sound. Check its site settings.");
	}, []);

	/* ------------------------------------------------------------- printing */
	// Wrapped in a fresh object so printing the same order twice still triggers.
	const printOrder = useCallback((order) => setPrinting({ order }), []);

	useEffect(() => {
		if (!printing) return undefined;
		document.body.classList.add("adm-printing");
		const done = () => setPrinting(null);
		window.addEventListener("afterprint", done);
		const id = setTimeout(() => window.print(), 60);
		return () => {
			clearTimeout(id);
			window.removeEventListener("afterprint", done);
			document.body.classList.remove("adm-printing");
		};
	}, [printing]);

	const dismissCancelAlert = useCallback((id) => setCancelAlerts((list) => list.filter((a) => a.id !== id)), []);

	const value = useMemo(
		() => ({
			cancelAlerts,
			dismissCancelAlert,
			settings,
			saveSettings,
			orders,
			ordersError,
			refreshOrders,
			updateOrder,
			refundOrder,
			applyOrder,
			newOrderCount,
			newCatering,
			refreshCatering,
			soundOn,
			setSoundOn,
			audioReady,
			enableAudio,
			printOrder,
		}),
		[
			cancelAlerts,
			dismissCancelAlert,
			settings,
			saveSettings,
			orders,
			ordersError,
			refreshOrders,
			updateOrder,
			refundOrder,
			applyOrder,
			newOrderCount,
			newCatering,
			refreshCatering,
			soundOn,
			setSoundOn,
			audioReady,
			enableAudio,
			printOrder,
		]
	);

	return (
		<AdminContext.Provider value={value}>
			{children}
			{printing &&
				createPortal(
					<div className="adm-print-root">
						<PrintTicket order={printing.order} restaurantName={settings?.name} />
					</div>,
					document.body
				)}
		</AdminContext.Provider>
	);
}

export const useAdmin = () => useContext(AdminContext);
