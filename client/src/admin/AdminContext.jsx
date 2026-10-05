import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "react-toastify";
import { api } from "../api";
import { useRestaurant } from "../context/RestaurantContext";
import { nativeAlarm } from "../native";
import { usePolling } from "./adminUi";
import { audioIsReady, getAudioContext, playChime, readPref, stopChime, unlockAudio, writePref } from "./adminUtils";
import PrintTicket from "./PrintTicket";

const AdminContext = createContext(null);
const ACTIVE = ["new", "preparing", "ready"];
const ORDER_POLL_MS = 10000;
const CATERING_POLL_MS = 60000;
// The kitchen screen repeats the chime until someone acknowledges the new order.
const REPEAT_ALERT_MS = 20000;

// Shared state for every admin screen: restaurant settings, the live (active) orders
// feed with new-order alerts, sidebar counts, sound preference and ticket printing.
// Orders are polled here rather than on the board so alerts ring on any admin page.
// `kitchen` is the kitchen screen: orders only (kitchen staff can't load settings or
// catering), a louder chime, and alerts that repeat until acknowledged.
export function AdminProvider({ children, kitchen = false, title }) {
	const { refresh: refreshSite } = useRestaurant();

	const [settings, setSettings] = useState(null);
	const [orders, setOrders] = useState(null);
	const [ordersError, setOrdersError] = useState(null);
	const [ordersUpdatedAt, setOrdersUpdatedAt] = useState(null);
	// New orders nobody has acknowledged yet (kitchen screen only).
	const [unackedIds, setUnackedIds] = useState([]);
	// Same list, readable right away (alertOrders checks it just after loadOrders may have added some).
	const unackedRef = useRef([]);
	const setUnacked = useCallback((update) => {
		unackedRef.current = update(unackedRef.current);
		setUnackedIds(unackedRef.current);
	}, []);
	const [newCatering, setNewCatering] = useState(0);
	const [soundOn, setSoundOnState] = useState(() => readPref("sound", true));
	const [audioReady, setAudioReady] = useState(audioIsReady);
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
		if (kitchen) return;
		api.get("/admin/restaurant")
			.then(setSettings)
			.catch((e) => toast.error(e.message));
	}, [kitchen]);

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
				if (soundOnRef.current) playChime({ loud: kitchen });
				setCancelAlerts((list) => (list.some((a) => a.id === fresh.id) ? list : [...list, fresh]));
			} catch {
				// The next poll will show the current state anyway.
			}
		}
	}, [kitchen]);

	const announce = useCallback((fresh) => {
		if (soundOnRef.current) playChime({ loud: kitchen });
		if (kitchen) {
			setUnacked((ids) => [...ids, ...fresh.map((o) => o.id).filter((id) => !ids.includes(id))]);
		} else if (fresh.length > 3) {
			toast.info(`${fresh.length} new orders just came in`, { autoClose: 8000 });
		} else {
			fresh.forEach((o) =>
				toast.info(`New order #${o.number} from ${o.customer_name}`, { autoClose: 8000 })
			);
		}
	}, [kitchen, setUnacked]);

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
			setOrdersUpdatedAt(Date.now());
		} catch (e) {
			setOrdersError(e);
		}
	}, [announce, checkVanished]);

	const refreshOrders = usePolling(loadOrders, ORDER_POLL_MS);

	// Orders pushed to the Android app (useKitchenPush): pop them up and ring like new arrivals,
	// even right after the page loaded, when loadOrders doesn't announce orders already there.
	const alertOrders = useCallback(
		async (ids) => {
			await loadOrders();
			const pending = ids
				.map(Number)
				.filter((id) => lastSeen.current.get(id)?.status === "new" && !unackedRef.current.includes(id));
			if (!pending.length) return;
			if (soundOnRef.current) playChime({ loud: kitchen });
			setUnacked((list) => [...list, ...pending.filter((id) => !list.includes(id))]);
		},
		[loadOrders, kitchen, setUnacked]
	);

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

	// An alert clears itself once the order leaves "New" (started, cancelled...).
	const newAlerts = useMemo(
		() => (orders || []).filter((o) => o.status === "new" && unackedIds.includes(o.id)),
		[orders, unackedIds]
	);
	// Acknowledge some alerts (by order id), or all of them.
	const acknowledgeAlerts = useCallback(
		(ids) => setUnacked((list) => (ids ? list.filter((id) => !ids.includes(id)) : [])),
		[setUnacked]
	);

	useEffect(() => {
		if (!newAlerts.length) return undefined;
		const id = setInterval(() => {
			if (soundOnRef.current) playChime({ loud: true });
		}, REPEAT_ALERT_MS);
		return () => clearInterval(id);
	}, [newAlerts.length]);

	// "(2) Mardini's admin" in the tab so new orders are visible from other tabs.
	const [originalTitle] = useState(() => document.title.replace(/^\(\d+\)\s*/, ""));
	const baseTitle = title || originalTitle;
	useEffect(() => {
		document.title = newOrderCount ? `(${newOrderCount}) ${baseTitle}` : baseTitle;
	}, [newOrderCount, baseTitle]);
	useEffect(
		() => () => {
			document.title = originalTitle;
		},
		[originalTitle]
	);

	/* ------------------------------------------------------------- catering */
	const loadCatering = useCallback(async () => {
		if (kitchen) return;
		try {
			const list = await api.get("/admin/catering_inquiries?status=new");
			setNewCatering(list.length);
		} catch {
			// Sidebar count only; errors surface on the catering page itself.
		}
	}, [kitchen]);
	const refreshCatering = usePolling(loadCatering, CATERING_POLL_MS);

	/* ---------------------------------------------------------------- sound */
	useEffect(() => {
		// Any click/tap/keypress in the admin unlocks audio for later chimes. iPads
		// suspend audio again when the app goes to the background, so keep listening.
		// The Android app's native alarm needs none of this.
		if (nativeAlarm()) return undefined;
		const ctx = getAudioContext();
		const unlock = () => {
			if (ctx?.state !== "running") unlockAudio();
		};
		const onStateChange = () => setAudioReady(ctx.state === "running");
		ctx?.addEventListener("statechange", onStateChange);
		document.addEventListener("pointerdown", unlock, { capture: true });
		document.addEventListener("keydown", unlock, { capture: true });
		return () => {
			ctx?.removeEventListener("statechange", onStateChange);
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
			if (ready) playChime({ loud: kitchen });
		} else {
			stopChime();
		}
	}, [kitchen]);

	const enableAudio = useCallback(async () => {
		const ready = await unlockAudio();
		setAudioReady(ready);
		if (ready) playChime({ loud: kitchen });
		else toast.error("This browser blocked sound. Check its site settings.");
		return ready;
	}, [kitchen]);

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
			ordersUpdatedAt,
			refreshOrders,
			alertOrders,
			updateOrder,
			refundOrder,
			applyOrder,
			newOrderCount,
			newAlerts,
			acknowledgeAlerts,
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
			ordersUpdatedAt,
			refreshOrders,
			alertOrders,
			updateOrder,
			refundOrder,
			applyOrder,
			newOrderCount,
			newAlerts,
			acknowledgeAlerts,
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
