import { error } from '@sveltejs/kit';
import { LESSONS } from '$lib/sim/lessons.js';
import { SlugSchema } from '$lib/lessons.js';
import type { PageLoad } from './$types.js';

export const prerender = true;

export function entries() {
	return LESSONS.map((l) => ({ slug: l.slug }));
}

export const load: PageLoad = ({ params }) => {
	// §VAL: lesson slug is validated client and server side (zod).
	const parsed = SlugSchema.safeParse(params.slug);
	if (!parsed.success) throw error(404, 'Unknown lesson');
	const lesson = LESSONS.find((l) => l.slug === parsed.data);
	if (!lesson) throw error(404, 'Unknown lesson');
	return { slug: lesson.slug };
};
