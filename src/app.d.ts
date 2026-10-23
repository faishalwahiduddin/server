/// <reference types="@cloudflare/workers-types" />
declare global {
	namespace App {
		interface Platform {
			env: Record<string, string | undefined>;
			cf?: IncomingRequestCfProperties;
			ctx?: ExecutionContext;
		}
	}
}
export {};
