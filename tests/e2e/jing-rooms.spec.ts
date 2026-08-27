import { expect, test } from '@playwright/test';

test.describe('Jingxin woodfish room', () => {
  test('counts clicks, keyboard, and touch; supports pause and reset', async ({ page }) => {
    await page.goto('/jing/muyu/');

    const count = page.locator('#muyu-count');
    const fish = page.locator('#muyu-fish');

    await fish.click();
    await fish.click();
    await expect(count).toHaveText('2');

    // keyboard: focus + Space
    await fish.focus();
    await page.keyboard.press('Space');
    await expect(count).toHaveText('3');

    // elapsed starts ticking
    await expect(page.locator('#muyu-elapsed')).not.toHaveText('00:00', { timeout: 3000 });

    // pause freezes the count input
    await page.locator('#muyu-pause').click();
    await fish.click({ force: true });
    await expect(count).toHaveText('3');

    // reset clears everything
    await page.locator('#muyu-reset').click();
    await expect(count).toHaveText('0');
    await expect(page.locator('#muyu-elapsed')).toHaveText('00:00');
    await expect(page.locator('#muyu-rhythm')).toHaveText('—');
  });

  test('touch tap counts on a touch device', async ({ browser }) => {
    const context = await browser.newContext({ hasTouch: true, viewport: { width: 390, height: 844 } });
    const page = await context.newPage();
    await page.goto('/jing/muyu/');
    await page.tap('#muyu-fish');
    await page.tap('#muyu-fish');
    await expect(page.locator('#muyu-count')).toHaveText('2');
    await context.close();
  });

  test('contains no merit/rank/reward language', async ({ page }) => {
    await page.goto('/jing/muyu/');
    const body = await page.textContent('body');
    expect(body).not.toMatch(/功德|排名|排行|积分|段位|成就|奖励|连击/);
  });

  test('requests no audio before explicit sound activation', async ({ page }) => {
    const audioRequests: string[] = [];
    page.on('request', (req) => {
      if (req.url().includes('/jing/audio/')) audioRequests.push(req.url());
    });
    await page.goto('/jing/muyu/');
    await page.locator('#muyu-fish').click();
    await page.waitForTimeout(500);
    expect(audioRequests).toEqual([]);

    // after opt-in, audio may load
    await page.locator('.jing-sound-toggle').click();
    await page.locator('#muyu-fish').click();
    await page.waitForTimeout(500);
    expect(audioRequests.length).toBeGreaterThan(0);
  });
});

test.describe('Jingxin reverence rooms', () => {
  test('buddhist room shows exactly three figures, none clickable as game buttons', async ({ page }) => {
    await page.goto('/jing/fo/');
    const figures = page.locator('.jing-figure');
    await expect(figures).toHaveCount(3);

    // sacred images are plain images: not wrapped in buttons/links, no role=button
    const interactiveImages = await page.locator(
      '.jing-figure button img, .jing-figure a img, .jing-figure img[role="button"], .jing-figure img[onclick]',
    ).count();
    expect(interactiveImages).toBe(0);

    // every figure shows attribution and license
    await expect(page.locator('.jing-figure-credit')).toHaveCount(3);
    await expect(page.locator('.jing-figure-credit').first()).toContainText('公有领域');
  });

  test('taoist room shows exactly three figures with CC attribution', async ({ page }) => {
    await page.goto('/jing/dao/');
    await expect(page.locator('.jing-figure')).toHaveCount(3);
    await expect(page.locator('.jing-figure-credit').first()).toContainText('CC BY-SA 4.0');
  });

  test('guided reverence completes with neutral copy (reduced motion static path)', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/jing/fo/');

    await page.locator('#reverence-buddhist .jing-reverence-begin').click();
    await expect(page.locator('#reverence-buddhist .jing-phase-text')).toHaveText('一礼 · 静心');

    const next = page.locator('#reverence-buddhist .jing-phase-next');
    await next.click();
    await expect(page.locator('#reverence-buddhist .jing-phase-text')).toHaveText('二礼 · 致敬');
    await next.click();
    await expect(page.locator('#reverence-buddhist .jing-phase-text')).toHaveText('三礼 · 安住');
    await next.click();

    await expect(page.locator('#reverence-buddhist .jing-reverence-done')).toBeVisible();
    await expect(page.locator('#reverence-buddhist .jing-reverence-end')).toContainText('礼敬已毕');

    // neutral copy only: no supernatural-success claims
    const body = await page.textContent('body');
    expect(body).not.toMatch(/保佑|灵验|必灵|功德\+|加持成功/);
  });

  test('taoist ambience never loads before opt-in', async ({ page }) => {
    const audioRequests: string[] = [];
    page.on('request', (req) => {
      if (req.url().includes('/jing/audio/')) audioRequests.push(req.url());
    });
    await page.goto('/jing/dao/');
    await page.locator('#reverence-taoist .jing-reverence-begin').click();
    await page.waitForTimeout(500);
    expect(audioRequests).toEqual([]);

    await page.locator('#reverence-taoist .jing-sound-toggle').click();
    await page.waitForTimeout(500);
    // buddhist room audio must never be requested from the taoist room
    expect(audioRequests.some((u) => u.includes('/chime.') || u.includes('/bell.'))).toBe(false);
  });
});
