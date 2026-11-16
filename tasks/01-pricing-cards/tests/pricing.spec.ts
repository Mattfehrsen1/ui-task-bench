import { expect, test, type Page } from '@playwright/test';
import { boxes, expectNoHorizontalScroll, openFixture } from '../../../grade/support.ts';
import { fixtures, type FixtureName } from './fixtures.ts';

const fixtureNames = Object.keys(fixtures) as FixtureName[];
const usd = (n: number) => `$${n.toLocaleString('en-US')}`;
const annualPerMonth = (monthly: number) => Math.round(monthly * 0.8);

const billingSwitch = (page: Page) => page.getByRole('switch', { name: 'Annual billing' });
const plans = (page: Page) => page.getByRole('article');

test('AC1 Billing period is a switch named "Annual billing", off by default', async ({ page }) => {
  await openFixture(page);
  await expect(billingSwitch(page)).toHaveAttribute('aria-checked', 'false');
});

test('AC2 The switch toggles by keyboard and by pointer', async ({ page }) => {
  await openFixture(page);
  const toggle = billingSwitch(page);

  await page.keyboard.press('Tab');
  await expect(toggle, 'the switch is the first tab stop').toBeFocused();
  await page.keyboard.press('Space');
  await expect(toggle).toHaveAttribute('aria-checked', 'true');
  await page.keyboard.press('Enter');
  await expect(toggle).toHaveAttribute('aria-checked', 'false');

  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-checked', 'true');
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-checked', 'false');
});

test('AC3 Renders one article per plan, named by its heading, in prop order', async ({ page }) => {
  for (const name of fixtureNames) {
    await openFixture(page, name);
    await expect(plans(page)).toHaveCount(fixtures[name].length);
    for (const [index, plan] of fixtures[name].entries()) {
      const article = plans(page).nth(index);
      await expect(article).toHaveAccessibleName(plan.name);
      await expect(article.getByRole('heading', { level: 3 })).toHaveText(plan.name);
      await expect(article).toContainText(plan.description);
    }
  }
});

test('AC4 Monthly billing shows the monthly price, billed monthly', async ({ page }) => {
  for (const name of fixtureNames) {
    await openFixture(page, name);
    for (const plan of fixtures[name]) {
      const article = page.getByRole('article', { name: plan.name });
      await expect(article).toContainText(new RegExp(`\\${usd(plan.monthlyPrice)}\\s*/\\s*month`));
      await expect(article).toContainText('Billed monthly');
    }
  }
});

test('AC5 Annual billing takes 20% off (rounded) and states the yearly total', async ({ page }) => {
  for (const name of fixtureNames) {
    await openFixture(page, name);
    await billingSwitch(page).click();
    for (const plan of fixtures[name]) {
      const perMonth = annualPerMonth(plan.monthlyPrice);
      const article = page.getByRole('article', { name: plan.name });
      await expect(article).toContainText(new RegExp(`\\${usd(perMonth)}\\s*/\\s*month`));
      await expect(article).toContainText(`Billed ${usd(perMonth * 12)} yearly`);
      await expect(article).not.toContainText('Billed monthly');
    }
  }
});

test('AC6 A "Save 20%" badge is visible only while annual billing is on', async ({ page }) => {
  await openFixture(page);
  const badge = page.getByText('Save 20%', { exact: true });
  await expect(badge).toBeHidden();
  await billingSwitch(page).click();
  await expect(badge).toBeVisible();
  await billingSwitch(page).click();
  await expect(badge).toBeHidden();
});

test('AC7 Only the highlighted plan is marked "Most popular"', async ({ page }) => {
  for (const name of fixtureNames) {
    await openFixture(page, name);
    await expect(page.getByText('Most popular', { exact: true })).toHaveCount(1);
    for (const plan of fixtures[name]) {
      const flag = page.getByRole('article', { name: plan.name }).getByText('Most popular');
      await expect(flag).toHaveCount(plan.highlighted ? 1 : 0);
    }
  }
});

test('AC8 Each plan has a "Choose <plan>" button and lists its features', async ({ page }) => {
  for (const name of fixtureNames) {
    await openFixture(page, name);
    for (const plan of fixtures[name]) {
      const article = page.getByRole('article', { name: plan.name });
      await expect(article.getByRole('button', { name: `Choose ${plan.name}` })).toBeVisible();
      await expect(article.getByRole('listitem')).toHaveText(plan.features);
    }
  }
});

test('AC9 Cards share one row from 768px and stack in one column below it', async ({ page }) => {
  await openFixture(page);
  await expect(plans(page)).toHaveCount(fixtures.default.length);

  await page.setViewportSize({ width: 1024, height: 800 });
  const [first, ...rest] = await boxes(plans(page));
  for (const box of rest) {
    expect(Math.abs(box.y - first!.y), 'cards share a row').toBeLessThanOrEqual(1);
    expect(Math.abs(box.width - first!.width), 'cards share the width').toBeLessThanOrEqual(1);
  }

  await page.setViewportSize({ width: 375, height: 800 });
  const stacked = await boxes(plans(page));
  for (const [i, box] of stacked.entries()) {
    expect(box.width, 'cards fill the column').toBeGreaterThanOrEqual(375 - 2 * 24 - 1);
    const above = stacked[i - 1];
    if (above) expect(box.y, 'cards stack top to bottom').toBeGreaterThan(above.y + above.height);
  }
  await expectNoHorizontalScroll(page);
});

test('AC10 Matches reference.png at 1280x800 (at most 1% of pixels differ)', async ({ page }) => {
  await openFixture(page);
  await expect(page).toHaveScreenshot('reference.png');
});
