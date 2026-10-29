import { describe, expect, it } from 'vitest';
import { expandVars, parsePipeline, splitChain, tokenize } from './parser.js';

describe('sim parser: tokenize', () => {
	it('splits on whitespace', () => {
		expect(tokenize('ls -l /tmp')).toEqual(['ls', '-l', '/tmp']);
	});
	it('honors single and double quotes', () => {
		expect(tokenize(`echo "hello world" 'a b'`)).toEqual(['echo', 'hello world', 'a b']);
	});
	it('handles backslash escapes', () => {
		expect(tokenize('echo a\\ b c')).toEqual(['echo', 'a b', 'c']);
	});
	it('keeps operators as tokens', () => {
		expect(tokenize('cat a | grep b > out')).toEqual(['cat', 'a', '|', 'grep', 'b', '>', 'out']);
		expect(tokenize('echo x >> log')).toEqual(['echo', 'x', '>>', 'log']);
	});
});

describe('sim parser: chains', () => {
	it('splits ; and && quote-aware', () => {
		expect(splitChain('a && b; c')).toEqual([
			{ segment: 'a', op: '&&' },
			{ segment: 'b', op: ';' },
			{ segment: 'c', op: null }
		]);
	});
	it('ignores operators inside quotes', () => {
		expect(splitChain('echo "a && b; c"')).toEqual([{ segment: 'echo "a && b; c"', op: null }]);
	});
	it('supports || chains', () => {
		expect(splitChain('a || b')).toEqual([
			{ segment: 'a', op: '||' },
			{ segment: 'b', op: null }
		]);
	});
});

describe('sim parser: pipelines', () => {
	it('splits pipes and captures redirects', () => {
		const stages = parsePipeline('cat notes.txt | grep dolor > out.txt');
		expect(stages).toHaveLength(2);
		expect(stages[0]).toEqual({ cmd: 'cat', args: ['notes.txt'], redirects: [] });
		expect(stages[1]?.redirects).toEqual([{ op: '>', target: 'out.txt' }]);
	});
	it('captures append and input redirects', () => {
		const stages = parsePipeline('sort < in.txt >> out.txt');
		expect(stages).toEqual([
			{ cmd: 'sort', args: [], redirects: [{ op: '<', target: 'in.txt' }, { op: '>>', target: 'out.txt' }] }
		]);
	});
});

describe('sim parser: env expansion', () => {
	it('expands $VAR and ${VAR}, missing is empty', () => {
		expect(expandVars('hi $USER!', { USER: 'user' })).toBe('hi user!');
		expect(expandVars('a${X}b', {})).toBe('ab');
	});
});
