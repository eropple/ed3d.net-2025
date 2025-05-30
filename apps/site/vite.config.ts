import { sveltekit } from "@sveltejs/kit/vite";
import tailwindcss from "@tailwindcss/vite";
import { svelteTesting } from "@testing-library/svelte/vite";
import { requireNum, requireStr } from "node-getenv";
import { defineConfig } from "vite";

export default defineConfig(({ command, mode }) => {
	// Only load these environment variables for dev server
	const isDev = command === "serve";

	let serverConfig = {};

	if (isDev) {
		const baseUrl = requireStr("BASE_URL");
		const port = requireNum("SITE_PORT");
		const hmrHostname = new URL(baseUrl).hostname;

		const hmr = {
			protocol: "wss",
			host: hmrHostname,
			port,
			clientPort: 443,
		};

		serverConfig = {
			host: true,
			strictPort: true,
			allowedHosts: true,
			port,
			open: false,
			hmr,
			cors: true,
		};
	}

	return {
		plugins: [tailwindcss(), sveltekit()],
		server: serverConfig,
		dev: {},
		test: {
			workspace: [
				{
					extends: "./vite.config.ts",
					plugins: [svelteTesting()],
					test: {
						name: "client",
						environment: "jsdom",
						clearMocks: true,
						include: ["src/**/*.svelte.{test,spec}.{js,ts}"],
						exclude: ["src/lib/server/**"],
						setupFiles: ["./vitest-setup-client.ts"]
					}
				},
				{
					extends: "./vite.config.ts",
					test: {
						name: "server",
						environment: "node",
						include: ["src/**/*.{test,spec}.{js,ts}"],
						exclude: ["src/**/*.svelte.{test,spec}.{js,ts}"]
					}
				}
			]
		}
	};
});
