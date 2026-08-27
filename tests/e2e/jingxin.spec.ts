import { expect, test } from '@playwright/test';

test.describe('Jingxin hidden shell', () => {
  test('public footer exposes exactly one subtle 静 seal linking to /jing/', async ({ page }) => {
    await page.goto('/');
    const seal = page.locator('.site-footer a.jing-seal');
    await expect(seal).toHaveCount(1);
    await expect(seal).toHaveText('静');
    await expect(seal).toHaveAttribute('href', '/jing/');
  });

  test('hall renders with noindex/nofollow and no public chrome', async ({ page }) => {
    const response = await page.goto('/jing/');
    expect(response?.status()).toBe(200);

    const robots = page.locator('head meta[name="robots"]');
    await expect(robots).toHaveAttribute('content', /noindex/);
    await expect(robots).toHaveAttribute('content', /nofollow/);

    // No public navigation, comment account UI, or analytics markup.
    await expect(page.locator('.site-header')).toHaveCount(0);
    await expect(page.locator('.nav-links')).toHaveCount(0);
    await expect(page.locator('#busuanzi_value_site_pv')).toHaveCount(0);
    await expect(page.locator('[data-qr-trigger]')).toHaveCount(0);
  });

  test('hall offers a quiet return-home action', async ({ page }) => {
    await page.goto('/jing/');
    const home = page.locator('a.jing-home');
    await expect(home).toHaveCount(1);
    await expect(home).toHaveAttribute('href', '/');
  });

  test('theme toggle persists across reload', async ({ page }) => {
    await page.goto('/jing/');
    await expect(page.locator('html')).toHaveClass(/dark/);

    await page.locator('#jing-theme-toggle').click();
    await expect(page.locator('html')).toHaveClass(/light/);

    await page.reload();
    await expect(page.locator('html')).toHaveClass(/light/);
  });

  test('hall has no horizontal overflow at 390px', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/jing/');
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
});
