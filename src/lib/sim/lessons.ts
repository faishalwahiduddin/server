import type { Lesson } from './types.js';
export type { Lesson } from './types.js';

/** Curriculum ported from Idnan/bash-guide §1 (basic operations). Simulation-only. */
export const LESSONS: Lesson[] = [
	{
		slug: 'terminal-basics',
		title: 'Terminal basics: export, whatis, whereis, which',
		chapter: '1 · Basic operations',
		brief: 'Learn to inspect your shell: list environment variables with export, read one with echo $NAME, and locate commands with whatis, whereis and which.',
		starter: 'export',
		tasks: [
			{ id: 't1', prompt: 'List all environment variables', check: '$cmd:export', hint: 'Type: export' },
			{ id: 't2', prompt: 'Print the value of $USER', check: 'user', hint: 'Type: echo $USER' },
			{ id: 't3', prompt: 'Find where the ls binary lives', check: '/usr/bin/ls', hint: 'Type: which ls' }
		]
	},
	{
		slug: 'file-ops',
		title: 'File operations: ls, cat, touch, cp, mv, rm',
		chapter: '1.1 · File operations',
		brief: 'List, view, create, copy, move and delete files. Everything happens in a mock filesystem — nothing on your device is touched.',
		starter: 'ls',
		tasks: [
			{ id: 't1', prompt: 'List the files in your home directory', check: 'README.md', hint: 'Type: ls' },
			{ id: 't2', prompt: 'View the notes file', check: 'Lorem ipsum', hint: 'Type: cat notes.txt' },
			{ id: 't3', prompt: 'Create an empty file called hello.txt', check: '$cmd:touch hello.txt', hint: 'Type: touch hello.txt' },
			{ id: 't4', prompt: 'Copy notes.txt to backup.txt, then list files', check: 'backup.txt', hint: 'Type: cp notes.txt backup.txt' }
		]
	},
	{
		slug: 'text-search',
		title: 'Text operations: grep, head, tail, sort, uniq, wc',
		chapter: '1.2 · Text operations',
		brief: 'Search inside files and slice text streams: grep for patterns, head/tail for edges, sort/uniq for order, wc for counts.',
		starter: 'cat notes.txt',
		tasks: [
			{ id: 't1', prompt: 'Search notes.txt for the word "dolor"', check: 'dolor', hint: 'Type: grep dolor notes.txt' },
			{ id: 't2', prompt: 'Show only the first line of notes.txt', check: 'Lorem ipsum', hint: 'Type: head -1 notes.txt' },
			{ id: 't3', prompt: 'Count lines, words and characters in notes.txt', check: '/\\d+\\s+\\d+\\s+\\d+/', hint: 'Type: wc notes.txt' }
		]
	},
	{
		slug: 'dirs',
		title: 'Directory operations: pwd, cd, mkdir',
		chapter: '1.3 · Directory operations',
		brief: 'Know where you are (pwd), move around (cd) and create workspaces (mkdir). Try cd /etc then pwd, then cd - back home.',
		starter: 'pwd',
		tasks: [
			{ id: 't1', prompt: 'Print your current directory', check: '/home/user', hint: 'Type: pwd' },
			{ id: 't2', prompt: 'Create a directory called lab', check: '$cmd:mkdir lab', hint: 'Type: mkdir lab' },
			{ id: 't3', prompt: 'Move into lab and confirm with pwd', check: '/home/user/lab', hint: 'Type: cd lab (then pwd)' }
		]
	},
	{
		slug: 'sysinfo',
		title: 'System info: uname, df, du, ps, whoami',
		chapter: '1.4 · System info',
		brief: 'Interrogate the (simulated) machine: kernel, disk usage, processes and identity. Network commands are disabled by design.',
		starter: 'uname -a',
		tasks: [
			{ id: 't1', prompt: 'Show kernel information', check: 'Linux', hint: 'Type: uname -a' },
			{ id: 't2', prompt: 'Show who you are logged in as', check: 'user', hint: 'Type: whoami' },
			{ id: 't3', prompt: 'List running processes', check: 'bash', hint: 'Type: ps' }
		]
	},
	{
		slug: 'pipes',
		title: 'Pipes & redirects: |, >, >>',
		chapter: '1.2+ · Combining commands',
		brief: 'Chain commands like a pro: pipe stdout into the next command, redirect output to files, append with >>.',
		starter: 'cat notes.txt | grep dolor',
		tasks: [
			{ id: 't1', prompt: 'Pipe notes.txt through grep for "Lorem"', check: 'Lorem', hint: 'Type: cat notes.txt | grep Lorem' },
			{ id: 't2', prompt: 'Save a sorted file list into sorted.txt', check: '$cmd:> sorted.txt', hint: 'Type: ls | sort > sorted.txt' },
			{ id: 't3', prompt: 'Count how many files: pipe ls into wc -l', check: '/\\d+/', hint: 'Type: ls | wc -l' }
		]
	},
	{
		slug: 'scripting',
		title: 'Shell variables: export, echo, $NAME',
		chapter: '2 · Shell programming teaser',
		brief: 'Your first step toward scripting: store values in variables and expand them with $.',
		starter: 'export GREETING=hello',
		tasks: [
			{ id: 't1', prompt: 'Create a variable CITY set to jakarta', check: '$cmd:CITY=jakarta', hint: 'Type: export CITY=jakarta' },
			{ id: 't2', prompt: 'Print the variable back', check: 'jakarta', hint: 'Type: echo $CITY' },
			{ id: 't3', prompt: 'Chain two commands with &&', check: 'jakarta', hint: 'Type: export CITY=jakarta && echo $CITY' }
		]
	},
	{
		slug: 'processes',
		title: 'Processes: ps, jobs, kill',
		chapter: '1.5 · Process monitoring',
		brief: 'See background jobs, understand kill semantics — safely simulated, nothing really dies here.',
		starter: 'jobs',
		tasks: [
			{ id: 't1', prompt: 'List background jobs', check: 'Running', hint: 'Type: jobs' },
			{ id: 't2', prompt: 'Try killing process 1234', check: '$cmd:kill 1234', hint: 'Type: kill 1234' }
		]
	}
];

export function getLesson(slug: string): Lesson | undefined {
	return LESSONS.find((l) => l.slug === slug);
}

export function listLessons(): Pick<Lesson, 'slug' | 'title' | 'chapter'>[] {
	return LESSONS.map((l) => ({ slug: l.slug, title: l.title, chapter: l.chapter }));
}
