import type { FsState, SimDir, SimNode } from './types.js';

function dir(name: string, children: SimNode[] = [], mode = 'rwxr-xr-x'): SimDir {
	return { kind: 'dir', name, mode, children: new Map(children.map((c) => [c.name, c])) };
}

function file(name: string, content: string, mode = 'rw-r--r--'): SimNode {
	return { kind: 'file', name, content, mode };
}

export function createInitialFs(): FsState {
	const root = dir('/', [
		dir('home', [
			dir('user', [
				file('README.md', '# server.faishal.id\nSimulated Linux sandbox. Nothing here is real.\n'),
				file('notes.txt', 'Lorem ipsum\ndolor sit amet\nconsetetur sadipscing\n'),
				dir('projects', [dir('demo', [file('main.sh', '#!/usr/bin/env bash\necho hello world\n')])])
			])
		]),
		dir('etc', [file('passwd', 'root:x:0:0:root:/root:/usr/bin/zsh\ndaemon:x:1:1:daemon:/usr/sbin:/usr/sbin/nologin\nuser:x:1000:1000:user:/home/user:/bin/bash\n')]),
		dir('tmp', [])
	]);
	return { root, cwd: ['home', 'user'] };
}

export function resolvePath(cwd: string[], input: string): string[] {
	const parts = input.startsWith('/') ? [] : [...cwd];
	for (const seg of input.split('/')) {
		if (seg === '' || seg === '.') continue;
		if (seg === '..') parts.pop();
		else if (seg === '~') return ['home', 'user', ...seg.split('/').slice(1).filter(Boolean)];
		else parts.push(seg);
	}
	return parts;
}

export function getNode(root: SimDir, path: string[]): SimNode | null {
	let cur: SimNode = root;
	for (const seg of path) {
		if (cur.kind !== 'dir') return null;
		const next = cur.children.get(seg);
		if (!next) return null;
		cur = next;
	}
	return cur;
}

function cloneDir(d: SimDir): SimDir {
	const children = new Map<string, SimNode>();
	for (const [k, v] of d.children) {
		children.set(k, v.kind === 'dir' ? cloneDir(v) : { ...v });
	}
	return { ...d, children };
}

export function cloneState(s: FsState): FsState {
	return { root: cloneDir(s.root), cwd: [...s.cwd] };
}

function parentOf(root: SimDir, path: string[]): SimDir | null {
	if (path.length === 0) return null;
	const node = getNode(root, path.slice(0, -1));
	return node && node.kind === 'dir' ? node : null;
}

export function listNames(state: FsState, path: string[]): string[] | null {
	const node = getNode(state.root, path);
	if (!node || node.kind !== 'dir') return null;
	return [...node.children.keys()].sort();
}

export function pwd(state: FsState): string {
	return '/' + state.cwd.join('/');
}

export function mkdir(state: FsState, path: string[]): FsState | null {
	const next = cloneState(state);
	const parent = parentOf(next.root, path);
	const name = path[path.length - 1];
	if (!parent || !name || parent.children.has(name)) return null;
	parent.children.set(name, dir(name));
	return next;
}

export function touch(state: FsState, path: string[]): FsState {
	const next = cloneState(state);
	const parent = parentOf(next.root, path);
	const name = path[path.length - 1];
	if (!parent || !name) return next;
	const existing = parent.children.get(name);
	if (!existing) parent.children.set(name, file(name, ''));
	return next;
}

export function writeFile(state: FsState, path: string[], content: string, append: boolean): FsState | null {
	const next = cloneState(state);
	const parent = parentOf(next.root, path);
	const name = path[path.length - 1];
	if (!parent || !name) return null;
	const existing = parent.children.get(name);
	if (existing && existing.kind === 'dir') return null;
	const prev = existing && existing.kind === 'file' ? existing.content : '';
	parent.children.set(name, file(name, append ? prev + content : content));
	return next;
}

export function readFile(state: FsState, path: string[]): string | null {
	const node = getNode(state.root, path);
	return node && node.kind === 'file' ? node.content : null;
}

export function removePath(state: FsState, path: string[], recursive: boolean): FsState | null {
	const next = cloneState(state);
	const parent = parentOf(next.root, path);
	const name = path[path.length - 1];
	if (!parent || !name) return null;
	const existing = parent.children.get(name);
	if (!existing) return null;
	if (existing.kind === 'dir' && existing.children.size > 0 && !recursive) return null;
	parent.children.delete(name);
	return next;
}

export function movePath(state: FsState, from: string[], to: string[]): FsState | null {
	const next = cloneState(state);
	const srcParent = parentOf(next.root, from);
	const srcName = from[from.length - 1];
	const dstParent = parentOf(next.root, to);
	const dstName = to[to.length - 1];
	if (!srcParent || !srcName || !dstParent || !dstName) return null;
	const node = srcParent.children.get(srcName);
	if (!node) return null;
	srcParent.children.delete(srcName);
	dstParent.children.set(dstName, { ...node, name: dstName } as SimNode);
	return next;
}
