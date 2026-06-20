// See https://svelte.dev/docs/kit/types#app.d.ts
import type {
	D1Database,
	IncomingRequestCfProperties,
	ExecutionContext
} from '@cloudflare/workers-types';

declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			/** True when the request carries a valid admin session cookie. */
			admin: boolean;
		}
		// interface PageData {}
		// interface PageState {}
		interface Platform {
			env: {
				DB: D1Database;
				/** Discord webhook for the recruitment apply form (server secret). */
				DISCORD_WEBHOOK_URL?: string;
				/** WarcraftLogs API client (server secrets) for live progress/feats. */
				WCL_CLIENT_ID?: string;
				WCL_CLIENT_SECRET?: string;
				/** Shared officer password for the /admin panel (server secret). */
				ADMIN_PASSWORD?: string;
			};
			cf?: IncomingRequestCfProperties;
			ctx?: ExecutionContext;
		}
	}
}

export {};
