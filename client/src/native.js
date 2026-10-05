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

// The app's native alarm (KitchenAlarm in kitchen-android/: plays on the Alarm volume, no tap
// needed), or null in a browser and in older app installs without it. Web deploys reach the
// tablet before a new APK does, so callers fall back to Web Audio.
// Never throws: anything unexpected means no native alarm, never a broken kitchen screen.
let alarmPlugin;
export function nativeAlarm() {
	if (alarmPlugin === undefined) {
		alarmPlugin = null;
		try {
			const capacitor = isKitchenApp() ? window.Capacitor : null;
			if (capacitor?.isPluginAvailable?.("KitchenAlarm") && typeof capacitor.nativePromise === "function") {
				// The page doesn't bundle @capacitor/core, so call the bridge the app injects.
				const call = (method, options = {}) => {
					try {
						return capacitor.nativePromise("KitchenAlarm", method, options);
					} catch (e) {
						return Promise.reject(e);
					}
				};
				alarmPlugin = { play: (options) => call("play", options), stop: () => call("stop") };
			}
		} catch {
			alarmPlugin = null;
		}
	}
	return alarmPlugin;
}
