# server.faishal.id — pointer

> Konteks lengkap ada di [AGENTS.md § Mulai di sini](../AGENTS.md). Baca itu dulu; berkas ini
> hanya penunjuk supaya Copilot membaca sumber yang sama dengan Claude dan Codex.

- **App**: shell simulasi server (SvelteKit 2 / Svelte 5, Cloudflare Pages), lokal-first tanpa backend
- **Dev**: `pnpm dev` → `http://localhost:3034`
- **Gate**: `pnpm check` (typecheck) dan `pnpm test` (vitest)
- **Desain**: [DESIGN.md](../DESIGN.md) → [docs/reference/design-system/](../docs/reference/design-system/)
- **Larangan**: jangan `pnpm dev`/`pnpm build` kecuali diminta; tanpa D1/R2/AI bindings; jangan buat berkas baru di root repo.
