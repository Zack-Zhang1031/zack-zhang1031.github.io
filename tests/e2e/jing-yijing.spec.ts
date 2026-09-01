import { expect, test } from '@playwright/test';

test.describe('Jingxin yijing room', () => {
  test('offers five casting method tabs', async ({ page }) => {
    await page.goto('/jing/yijing/');
    const tabs = page.locator('[role="tab"]');
    await expect(tabs).toHaveCount(5);
    await expect(tabs.nth(0)).toHaveText('铜钱');
    await expect(tabs.nth(1)).toHaveText('蓍草');
    await expect(tabs.nth(2)).toHaveText('数字');
    await expect(tabs.nth(3)).toHaveText('时间');
    await expect(tabs.nth(4)).toHaveText('手动');
  });

  test('manual casting renders primary and derived views', async ({ page }) => {
    await page.goto('/jing/yijing/');
    await page.locator('#yj-tab-manual').click();

    const values = ['7', '8', '9', '7', '6', '8'];
    for (const [i, value] of values.entries()) {
      await page.locator(`#yj-man-${i + 1}`).fill(value);
    }
    await page.locator('#yj-manual-cast').click();

    await expect(page.locator('#yj-result')).toBeVisible();
    await expect(page.locator('#yj-primary')).toContainText('雷火丰');
    await expect(page.locator('#yj-moving')).toContainText('3、5');
    await expect(page.locator('#yj-changed')).toContainText('泽雷随');
    await expect(page.locator('#yj-mutual')).toContainText('泽风大过');
    await expect(page.locator('#yj-opposite')).toContainText('风水涣');
    await expect(page.locator('#yj-reversed')).toContainText('火山旅');
    await expect(page.locator('.jing-yj-line')).toHaveCount(6);
  });

  test('invalid manual lines show an inline error', async ({ page }) => {
    await page.goto('/jing/yijing/');
    await page.locator('#yj-tab-manual').click();
    await page.locator('#yj-man-1').fill('7');
    await page.locator('#yj-man-2').fill('8');
    await page.locator('#yj-man-3').fill('5');
    await page.locator('#yj-man-4').fill('7');
    await page.locator('#yj-man-5').fill('6');
    await page.locator('#yj-man-6').fill('8');
    await page.locator('#yj-manual-cast').click();

    await expect(page.locator('#yj-manual-error')).toBeVisible();
    await expect(page.locator('#yj-manual-error')).toContainText('第 3 爻');
    await expect(page.locator('#yj-result')).toBeHidden();
  });

  test('number casting shows its formula and result', async ({ page }) => {
    await page.goto('/jing/yijing/');
    await page.locator('#yj-tab-numbers').click();
    await page.locator('#yj-num-1').fill('3');
    await page.locator('#yj-num-2').fill('5');
    await page.locator('#yj-num-3').fill('8');
    await page.locator('#yj-numbers-cast').click();

    await expect(page.locator('#yj-numbers-formula')).toContainText('mod 8');
    await expect(page.locator('#yj-numbers-formula')).toContainText('mod 6');
    await expect(page.locator('#yj-primary')).toContainText('火风鼎');
  });

  test('time casting shows its formula and result', async ({ page }) => {
    await page.goto('/jing/yijing/');
    await page.locator('#yj-tab-time').click();
    await page.locator('#yj-time-y').fill('2024');
    await page.locator('#yj-time-m').fill('2');
    await page.locator('#yj-time-d').fill('4');
    await page.locator('#yj-time-h').fill('12');
    await page.locator('#yj-time-cast').click();

    await expect(page.locator('#yj-time-formula')).toContainText('2024+2+4');
    await expect(page.locator('#yj-primary')).toContainText('水泽节');
  });

  test('coin casting needs six throws before a result', async ({ page }) => {
    await page.goto('/jing/yijing/');
    await expect(page.locator('.jing-yj-coin')).toHaveCount(3);
    await expect(page.locator('.jing-yj-coin-front small').first()).toHaveText('字面');
    await expect(page.locator('.jing-yj-coin-back small').first()).toHaveText('背面');
    await expect(page.locator('#yj-coins-count')).toHaveText('0 / 6');
    const throwBtn = page.locator('#yj-coins-throw');
    for (let i = 0; i < 5; i += 1) await throwBtn.click();
    await expect(page.locator('#yj-result')).toBeHidden();
    await expect(page.locator('#yj-coins-log li')).toHaveCount(5);
    await expect(page.locator('.jing-yj-progress-line.is-filled')).toHaveCount(5);

    await throwBtn.click();
    await expect(page.locator('#yj-result')).toBeVisible();
    await expect(page.locator('#yj-coins-log li')).toHaveCount(6);
    await expect(page.locator('#yj-coins-count')).toHaveText('6 / 6');
    await expect(throwBtn).toBeDisabled();

    await page.locator('#yj-coins-reset').click();
    await expect(page.locator('#yj-coins-log li')).toHaveCount(0);
    await expect(page.locator('#yj-result')).toBeHidden();
    await expect(page.locator('#yj-coins-count')).toHaveText('0 / 6');
  });

  test('time casting can fill the current local hour and reports missing input', async ({ page }) => {
    await page.goto('/jing/yijing/');
    await page.locator('#yj-tab-time').click();
    await page.locator('#yj-time-cast').click();
    await expect(page.locator('#yj-method-status')).toContainText('请填写完整');
    await page.locator('#yj-time-now').click();
    await expect(page.locator('#yj-time-y')).not.toHaveValue('');
    await expect(page.locator('#yj-time-h')).not.toHaveValue('');
    await expect(page.locator('#yj-method-status')).toContainText('已填入本机此刻');
  });

  test('starts with sound enabled and uses the replacement coin recording', async ({ page }) => {
    await page.addInitScript(() => {
      const NativeAudio = window.Audio;
      (window as unknown as { __jingAudioSources: string[] }).__jingAudioSources = [];
      window.Audio = new Proxy(NativeAudio, {
        construct(target, args: [string?]) {
          if (args[0]) (window as unknown as { __jingAudioSources: string[] }).__jingAudioSources.push(args[0]);
          return Reflect.construct(target, args);
        },
      });
    });
    await page.goto('/jing/yijing/');
    await expect(page.locator('.jing-sound-toggle')).toHaveAttribute('aria-pressed', 'true');
    await page.locator('#yj-coins-throw').click();
    const audioSources = await page.evaluate(() => (window as unknown as { __jingAudioSources: string[] }).__jingAudioSources);
    expect(audioSources).toContain('/jing/audio/coins-toss.wav');
  });

  test('yarrow casting lists three changes per line', async ({ page }) => {
    await page.goto('/jing/yijing/');
    await page.locator('#yj-tab-yarrow').click();
    await page.locator('#yj-yarrow-cast').click();

    await expect(page.locator('#yj-yarrow-log li')).toHaveCount(6);
    await expect(page.locator('#yj-yarrow-log li').first()).toContainText('三变');
    await expect(page.locator('#yj-result')).toBeVisible();
  });

  test('refresh clears results and inputs', async ({ page }) => {
    await page.goto('/jing/yijing/');
    await page.locator('#yj-tab-manual').click();
    await page.locator('#yj-man-1').fill('7');
    await page.locator('#yj-man-2').fill('8');
    await page.locator('#yj-man-3').fill('9');
    await page.locator('#yj-man-4').fill('7');
    await page.locator('#yj-man-5').fill('6');
    await page.locator('#yj-man-6').fill('8');
    await page.locator('#yj-manual-cast').click();
    await expect(page.locator('#yj-result')).toBeVisible();

    await page.reload();
    await expect(page.locator('#yj-result')).toBeHidden();
  });

  test('makes no external request while casting', async ({ page }) => {
    const external: string[] = [];
    page.on('request', (req) => {
      if (!req.url().startsWith('http://localhost:4321')) external.push(req.url());
    });
    await page.goto('/jing/yijing/');
    await page.locator('#yj-tab-yarrow').click();
    await page.locator('#yj-yarrow-cast').click();
    await expect(page.locator('#yj-result')).toBeVisible();
    expect(external).toEqual([]);
  });

  test('no fortune-telling claims in copy', async ({ page }) => {
    await page.goto('/jing/yijing/');
    const body = await page.textContent('body');
    expect(body).not.toMatch(/灵验|必灵|化解|灾祸|转运|大吉|大凶/);
  });
});
