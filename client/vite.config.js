import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
	plugins: [react()],
	server: {
		port: 4000,
		strictPort: true,
		// Rails API; open http://localhost:4000 in development. X-Forwarded-Host tells
		// Rails the site's real address, so links it builds (password reset) work.
		proxy: { "/api": { target: "http://localhost:3000", changeOrigin: true, xfwd: true } },
		// Phone testing through ngrok (see HANDOFF.md).
		allowedHosts: [".ngrok-free.app", ".ngrok.app", ".ngrok.io"],
	},
	build: {
		// bin/render-build.sh copies this folder into Rails' public/.
		outDir: "build",
		sourcemap: false,
	},
});
