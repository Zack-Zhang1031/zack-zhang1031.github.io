import { expect, test, type Page } from '@playwright/test';

async function fillBirth(
  page: Page,
  birth: { year: string; month: string; day: string; hour: string; minute: string },
) {
  await page.locator('#bazi-year').fill(birth.year);
  await page.locator('#bazi-month').fill(birth.month);
  await page.locator('#bazi-day').fill(birth.day);
  await page.locator('#bazi-hour').fill(birth.hour);
  await page.locator('#bazi-minute').fill(birth.minute);
}

const GOLDEN = { year: '1986', month: '5', day: '29', hour: '0', minute: '0' };

test.describe('Jingxin yixue reference room', () => {
  test('lists five elements and eight trigrams with cycle notes', async ({ page }) => {
    await page.goto('/jing/yixue/');
    await expect(page.locator('.jing-table tbody tr')).toHaveCount(5);
    await expect(page.locator('.jing-gua')).toHaveCount(8);
    await expect(page.locator('.jing-gua').first()).toContainText('乾');
    const body = await page.textContent('body');
    expect(body).toContain('木生火');
  });
});

test.describe('Jingxin bazi room', () => {
  test('computes the frozen 1986-05-29 golden chart locally', async ({ page }) => {
    await page.goto('/jing/bazi/');
    await fillBirth(page, GOLDEN);
    await page.locator('button[type="submit"]').click();

    await expect(page.locator('#bazi-result')).toBeVisible();
    await expect(page.locator('#bazi-summary-text')).toContainText('丙寅 / 癸巳 / 癸酉 / 壬子');
    await expect(page.locator('#bazi-pillars')).toContainText('丙寅');
    await expect(page.locator('#bazi-pillars')).toContainText('癸巳');
    await expect(page.locator('#bazi-pillars')).toContainText('癸酉');
    await expect(page.locator('#bazi-pillars')).toContainText('壬子');
    await expect(page.locator('#bazi-pillars')).toContainText('日主');

    // ordered collapsible sections
    const summaries = page.locator('#bazi-result summary');
    await expect(summaries).toHaveCount(5);
    await expect(summaries.nth(0)).toHaveText('输入摘要');
    await expect(summaries.nth(1)).toHaveText('盘面');
    await expect(summaries.nth(2)).toHaveText('推演');
    await expect(summaries.nth(3)).toHaveText('简释');
    await expect(summaries.nth(4)).toHaveText('提醒');
  });

  test('sends no request containing birth data', async ({ page }) => {
    const requests: string[] = [];
    page.on('request', (req) => requests.push(req.url()));
    await page.goto('/jing/bazi/');
    await fillBirth(page, GOLDEN);
    await page.locator('button[type="submit"]').click();
    await expect(page.locator('#bazi-result')).toBeVisible();

    for (const url of requests) {
      expect(url).not.toMatch(/1986|year=|month=|day=|hour=|minute=|longitude=/);
      expect(url.startsWith('http://localhost:4321')).toBe(true);
    }
  });

  test('refresh clears every birth field and the result', async ({ page }) => {
    await page.goto('/jing/bazi/');
    await fillBirth(page, GOLDEN);
    await page.locator('button[type="submit"]').click();
    await expect(page.locator('#bazi-result')).toBeVisible();

    await page.reload();
    await expect(page.locator('#bazi-year')).toHaveValue('');
    await expect(page.locator('#bazi-month')).toHaveValue('');
    await expect(page.locator('#bazi-result')).toBeHidden();
  });

  test('out-of-range input shows a visible error and no result', async ({ page }) => {
    await page.goto('/jing/bazi/');
    await fillBirth(page, { ...GOLDEN, year: '1899' });
    await page.locator('button[type="submit"]').click();

    await expect(page.locator('#bazi-error')).toBeVisible();
    await expect(page.locator('#bazi-error')).toContainText('1900');
    await expect(page.locator('#bazi-result')).toBeHidden();
  });

  test('true-solar mode reveals place controls and labels the summary', async ({ page }) => {
    await page.goto('/jing/bazi/');
    await expect(page.locator('#bazi-place')).toBeHidden();

    await page.locator('input[name="timeMode"][value="true-solar"]').check();
    await expect(page.locator('#bazi-place')).toBeVisible();

    await page.locator('#bazi-city').selectOption({ label: '乌鲁木齐（87.62°E）' });
    await fillBirth(page, { year: '2024', month: '1', day: '1', hour: '12', minute: '0' });
    await page.locator('button[type="submit"]').click();

    await expect(page.locator('#bazi-summary-text')).toContainText('真太阳时');
    await expect(page.locator('#bazi-summary-text')).toContainText('87.62');
    await expect(page.locator('#bazi-derivation')).toContainText('经度修正');
  });

  test('copy summary button produces a notebook-ready line', async ({ browser }) => {
    const context = await browser.newContext({ permissions: ['clipboard-read', 'clipboard-write'] });
    const page = await context.newPage();
    await page.goto('/jing/bazi/');
    await fillBirth(page, GOLDEN);
    await page.locator('button[type="submit"]').click();
    await page.locator('#bazi-copy').click();
    await expect(page.locator('#bazi-copy-state')).toContainText('已复制');
    await expect(page.locator('#bazi-copy-state .jing-note-link')).toHaveAttribute('href', '/jing/notes/');

    const clip = await page.evaluate(() => navigator.clipboard.readText());
    expect(clip).toContain('丙寅 / 癸巳 / 癸酉 / 壬子');
    await context.close();
  });

  test('result region is usable at 390px without horizontal overflow', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/jing/bazi/');
    await fillBirth(page, GOLDEN);
    await page.locator('button[type="submit"]').click();
    await expect(page.locator('#bazi-result')).toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
});
