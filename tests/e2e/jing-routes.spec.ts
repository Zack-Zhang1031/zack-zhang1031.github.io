import { expect, test } from '@playwright/test';

const ROUTES = [
  { path: '/jing/', name: '静心堂' },
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

test.describe('Jingxin ten routes assembly', () => {
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

  test('hall index links to all nine rooms', async ({ page }) => {
    await page.goto('/jing/');
    for (const route of ROUTES.slice(1)) {
      await expect(page.locator(`a[href="${route.path}"]`)).toBeAttached();
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
});
