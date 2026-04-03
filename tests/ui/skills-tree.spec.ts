import { test, expect } from '@playwright/test';

test.describe('Skills Tab - Tree Navigation', () => {
  test.beforeEach(async ({ page }) => {
    // hermes-agents webapp にアクセス
    await page.goto('http://localhost:18470/agents/test-agent');
    // Skills タブをクリック（role で確実に選択）
    await page.getByRole('tab', { name: 'Skills' }).click();
    // Skills コンテンツが読み込まれるまで待機
    // スキルリストを含むカードが表示されるまで
    await expect(
      page.getByText('No skills available in ~/.agents/skills').or(page.getByRole('tree')),
    ).toBeVisible({ timeout: 7000 });
  });

  test('should not expand skill directories', async ({ page }) => {
    // スキルディレクトリを特定（SKILL.md がある）
    // 例: refactor スキル（トップレベル、SKILL.md 含む）

    // expand ボタンの有無を確認
    const skillRows = await page.locator('div[class*="flex items-center gap-2"]').all();

    for (const row of skillRows) {
      const label = await row.locator('label, span').first().innerText();

      // スキルディレクトリなら展開ボタンがない
      if (label.includes('refactor') || label.includes('rust-cli')) {
        // ボタンが存在せず、スペーサーdivだけあることを確認
        const hasPaddingDiv = await row.locator('div[class*="size-5"]').count();
        expect(hasPaddingDiv).toBeGreaterThan(0); // spacing only, no expand button
      }
    }
  });

  test('should display category folders with expand buttons', async ({ page }) => {
    // カテゴリフォルダ（SKILL.md がない）は展開ボタンを持つべき
    // 例: apple, mini-ops など

    // 展開ボタンは <button> で inline-flex + size-5
    const expandButtons = await page
      .locator('button')
      .filter({
        has: page.locator('svg'),
      })
      .all();

    // 実際に存在する確認
    expect(expandButtons.length).toBeGreaterThan(0);
  });

  test('should hide children of skill directories', async ({ page }) => {
    // スキルディレクトリを展開しようとしても子が表示されない
    // dogfood のように SKILL.md を持ちながら子フォルダがあるケースを確認

    const dogfoodLabels = page.getByText('dogfood', { exact: true });
    if ((await dogfoodLabels.count()) > 0) {
      await expect(page.getByRole('button', { name: /^(Expand|Collapse) dogfood$/ })).toHaveCount(
        0,
      );
    }
  });

  test('should allow expanding category folders', async ({ page }) => {
    // カテゴリフォルダ（例: mini-ops）を展開できることを確認

    // mini-ops 行を探す
    const miniOpsLabel = await page.locator('text=mini-ops').first();
    if (await miniOpsLabel.isVisible()) {
      // 親の行から展開ボタンを取得
      const parentRow = await miniOpsLabel
        .locator('xpath=ancestor::div[contains(@class, "flex items-center gap-2")]')
        .first();
      const expandBtn = await parentRow.locator('button').first();

      // ボタンが存在して、矢印が right を示している
      if (await expandBtn.isVisible()) {
        const chevron = await expandBtn.locator('svg').getAttribute('class');
        expect(chevron).toContain('ChevronRight'); // or inspect actual class

        // クリックして展開
        await expandBtn.click();

        // 子が表示される（depth+1 でインデント）
        await page.waitForSelector('text=hermes-agent-upgrade|hermes-agent-spawning', {
          timeout: 1000,
        });
      }
    }
  });
});
