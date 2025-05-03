// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces

import type { Logger } from "pino";
import type { DeepReadonly } from "utility-types";

import type { UserPrivate } from "$lib/domain/users/types.js"; // Adjusted path
import type { AppConfig } from "$lib/server/_config/types/index.js";
import type { AppRequestCradle } from "$lib/server/_deps/scopes/request.js"; // Adjusted path


declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			readonly logger: Logger;
			readonly config: DeepReadonly<AppConfig>;
			readonly deps: AppRequestCradle;
			readonly user: UserPrivate | null;
		}
		interface PageData {
			flash?: { type: "success" | "error" | "info" | "warning"; message: string };
		}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
