import type { CapacitorConfig } from "@capacitor/cli";

// The app loads the live kitchen screen; web deploys reach the tablet without a new APK.
// For a dev APK against the local DB, build with KITCHEN_URL set to the ngrok URL,
// e.g. KITCHEN_URL=https://abc123.ngrok-free.app/kitchen ./build-apk.sh --dev
const url = process.env.KITCHEN_URL || "https://mardinismenlopark.com/kitchen";

const config: CapacitorConfig = {
	appId: "com.mardinis.kitchen",
	appName: "Kitchen",
	webDir: "www",
	backgroundColor: "#1c1814",
	server: {
		url,
	},
};

export default config;
