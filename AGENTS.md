# AGENTS.md — server.faishal.id

Simulation-only app shell. SvelteKit 2 / Svelte 5 on Cloudflare Pages. Local-first, no DB, zero backend execution.

## Mulai di sini (60 detik)

<!-- trace:begin start-here -->
- **App**: `server` — placeholder shell for future server-side simulations.
- **Port & URL**: dev `http://localhost:3034` (`vite dev --port 3034 --strictPort`) · produksi `https://server.faishal.id` (Pages project `server-faishal`)
- **Branch**: `main` = produksi. Kerja di branch task.
- **Cek**: `pnpm check` (typecheck) sebelum commit.
- **CLI**: pakai `gh-faishal` dan `wrangler-faishal` — jangan bare `gh`/`wrangler`.
- **Larangan**: jangan jalankan `pnpm dev`/`pnpm build` kecuali diminta (§L-1). Tanpa D1/R2/AI bindings. Tanpa Better Auth/Access/Turnstile/Sentry. Jangan buat berkas baru di root repo (§ORG).
<!-- trace:end -->

## Deploy

- Deploy: `pnpm deploy` (check, build, `wrangler-faishal pages deploy`). DNS: `server` CNAME → `server-faishal.pages.dev` (proxied) in the faishal.id zone.

## Layout

- `src/routes/+page.svelte` — placeholder. No forms yet.
- Plan: `docs/plans/active/`; changelog: `docs/changelog/YYYY/MM/`.

## Rules

- Local-first, no accounts, no backend execution.
- Validation (§VAL): every input, import and form is validated on the client and again on the server (zod) once forms exist. `zod` is pre-declared in dependencies as the validation stub.
- Time (§TZ): store UTC, display WIB.
