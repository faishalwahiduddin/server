<script lang="ts">
	import { onMount } from 'svelte';
	import SimTerminal from '$lib/components/SimTerminal.svelte';
	import { getLesson } from '$lib/lessons.js';
	import { checkTask } from '$lib/sim/index.js';
	import { loadProgress, markDone } from '$lib/progress.js';
	import type { PageProps } from './$types.js';

	let { data }: PageProps = $props();
	const lesson = $derived(getLesson(data.slug)!);

	/** Minimal markdown renderer (briefs are bundled local content — escape first, then shape). */
	function renderMd(md: string): string {
		const esc = (s: string) =>
			s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
		const inline = (s: string) => esc(s).replace(/`([^`]+)`/g, '<code>$1</code>');
		const blocks: string[] = [];
		let para: string[] = [];
		let list: string[] | null = null;
		let code: string[] | null = null;
		const flushPara = () => {
			if (para.length > 0) blocks.push(`<p>${para.map(inline).join(' ')}</p>`);
			para = [];
		};
		const flushList = () => {
			if (list) blocks.push(`<ul>${list.map((i) => `<li>${inline(i)}</li>`).join('')}</ul>`);
			list = null;
		};
		for (const raw of md.split('\n')) {
			const line = raw.replace(/\r$/, '');
			if (code !== null) {
				if (line.trim().startsWith('```')) {
					blocks.push(`<pre><code>${esc(code.join('\n'))}</code></pre>`);
					code = null;
				} else code.push(line);
				continue;
			}
			if (line.trim().startsWith('```')) {
				flushPara();
				flushList();
				code = [];
				continue;
			}
			const h = line.match(/^(#{1,3})\s+(.*)$/);
			if (h) {
				flushPara();
				flushList();
				const level = h[1].length + 1;
				blocks.push(`<h${level}>${inline(h[2])}</h${level}>`);
				continue;
			}
			const li = line.match(/^\s*[-*]\s+(.*)$/);
			if (li) {
				flushPara();
				list ??= [];
				list.push(li[1]);
				continue;
			}
			if (line.trim() === '') {
				flushPara();
				flushList();
				continue;
			}
			para.push(line.trim());
		}
		flushPara();
		flushList();
		if (code !== null) blocks.push(`<pre><code>${esc(code.join('\n'))}</code></pre>`);
		return blocks.join('\n');
	}

	const briefHtml = $derived(renderMd(lesson.briefMd));

	type Tick = { cmd: string; output: string };
	let transcript: Tick[] = $state([]);
	let ticks: Record<string, boolean> = $state({});
	let lastCommand = $state('');
	let checkedOnce = $state(false);

	const allDone = $derived(lesson.tasks.every((t) => ticks[t.id]));
	const lessonDone = $derived(loadProgressSnapshot()[lesson.slug] === true);

	// Snapshot helper re-read on demand (progress persists in localStorage).
	let progressSnap: Record<string, boolean> = $state({});
	function loadProgressSnapshot(): Record<string, boolean> {
		return progressSnap;
	}

	onMount(() => {
		try {
			progressSnap = loadProgress(localStorage);
			const raw = localStorage.getItem('serverfaishal.tasks');
			if (raw) {
				const parsed: unknown = JSON.parse(raw);
				if (typeof parsed === 'object' && parsed !== null) {
					const mine: Record<string, boolean> = {};
					for (const t of lesson.tasks) {
						if ((parsed as Record<string, boolean>)[`${lesson.slug}:${t.id}`] === true)
							mine[t.id] = true;
					}
					ticks = mine;
				}
			}
		} catch {
			/* storage unavailable — session-only */
		}
	});

	function persistTicks() {
		try {
			const raw = localStorage.getItem('serverfaishal.tasks');
			const all: Record<string, boolean> =
				raw && typeof JSON.parse(raw) === 'object' ? (JSON.parse(raw) as Record<string, boolean>) : {};
			for (const t of lesson.tasks) {
				if (ticks[t.id]) all[`${lesson.slug}:${t.id}`] = true;
			}
			localStorage.setItem('serverfaishal.tasks', JSON.stringify(all));
		} catch {
			/* ignore */
		}
	}

	function handleResult(command: string, output: string): void {
		lastCommand = command;
		transcript = [...transcript, { cmd: command, output }].slice(-200);
		let changed = false;
		for (const t of lesson.tasks) {
			if (!ticks[t.id] && checkTask(t.check, command, output)) {
				ticks[t.id] = true;
				changed = true;
			}
		}
		if (changed) {
			ticks = { ...ticks };
			persistTicks();
		}
	}

	/** Check button: re-evaluate the whole transcript, then persist lesson completion. */
	function check() {
		checkedOnce = true;
		for (const entry of transcript) {
			for (const t of lesson.tasks) {
				if (!ticks[t.id] && checkTask(t.check, entry.cmd, entry.output)) ticks[t.id] = true;
			}
		}
		ticks = { ...ticks };
		persistTicks();
		if (lesson.tasks.every((t) => ticks[t.id])) {
			try {
				progressSnap = markDone(localStorage, lesson.slug);
			} catch {
				/* storage unavailable */
			}
		}
	}
</script>

<svelte:head>
	<title>{lesson.title} — server.faishal.id</title>
	<meta name="description" content={lesson.brief} />
</svelte:head>

<a href="/learn" class="text-sm hover:underline">← All lessons</a>
<p class="text-muted mt-2 text-xs">{lesson.chapter}</p>
<h1 class="text-2xl font-bold">{lesson.title}</h1>

<div class="prose-doc mt-2 max-w-prose">
	<!-- eslint-disable-next-line svelte/no-at-html-tags -->
	{@html briefHtml}
</div>

<div class="mt-4 grid gap-4 lg:grid-cols-5">
	<div class="lg:col-span-3">
		<SimTerminal starter={lesson.starter ?? ''} onResult={handleResult} />
		<p class="text-muted mt-2 text-xs" aria-live="polite">
			{#if lastCommand !== ''}Last command: <code class="font-mono">{lastCommand}</code>{/if}
		</p>
	</div>
	<aside class="lg:col-span-2" aria-label="Lesson tasks">
		<h2 class="font-semibold">Tasks</h2>
		<ol class="mt-2 space-y-2">
			{#each lesson.tasks as task (task.id)}
				<li
					class="rounded-lg border border-line bg-surface p-3 text-sm {ticks[task.id]
						? 'border-ok'
						: ''}"
					data-testid="task-{task.id}"
				>
					<p>
						{#if ticks[task.id]}<span aria-hidden="true" class="text-ok">✓ </span>{/if}
						{task.prompt}
					</p>
					<details class="text-muted mt-1 text-xs">
						<summary class="min-h-11 cursor-pointer py-2">Hint</summary>
						<p class="mt-1 font-mono">{task.hint}</p>
					</details>
				</li>
			{/each}
		</ol>
		<button
			class="mt-3 min-h-11 w-full rounded-lg bg-brand px-5 font-medium text-brand-ink disabled:opacity-50 sm:w-auto"
			onclick={check}
			data-testid="check-tasks"
		>
			Check
		</button>
		{#if checkedOnce && !allDone}
			<p class="mt-2 text-sm text-warn" role="status">Not quite yet — run the remaining tasks in the terminal above.</p>
		{/if}
		{#if allDone || lessonDone}
			<p
				class="mt-3 rounded-lg border border-ok p-3 text-sm"
				data-testid="lesson-complete"
				role="status"
			>
				Lesson complete — nice work. <a href="/learn" class="underline">Pick the next one →</a>
			</p>
		{/if}
	</aside>
</div>
