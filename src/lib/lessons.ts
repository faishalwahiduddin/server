import { z } from 'zod';
import { LESSONS, getLesson as getCanonical, type Lesson } from './sim/lessons.js';

export const SlugSchema = z.string().regex(/^[a-z0-9][a-z0-9-]*$/).max(80);

/** Markdown briefs bundled at build time — no network fetch at runtime (Pages prerender-safe). */
const briefs = import.meta.glob<string>('../../content/lessons/*.md', {
	query: '?raw',
	import: 'default',
	eager: true
});

export type LessonWithBrief = Lesson & { briefMd: string };

export function listLessons(): Lesson[] {
	return LESSONS;
}

export function getLesson(slug: string): LessonWithBrief | null {
	if (!SlugSchema.safeParse(slug).success) return null;
	const lesson = getCanonical(slug);
	if (!lesson) return null;
	const briefMd = briefs[`../../content/lessons/${slug}.md`] ?? lesson.brief;
	return { ...lesson, briefMd };
}
