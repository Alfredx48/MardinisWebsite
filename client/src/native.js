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
