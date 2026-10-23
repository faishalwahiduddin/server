import { createInitialFs } from './filesystem.js';
import { DEFAULT_ENV, executeLine } from './commands.js';
import type { FsState } from './types.js';

export * from './types.js';
export { createInitialFs, pwd } from './filesystem.js';
export { executeLine, listCommands, DEFAULT_ENV } from './commands.js';
export { LESSONS, getLesson, listLessons } from './lessons.js';
export { parsePipeline, splitChain, tokenize, expandVars } from './parser.js';

export interface SimSession {
	state: FsState;
	env: Record<string, string>;
}

/** Fresh interactive session: home directory + default env. */
export function createSession(): SimSession {
	return { state: createInitialFs(), env: { ...DEFAULT_ENV } };
}

/**
 * Task check semantics:
 * - "$cmd:<text>" → passes when the typed command contains <text>
 * - "/<regex>/" → passes when the regex matches command output
 * - otherwise → passes when output contains the text
 */
export function checkTask(check: string, typedCommand: string, output: string): boolean {
	if (check.startsWith('$cmd:')) {
		return typedCommand.includes(check.slice(5));
	}
	if (check.startsWith('/') && check.lastIndexOf('/') > 0) {
		const last = check.lastIndexOf('/');
		try {
			return new RegExp(check.slice(1, last)).test(output);
		} catch {
			return output.includes(check);
		}
	}
	return output.includes(check);
}
