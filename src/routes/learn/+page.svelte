<script lang="ts">
	import { onMount } from 'svelte';
	import { listLessons } from '$lib/lessons.js';
	import { loadProgress } from '$lib/progress.js';

	const lessons = listLessons();
	let done: Record<string, boolean> = $state({});

	const total = lessons.length;
	const doneCount = $derived(lessons.filter((l) => done[l.slug]).length);

	onMount(() => {
		// Prerender-safe: localStorage is browser-only.
		done = loadProgress(localStorage);
	});
</script>

<svelte:head>
	<title>Learn Linux — server.faishal.id</title>
	<meta
		name="description"
		content="Interactive Linux lessons in a 100% simulated terminal. No servers, no signup, free forever."
	/>
</svelte:head>

<h1 class="text-2xl font-bold">Learn Linux, safely simulated</h1>
<p class="text-muted mt-1 max-w-prose">
	Eight hands-on lessons ported from the bash-guide. Every command runs in a mock filesystem in
	your browser — nothing real, nothing to break. Progress stays in this browser (local-first).
</p>

<p class="text-muted mt-4 text-sm" role="status">
	{doneCount} of {total} lessons complete
</p>
<div
	class="mt-1 h-2 max-w-md overflow-hidden rounded-full border border-line bg-surface"
	role="progressbar"
	aria-valuenow={doneCount}
	aria-valuemin={0}
	aria-valuemax={total}
	aria-label="Lessons complete"
>
	<div class="h-full bg-brand transition-all" style="width: {(doneCount / total) * 100}%"></div>
</div>

<ol class="mt-6 grid gap-3 md:grid-cols-2">
	{#each lessons as lesson, i (lesson.slug)}
		<li>
			<a
				href="/learn/{lesson.slug}"
				class="block rounded-lg border border-line bg-surface p-4 hover:border-brand"
				data-testid="lesson-{lesson.slug}"
			>
				<p class="text-muted text-xs">{i + 1}. {lesson.chapter}</p>
				<p class="mt-1 font-semibold">
					{#if done[lesson.slug]}<span aria-hidden="true" class="text-ok">✓ </span>{/if}{lesson.title}
				</p>
				<p class="text-muted mt-1 line-clamp-2 text-sm">{lesson.brief}</p>
			</a>
		</li>
	{/each}
</ol>
