// The Android "Kitchen" app (kitchen-android/) loads the live /kitchen page in a WebView and
// injects window.Capacitor. Native-only behavior goes behind isKitchenApp(), with the
// browser behavior as the fallback, so the iPad and browser kitchen keep working as before.

export function isKitchenApp() {
	try {
		return window.Capacitor?.isNativePlatform?.() === true;
	} catch {
		return false;
	}
}

// A plugin of the app as { method(options) → Promise }, or null in a browser and in older app
// installs without it (web deploys reach the tablet before a new APK does, so callers fall
// back). Never throws: anything unexpected means no plugin, never a broken kitchen screen.
// The page doesn't bundle @capacitor/core, so it calls the bridge the app injects.
function bridgePlugin(name, methods) {
	try {
		const capacitor = isKitchenApp() ? window.Capacitor : null;
		if (!capacitor?.isPluginAvailable?.(name) || typeof capacitor.nativePromise !== "function") return null;
		const call = (method, options = {}) => {
			try {
				return capacitor.nativePromise(name, method, options);
			} catch (e) {
				return Promise.reject(e);
			}
		};
		return Object.fromEntries(methods.map((method) => [method, (options) => call(method, options)]));
	} catch {
		return null;
	}
}

// The native alarm (KitchenAlarm: plays on the Alarm volume, no tap needed). setSound tells it
// the page's Sound on/off and loudness, for push alerts while the page isn't open; app 1.1
// doesn't have it, so callers ignore its errors.
let alarmPlugin;
export function nativeAlarm() {
	if (alarmPlugin === undefined) alarmPlugin = bridgePlugin("KitchenAlarm", ["play", "stop", "setSound"]);
	return alarmPlugin;
}

// Push alerts (KitchenPush, app 1.2+): the device's push token, orders pushed while the page
// wasn't showing, and whether Android lets alerts through. See useKitchenPush.
let pushPlugin;
export function nativePush() {
	if (pushPlugin === undefined) pushPlugin = bridgePlugin("KitchenPush", ["getToken", "takePendingOrders", "status", "openSettings"]);
	return pushPlugin;
}
