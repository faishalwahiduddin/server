import { z } from 'zod';

export const PROGRESS_KEY = 'serverfaishal.progress';
export const ProgressSchema = z.record(z.string().regex(/^[a-z0-9][a-z0-9-]*$/), z.boolean());
export type Progress = z.infer<typeof ProgressSchema>;

export type Store = Pick<Storage, 'getItem' | 'setItem'>;

export function loadProgress(store: Store): Progress {
	try {
		const raw = store.getItem(PROGRESS_KEY);
		if (!raw) return {};
		const parsed = ProgressSchema.safeParse(JSON.parse(raw));
		return parsed.success ? parsed.data : {};
	} catch {
		return {};
	}
}

export function saveProgress(store: Store, progress: Progress): void {
	store.setItem(PROGRESS_KEY, JSON.stringify(ProgressSchema.parse(progress)));
}

export function markDone(store: Store, slug: string): Progress {
	const next = { ...loadProgress(store), [slug]: true };
	saveProgress(store, next);
	return next;
}
