export interface Redirect {
	op: '>' | '>>' | '<';
	target: string;
}

export interface ParsedStage {
	cmd: string;
	args: string[];
	redirects: Redirect[];
}

export type ChainOp = ';' | '&&' | '||';

/** Split a line into pipeline segments chained by ; && || (quote-aware). */
export function splitChain(line: string): { segment: string; op: ChainOp | null }[] {
	const out: { segment: string; op: ChainOp | null }[] = [];
	let cur = '';
	let quote: string | null = null;
	let esc = false;
	let i = 0;
	const push = (op: ChainOp | null): void => {
		if (cur.trim() !== '' || op !== null) out.push({ segment: cur.trim(), op });
		cur = '';
	};
	while (i < line.length) {
		const c = line[i];
		if (esc) {
			cur += c;
			esc = false;
			i++;
			continue;
		}
		if (c === '\\') {
			cur += c;
			esc = true;
			i++;
			continue;
		}
		if (quote) {
			cur += c;
			if (c === quote) quote = null;
			i++;
			continue;
		}
		if (c === '"' || c === "'") {
			quote = c;
			cur += c;
			i++;
			continue;
		}
		if (c === ';') {
			push(';');
			i++;
			continue;
		}
		if (c === '&' && line[i + 1] === '&') {
			push('&&');
			i += 2;
			continue;
		}
		if (c === '|' && line[i + 1] === '|') {
			// logical OR — keep inside segment, handled as chain op marker
			push('||');
			i += 2;
			continue;
		}
		cur += c;
		i++;
	}
	if (cur.trim() !== '') out.push({ segment: cur.trim(), op: null });
	return out;
}

/** Tokenize one pipeline segment: quotes, escapes, pipes, redirects. */
export function tokenize(segment: string): string[] {
	const tokens: string[] = [];
	let cur = '';
	let quote: string | null = null;
	let esc = false;
	const flush = (): void => {
		if (cur !== '') {
			tokens.push(cur);
			cur = '';
		}
	};
	for (let i = 0; i < segment.length; i++) {
		const c = segment[i];
		if (esc) {
			// Keep \n and \t intact inside quotes so echo -e interprets them downstream.
			if (quote !== null && (c === 'n' || c === 't')) cur += '\\';
			cur += c;
			esc = false;
			continue;
		}
		if (c === '\\') {
			esc = true;
			continue;
		}
		if (quote) {
			if (c === quote) quote = null;
			else cur += c;
			continue;
		}
		if (c === '"' || c === "'") {
			quote = c;
			continue;
		}
		if (c === ' ' || c === '\t') {
			flush();
			continue;
		}
		if (c === '|' || c === '<' || c === '>') {
			flush();
			if (c === '>' && segment[i + 1] === '>') {
				tokens.push('>>');
				i++;
			} else {
				tokens.push(c);
			}
			continue;
		}
		cur += c;
	}
	flush();
	return tokens;
}

/** Parse one chain segment into pipe stages with redirects. */
export function parsePipeline(segment: string): ParsedStage[] {
	const tokens = tokenize(segment);
	const stages: ParsedStage[] = [];
	let cur: ParsedStage = { cmd: '', args: [], redirects: [] };
	let i = 0;
	const commit = (): void => {
		if (cur.cmd !== '' || cur.args.length > 0 || cur.redirects.length > 0) {
			stages.push(cur);
		}
		cur = { cmd: '', args: [], redirects: [] };
	};
	while (i < tokens.length) {
		const t = tokens[i];
		if (t === '|') {
			commit();
			i++;
			continue;
		}
		if (t === '>' || t === '>>' || t === '<') {
			const target = tokens[i + 1] ?? '';
			cur.redirects.push({ op: t as Redirect['op'], target });
			i += 2;
			continue;
		}
		if (cur.cmd === '') cur.cmd = t;
		else cur.args.push(t);
		i++;
	}
	commit();
	return stages;
}

/** Expand $VAR and ${VAR} against env (no command substitution — simulation). */
export function expandVars(text: string, env: Record<string, string>): string {
	return text.replace(/\$\{([A-Za-z_][A-Za-z0-9_]*)\}|\$([A-Za-z_][A-Za-z0-9_]*)/g, (m, b: string, a: string) => {
		const key = b ?? a;
		return env[key] ?? '';
	});
}
