import { expect, test } from '@playwright/test';

test.describe('Jingxin lot room', () => {
  test('offers three collection tabs with edition metadata', async ({ page }) => {
    await page.goto('/jing/chouqian/');
    const tabs = page.locator('[role="tab"]');
    await expect(tabs).toHaveCount(3);
    await expect(tabs.nth(0)).toHaveText('观音灵签');
    await expect(tabs.nth(1)).toHaveText('吕祖灵签');
    await expect(tabs.nth(2)).toHaveText('关帝灵签');
    // 版本来源默认折叠，展开后可见
    const source = page.locator('.jing-lot-source');
    await expect(source.locator('summary')).toContainText('版本');
    await source.locator('summary').click();
    await expect(page.locator('#lot-edition')).toContainText('观音灵签');
    await expect(page.locator('#lot-edition')).toContainText('数据修订');
  });

  test('draws a lot and renders verse, allusion, topics and classical notes', async ({ page }) => {
    await page.goto('/jing/chouqian/');
    await page.locator('#lot-draw').click();

    await expect(page.locator('#lot-result')).toBeVisible();
    await expect(page.locator('#lot-title')).toContainText('第');
    await expect(page.locator('#lot-title')).toContainText('签');
    await expect(page.locator('#lot-grade')).toContainText('观音灵签');
    await expect(page.locator('#lot-verse p')).toHaveCount(4);
    await expect(page.locator('#lot-stamp')).toContainText('第');
    await expect(page.locator('#lot-stamp')).toContainText('签');
    await expect(page.locator('#lot-allusion')).not.toBeEmpty();
    await expect(page.locator('#lot-topics-list li')).toHaveCount(3);

    // 关帝套带干支
    await page.locator('#lot-tab-guandi').click();
    await page.locator('#lot-draw').click();
    await expect(page.locator('#lot-grade')).toContainText('关帝灵签');
    await expect(page.locator('#lot-grade')).toContainText('·');
  });

  test('cups never overwrite the drawn lot', async ({ page }) => {
    await page.goto('/jing/chouqian/');
    await page.locator('#lot-draw').click();
    await expect(page.locator('#lot-result')).toBeVisible({ timeout: 4000 });
    const title = await page.locator('#lot-title').textContent();

    await page.locator('#lot-cups').click();
    await expect(page.locator('.jing-cup-pair')).toHaveCount(3);
    await expect(page.locator('#lot-cups-result')).toContainText('三回依次为');
    await expect(page.locator('#lot-cups-result')).toContainText(/圣筊|笑筊|阴筊/);
    await expect(page.locator('#lot-title')).toHaveText(title!);

    // 掷筊只此一回
    await expect(page.locator('#lot-cups')).toBeDisabled();
  });

  test('rapid redraw keeps the original lot and shows a calm warning', async ({ page }) => {
    await page.goto('/jing/chouqian/');
    await page.locator('#lot-draw').click();
    await expect(page.locator('#lot-result')).toBeVisible({ timeout: 4000 });
    const title = await page.locator('#lot-title').textContent();

    await page.locator('#lot-draw').click();
    await expect(page.locator('#lot-redraw-warn')).toBeVisible();
    await expect(page.locator('#lot-title')).toHaveText(title!);
  });

  test('switching collection does not clear the current lot', async ({ page }) => {
    await page.goto('/jing/chouqian/');
    await page.locator('#lot-draw').click();
    await expect(page.locator('#lot-result')).toBeVisible({ timeout: 4000 });
    const title = await page.locator('#lot-title').textContent();
    await page.locator('#lot-tab-luzu').click();
    await page.locator('.jing-lot-source summary').click();
    await expect(page.locator('#lot-edition')).toContainText('吕祖灵签');
    await expect(page.locator('#lot-title')).toHaveText(title!);
  });

  test('sends no external requests while drawing', async ({ page }) => {
    const external: string[] = [];
    page.on('request', (request) => {
      const url = request.url();
      if (!url.startsWith('http://localhost') && !url.startsWith('data:')) {
        external.push(url);
      }
    });
    await page.goto('/jing/chouqian/');
    await page.locator('#lot-draw').click();
    await page.locator('#lot-cups').click();
    await expect(page.locator('#lot-result')).toBeVisible();
    expect(external).toEqual([]);
  });

  test('has no horizontal overflow at 390px', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/jing/chouqian/');
    await page.locator('#lot-draw').click();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);
  });
});

test.describe('Jingxin lot draw animation', () => {
  test('plays the tube-shake animation before revealing the lot', async ({ page }) => {
    await page.goto('/jing/chouqian/');
    await page.locator('#lot-draw').click();
    await expect(page.locator('#lot-stage')).toBeVisible();
    await expect(page.locator('#lot-stage')).toHaveClass(/is-playing/);
    await expect(page.locator('#lot-result')).toBeVisible({ timeout: 4000 });
    await expect(page.locator('#lot-stage')).toBeHidden();
  });

  test('reduced motion skips the animation and reveals immediately', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/jing/chouqian/');
    await page.locator('#lot-draw').click();
    await expect(page.locator('#lot-result')).toBeVisible();
    await expect(page.locator('#lot-stage')).toBeHidden();
    await expect(page.locator('#lot-title')).toContainText('签');
  });
});
