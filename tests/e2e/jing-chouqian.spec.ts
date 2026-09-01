import { expect, test, type Page } from '@playwright/test';

/* 第一次抽签的净手前奏会自动衔接摇筒，不需要第二次点击。 */
async function drawLot(page: Page) {
  await page.locator('#lot-draw').click();
}

const DRAW_TIMEOUT_MS = 7_000;

test('starts with sound enabled and uses the replacement lot recording', async ({ page }) => {
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
  await page.goto('/jing/chouqian/');
  await expect(page.locator('.jing-sound-toggle')).toHaveAttribute('aria-pressed', 'true');
  await page.locator('#lot-draw').click();
  await expect.poll(() => page.evaluate(() => (window as unknown as { __jingAudioSources: string[] }).__jingAudioSources)).toContain('/jing/audio/lot-draw.mp3');
});

test.describe('Jingxin lot room', () => {
  test('shows the selected lot tube before the first draw', async ({ page }) => {
    await page.goto('/jing/chouqian/');
    await expect(page.locator('#lot-stage')).toBeVisible();
    await expect(page.locator('#lot-visual')).toHaveAttribute('data-frame', '0');
    await expect(page.locator('#lot-stage-text')).toContainText('点击下方抽签');
    await expect(page.locator('#lot-tube-image')).toBeVisible();
  });

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

  test('switches the transparent frame sequence with the selected collection', async ({ page }) => {
    await page.goto('/jing/chouqian/');
    const tube = page.locator('#lot-tube-image');
    await expect(tube).toHaveAttribute('src', '/jing/generated/lot/frames-safe/guanyin/frame-0.png');
    await expect(tube).toHaveAttribute('width', '768');
    await expect(tube).toHaveAttribute('height', '1152');
    await page.locator('#lot-tab-luzu').click();
    await expect(tube).toHaveAttribute('src', '/jing/generated/lot/frames-safe/luzu/frame-0.png');
    await page.locator('#lot-tab-guandi').click();
    await expect(tube).toHaveAttribute('src', '/jing/generated/lot/frames-safe/guandi/frame-0.png');
    const stageSize = await page.locator('.jing-lot-visual').evaluate((element) => {
      const rect = element.getBoundingClientRect();
      return { width: rect.width, height: rect.height };
    });
    expect(stageSize.width / stageSize.height).toBeCloseTo(2 / 3, 2);
  });

  test('uses a code-built shrine instead of the retired scene background', async ({ page }) => {
    await page.goto('/jing/chouqian/');
    const backgrounds = await page.evaluate(() => [
      getComputedStyle(document.querySelector('.jing-lots')!).backgroundImage,
      getComputedStyle(document.querySelector('.jing-lot-mood')!).backgroundImage,
      getComputedStyle(document.querySelector('.jing-lot-cleanse')!, '::before').backgroundImage,
    ].join(' '));
    expect(backgrounds).not.toMatch(/lot-shrine|\/jing\/img\//);
    await expect(page.locator('.jing-lot-table')).toHaveCount(0);
    await expect(page.locator('.jing-lot-contact-shadow')).toHaveCSS('opacity', '0');
  });

  test('first draw automatically continues from cleansing into the shake', async ({ page }) => {
    await page.goto('/jing/chouqian/');
    await page.locator('#lot-draw').click();
    await expect(page.locator('#lot-cleanse')).toBeVisible();
    await expect(page.locator('#jing-lots-app')).toHaveClass(/is-ritual-active/);
    await expect(page.locator('.jing-cleanse-text')).toContainText('净手');
    await expect(page.locator('#lot-cleanse')).toBeHidden({ timeout: 1500 });
    await expect(page.locator('#lot-stage')).toHaveClass(/is-playing/);
    await expect(page.locator('#lot-result')).toBeVisible({ timeout: DRAW_TIMEOUT_MS });
    await expect(page.locator('#jing-lots-app')).not.toHaveClass(/is-ritual-active/);
  });

  test('the asked question echoes above the verse without a chant control', async ({ page }) => {
    await page.goto('/jing/chouqian/');
    await page.locator('#lot-question').fill('家中平安');
    await drawLot(page);
    await expect(page.locator('#lot-result')).toBeVisible({ timeout: DRAW_TIMEOUT_MS });
    await expect(page.locator('#lot-question-echo')).toContainText('为「家中平安」问');

    await expect(page.locator('#lot-chant')).toHaveCount(0);
  });

  test('bookmark shows a preview before saving', async ({ page }) => {
    await page.goto('/jing/chouqian/');
    await drawLot(page);
    await expect(page.locator('#lot-result')).toBeVisible({ timeout: DRAW_TIMEOUT_MS });
    await page.locator('#lot-bookmark').click();
    await expect(page.locator('#lot-bookmark-preview')).toBeVisible();
    await expect(page.locator('#lot-bookmark-img')).toHaveAttribute('src', /^data:image\/png/);
    await page.locator('#lot-bookmark-cancel').click();
    await expect(page.locator('#lot-bookmark-preview')).toBeHidden();
  });

  test('draws a lot and renders verse, allusion, topics and classical notes', async ({ page }) => {
    await page.goto('/jing/chouqian/');
    await drawLot(page);

    await expect(page.locator('#lot-result')).toBeVisible({ timeout: DRAW_TIMEOUT_MS });
    await expect(page.locator('#lot-title')).toContainText('第');
    await expect(page.locator('#lot-title')).toContainText('签');
    await expect(page.locator('#lot-grade')).toContainText('观音灵签');
    await expect(page.locator('#lot-verse p')).toHaveCount(4);
    await expect(page.locator('#lot-stamp')).toContainText('第');
    await expect(page.locator('#lot-stamp')).toContainText('签');
    await expect(page.locator('#lot-allusion')).not.toBeEmpty();
    expect(await page.locator('#lot-topics-list li').count()).toBeGreaterThan(0);
    await expect(page.locator('#lot-bookmark')).toBeEnabled();

    // 关帝套带干支
    await page.locator('#lot-tab-guandi').click();
    await expect(page.locator('#lot-tab-guandi')).toHaveAttribute('aria-selected', 'true');
    await page.locator('#lot-draw').click();
    await expect(page.locator('#lot-grade')).toContainText('关帝灵签', { timeout: DRAW_TIMEOUT_MS });
    await expect(page.locator('#lot-grade')).toContainText('·');
  });

  test('cups never overwrite the drawn lot', async ({ page }) => {
    await page.goto('/jing/chouqian/');
    await drawLot(page);
    await expect(page.locator('#lot-result')).toBeVisible({ timeout: DRAW_TIMEOUT_MS });
    const title = await page.locator('#lot-title').textContent();

    await page.locator('#lot-cups').click();
    await expect(page.locator('.jing-cup-pair')).toHaveCount(3);
    await expect(page.locator('#lot-cups-result')).toContainText('三回依次为');
    await expect(page.locator('#lot-cups-result')).toContainText(/圣筊|笑筊|阴筊/);
    await expect(page.locator('#lot-title')).toHaveText(title!);

    // 掷筊只此一回
    await expect(page.locator('#lot-cups')).toBeDisabled();
  });

  test('repeat draw starts immediately without a cooldown', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/jing/chouqian/');
    await drawLot(page);
    await expect(page.locator('#lot-session-list li')).toHaveCount(1);

    await page.locator('#lot-draw').click();
    await expect(page.locator('#lot-session-list li')).toHaveCount(2);
    await expect(page.locator('#lot-redraw-warn')).toHaveCount(0);
  });

  test('switching collection does not clear the current lot', async ({ page }) => {
    await page.goto('/jing/chouqian/');
    await drawLot(page);
    await expect(page.locator('#lot-result')).toBeVisible({ timeout: DRAW_TIMEOUT_MS });
    const title = await page.locator('#lot-title').textContent();
    await page.locator('#lot-tab-luzu').click();
    await page.locator('.jing-lot-source summary').click();
    await expect(page.locator('#lot-edition')).toContainText('吕祖灵签');
    await expect(page.locator('#lot-title')).toHaveText(title!);
  });

  test('keeps an in-memory session record and restores the correct collection', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/jing/chouqian/');
    await page.locator('#lot-question').fill('第一问');
    await page.locator('#lot-draw').click();
    const firstTitle = await page.locator('#lot-title').textContent();
    await expect(page.locator('#lot-session-list li')).toHaveCount(1);
    await expect(page.locator('#lot-session-list')).toContainText('观音灵签');

    await page.locator('#lot-tab-luzu').click();
    await page.locator('#lot-question').fill('第二问');
    await page.locator('#lot-draw').click();
    await expect(page.locator('#lot-session-list li')).toHaveCount(2);
    await expect(page.locator('#lot-session-list')).toContainText('吕祖灵签');

    await page.locator('[data-lot-history="1"]').click();
    await expect(page.locator('#lot-title')).toHaveText(firstTitle!);
    await expect(page.locator('#lot-grade')).toContainText('观音灵签');
    await expect(page.locator('#lot-question-echo')).toContainText('第一问');
    await expect(page.locator('#lot-question')).toHaveValue('第一问');
    await expect(page.locator('#lot-tab-guanyin')).toHaveAttribute('aria-selected', 'true');

    await page.reload();
    await expect(page.locator('#lot-session-history')).toBeHidden();
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
    await drawLot(page);
    await expect(page.locator('#lot-result')).toBeVisible({ timeout: DRAW_TIMEOUT_MS });
    await page.locator('#lot-cups').click();
    await expect(page.locator('#lot-cups-result')).toContainText('三回依次为');
    expect(external).toEqual([]);
  });

  test('has no horizontal overflow at 390px', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/jing/chouqian/');
    await drawLot(page);
    await expect(page.locator('#lot-result')).toBeVisible({ timeout: DRAW_TIMEOUT_MS });
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);
  });
});

test.describe('Jingxin lot draw animation', () => {
  test('plays all three regenerated sixteen-frame sequences', async ({ page }) => {
    await page.goto('/jing/chouqian/');
    for (const collection of ['guanyin', 'luzu', 'guandi']) {
      await page.locator(`#lot-tab-${collection}`).click();
      await page.locator('#lot-draw').click();
      await expect(page.locator('#lot-visual')).toHaveAttribute('data-collection', collection);
      await expect(page.locator('#lot-visual')).toHaveAttribute('data-frame', /^(?:1[2-5])$/, { timeout: 5600 });
      await expect(page.locator('#lot-result')).toBeVisible({ timeout: DRAW_TIMEOUT_MS });
      await expect(page.locator('#lot-visual')).toHaveAttribute('data-frame', '15');
    }
  });

  test('plays the tube-shake animation before revealing the lot', async ({ page }) => {
    await page.goto('/jing/chouqian/');
    await drawLot(page);
    await expect(page.locator('#lot-stage')).toBeVisible();
    await expect(page.locator('#lot-stage')).toHaveClass(/is-playing/);
    await expect(page.locator('#lot-animation-canvas')).toBeVisible({ timeout: 3000 });
    await expect(page.locator('#lot-visual')).toHaveAttribute('data-canvas-ready', 'true');
    await expect(page.locator('#lot-visual')).toHaveAttribute('data-frame', /^(?:[1-9]|1[0-5])$/, { timeout: 3000 });
    await expect(page.locator('#lot-result')).toBeVisible({ timeout: DRAW_TIMEOUT_MS });
    await expect(page.locator('#lot-stage')).toBeVisible();
    await expect(page.locator('#lot-stage')).toHaveAttribute('data-phase', 'settled');
    await expect(page.locator('#lot-animation-canvas')).toBeHidden();
    await expect(page.locator('#lot-visual')).toHaveAttribute('data-canvas-ready', 'false');
    await expect(page.locator('#lot-falling-stick')).toBeHidden();
    await expect(page.locator('#lot-visual')).toHaveAttribute('data-frame', '15');
    await expect(page.locator('#lot-stage-text')).toContainText('签筒已归位');
  });

  test('reduced motion skips the animation and reveals immediately', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/jing/chouqian/');
    await page.locator('#lot-draw').click();
    await expect(page.locator('#lot-result')).toBeVisible();
    await expect(page.locator('#lot-cleanse')).toBeHidden();
    await expect(page.locator('#lot-stage')).toBeVisible();
    await expect(page.locator('#lot-stage')).toHaveAttribute('data-phase', 'settled');
    await expect(page.locator('#lot-title')).toContainText('签');
  });
});
