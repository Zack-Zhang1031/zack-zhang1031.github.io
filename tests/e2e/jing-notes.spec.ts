import { expect, test } from '@playwright/test';

const SECRET = '测试秘密内容-勿外传-7f3a9c';

test.describe('Jingxin encrypted notes', () => {
  test('create, save, lock, and unlock without persisting plaintext', async ({ page }) => {
    const requests: string[] = [];
    page.on('request', (req) => {
      requests.push(`${req.method()} ${req.url()} ${req.postData() ?? ''}`);
    });

    await page.goto('/jing/notes/');
    await expect(page.locator('#notes-create')).toBeVisible();

    await page.locator('#notes-new-password').fill('e2e-pass-1');
    await page.locator('#notes-new-password2').fill('e2e-pass-1');
    await page.locator('#notes-create-btn').click();

    await expect(page.locator('#notes-editor')).toBeVisible();
    await page.locator('#notes-text').fill(SECRET);
    await page.locator('#notes-save-btn').click();
    await expect(page.locator('#notes-status')).toContainText('已保存');

    // stored envelope must not contain plaintext
    const stored = await page.evaluate(() => localStorage.getItem('jing.vault.v1'));
    expect(stored).toBeTruthy();
    expect(stored).not.toContain(SECRET);
    expect(stored).not.toContain('e2e-pass-1');

    // no outgoing request may carry the plaintext or the password
    for (const entry of requests) {
      expect(entry).not.toContain(SECRET);
      expect(entry).not.toContain('e2e-pass-1');
    }

    // reload -> locked; wrong password rejected; correct password restores
    await page.reload();
    await expect(page.locator('#notes-unlock')).toBeVisible();
    await page.locator('#notes-password').fill('wrong-pass');
    await page.locator('#notes-unlock-btn').click();
    await expect(page.locator('#notes-status')).toContainText('密码错误');
    await expect(page.locator('#notes-editor')).toBeHidden();

    await page.locator('#notes-password').fill('e2e-pass-1');
    await page.locator('#notes-unlock-btn').click();
    await expect(page.locator('#notes-editor')).toBeVisible();
    await expect(page.locator('#notes-text')).toHaveValue(SECRET);

    // manual lock wipes the editor
    await page.locator('#notes-lock-btn').click();
    await expect(page.locator('#notes-unlock')).toBeVisible();
    await expect(page.locator('#notes-text')).toHaveValue('');
  });

  test('failed import never overwrites the current vault', async ({ page }) => {
    await page.goto('/jing/notes/');
    await page.locator('#notes-new-password').fill('keep-pass');
    await page.locator('#notes-new-password2').fill('keep-pass');
    await page.locator('#notes-create-btn').click();
    await page.locator('#notes-text').fill('原有笔记');
    await page.locator('#notes-save-btn').click();

    const before = await page.evaluate(() => localStorage.getItem('jing.vault.v1'));

    await page.locator('#notes-import-input').setInputFiles({
      name: 'broken.jing',
      mimeType: 'application/json',
      buffer: Buffer.from('{not valid json'),
    });
    await expect(page.locator('#notes-import-auth')).toBeVisible();
    await page.locator('#notes-import-password').fill('whatever');
    await page.locator('#notes-import-confirm').click();
    await expect(page.locator('#notes-status')).toContainText('JSON');

    const after = await page.evaluate(() => localStorage.getItem('jing.vault.v1'));
    expect(after).toBe(before);
  });
});
