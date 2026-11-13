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

## Design Systems

Token dan komponen UI bersumber dari [`DESIGN.md`](./DESIGN.md) dan [`docs/reference/design-system/`](./docs/reference/design-system/) (token di `src/app.css`, Tailwind v4).

- Pakai utilitas semantik (`bg-surface`, `text-ink`, `border-line`, `bg-brand`, …); jangan hardcode hex di markup (§DS-3).
- Pola reusable baru → dokumentasikan di `docs/reference/design-system/` dalam task yang sama.
- Aksesibilitas WCAG AA (§DS-6): fokus terlihat, target sentuh ≥ 44px, hormati `prefers-reduced-motion`.

## Rules

- Local-first, no accounts, no backend execution.
- Validation (§VAL): every input, import and form is validated on the client and again on the server (zod) once forms exist. `zod` is pre-declared in dependencies as the validation stub.
- Time (§TZ): store UTC, display WIB.
