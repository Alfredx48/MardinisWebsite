import { useCallback, useEffect, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBell } from "@fortawesome/free-solid-svg-icons";
import { api } from "../api";
import { nativeAlarm, nativePush } from "../native";
import { useAdmin } from "./AdminContext";
import { alarmLevel } from "./adminUtils";

// Push alerts in the Android app (app 1.2+; does nothing in browsers or older apps). The server
// pushes every new order (app/services/kitchen_push.rb); with the app closed or the screen off,
// the app rings and opens the kitchen by itself. This hook:
// - registers the device's push token for whoever is signed in, on every launch (keeps it fresh
//   on the server) and whenever Firebase changes it;
// - pops up orders pushed while the page wasn't on screen, and right away for pushes that arrive
//   while it is, instead of at the next 10-second poll;
// - tells the app the Sound setting and loudness, so alerts while it's closed follow them.
// Returns unregister(), to call before signing out.
export function useKitchenPush(level) {
	const { alertOrders, soundOn } = useAdmin();
	const token = useRef(null);
	const alertRef = useRef(alertOrders);
	alertRef.current = alertOrders;

	useEffect(() => {
		const push = nativePush();
		if (!push) return undefined;
		let stopped = false;
		const register = async (next) => {
			try {
				const value = next || (await push.getToken()).token;
				if (stopped || !value) return;
				token.current = value;
				await api.post("/admin/devices", { token: value, platform: "android" });
			} catch {
				// Push isn't set up in this build, or we're offline: the next launch tries again.
			}
		};
		const takePending = async () => {
			try {
				const { orderIds } = await push.takePendingOrders();
				// Even if this effect was just cleaned up: taken orders must still pop up.
				if (orderIds?.length) alertRef.current(orderIds);
			} catch {
				// Nothing to show.
			}
		};
		const onToken = (e) => register(e.token);
		// Pushes now come here; on any other page the app rings by itself.
		push.setKitchenOpen({ open: true }).catch(() => {});
		register();
		takePending();
		window.addEventListener("kitchenpushtoken", onToken);
		window.addEventListener("kitchenpushorder", takePending);
		window.addEventListener("kitchenpushpending", takePending);
		return () => {
			stopped = true;
			push.setKitchenOpen({ open: false }).catch(() => {});
			window.removeEventListener("kitchenpushtoken", onToken);
			window.removeEventListener("kitchenpushorder", takePending);
			window.removeEventListener("kitchenpushpending", takePending);
		};
	}, []);

	useEffect(() => {
		nativeAlarm()
			?.setSound({ on: soundOn, volume: alarmLevel(level).native })
			.catch(() => {});
	}, [soundOn, level]);

	return useCallback(async () => {
		if (!token.current) return;
		await api.delete(`/admin/devices?token=${encodeURIComponent(token.current)}`).catch(() => {});
		token.current = null;
	}, []);
}

// What Android may be blocking, worst first, with the settings screen that fixes it.
const PUSH_PROBLEMS = [
	["notifications", "Notifications are off for this app, so new orders can't ring while it's closed."],
	["fullScreen", "Full-screen alerts are off, so new orders can't wake the tablet."],
	["battery", "Battery saving can delay new-order alerts while the app is closed."],
];
const PUSH_CHECK_MS = 30000;

// In the Android app: a bar under the top bar when Android would hold back push alerts.
export function PushStatusBanner() {
	const [problem, setProblem] = useState(null);

	useEffect(() => {
		const push = nativePush();
		if (!push) return undefined;
		const check = () =>
			push
				.status()
				.then((status) => setProblem(PUSH_PROBLEMS.find(([key]) => status[key] === false) || null))
				.catch(() => {});
		check();
		// Also catches coming back from the settings screen.
		const id = setInterval(check, PUSH_CHECK_MS);
		document.addEventListener("visibilitychange", check);
		return () => {
			clearInterval(id);
			document.removeEventListener("visibilitychange", check);
		};
	}, []);

	if (!problem) return null;
	const [which, message] = problem;
	return (
		<div className="adm-k-pushwarn" role="status">
			<FontAwesomeIcon icon={faBell} />
			<span>{message}</span>
			<button type="button" className="adm-k-btn" onClick={() => nativePush()?.openSettings({ which }).catch(() => {})}>
				Turn on
			</button>
		</div>
	);
}
