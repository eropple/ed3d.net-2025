import { sveltekit } from "@sveltejs/kit/vite";
import tailwindcss from "@tailwindcss/vite";
import { svelteTesting } from "@testing-library/svelte/vite";
import { requireNum, requireStr } from "node-getenv";
import { defineConfig } from "vite";

const baseUrl = requireStr("BASE_URL");
const port = requireNum("SITE_PORT");

const hmrHostname = new URL(baseUrl).hostname;

const hmr = {
  protocol: "wss",
  host: hmrHostname,
  port,
  clientPort: 443,
};

export default defineConfig({
	plugins: [tailwindcss(), sveltekit()],
  server: {
    host: true,
    strictPort: true,
    allowedHosts: true,
    port,

    open: false,
    hmr,
    cors: true,
  },
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
});
