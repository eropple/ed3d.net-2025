// See https://svelte.dev/docs/kit/types#app.d.ts

import type { AppRequestCradle } from "./lib/server/_deps/scopes/request.js";
import type { UserPrivate } from "./lib/server/domain/auth/types.js";
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		interface Locals {
      readonly logger: Logger;
      readonly config: DeepReadonly<AppConfig>;
      readonly deps: AppRequestCradle;
      readonly user: UserPrivate | null;
    }
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
