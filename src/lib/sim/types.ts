export interface SimFile {
	kind: 'file';
	name: string;
	content: string;
	mode: string;
	owner?: string;
}

export interface SimDir {
	kind: 'dir';
	name: string;
	children: Map<string, SimNode>;
	mode: string;
	owner?: string;
}

export type SimNode = SimFile | SimDir;

export interface FsState {
	root: SimDir;
	cwd: string[];
}

export interface CmdResult {
	output: string;
	state: FsState;
	env: Record<string, string>;
	exitCode: number;
}

export interface LessonTask {
	id: string;
	prompt: string;
	/** substring or /regex/ that must appear in command output, or $cmd:prefix to match typed command */
	check: string;
	hint: string;
}

export interface Lesson {
	slug: string;
	title: string;
	chapter: string;
	brief: string;
	starter?: string;
	tasks: LessonTask[];
}
