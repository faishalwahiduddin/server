# Design System — server.faishal.id

Shell simulasi server: `Home` dan `Learn` (`src/routes`), terminal simulasi (`src/lib/components/SimTerminal.svelte`, xterm),
dan konten pelajaran yang dirender dengan kelas `.prose-doc`. Tailwind v4 (`@import 'tailwindcss'`) dengan token
semantik di `:root` yang dipetakan lewat `@theme inline`. Bukan back-office CRUD, jadi DS-4 tidak berlaku.

- Token & tipografi → [foundations.md](foundations.md)
- Pakai utilitas semantik (`bg-surface`, `text-ink`, `border-line`, `bg-brand`, `text-brand-ink`, `text-ok|bad|warn`); jangan hex di markup (§DS-3).
- Navigasi: `<nav aria-label="Main">`, tautan `min-h-11` (44px), `aria-current="page"` memakai `bg-brand text-brand-ink`, tautan "Skip to content" di awal.
