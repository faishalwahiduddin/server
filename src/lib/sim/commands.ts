import {
	getNode,
	listNames,
	mkdir,
	movePath,
	pwd,
	readFile,
	removePath,
	resolvePath,
	touch,
	writeFile
} from './filesystem.js';
import { expandVars, parsePipeline, splitChain, type ParsedStage } from './parser.js';
import type { CmdResult, FsState } from './types.js';

export const MAX_LINES = 200;
export const MAX_CHARS = 20000;
export const MAX_PIPE_STAGES = 50;

const KNOWN_COMMANDS = [
	'export', 'env', 'whatis', 'whereis', 'which', 'clear',
	'cat', 'chmod', 'chown', 'cp', 'diff', 'file', 'find', 'gunzip', 'gzcat', 'gzip',
	'head', 'less', 'more', 'ls', 'mv', 'rm', 'tail', 'touch',
	'awk', 'cut', 'echo', 'egrep', 'fgrep', 'grep', 'nl', 'sed', 'sort', 'tr', 'uniq', 'wc',
	'cd', 'mkdir', 'pwd', 'rmdir',
	'cal', 'date', 'df', 'du', 'uname', 'uptime', 'whoami', 'hostname', 'id', 'ps', 'free',
	'kill', 'killall', 'jobs', 'sleep',
	'ping', 'curl', 'wget', 'ssh', 'scp', 'dig', 'whois',
	'man', 'help', 'history', 'exit'
];

function capOutput(text: string): string {
	const lines = text.split('\n');
	let out = lines.length > MAX_LINES ? lines.slice(0, MAX_LINES).join('\n') + '\n… [truncated: output cap]' : text;
	if (out.length > MAX_CHARS) out = out.slice(0, MAX_CHARS) + '\n… [truncated: output cap]';
	return out;
}

interface StageResult {
	output: string;
	state: FsState;
	env: Record<string, string>;
	exitCode: number;
}

function lsLong(state: FsState, path: string[], showAll: boolean): string {
	const node = getNode(state.root, path);
	if (!node || node.kind !== 'dir') return 'ls: cannot access: No such directory (simulated)';
	const names = [...node.children.keys()].sort();
	const rows = names
		.filter((n) => showAll || !n.startsWith('.'))
		.map((n) => {
			const child = node.children.get(n);
			if (!child) return n;
			const size = child.kind === 'file' ? child.content.length : 4096;
			return `${child.kind === 'dir' ? 'd' : '-'}${child.mode} user user ${String(size).padStart(6)} Jan  1 00:00 ${n}`;
		});
	if (showAll) rows.unshift('drwxr-xr-x user user   4096 Jan  1 00:00 .', 'drwxr-xr-x user user   4096 Jan  1 00:00 ..');
	return rows.join('\n');
}

function simpleDiff(a: string, b: string, fa: string, fb: string): string {
	const la = a.split('\n');
	const lb = b.split('\n');
	const out: string[] = [];
	const n = Math.max(la.length, lb.length);
	for (let i = 0; i < n; i++) {
		if (la[i] !== lb[i]) {
			if (la[i] !== undefined) out.push(`< ${la[i]}`);
			if (lb[i] !== undefined) out.push(`> ${lb[i]}`);
		}
	}
	if (out.length === 0) return '';
	return `--- ${fa}\n+++ ${fb}\n` + out.join('\n');
}

function runAwk(args: string[], stdin: string): string {
	// awk -F sep '{ print $1, $3 }'  and  awk '/pattern/ { print }'
	let sep = '\\s+';
	let program = '';
	const rest = [...args];
	if (rest[0] === '-F' && rest[1]) {
		sep = rest[1];
		rest.splice(0, 2);
	}
	program = rest.join(' ');
	const patternMatch = program.match(/^\/([^/]*)\/\s*\{\s*(.*?)\s*\}$/);
	const actionMatch = program.match(/^\{\s*(.*?)\s*\}$/);
	const printMatch = (actionMatch?.[1] ?? patternMatch?.[2] ?? '').match(/^print\s*(.*)$/);
	const lines = stdin.split('\n').filter((l) => l !== '');
	const out: string[] = [];
	const splitter = sep === ':' ? ':' : /\s+/;
	for (const line of lines) {
		if (patternMatch && !line.includes(patternMatch[1])) continue;
		if (!printMatch) {
			out.push(line);
			continue;
		}
		const fields = line.split(splitter);
		const spec = printMatch[1].trim();
		if (spec === '' || spec === '$0') out.push(line);
		else {
			const cols = spec.split(/[,\s]+/).map((c) => {
				const m = c.match(/\$(\d+)/);
				return m ? (fields[Number(m[1]) - 1] ?? '') : c;
			});
			out.push(cols.join(' '));
		}
	}
	return out.join('\n');
}

function runSed(args: string[], stdin: string): string {
	const script = args.join(' ');
	const m = script.match(/^s\/((?:[^/\\]|\\.)*)\/((?:[^/\\]|\\.)*)\/([g]*)$/);
	if (!m) return 'sed: unsupported script in simulation (only s/a/b/g)';
	const [, pat, rep, flags] = m;
	const re = new RegExp(pat, flags.includes('g') ? 'g' : '');
	return stdin
		.split('\n')
		.map((l) => l.replace(re, rep))
		.join('\n');
}

function runSort(args: string[], stdin: string): string {
	let lines = stdin.split('\n');
	if (lines.length > 0 && lines[lines.length - 1] === '') lines.pop();
	const numeric = args.includes('-n');
	const reverse = args.includes('-r');
	const unique = args.includes('-u');
	lines.sort((a, b) => (numeric ? Number(a) - Number(b) || (a < b ? -1 : 1) : a < b ? -1 : a > b ? 1 : 0));
	if (unique) lines = [...new Set(lines)];
	if (reverse) lines.reverse();
	return lines.join('\n');
}

function runTr(args: string[], stdin: string): string {
	const [from = '', to = ''] = args;
	const expand = (s: string): string => {
		if (s === 'a-z') return 'abcdefghijklmnopqrstuvwxyz';
		if (s === 'A-Z') return 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
		if (s === '0-9') return '0123456789';
		return s;
	};
	const f = expand(from);
	const t = expand(to);
	return [...stdin].map((c) => (f.includes(c) && t[f.indexOf(c)] ? t[f.indexOf(c)] : c)).join('');
}

function runUniq(args: string[], stdin: string): string {
	const lines = stdin.split('\n');
	const out: string[] = [];
	const count = args.includes('-c');
	let prev: string | null = null;
	let n = 0;
	const flush = (): void => {
		if (prev !== null) out.push(count ? `${String(n).padStart(7)} ${prev}` : prev);
	};
	for (const l of lines) {
		if (l === prev) n++;
		else {
			flush();
			prev = l;
			n = 1;
		}
	}
	flush();
	return out.join('\n');
}

function runWc(args: string[], stdin: string, label: string): string {
	const lines = stdin === '' ? 0 : stdin.split('\n').length - (stdin.endsWith('\n') ? 1 : 0);
	const words = stdin.trim() === '' ? 0 : stdin.trim().split(/\s+/).length;
	const chars = stdin.length;
	const showAll = !args.some((a) => ['-l', '-w', '-c', '-m'].includes(a));
	const parts: string[] = [];
	if (showAll || args.includes('-l')) parts.push(String(lines).padStart(7));
	if (showAll || args.includes('-w')) parts.push(String(words).padStart(7));
	if (showAll || args.includes('-c') || args.includes('-m')) parts.push(String(chars).padStart(7));
	if (label) parts.push(` ${label}`);
	return parts.join(' ');
}

function applyGrep(args: string[], stdin: string, fixed: boolean, extended: boolean): { output: string; found: boolean } {
	let ignoreCase = false;
	let invert = false;
	let lineNo = false;
	const pats: string[] = [];
	for (const a of args) {
		if (a === '-i') ignoreCase = true;
		else if (a === '-v') invert = true;
		else if (a === '-n') lineNo = true;
		else if (a === '-r' || a === '-E' || a === '-F' || a === '-w') continue;
		else if (a.startsWith('-')) continue;
		else pats.push(a);
	}
	const raw = pats[0] ?? '';
	const test = (line: string): boolean => {
		let hit: boolean;
		if (fixed) {
			hit = ignoreCase ? line.toLowerCase().includes(raw.toLowerCase()) : line.includes(raw);
		} else if (!extended && (raw.includes('(') || raw.includes('|')) && !raw.startsWith('(')) {
			hit = line.includes(raw);
		} else {
			try {
				hit = new RegExp(extended ? raw : raw, ignoreCase ? 'i' : '').test(line);
			} catch {
				hit = line.includes(raw);
			}
		}
		return invert ? !hit : hit;
	};
	const lines = stdin.split('\n');
	const matched = lines.filter((l, idx) => l !== '' || idx < lines.length - 1).filter(test);
	const out = matched.map((l) => (lineNo ? `${lines.indexOf(l) + 1}:${l}` : l)).join('\n');
	return { output: out, found: matched.length > 0 };
}

function executeStage(state: FsState, env: Record<string, string>, stage: ParsedStage, stdin: string): StageResult {
	const args = stage.args.map((a) => expandVars(a, env));
	const cmd = expandVars(stage.cmd, env);
	const fail = (output: string): StageResult => ({ output, state, env, exitCode: 1 });
	const ok = (output: string, s: FsState = state, e: Record<string, string> = env): StageResult => ({
		output,
		state: s,
		env: e,
		exitCode: 0
	});
	const needFile = (p: string[]): string | null => readFile(state, p);

	switch (cmd) {
		case '':
			return ok('');
		case 'echo': {
			let text = args.join(' ');
			let trailingNewline = true;
			const flags = args.filter((a) => a.startsWith('-') && /^[a-zA-Z]+$/.test(a.slice(1)));
			if (flags.some((f) => f.includes('n'))) {
				trailingNewline = false;
				text = args.filter((a) => !a.startsWith('-')).join(' ');
			} else if (flags.length > 0) {
				text = args.filter((a) => !a.startsWith('-')).join(' ');
			}
			text = text.replace(/\\n/g, '\n').replace(/\\t/g, '\t').replace(/\\"/g, '"');
			return ok(trailingNewline ? text : text);
		}
		case 'export': {
			const next = { ...env };
			for (const a of args) {
				const m = a.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
				if (m) next[m[1]] = m[2];
			}
			return ok('', state, next);
		}
		case 'env':
			return ok(Object.entries(env).map(([k, v]) => `${k}=${v}`).join('\n'));
		case 'pwd':
			return ok(pwd(state));
		case 'whoami':
			return ok('user');
		case 'hostname':
			return ok('server');
		case 'id':
			return ok('uid=1000(user) gid=1000(user) groups=1000(user)');
		case 'uname':
			return ok(args.includes('-a') ? 'Linux server 6.8.0-sim x86_64 GNU/Linux (simulated)' : 'Linux');
		case 'date':
			return ok(new Date().toUTCString() + ' (simulated host clock)');
		case 'cal':
			return ok('    January 2026\nMo Tu We Th Fr Sa Su\n          1  2  3  4\n 5  6  7  8  9 10 11\n12 13 14 15 16 17 18\n19 20 21 22 23 24 25\n26 27 28 29 30 31 (simulated)');
		case 'uptime':
			return ok('00:00:00 up 42 days,  1 user,  load average: 0.00, 0.01, 0.05 (simulated)');
		case 'df':
			return ok('Filesystem     1K-blocks  Used Available Use% Mounted on\nsimfs            1048576  4096   1044480   1% /');
		case 'du': {
			const target = args.find((a) => !a.startsWith('-')) ?? '.';
			const p = resolvePath(state.cwd, target);
			const node = getNode(state.root, p);
			if (!node) return fail(`du: ${target}: No such file or directory (simulated)`);
			const size = node.kind === 'file' ? node.content.length : 4096;
			return ok(args.includes('-h') ? `4.0K\t${target}` : `${Math.max(4, Math.ceil(size / 1024))}\t${target}`);
		}
		case 'free':
			return ok('               total        used        free\nMem:         2097152       65536     2031616\nSwap:              0           0           0 (simulated)');
		case 'ps':
			return ok('  PID TTY          TIME CMD\n 1234 pts/0    00:00:00 bash\n 5678 pts/0    00:00:00 ps (simulated)');
		case 'clear':
			return ok('\x1b[2J\x1b[H');
		case 'history':
			return ok('    1  ls\n    2  pwd\n    3  echo hello (simulated session)');
		case 'help':
			return ok(`Simulated bash — ${KNOWN_COMMANDS.length} commands. Try: ls, pwd, cat, echo, grep, sort, uniq, wc. Type "man <cmd>" for a hint.`);
		case 'man': {
			const topic = args[0] ?? 'bash';
			return ok(`${topic.toUpperCase()}(1) — simulated manual: usage and examples for "${topic}" follow the bash-guide lesson. No real pages installed.`);
		}
		case 'whatis':
			return ok(args.map((a) => `${a} (1) - simulated manual entry`).join('\n') || 'whatis what?');
		case 'whereis':
			return ok(args.map((a) => `${a}: /usr/bin/${a}`).join('\n'));
		case 'which':
			return ok(args.map((a) => `/usr/bin/${a}`).join('\n'));
		case 'ls': {
			const long = args.includes('-l');
			const all = args.includes('-a');
			const target = args.find((a) => !a.startsWith('-'));
			const p = target ? resolvePath(state.cwd, target) : state.cwd;
			const node = getNode(state.root, p);
			if (!node) return fail(`ls: cannot access '${target}': No such file or directory (simulated)`);
			if (node.kind === 'file') return ok(long ? `-rw-r--r-- user user ${node.content.length} ${node.name}` : node.name);
			if (long) return ok(lsLong(state, p, all));
			const names = listNames(state, p) ?? [];
			return ok(names.filter((n) => all || !n.startsWith('.')).join('  '));
		}
		case 'cd': {
			const target = args[0] ?? '/home/user';
			const p = target === '-' ? state.cwd : resolvePath(state.cwd, target);
			const node = getNode(state.root, p);
			if (!node || node.kind !== 'dir') return fail(`bash: cd: ${target}: No such directory (simulated)`);
			return ok('', { ...state, cwd: p });
		}
		case 'mkdir': {
			const dirs = args.filter((a) => !a.startsWith('-'));
			if (dirs.length === 0) return fail('mkdir: missing operand');
			let s = state;
			for (const d of dirs) {
				const next = mkdir(s, resolvePath(s.cwd, d));
				if (!next) return fail(`mkdir: cannot create directory '${d}' (simulated)`);
				s = next;
			}
			return ok('', s);
		}
		case 'rmdir': {
			const target = args[0];
			if (!target) return fail('rmdir: missing operand');
			const next = removePath(state, resolvePath(state.cwd, target), false);
			if (!next) return fail(`rmdir: failed to remove '${target}' (simulated)`);
			return ok('', next);
		}
		case 'touch': {
			const files = args.filter((a) => !a.startsWith('-'));
			if (files.length === 0) return fail('touch: missing operand');
			let s = state;
			for (const f of files) s = touch(s, resolvePath(s.cwd, f));
			return ok('', s);
		}
		case 'cat': {
			const files = args.filter((a) => !a.startsWith('-'));
			if (files.length === 0) return ok(stdin);
			const parts: string[] = [];
			for (const f of files) {
				const content = needFile(resolvePath(state.cwd, f));
				if (content === null) return fail(`cat: ${f}: No such file (simulated)`);
				parts.push(content);
			}
			return ok(parts.join(''));
		}
		case 'head':
		case 'tail': {
			const nFlag = args.find((a) => /^-\d+$/.test(a));
			const n = nFlag ? Number(nFlag.slice(1)) : 10;
			const files = args.filter((a) => !a.startsWith('-'));
			const text = files.length === 0 ? stdin : (() => {
				const parts: string[] = [];
				for (const f of files) {
					const c = needFile(resolvePath(state.cwd, f));
					if (c === null) return null;
					parts.push(c);
				}
				return parts.join('');
			})();
			if (text === null) return fail(`${cmd}: No such file (simulated)`);
			const lines = (text as string).split('\n');
			const picked = cmd === 'head' ? lines.slice(0, n) : lines.slice(-n);
			return ok(picked.join('\n'));
		}
		case 'less':
		case 'more':
		case 'gzcat': {
			const files = args.filter((a) => !a.startsWith('-'));
			if (files.length === 0) return ok(stdin);
			const c = needFile(resolvePath(state.cwd, files[0]));
			if (c === null) return fail(`${cmd}: No such file (simulated)`);
			return ok(c);
		}
		case 'nl': {
			const text = args.some((a) => !a.startsWith('-')) ? (() => {
				const f = args.find((a) => !a.startsWith('-')) ?? '';
				return needFile(resolvePath(state.cwd, f)) ?? null;
			})() : stdin;
			if (text === null) return fail('nl: No such file (simulated)');
			return ok((text as string).split('\n').map((l, i) => `${String(i + 1).padStart(6)}  ${l}`).join('\n'));
		}
		case 'wc': {
			const files = args.filter((a) => !a.startsWith('-'));
			if (files.length === 0) return ok(runWc(args, stdin, ''));
			return ok(files.map((f) => {
				const c = needFile(resolvePath(state.cwd, f));
				if (c === null) return `wc: ${f}: No such file (simulated)`;
				return runWc(args, c, ` ${f}`);
			}).join('\n'));
		}
		case 'sort':
			return ok(runSort(args, args.some((a) => !a.startsWith('-')) ? (() => {
				const f = args.find((a) => !a.startsWith('-')) ?? '';
				return needFile(resolvePath(state.cwd, f)) ?? '';
			})() as string : stdin));
		case 'uniq':
			return ok(runUniq(args, stdin));
		case 'tr':
			return ok(runTr(args, stdin));
		case 'cut': {
			let delim = '\t';
			let fields = '1';
			for (let i = 0; i < args.length; i++) {
				if (args[i] === '-d' && args[i + 1]) delim = args[i + 1];
				if (args[i] === '-f' && args[i + 1]) fields = args[i + 1];
			}
			const text = args.some((a) => !a.startsWith('-') && a !== delim && a !== fields) ? '' : stdin;
			const idx = fields.split(',').map((f) => Number(f) - 1);
			return ok(text.split('\n').map((l) => l.split(delim).filter((_, i) => idx.includes(i)).join(delim)).join('\n'));
		}
		case 'grep':
		case 'egrep':
		case 'fgrep': {
			const files = args.filter((a) => !a.startsWith('-'));
			const fixed = cmd === 'fgrep';
			if (files.length <= 1) {
				const r = applyGrep(args, stdin, fixed, cmd === 'egrep');
				return r.found ? ok(r.output) : { output: r.output, state, env, exitCode: 1 };
			}
			const out: string[] = [];
			let found = false;
			for (const f of files.slice(1)) {
				const c = needFile(resolvePath(state.cwd, f));
				if (c === null) {
					out.push(`grep: ${f}: No such file (simulated)`);
					continue;
				}
				const r = applyGrep([args[0]], c, fixed, cmd === 'egrep');
				if (r.found) {
					found = true;
					out.push(r.output.split('\n').map((l) => `${f}:${l}`).join('\n'));
				}
			}
			return { output: out.join('\n'), state, env, exitCode: found ? 0 : 1 };
		}
		case 'awk': {
			const files = args.filter((a) => !a.startsWith('-') && a !== (args[args.indexOf('-F') + 1] ?? ''));
			const text = files.length > 0 ? (() => {
				const last = files[files.length - 1];
				if (last.includes('{') || last.includes('/') || last === 'print' || last.startsWith('$')) return stdin;
				const c = needFile(resolvePath(state.cwd, last));
				return c ?? stdin;
			})() : stdin;
			return ok(runAwk(args, text as string));
		}
		case 'sed': {
			const files = args.filter((a) => !a.startsWith('-'));
			const scriptIdx = files.findIndex((f) => f.startsWith('s/'));
			const script = scriptIdx >= 0 ? [files[scriptIdx]] : files.slice(0, 1);
			const fileArgs = scriptIdx >= 0 ? files.filter((_, i) => i !== scriptIdx) : files.slice(1);
			const text = fileArgs.length === 0 ? stdin : (() => {
				const c = needFile(resolvePath(state.cwd, fileArgs[0]));
				return c ?? null;
			})();
			if (text === null) return fail('sed: No such file (simulated)');
			return ok(runSed(script, text as string));
		}
		case 'find': {
			const start = args.find((a) => !a.startsWith('-') && !a.startsWith('*')) ?? '.';
			const namePat = (() => {
				const i = args.indexOf('-name');
				return i >= 0 ? (args[i + 1] ?? '').replace(/\*/g, '') : '';
			})();
			const base = resolvePath(state.cwd, start);
			const baseNode = getNode(state.root, base);
			if (!baseNode) return fail(`find: '${start}': No such directory (simulated)`);
			const hits: string[] = [];
			const walk = (nodePath: string[], prefix: string): void => {
				const n = getNode(state.root, nodePath);
				if (!n || n.kind !== 'dir') return;
				for (const [name] of n.children) {
					const full = `${prefix}/${name}`.replace('//', '/');
					if (!namePat || name.includes(namePat)) hits.push(full);
					walk([...nodePath, name], full);
				}
			};
			walk(base, start === '.' ? '.' : start);
			return ok(hits.join('\n'));
		}
		case 'file': {
			const f = args.find((a) => !a.startsWith('-')) ?? '';
			if (!f) return fail('file: missing operand');
			const c = needFile(resolvePath(state.cwd, f));
			if (c === null) return fail(`file: ${f}: No such file (simulated)`);
			const kind = c.startsWith('#!') ? 'script' : c.includes('<html') ? 'HTML document' : 'ASCII text';
			return ok(`${f}: ${kind} (simulated)`);
		}
		case 'diff': {
			const files = args.filter((a) => !a.startsWith('-'));
			if (files.length < 2) return fail('diff: missing operand');
			const a = needFile(resolvePath(state.cwd, files[0]));
			const b = needFile(resolvePath(state.cwd, files[1]));
			if (a === null || b === null) return fail('diff: No such file (simulated)');
			const d = simpleDiff(a, b, files[0], files[1]);
			return { output: d, state, env, exitCode: d === '' ? 0 : 1 };
		}
		case 'cp':
		case 'mv': {
			const operands = args.filter((a) => !a.startsWith('-'));
			if (operands.length < 2) return fail(`${cmd}: missing operand`);
			const dest = operands[operands.length - 1];
			const sources = operands.slice(0, -1);
			let s = state;
			for (const src of sources) {
				const from = resolvePath(s.cwd, src);
				const to = resolvePath(s.cwd, dest);
				if (cmd === 'mv') {
					const next = movePath(s, from, to);
					if (!next) return fail(`${cmd}: cannot move '${src}' (simulated)`);
					s = next;
				} else {
					const content = readFile(s, from);
					if (content === null) return fail(`cp: '${src}': No such file (simulated)`);
					const next = writeFile(s, to, content, false);
					if (!next) return fail(`cp: cannot copy to '${dest}' (simulated)`);
					s = next;
				}
			}
			return ok('', s);
		}
		case 'rm': {
			const recursive = args.includes('-r') || args.includes('-rf') || args.includes('-fr');
			const operands = args.filter((a) => !a.startsWith('-'));
			if (operands.length === 0) return fail('rm: missing operand');
			let s = state;
			for (const f of operands) {
				const next = removePath(s, resolvePath(s.cwd, f), recursive);
				if (!next) return fail(`rm: cannot remove '${f}' (simulated)`);
				s = next;
			}
			return ok('', s);
		}
		case 'chmod':
		case 'chown':
			return ok('');
		case 'gzip':
		case 'gunzip':
			return ok('');
		case 'fmt':
			return ok(stdin.split(/\s+/).join('\n'));
		case 'jobs':
			return ok('[1]+  Running  sleep 100 & (simulated)');
		case 'kill':
		case 'killall':
			return ok('');
		case 'sleep':
			return ok('');
		case 'ping': {
			const host = args.find((a) => !a.startsWith('-')) ?? 'example.com';
			return ok(`PING ${host} (93.184.216.34): 56 data bytes\n64 bytes from 93.184.216.34: icmp_seq=0 ttl=64 time=12.3 ms\n64 bytes from 93.184.216.34: icmp_seq=1 ttl=64 time=11.8 ms\n(simulated — no real network)`);
		}
		case 'curl':
		case 'wget':
			return fail(`${cmd}: network is disabled in simulation (deny-all). Lesson tip: use echo/cat on local files instead.`);
		case 'ssh':
		case 'scp':
			return fail(`${cmd}: remote hosts are unavailable in simulation. Practice flags and paths locally.`);
		case 'dig':
			return ok(`; <<>> DiG (simulated) <<>> ${args[0] ?? 'example.com'}\n;; ANSWER SECTION:\n${args[0] ?? 'example.com'}. 300 IN A 93.184.216.34`);
		case 'whois':
			return ok(`Domain Name: ${(args[0] ?? 'EXAMPLE.COM').toUpperCase()}\nRegistrar: SIMULATED-REGISTRAR\n(simulated — no real lookup)`);
		case 'exit':
			return ok('');
		default: {
			const suggestion = KNOWN_COMMANDS.find((k) => k.startsWith(cmd.slice(0, 2))) ?? 'ls';
			return fail(`bash: ${cmd}: command not found (simulated). Try "${suggestion}".`);
		}
	}
}

export function listCommands(): string[] {
	return [...KNOWN_COMMANDS].sort();
}

/** Execute a full input line: chains (; && ||), pipes, redirects. Pure + synchronous. */
export function executeLine(prevState: FsState, prevEnv: Record<string, string>, line: string): CmdResult {
	const trimmed = line.trim();
	if (trimmed === '') return { output: '', state: prevState, env: prevEnv, exitCode: 0 };
	let state = prevState;
	let env = { ...prevEnv };
	const outChunks: string[] = [];
	let lastCode = 0;

	for (const { segment, op } of splitChain(trimmed)) {
		const stages = parsePipeline(segment);
		if (stages.length === 0) continue;
		if (stages.length > MAX_PIPE_STAGES) {
			outChunks.push('bash: pipeline too deep in simulation (cap 50)');
			lastCode = 1;
			continue;
		}
		// input redirect on first stage
		let stdin = '';
		const first = stages[0] as ParsedStage;
		const inRedir = first.redirects.find((r) => r.op === '<');
		if (inRedir) {
			const content = readFile(state, resolvePath(state.cwd, inRedir.target));
			if (content === null) {
				outChunks.push(`bash: ${inRedir.target}: No such file (simulated)`);
				lastCode = 1;
				continue;
			}
			stdin = content;
		}
		let code = 0;
		for (const stage of stages) {
			const clean: ParsedStage = { ...stage, redirects: stage.redirects.filter((r) => r.op !== '<') };
			const res = executeStage(state, env, clean, stdin);
			state = res.state;
			env = res.env;
			code = res.exitCode;
			stdin = res.output;
			if (code !== 0 && stages.length === 1) break;
		}
		// output redirect on last stage
		const last = stages[stages.length - 1] as ParsedStage;
		const outRedir = last.redirects.find((r) => r.op === '>' || r.op === '>>');
		if (outRedir) {
			const next = writeFile(state, resolvePath(state.cwd, outRedir.target), stdin + (stdin.endsWith('\n') ? '' : '\n'), outRedir.op === '>>');
			if (!next) {
				outChunks.push(`bash: ${outRedir.target}: cannot write (simulated)`);
				code = 1;
			} else {
				state = next;
				stdin = '';
			}
		}
		if (capOutput(stdin) !== stdin) stdin = capOutput(stdin);
		if (stdin !== '') outChunks.push(stdin);
		lastCode = code;
		if (op === '&&' && code !== 0) break;
		if (op === '||' && code === 0) break;
	}

	return { output: outChunks.join('\n'), state, env, exitCode: lastCode };
}

export const DEFAULT_ENV: Record<string, string> = {
	USER: 'user',
	HOME: '/home/user',
	PATH: '/usr/bin:/bin',
	SHELL: '/bin/bash',
	LANG: 'en_US.UTF-8'
};
