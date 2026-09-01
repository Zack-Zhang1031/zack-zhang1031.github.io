import { expect, test, type Page } from '@playwright/test';

async function fillTime(
  page: Page,
  t: { year: string; month: string; day: string; hour: string; minute: string },
) {
  await page.locator('#qm-year').fill(t.year);
  await page.locator('#qm-month').fill(t.month);
  await page.locator('#qm-day').fill(t.day);
  await page.locator('#qm-hour').fill(t.hour);
  await page.locator('#qm-minute').fill(t.minute);
}

test.describe('Jingxin qimen room', () => {
  test('renders three agreeing schools for the 1986 golden datetime', async ({ page }) => {
    await page.goto('/jing/qimen/');
    await fillTime(page, { year: '1986', month: '5', day: '29', hour: '0', minute: '0' });
    await page.locator('button[type="submit"]').click();

    await expect(page.locator('#qm-result')).toBeVisible();
    await expect(page.locator('#qm-context')).toContainText('小满');
    await expect(page.locator('#qm-agree')).toContainText('同局');

    for (const school of ['chai-bu', 'zhi-run', 'mao-shan']) {
      await expect(page.locator(`#qm-ju-${school}`)).toContainText('阳遁 2 局');
      await expect(page.locator(`#qm-board-${school} .jing-qm-cell`)).toHaveCount(9);
      await expect(page.locator(`#qm-meta-${school}`)).toContainText('值符');
      await page.locator(`[data-qm-school-tab="${school}"]`).click();
      await page.locator(`#qm-school-${school} .jing-qm-steps summary`).click();
      await expect(page.locator(`#qm-derivation-${school} li`).first()).toBeVisible();
    }

    await expect(page.locator('.jing-qm-school:visible')).toHaveCount(1);
    await page.locator('#qm-compare-toggle').click();
    await expect(page.locator('.jing-qm-school:visible')).toHaveCount(3);
    await expect(page.locator('#qm-compare-toggle')).toHaveAttribute('aria-pressed', 'true');

    const palace = page.locator('#qm-board-chai-bu .jing-qm-cell[data-palace="4"]');
    await palace.click();
    await expect(page.locator('#qm-inspector-title')).toContainText('拆补法');
    await expect(page.locator('#qm-inspector-element')).not.toHaveText('—');
    await expect(page.locator('.jing-qm-cell.is-corresponding')).toHaveCount(2);
    await expect(page.locator('#qm-inspector-compare p')).toHaveCount(3);
  });

  test('shows known inter-school divergence at 2024-12-21 20:00', async ({ page }) => {
    await page.goto('/jing/qimen/');
    await fillTime(page, { year: '2024', month: '12', day: '21', hour: '20', minute: '0' });
    await page.locator('button[type="submit"]').click();

    await expect(page.locator('#qm-agree')).toContainText('不同');
    await expect(page.locator('#qm-ju-chai-bu')).toContainText('阳遁 4 局');
    await expect(page.locator('#qm-ju-zhi-run')).toContainText('阴遁 1 局');
    await expect(page.locator('#qm-ju-mao-shan')).toContainText('阳遁 1 局');
    await page.locator('[data-qm-school-tab="zhi-run"]').click();
    await page.locator('#qm-school-zhi-run .jing-qm-steps summary').click();
    await expect(page.locator('#qm-derivation-zhi-run')).toContainText('置闰');
  });

  test('out-of-range input shows a visible error', async ({ page }) => {
    await page.goto('/jing/qimen/');
    await fillTime(page, { year: '1899', month: '12', day: '31', hour: '12', minute: '0' });
    await page.locator('button[type="submit"]').click();

    await expect(page.locator('#qm-error')).toBeVisible();
    await expect(page.locator('#qm-result')).toBeHidden();
  });

  test('requires every field, fills local current time, and reveals five layers', async ({ page }) => {
    await page.goto('/jing/qimen/');
    await fillTime(page, { year: '1986', month: '5', day: '29', hour: '0', minute: '' });
    await page.locator('#qm-submit').click();
    await expect(page.locator('#qm-error')).toContainText('完整填写');
    await expect(page.locator('#qm-result')).toBeHidden();

    await page.locator('#qm-now').click();
    await expect(page.locator('#qm-year')).not.toHaveValue('');
    await expect(page.locator('#qm-minute')).not.toHaveValue('');
    await expect(page.locator('#qm-status')).toContainText('本机此刻');
    await page.locator('#qm-submit').click();
    await expect(page.locator('.jing-qm-layer-progress li')).toHaveCount(5);
    await expect(page.locator('.jing-qm-layer-progress li.is-done')).toHaveCount(5, { timeout: 3000 });
    await expect(page.locator('#qm-status')).toContainText('起局完成');
  });

  test('refresh clears inputs and results', async ({ page }) => {
    await page.goto('/jing/qimen/');
    await fillTime(page, { year: '1986', month: '5', day: '29', hour: '0', minute: '0' });
    await page.locator('button[type="submit"]').click();
    await expect(page.locator('#qm-result')).toBeVisible();

    await page.reload();
    await expect(page.locator('#qm-year')).toHaveValue('');
    await expect(page.locator('#qm-result')).toBeHidden();
  });

  test('makes no external request and works at 390px', async ({ page }) => {
    const external: string[] = [];
    page.on('request', (req) => {
      if (!req.url().startsWith('http://localhost:4321')) external.push(req.url());
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/jing/qimen/');
    await fillTime(page, { year: '1986', month: '5', day: '29', hour: '0', minute: '0' });
    await page.locator('button[type="submit"]').click();
    await expect(page.locator('#qm-result')).toBeVisible();
    const mobilePalace = page.locator('#qm-board-chai-bu .jing-qm-cell[data-palace="4"]');
    await mobilePalace.click();
    await expect(mobilePalace).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('#qm-inspector')).toBeFocused();
    await expect(page.locator('#qm-inspector-compare')).toBeInViewport();

    expect(external).toEqual([]);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
});
