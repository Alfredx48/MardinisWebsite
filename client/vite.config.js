import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
	plugins: [react()],
	server: {
		port: 4000,
		strictPort: true,
		// Rails API; open http://localhost:4000 in development.
		proxy: { "/api": "http://localhost:3000" },
		// Phone testing through ngrok (see HANDOFF.md).
		allowedHosts: [".ngrok-free.app", ".ngrok.app", ".ngrok.io"],
	},
	build: {
		// bin/render-build.sh copies this folder into Rails' public/.
		outDir: "build",
		sourcemap: false,
	},
});
