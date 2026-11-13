# server MVP (stub)

> Status: scaffold only. App shell cloned from `jobs/` patterns, minus D1/Access code.

## Goal

Working SvelteKit 2 + Svelte 5 shell on Cloudflare Pages (`server-faishal`), dev port 3036, DNS `server.faishal.id` CNAME `server-faishal.pages.dev`. Simulation-only, zero backend execution.

## Scaffold (done)

- `package.json` — SvelteKit 2.57.1, Svelte 5.55.4, adapter-cloudflare 7.2.8, Vite 8.0.8, pnpm 10.34.1, Node >=22 <25, port 3036
- `svelte.config.js` — adapter-cloudflare + platformProxy `wrangler.toml`
- `wrangler.toml` — Pages project `server-faishal`, compatibility_date 2026-07-19 + nodejs_compat, no bindings
- `scripts/deploy.sh` — check + build + `wrangler-faishal pages deploy`
- `src/routes/+page.svelte` — placeholder

## Next

- [ ] `pnpm install` + `pnpm check` green
- [ ] First Pages deploy + DNS CNAME
- [ ] Define first simulation scope (routes, zod schemas per §VAL)
