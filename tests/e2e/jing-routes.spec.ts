import { expect, test } from '@playwright/test';

const ROUTES = [
  { path: '/jing/', name: '静心堂' },
  { path: '/jing/meditation/', name: '静心' },
  { path: '/jing/muyu/', name: '木鱼' },
  { path: '/jing/fo/', name: '佛礼' },
  { path: '/jing/dao/', name: '道礼' },
  { path: '/jing/notes/', name: '笔记' },
  { path: '/jing/yixue/', name: '易学' },
  { path: '/jing/bazi/', name: '八字' },
  { path: '/jing/yijing/', name: '周易' },
  { path: '/jing/qimen/', name: '奇门' },
  { path: '/jing/chouqian/', name: '抽签' },
];

test.describe('Jingxin eleven routes assembly', () => {
  for (const route of ROUTES) {
    test(`${route.path} renders with private chrome only`, async ({ page }) => {
      const external: string[] = [];
      page.on('request', (request) => {
        const url = request.url();
        if (!url.startsWith('http://localhost') && !url.startsWith('data:')) {
          external.push(url);
        }
      });

      const response = await page.goto(route.path);
      expect(response?.status()).toBe(200);
      await expect(page.locator('h1').first()).toBeVisible();

      // 私密外壳：无公共导航、评论、账号、追踪元素
      await expect(page.locator('.site-nav')).toHaveCount(0);
      await expect(page.locator('.comments-section')).toHaveCount(0);
      await expect(page.locator('.comment-account')).toHaveCount(0);
      await expect(page.locator('script[src*="googletagmanager"], script[src*="analytics"]')).toHaveCount(0);

      // 外壳控件齐全：主题切换、返回主页、回顶部
      await expect(page.locator('#jing-theme-toggle')).toBeAttached();
      await expect(page.locator('.jing-home')).toBeAttached();
      await expect(page.locator('#jing-back-to-top')).toBeAttached();

      expect(external).toEqual([]);
    });
  }

  test('hall shell links to all ten rooms', async ({ page }) => {
    await page.goto('/jing/');
    for (const route of ROUTES.slice(1)) {
      await expect(page.locator(`a[href="${route.path}"]`).first()).toBeAttached();
    }
  });

  test('reduced motion users get the same content without animation reliance', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    for (const route of ROUTES) {
      const response = await page.goto(route.path);
      expect(response?.status()).toBe(200);
      await expect(page.locator('h1').first()).toBeVisible();
    }
  });

  test('five elements diagram updates the paper detail panel', async ({ page }) => {
    await page.goto('/jing/yixue/');
    await page.getByRole('button', { name: '五行属性', exact: true }).click();
    await expect(page.locator('#wuxing-topic-title')).toHaveText('五行属性');
    await expect(page.locator('[data-field="attributes"].is-topic-active')).toHaveCount(3);
    await page.getByRole('button', { name: '火', exact: true }).click();
    await expect(page.locator('#wuxing-name')).toHaveText('火');
    await expect(page.locator('#wuxing-topic-state')).toContainText('火行');
    await expect(page.locator('.jing-element-fire')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('.jing-wuxing-diagram path.is-related')).not.toHaveCount(0);
  });

  test('bazi result keeps pillars and adds factual element ratios', async ({ page }) => {
    await page.goto('/jing/bazi/');
    await page.locator('#bazi-year').fill('1986');
    await page.locator('#bazi-month').fill('5');
    await page.locator('#bazi-day').fill('29');
    await page.locator('#bazi-hour').fill('10');
    await page.locator('#bazi-minute').fill('30');
    await page.locator('#bazi-form button[type="submit"]').click();
    await expect(page.locator('#bazi-status')).toContainText('排盘完成');
    await expect(page.locator('.jing-bazi-pillar')).toHaveCount(4);
    await expect(page.locator('.jing-bazi-element-bar')).toHaveCount(5);
    await expect(page.locator('.jing-bazi-year-timeline span')).toHaveCount(9);
  });

  test('qimen palace click opens its structured inspector', async ({ page }) => {
    await page.goto('/jing/qimen/');
    for (const [id, value] of [['year', '2024'], ['month', '2'], ['day', '10'], ['hour', '12'], ['minute', '0']]) {
      await page.locator(`#qm-${id}`).fill(value);
    }
    await page.locator('#qimen-form button[type="submit"]').click();
    await expect(page.locator('#qm-status')).toContainText('起局完成');
    await expect(page.locator('.jing-qm-cell')).toHaveCount(27);
    await page.locator('.jing-qm-cell').first().click();
    await expect(page.locator('#qm-inspector-title')).not.toHaveText('点击任一宫位');
  });

  test('meditation timer starts and can be paused', async ({ page }) => {
    await page.goto('/jing/meditation/');
    await page.locator('#meditation-toggle').click({ force: true });
    await expect(page.locator('#meditation-toggle')).toHaveAttribute('aria-pressed', 'true');
    await page.locator('#meditation-toggle').click({ force: true });
    await expect(page.locator('#meditation-breath-label')).toHaveText('继续静心');
  });

  test('scene and study pages reflow without horizontal overflow on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    for (const path of ['/jing/', '/jing/muyu/', '/jing/fo/', '/jing/chouqian/', '/jing/yixue/', '/jing/bazi/', '/jing/qimen/', '/jing/yijing/', '/jing/notes/']) {
      await page.goto(path);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow, `${path} should not overflow horizontally`).toBeLessThanOrEqual(0);
    }
  });
});
