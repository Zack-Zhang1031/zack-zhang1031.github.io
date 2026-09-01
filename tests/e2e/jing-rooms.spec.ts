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

  test('offers a sit countdown with a cancel path', async ({ page }) => {
    await page.goto('/jing/muyu/');
    await page.locator('#muyu-sit-min').fill('1');
    await page.locator('#muyu-sit-start').click();
    await expect(page.locator('#muyu-sit-status')).toContainText('余');
    await expect(page.locator('#muyu-sit-start')).toHaveText('结束安坐');
    await page.locator('#muyu-sit-start').click();
    await expect(page.locator('#muyu-sit-status')).toContainText('已作罢');
  });

  test('offers an adjustable automatic rhythm with one active timer', async ({ page }) => {
    await page.goto('/jing/muyu/');
    await page.locator('#muyu-tempo').fill('60');
    await expect(page.locator('#muyu-tempo-value')).toHaveText('60 次/分');
    await page.locator('#muyu-auto').click();
    await expect(page.locator('#muyu-mode-status')).toContainText('60 次/分');
    await expect(page.locator('#muyu-count')).toHaveText('2', { timeout: 1600 });

    await page.locator('#muyu-tempo').fill('90');
    await expect(page.locator('#muyu-mode-status')).toContainText('90 次/分');
    await page.locator('#muyu-auto').click();
    const stopped = Number(await page.locator('#muyu-count').textContent());
    await page.waitForTimeout(850);
    await expect(page.locator('#muyu-count')).toHaveText(String(stopped));
    await expect(page.locator('#muyu-mode-status')).toContainText('已停止');
  });

  test('shows the transparent strike sprite and advances its frame on a strike', async ({ page }) => {
    await page.goto('/jing/muyu/');
    const sprite = page.locator('.jing-muyu-strike-sprite');
    await expect(sprite).toBeVisible();
    await expect(sprite).toHaveAttribute('data-strike-frame', '0');
    await expect(sprite).toHaveCSS('background-image', /strike-sequence\.png/);
    await page.locator('#muyu-fish').click();
    await expect(sprite).toHaveAttribute('data-strike-frame', /[1-5]/);
    await expect(page.locator('#muyu-mode-status')).toContainText('第 1 声');
    await expect(page.locator('#jing-muyu-app')).toHaveClass(/is-practicing/);
    await page.mouse.move(10, 10);
    await expect(page.locator('.jing-muyu-hit-label')).toHaveCSS('opacity', '0.16');
  });

  test('uses a code-built room instead of the retired table background', async ({ page }) => {
    await page.goto('/jing/muyu/');
    const background = await page.locator('.jing-muyu-scene').evaluate(
      (node) => getComputedStyle(node).backgroundImage,
    );
    expect(background).not.toContain('woodfish-table');
    await expect(page.locator('.jing-muyu-prop--incense')).toHaveAttribute('src', /incense-burner\.png$/);
  });

  test('centers the desktop woodfish stage independently of the side panels', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/jing/muyu/');
    const scene = await page.locator('.jing-muyu-scene').boundingBox();
    const stage = await page.locator('.jing-muyu-stage').boundingBox();
    const strike = await page.locator('.jing-muyu-hit-label').boundingBox();
    expect(scene && stage && strike).toBeTruthy();
    const sceneCenter = scene!.x + scene!.width / 2;
    expect(Math.abs(stage!.x + stage!.width / 2 - sceneCenter)).toBeLessThan(2);
    expect(Math.abs(strike!.x + strike!.width / 2 - sceneCenter)).toBeLessThan(2);
  });

  test('keeps merit private and contains no ranking or reward mechanics', async ({ page }) => {
    await page.goto('/jing/muyu/');
    await expect(page.locator('#muyu-today-merit')).toHaveText('0');
    await page.locator('#muyu-fish').click();
    await expect(page.locator('#muyu-today-merit')).toHaveText('1');
    await expect(page.locator('#muyu-total-merit')).toHaveText('1');
    const body = await page.textContent('body');
    expect(body).not.toMatch(/功德排行|领取奖励|积分榜|段位|成就解锁|连击/);
  });

  test('starts with sound enabled and uses the replacement woodfish recording', async ({ page }) => {
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
    await page.goto('/jing/muyu/');
    await expect(page.locator('.jing-sound-toggle')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('.jing-sound-toggle')).toContainText('有声');
    await page.locator('#muyu-fish').click();
    const audioSources = await page.evaluate(() => (window as unknown as { __jingAudioSources: string[] }).__jingAudioSources);
    expect(audioSources).toContain('/jing/audio/woodfish.mp3');
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

  test('taoist room shows the three purities plus Lüzu and Guandi with attribution', async ({ page }) => {
    await page.goto('/jing/dao/');
    await expect(page.locator('.jing-figure')).toHaveCount(5);
    await expect(page.locator('.jing-figure-credit').first()).toContainText('CC BY-SA 4.0');
    await expect(page.locator('.jing-figure-tab')).toContainText(['元始天尊', '灵宝天尊', '道德天尊', '吕祖', '关帝']);
  });

  test('guided reverence completes with neutral copy (reduced motion static path)', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/jing/fo/');

    await page.locator('#reverence-buddhist .jing-reverence-begin').click();
    await expect(page.locator('#reverence-buddhist .jing-phase-text')).toHaveText('1礼 · 静态示意');
    await expect(page.locator('#reverence-buddhist .jing-ritual-progress output')).toHaveText('第 1 / 3 步');
    await expect(page.locator('#reverence-buddhist .jing-ritual-progress')).toHaveAttribute('aria-valuenow', '33');

    const next = page.locator('#reverence-buddhist .jing-phase-next');
    await next.click();
    await expect(page.locator('#reverence-buddhist .jing-phase-text')).toHaveText('2礼 · 静态示意');
    await next.click();
    await expect(page.locator('#reverence-buddhist .jing-phase-text')).toHaveText('3礼 · 静态示意');
    await next.click();

    await expect(page.locator('#reverence-buddhist .jing-reverence-done')).toBeVisible();
    await expect(page.locator('#reverence-buddhist .jing-reverence-end')).toContainText('礼敬已毕');
    await expect(page.locator('#reverence-buddhist .jing-ritual-progress')).toHaveAttribute('aria-valuenow', '100');

    // neutral copy only: no supernatural-success claims
    const body = await page.textContent('body');
    expect(body).not.toMatch(/保佑|灵验|必灵|功德\+|加持成功/);
  });

  test('only the start stage is visible before reverence begins', async ({ page }) => {
    await page.goto('/jing/fo/');
    await expect(page.locator('#reverence-buddhist [data-stage="phases"]')).toBeHidden();
    await expect(page.locator('#reverence-buddhist [data-stage="done"]')).toBeHidden();
    await expect(page.locator('#reverence-buddhist .jing-phase-next')).toBeHidden();

    await page.locator('#reverence-buddhist .jing-reverence-begin').click();
    await expect(page.locator('#reverence-buddhist [data-stage="start"]')).toBeHidden();
    await expect(page.locator('#reverence-buddhist [data-stage="phases"]')).toBeVisible();
    await expect(page.locator('#reverence-buddhist [data-stage="done"]')).toBeHidden();
  });

  test('uses transparent action frames and prevents overlapping interactions', async ({ page }) => {
    await page.goto('/jing/fo/');

    await expect(page.locator('.jing-ritual-frame')).toHaveCount(7);
    await page.locator('#reverence-buddhist [data-gesture="palms"]').click();
    await page.locator('#reverence-buddhist .jing-reverence-begin').click();

    await expect(page.locator('.jing-reverence-room')).toHaveClass(/is-performing/);
    await expect(page.locator('.jing-figure-tab').first()).toBeDisabled();
    await expect(page.locator('.jing-reverence-selector')).toHaveCSS('opacity', '0.42');
    await expect(page.locator('.jing-ritual-actor')).toHaveAttribute('data-pose', 'palms', { timeout: 1600 });
    await expect(page.locator('#reverence-buddhist .jing-ritual-progress output')).toContainText('/ 3 步');
    await expect(page.locator('.jing-ritual-frame.is-active')).toHaveCount(1);

    await page.locator('#reverence-buddhist .jing-reverence-stop').click();
    await expect(page.locator('.jing-reverence-room')).not.toHaveClass(/is-performing/);
    await expect(page.locator('.jing-reverence-selector')).toHaveCSS('opacity', '1');
    await expect(page.locator('.jing-figure-tab').first()).toBeEnabled();
    await expect(page.locator('.jing-ritual-actor')).toHaveAttribute('data-pose', 'ready');
  });

  test('taoist sound starts enabled, uses its own ambience and can be muted', async ({ page }) => {
    const audioRequests: string[] = [];
    page.on('request', (req) => {
      if (req.url().includes('/jing/audio/')) audioRequests.push(req.url());
    });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/jing/dao/');
    const soundToggle = page.locator('#reverence-taoist .jing-sound-toggle');
    await expect(soundToggle).toHaveAttribute('aria-pressed', 'true');
    await expect(soundToggle).toContainText('有声');
    await page.locator('#reverence-taoist .jing-reverence-begin').click();
    await page.waitForTimeout(500);
    expect(audioRequests.some((u) => u.includes('/windchime.'))).toBe(true);
    expect(audioRequests.some((u) => u.includes('/pine-wind.'))).toBe(true);
    // Buddhist-room audio must never be requested from the Taoist room.
    expect(audioRequests.some((u) => u.includes('/chime.') || u.includes('/bell.'))).toBe(false);

    /* 声音开关只在起始舞台上：走完三礼回到起点再验证静音。 */
    for (let i = 0; i < 3; i += 1) {
      await page.locator('#reverence-taoist .jing-phase-next').click();
    }
    await page.locator('#reverence-taoist .jing-reverence-again').click();
    await soundToggle.click();
    await expect(soundToggle).toHaveAttribute('aria-pressed', 'false');
    await expect(soundToggle).toContainText('静音');
  });
});

test.describe('Jingxin reverence scene animation', () => {
  test('buddhist scene animates during guided phases when motion is allowed', async ({ page }) => {
    await page.goto('/jing/fo/');
    await page.locator('#reverence-buddhist .jing-reverence-begin').click();
    const scene = page.locator('#reverence-buddhist .jing-scene');
    await expect(scene).toBeVisible();
    await expect(scene).toHaveClass(/is-animated/);
    await expect(page.locator('#reverence-buddhist .jing-smoke-wisp')).toHaveCount(2);
  });

  test('taoist scene shows taiji and stays static under reduced motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/jing/dao/');
    await page.locator('#reverence-taoist .jing-reverence-begin').click();
    const scene = page.locator('#reverence-taoist .jing-scene');
    await expect(scene).toBeVisible();
    await expect(scene).not.toHaveClass(/is-animated/);
    await expect(page.locator('#reverence-taoist .jing-taiji')).toHaveCount(1);
    await expect(page.locator('#reverence-taoist .jing-phase-text')).toHaveText('拱手 · 收心');
    await expect(page.locator('.jing-ritual-frame')).toHaveCount(5);
    await expect(page.locator('.jing-ritual-actor')).toHaveAttribute('data-pose', 'hands');
  });
});
