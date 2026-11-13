# Foundations — server.faishal.id

Nilai disalin dari `src/app.css`. Bila berbeda, berkas itu yang benar.

## Warna (terang / gelap via `prefers-color-scheme`)

| Token | Terang | Gelap | Peran |
|-------|--------|-------|-------|
| `--bg` | `#f6f7f9` | `#0f1218` | Latar halaman |
| `--surface` | `#ffffff` | `#171c25` | Header, kartu, blok kode |
| `--ink` | `#14181f` | `#e8ebf0` | Teks utama |
| `--muted` | `#4f5968` | `#a3adbc` | Teks sekunder, blockquote |
| `--line` | `#d3d8e0` | `#2a3140` | Garis |
| `--brand` | `#0b5cad` | `#5aa2ee` | Tautan, fokus, item nav aktif |
| `--brand-ink` | `#ffffff` | `#0a0f17` | Teks di atas `--brand` |
| `--ok` | `#1a7f4b` | `#4cc38a` | Sukses |
| `--bad` | `#b3261e` | `#ff7b72` | Error |
| `--warn` | `#8a5a00` | `#e3b341` | Peringatan |

Utilitas Tailwind: `--color-<nama>` dipetakan ke token di atas lewat `@theme inline` (`bg-bg`, `bg-surface`, `text-ink`, dst).

## Tipografi

- Sans: `'Inter', ui-sans-serif, system-ui, sans-serif`, `line-height: 1.6`.
- Mono: `ui-monospace, 'SFMono-Regular', Menlo, monospace` (`code` 0.9em).
- `.prose-doc`: lebar maks `75ch`; h1 1.75rem/700, h2 1.3rem/650 dengan garis bawah, h3 1.1rem/650.

## Aksesibilitas (DS-6)

- `:focus-visible`: outline 2px `--brand`, offset 2px.
- `@media (prefers-reduced-motion: reduce)` meniadakan animasi/transisi.
- Target sentuh nav ≥ 44px (`min-h-11`); `color-scheme: light dark`.
