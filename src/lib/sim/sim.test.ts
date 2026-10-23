import { describe, expect, it } from 'vitest';
import { executeLine, DEFAULT_ENV } from './commands.js';
import { createInitialFs, pwd } from './filesystem.js';
import { parsePipeline, splitChain, tokenize } from './parser.js';
import { LESSONS, checkTask, createSession } from './index.js';

function run(line: string): { output: string; code: number } {
	const s = createSession();
	const r = executeLine(s.state, s.env, line);
	return { output: r.output, code: r.exitCode };
}

describe('filesystem', () => {
	it('starts in /home/user', () => {
		expect(pwd(createInitialFs())).toBe('/home/user');
	});
});

describe('parser', () => {
	it('tokenizes quotes', () => {
		expect(tokenize(`echo "hello world" 'a b'`)).toEqual(['echo', 'hello world', 'a b']);
	});
	it('splits chains', () => {
		expect(splitChain('a && b; c')).toEqual([
			{ segment: 'a', op: '&&' },
			{ segment: 'b', op: ';' },
			{ segment: 'c', op: null }
		]);
	});
	it('parses pipes and redirects', () => {
		const stages = parsePipeline('cat notes.txt | grep dolor > out.txt');
		expect(stages).toHaveLength(2);
		expect(stages[1]?.redirects).toEqual([{ op: '>', target: 'out.txt' }]);
	});
});

describe('commands', () => {
	it('pwd + ls show seeded files', () => {
		expect(run('pwd').output).toBe('/home/user');
		expect(run('ls').output).toContain('README.md');
	});
	it('echo expands vars', () => {
		const s = createSession();
		const r = executeLine(s.state, s.env, 'export CITY=jakarta && echo $CITY');
		expect(r.output).toContain('jakarta');
	});
	it('pipes buffer stdout to stdin', () => {
		expect(run('cat notes.txt | grep dolor').output).toContain('dolor');
	});
	it('redirect writes files', () => {
		const s = createSession();
		const r = executeLine(s.state, s.env, 'echo hello > hi.txt && cat hi.txt');
		expect(r.output).toContain('hello');
	});
	it('sort | uniq | wc chain', () => {
		const out = run('echo -e "b\\na\\nb" | sort | uniq').output;
		expect(out).toBe('a\nb');
	});
	it('unknown command suggests help', () => {
		const r = run('foobar123');
		expect(r.code).toBe(1);
		expect(r.output).toContain('command not found');
	});
	it('network is disabled by design', () => {
		expect(run('curl https://example.com').output).toContain('disabled in simulation');
	});
	it('mkdir + cd + pwd roundtrip', () => {
		const s = createSession();
		const r = executeLine(s.state, s.env, 'mkdir lab && cd lab && pwd');
		expect(r.output).toContain('/home/user/lab');
	});
	it('grep exit code 1 on no match', () => {
		expect(run('echo hi | grep zzz').code).toBe(1);
	});
});

describe('lessons', () => {
	it('8 lessons with tasks', () => {
		expect(LESSONS).toHaveLength(8);
		for (const l of LESSONS) expect(l.tasks.length).toBeGreaterThan(0);
	});
	it('checkTask semantics', () => {
		expect(checkTask('$cmd:export', 'export A=1', '')).toBe(true);
		expect(checkTask('user', 'whoami', 'user\n')).toBe(true);
		expect(checkTask('/\\d+/', 'wc notes.txt', '  3   9  60')).toBe(true);
	});
});

void DEFAULT_ENV;
