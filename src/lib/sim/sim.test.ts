import { describe, expect, it } from 'vitest';
import { capOutput, executeLine, toXterm, DEFAULT_ENV } from './commands.js';
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

function session(): { run: (line: string) => { output: string; code: number } } {
	let s = createSession();
	return {
		run: (line: string) => {
			const r = executeLine(s.state, s.env, line);
			s = { state: r.state, env: r.env };
			return { output: r.output, code: r.exitCode };
		}
	};
}

describe('sim engine: filesystem ops', () => {
	it('mkdir -p nested, relative .., absolute cd', () => {
		const t = session();
		expect(t.run('mkdir -p a/b/c && cd a/b/c && pwd').output).toBe('/home/user/a/b/c');
		expect(t.run('cd ../.. && pwd').output).toBe('/home/user/a');
		expect(t.run('cd /etc && pwd').output).toBe('/etc');
		expect(t.run('cd . && pwd').output).toBe('/etc');
	});
	it('touch + redirect write + cat + cp/mv/rm roundtrip', () => {
		const t = session();
		t.run('touch hello.txt && echo hello > hello.txt');
		expect(t.run('cat hello.txt').output).toBe('hello\n');
		expect(t.run('ls').output).toContain('hello.txt');
		t.run('cp hello.txt copy.txt && mv copy.txt moved.txt');
		expect(t.run('cat moved.txt').output).toBe('hello\n');
		t.run('echo more >> moved.txt');
		expect(t.run('cat moved.txt').output).toBe('hello\nmore\n');
		expect(t.run('rm hello.txt moved.txt && ls').output).not.toContain('hello.txt');
	});
	it('rm refuses non-empty dirs without -r', () => {
		const t = session();
		t.run('mkdir -p d/sub && touch d/sub/f');
		expect(t.run('rm d').code).toBe(1);
		expect(t.run('rm -r d && ls').output).toBe('README.md  notes.txt  projects');
	});
});

describe('sim engine: core commands', () => {
	it('echo joins args and export feeds $VAR', () => {
		const t = session();
		expect(t.run('echo a b c').output).toBe('a b c');
		expect(t.run('export CITY=jakarta && echo $CITY').output).toContain('jakarta');
		expect(t.run('echo ${CITY} ${MISSING}').output).toContain('jakarta');
	});
	it('chmod/chown persist and ls -l reflects them', () => {
		const t = session();
		t.run('touch m.sh && chmod 755 m.sh && chown root m.sh');
		const out = t.run('ls -l m.sh').output;
		expect(out).toContain('-755');
		expect(out).toContain('root root');
		expect(t.run('chmod 999 m.sh').code).toBe(1);
	});
	it('date is deterministic and supports +format', () => {
		expect(run('date').output).toBe('Thu Jan  1 00:00:00 UTC 2026 (simulated clock)');
		expect(run('date').output).toBe(run('date').output);
		expect(run('date +%Y-%m-%d').output).toBe('2026-01-01');
	});
	it('cal renders a deterministic month grid', () => {
		const out = run('cal').output;
		expect(out).toContain('January 2026');
		expect(out).toContain('Su Mo Tu We Th Fr Sa');
		expect(run('cal 2 2026').output).toContain('February 2026');
		expect(run('cal 13 2026').code).toBe(1);
	});
	it('gzip/gunzip roundtrip with format check', () => {
		const t = session();
		t.run('echo data > d.txt && gzip d.txt');
		const listing = t.run('ls').output.split('  ');
		expect(listing).toContain('d.txt.gz');
		expect(listing).not.toContain('d.txt');
		expect(t.run('gunzip d.txt.gz && cat d.txt').output).toBe('data\n');
		expect(t.run('gunzip d.txt').code).toBe(1);
	});
	it('which/whereis/whatis resolve known commands', () => {
		expect(run('which ls').output).toBe('/usr/bin/ls');
		expect(run('whereis grep').output).toBe('grep: /usr/bin/grep');
		expect(run('whatis pwd').output).toContain('pwd');
		expect(run('which nosuchcmd').code).toBe(0);
	});
	it('unknown command suggests the closest match', () => {
		const r = run('cta');
		expect(r.code).toBe(1);
		expect(r.output).toContain("Did you mean 'cat'?");
		expect(run('foobar123').output).toContain('command not found');
	});
	it('text pipeline: sort | cut | uniq, sed, awk, tr, nl', () => {
		expect(run('echo -e "b:a\\nc:b\\na:c" | sort | cut -d: -f1 | uniq').output).toBe('a\nb\nc');
		expect(run('echo hello | sed s/hello/hi/').output).toBe('hi');
		expect(run('echo "x y" | awk \'{print $2}\'').output).toBe('y');
		expect(run('echo abc | tr a-z A-Z').output).toBe('ABC');
		expect(run('echo hi | nl').output).toContain('1');
		expect(run('echo -e "a\\nb" | grep -v a').output).toBe('b');
		expect(run('echo -e "a\\nb" | wc -l').output).toContain('2');
	});
	it('df/du/ping report deterministic fake stats', () => {
		expect(run('df').output).toContain('simfs');
		expect(run('du notes.txt').output).toContain('notes.txt');
		expect(run('ping -c 1 example.com').output).toContain('icmp_seq=0');
	});
	it('output caps at 200 lines and 50 pipe stages', () => {
		expect(capOutput('a\n'.repeat(300)).split('\n')).toHaveLength(201);
		expect(capOutput('a\n'.repeat(300))).toContain('truncated');
		const many = Array(51).fill('echo x').join(' | ');
		const r = run(many);
		expect(r.code).toBe(1);
		expect(r.output).toContain('cap 50');
	});
	it('redirect to /dev/null discards output', () => {
		const t = session();
		expect(t.run('echo hi > /dev/null').output).toBe('');
		expect(t.run('ls /dev/null').code).toBe(1);
	});
	it('toXterm converts LF to CRLF', () => {
		expect(toXterm('a\nb\n')).toBe('a\r\nb\r\n');
	});
});
