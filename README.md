# server.faishal.id — Learn Linux in a Simulated Terminal

**Live demo:** [server.faishal.id](https://server.faishal.id) · **Stack:** SvelteKit 5 · Cloudflare Pages · Zero backend

An interactive platform for learning Linux server basics. Every command runs in a **100% client-side simulation** — a mock filesystem and a 40+ command bash parser written in pure TypeScript. No containers, no VMs, no servers to break, no signup. Open a lesson and type.

Curriculum is ported from [Idnan/bash-guide](https://github.com/Idnan/bash-guide) (MIT, 12k+ stars).

## Why simulation instead of a real shell?

| Approach | Cost | Latency | Safety |
|---|---|---|---|
| Real microVM per user (Firecracker, E2B, Vercel Sandbox) | $ per execution + idle memory billing | Cold boot per session | Kernel escape / fork-bomb / exfil surface to manage |
| **This repo: mock FS + parser in the browser** | **$0** | **0 ms** | **No attack surface — there is no machine** |

For chapters 1–2 of bash-guide (basic ops, pipes, variables) a faithful simulation teaches the same muscle memory with instant feedback. Network commands (`curl`, `ssh`, …) are disabled by design and say so when you try them.

## Features

- **8 hands-on lessons** — terminal basics, file ops, text search, directories, sysinfo, pipes & redirects, shell variables, processes
- **Simulated terminal** — prompt, history (↑/↓), pipes (`|`), redirects (`>`/`>>`/`<`), chaining (`;`, `&&`, `||`), `$VAR` expansion, quoted strings
- **40+ commands** — `ls cat touch cp mv rm mkdir grep sed awk sort uniq wc find diff head tail …` (type `help` inside)
- **Task checklist per lesson** — commands are graded locally; progress persists in `localStorage`
- ** output caps** — 200 lines / 20 KB per command, 50 pipe stages max, so `yes | head` style runaways can't hang the tab

## Tech stack

- [SvelteKit 2 + Svelte 5](https://kit.svelte.dev/) with [`adapter-cloudflare`](https://kit.svelte.dev/docs/adapter-cloudflare)
- [Cloudflare Pages](https://pages.cloudflare.com/) (`server-faishal`, `server.faishal.id`)
- [Tailwind CSS v4](https://tailwindcss.com/), [Zod](https://zod.dev/) validation on every route input, [Vitest](https://vitest.dev/) unit tests
- `pnpm` + Node 22–24

## Project structure

```
server/
├── src/lib/sim/          # Tier-0 simulation engine (pure TS, zero deps)
│   ├── types.ts           # SimFile/SimDir/FsState/CmdResult/Lesson
│   ├── filesystem.ts      # immutable mock FS: mkdir/touch/cp/mv/rm/…
│   ├── parser.ts          # quote-aware tokenizer, pipes, redirects, chains
│   ├── commands.ts        # 40+ simulated commands + executeLine()
│   ├── lessons.ts         # 8-lesson curriculum + task checks
│   └── sim.test.ts        # 15 unit tests
├── src/lib/components/
│   └── SimTerminal.svelte # terminal UI (prompt, history, grading hook)
├── src/routes/learn/      # lesson list + [slug] lesson runner
├── content/lessons/       # long-form markdown briefs (bundled at build)
└── scripts/deploy.sh      # check → build → wrangler pages deploy
```

## Local development

```bash
pnpm install
pnpm check    # svelte-check typecheck gate (must pass before commit)
pnpm test     # vitest unit tests
```

The dev server (`pnpm dev --port 3034`) and production builds are only run on explicit request per fleet convention. Deploy is manual, never CI:

```bash
pnpm deploy   # → wrangler pages deploy --project-name server-faishal
```

## Design decisions

1. **Fleet-native, not Vercel.** The faishal.id fleet is 100% Cloudflare Pages; introducing Vercel/Next for sandbox execution would break deploy, CLI (`wrangler-faishal`), and port conventions. So the sandbox became a simulation.
2. **Immutable FS snapshots.** Every mutation clones — Svelte reactivity and lesson reset come free, and `executeLine()` stays a pure function that's trivial to test.
3. **Pipes by buffering.** Like WASM shells, each stage runs to completion and stdout feeds the next stage's stdin. No fork, no job control — documented in lessons.
4. **Local-first progress.** No accounts, no database. Progress lives in `localStorage` (`serverfaishal.progress`) with JSON export planned.

## Attribution

Curriculum structure follows [Idnan/bash-guide](https://github.com/Idnan/bash-guide) © Adnan Ahmad, MIT License. This implementation (simulator, UI, lessons text) is original work under MIT below.

## License

[MIT](LICENSE) © 2026 Faishal Wahiduddin
