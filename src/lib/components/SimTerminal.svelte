<script lang="ts">
	import { onMount } from 'svelte';
	import { createSession, executeLine, type SimSession } from '$lib/sim/index.js';
	import { pwd } from '$lib/sim/filesystem.js';

	interface Props {
		starter?: string;
		onResult?: (command: string, output: string) => void;
		onCommand?: (command: string, output: string) => void;
	}

	let { starter = '', onResult, onCommand }: Props = $props();

	let el: HTMLDivElement | null = $state(null);
	let ready = $state(false);

	// Mutable sim session lives outside the render cycle.
	let session: SimSession = createSession();

	function shortCwd(): string {
		const full = pwd(session.state);
		return full === '/home/user' ? '~' : full.replace('/home/user/', '~/');
	}

	function promptText(): string {
		return `user@server:${shortCwd()}$`;
	}

	onMount(() => {
		let term: import('@xterm/xterm').Terminal | null = null;
		let fit: import('@xterm/addon-fit').FitAddon | null = null;
		let ro: ResizeObserver | null = null;
		let cancelled = false;
		let line = '';
		let cursor = 0;
		const history: string[] = [];
		let hIndex = -1;

		const safeFit = () => {
			// Hidden-terminal pitfall: fit() with zero width throws / mis-sizes.
			if (!fit || !term || !el) return;
			if (el.offsetWidth > 0) {
				try {
					fit.fit();
				} catch {
					/* ignore transient layout races */
				}
			}
		};

		const writePrompt = () => {
			term?.write(`\r\n${promptText()} `);
		};

		const redrawLine = () => {
			if (!term) return;
			term.write(`\r\x1b[K${promptText()} ${line}`);
			const back = line.length - cursor;
			if (back > 0) term.write(`\x1b[${back}D`);
		};

		const emit = (cmd: string, output: string) => {
			onResult?.(cmd, output);
			onCommand?.(cmd, output);
		};

		const run = (input: string) => {
			if (!term) return;
			const cmd = input;
			if (cmd.trim() !== '') {
				history.push(cmd);
				if (history.length > 200) history.shift();
			}
			hIndex = -1;
			const res = executeLine(session.state, session.env, cmd);
			session = { state: res.state, env: res.env };
			if (res.output.includes('\x1b[2J')) {
				term.clear();
				const rest = res.output.replace('\x1b[2J\x1b[H', '').replace(/\n/g, '\r\n');
				if (rest !== '') term.write(rest);
			} else if (res.output !== '') {
				term.write(`\r\n${res.output.replace(/\n/g, '\r\n')}`);
			}
			emit(cmd, res.output.replace('\x1b[2J\x1b[H', ''));
			writePrompt();
			line = '';
			cursor = 0;
		};

		(async () => {
			const [{ Terminal }, { FitAddon }, { WebLinksAddon }, { SearchAddon }] = await Promise.all([
				import('@xterm/xterm'),
				import('@xterm/addon-fit'),
				import('@xterm/addon-web-links'),
				import('@xterm/addon-search')
			]);
			await import('@xterm/xterm/css/xterm.css');
			if (cancelled || !el) return;
			term = new Terminal({
				convertEol: false,
				cursorBlink: true,
				fontFamily: "ui-monospace, 'SFMono-Regular', Menlo, monospace",
				fontSize: 14,
				theme: {
					background: '#09090b',
					foreground: '#f4f4f5',
					cursor: '#34d399',
					selectionBackground: 'rgba(52, 211, 153, 0.3)'
				}
			});
			fit = new FitAddon();
			term.loadAddon(fit);
			term.loadAddon(new WebLinksAddon());
			term.loadAddon(new SearchAddon());
			term.open(el);
			safeFit();
			term.writeln('server.faishal.id \u2014 simulated Linux. Type `help` to start.');
			term.write(`${promptText()} `);
			ready = true;

			term.onData((data: string) => {
				if (!term) return;
				if (data === '\x1b[A') {
					if (history.length === 0) return;
					hIndex = hIndex < 0 ? history.length - 1 : Math.max(0, hIndex - 1);
					line = history[hIndex] ?? '';
					cursor = line.length;
					redrawLine();
					return;
				}
				if (data === '\x1b[B') {
					if (hIndex < 0) return;
					hIndex += 1;
					line = hIndex >= history.length ? '' : (history[hIndex] ?? '');
					if (hIndex >= history.length) hIndex = -1;
					cursor = line.length;
					redrawLine();
					return;
				}
				if (data === '\x1b[C' || data === '\x1b[D') {
					if (data === '\x1b[C' && cursor < line.length) {
						cursor += 1;
						term.write('\x1b[C');
					} else if (data === '\x1b[D' && cursor > 0) {
						cursor -= 1;
						term.write('\x1b[D');
					}
					return;
				}
				for (const ch of data) {
					if (ch === '\r') {
						term.write('\r\n');
						run(line);
					} else if (ch === '\x7f') {
						if (cursor > 0) {
							line = line.slice(0, cursor - 1) + line.slice(cursor);
							cursor -= 1;
							redrawLine();
						}
					} else if (ch === '\x03') {
						term.write('^C');
						line = '';
						cursor = 0;
						hIndex = -1;
						writePrompt();
					} else if (ch === '\x0c') {
						term.clear();
						redrawLine();
					} else if (ch === '\x15') {
						line = '';
						cursor = 0;
						redrawLine();
					} else if (ch >= ' ' && ch !== '\x7f') {
						line = line.slice(0, cursor) + ch + line.slice(cursor);
						cursor += 1;
						const rest = line.slice(cursor);
						term.write(ch + rest);
						if (rest.length > 0) term.write(`\x1b[${rest.length}D`);
					}
				}
			});

			ro = new ResizeObserver(safeFit);
			ro.observe(el);
			window.addEventListener('resize', safeFit);
			requestAnimationFrame(safeFit);
			setTimeout(safeFit, 100);

			if (starter.trim() !== '') {
				term.write(starter);
				line = starter;
				cursor = starter.length;
			}
		})();

		return () => {
			cancelled = true;
			ro?.disconnect();
			window.removeEventListener('resize', safeFit);
			term?.dispose();
			term = null;
		};
	});
</script>

<div
	class="overflow-hidden rounded-lg border border-zinc-700 bg-zinc-950 text-sm text-zinc-100"
	role="log"
	aria-label="Simulated Linux terminal"
>
	<div class="flex items-center gap-2 border-b border-zinc-800 px-3 py-2" aria-hidden="true">
		<span class="h-3 w-3 rounded-full bg-red-500/70"></span>
		<span class="h-3 w-3 rounded-full bg-yellow-500/70"></span>
		<span class="h-3 w-3 rounded-full bg-emerald-500/70"></span>
		<span class="ml-2 font-mono text-xs text-zinc-400">user@server — simulated bash</span>
		{#if !ready}<span class="ml-auto font-mono text-xs text-zinc-500">loading…</span>{/if}
	</div>
	<div bind:this={el} class="xterm-screen h-[380px] p-2" data-testid="sim-terminal"></div>
	<p class="sr-only">Terminal input is handled inside the xterm canvas above. Keyboard: type commands, Enter to run, Up/Down for history.</p>
</div>
