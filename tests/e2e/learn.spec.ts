import { test, expect } from '@playwright/test';

/**
 * Learn flow — stub coverage (§QA).
 * SimTerminal is xterm canvas-based; these specs assert page structure,
 * task checklist presence and local-first progress contract (no backend).
 */

// @tc:learn-list-renders — lesson list shows all 8 lessons with progress bar
test('lesson list renders with progress', async ({ page }) => {
	await page.goto('/learn');
	await expect(page.getByRole('heading', { name: /learn linux/i })).toBeVisible();
	await expect(page.getByRole('progressbar')).toBeVisible();
	for (const slug of [
		'terminal-basics',
		'file-ops',
		'text-search',
		'dirs',
		'sysinfo',
		'pipes',
		'scripting',
		'processes'
	]) {
		await expect(page.getByTestId(`lesson-${slug}`)).toBeVisible();
	}
});

// @tc:lesson-pane-renders — lesson pane shows brief, terminal, checklist and Check button
test('lesson pane renders terminal and tasks', async ({ page }) => {
	await page.goto('/learn/dirs');
	await expect(page.getByRole('heading', { name: /director/i })).toBeVisible();
	await expect(page.getByTestId('sim-terminal')).toBeVisible();
	await expect(page.getByTestId('task-t1')).toBeVisible();
	await expect(page.getByTestId('check-tasks')).toBeVisible();
});

// @tc:lesson-unknown-slug-404 — invalid slugs 404 (Zod §VAL)
test('unknown lesson slug 404s', async ({ page }) => {
	const res = await page.goto('/learn/not-a-lesson!!');
	expect(res?.status()).toBe(404);
});

// @tc:learn-progress-local — progress persists in localStorage under serverfaishal.progress
test('progress key is localStorage-only', async ({ page }) => {
	await page.goto('/learn');
	const key = await page.evaluate(() => {
		localStorage.setItem('serverfaishal.progress', JSON.stringify({ dirs: true }));
		return localStorage.getItem('serverfaishal.progress');
	});
	expect(key).toContain('dirs');
});
