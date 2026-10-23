<script lang="ts">
	import '../app.css';
	import { page } from '$app/state';
	let { children } = $props();
	const current = (href: string) =>
		href === '/' ? page.url.pathname === '/' : page.url.pathname.startsWith(href);
</script>

<a
	href="#main"
	class="sr-only focus:not-sr-only focus:absolute focus:m-2 focus:rounded focus:bg-brand focus:px-3 focus:py-2 focus:text-brand-ink"
	>Skip to content</a
>
<header class="border-b border-line bg-surface">
	<nav class="mx-auto flex max-w-6xl flex-wrap items-center gap-x-1 gap-y-1 px-4 py-2" aria-label="Main">
		<span class="mr-3 font-semibold">server.faishal.id</span>
		<a
			href="/"
			aria-current={current('/') ? 'page' : undefined}
			class="min-h-11 rounded px-3 py-2 text-sm text-ink hover:bg-bg aria-[current=page]:bg-brand aria-[current=page]:text-brand-ink">Home</a
		>
		<a
			href="/learn"
			aria-current={current('/learn') ? 'page' : undefined}
			class="min-h-11 rounded px-3 py-2 text-sm text-ink hover:bg-bg aria-[current=page]:bg-brand aria-[current=page]:text-brand-ink">Learn</a
		>
	</nav>
</header>
<main id="main" class="mx-auto max-w-6xl px-4 py-6">{@render children()}</main>
