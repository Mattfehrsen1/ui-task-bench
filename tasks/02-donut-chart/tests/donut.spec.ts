import { expect, test, type Locator, type Page } from '@playwright/test';
import { boxes, expectNoHorizontalScroll, openFixture } from '../../../grade/support.ts';
import type { Segment } from './contract.ts';
import { fixtures, type FixtureName } from './fixtures.ts';

const fixtureNames = Object.keys(fixtures) as FixtureName[];
const format = (n: number) => n.toLocaleString('en-US');

interface Expected extends Segment {
  percent: number;
  /** Mid-angle of the segment in turns, clockwise from 12 o'clock. */
  middle: number;
}

function expected(data: Segment[]): Expected[] {
  const total = data.reduce((sum, s) => sum + s.value, 0);
  let start = 0;
  return data.map((s) => {
    const share = s.value / total;
    const middle = start + share / 2;
    start += share;
    return { ...s, percent: Math.round(share * 100), middle };
  });
}

const chart = (page: Page, name: FixtureName) =>
  page.getByRole('group', { name: fixtures[name].title });
const segments = (page: Page, name: FixtureName) => chart(page, name).getByRole('img');
const legendRows = (page: Page) => page.getByRole('list', { name: 'Legend' }).getByRole('listitem');

/** Viewport point halfway through the ring's thickness at the segment's mid-angle. */
async function pointOnRing(page: Page, name: FixtureName, middle: number) {
  const [svg] = await boxes(chart(page, name));
  if (!svg) throw new Error('chart not rendered');
  const radius = svg.width * 0.375;
  const angle = middle * 2 * Math.PI;
  return {
    x: svg.x + svg.width / 2 + radius * Math.sin(angle),
    y: svg.y + svg.height / 2 - radius * Math.cos(angle),
  };
}

async function expectActive(page: Page, index: number, segment: Expected) {
  const tooltip = page.getByRole('tooltip');
  await expect(tooltip).toBeVisible();
  await expect(tooltip).toContainText(segment.label);
  await expect(tooltip).toContainText(format(segment.value));
  await expect(tooltip).toContainText(`${segment.percent}%`);

  const rows = legendRows(page);
  const count = await rows.count();
  for (let i = 0; i < count; i++) {
    const row = rows.nth(i);
    if (i === index) await expect(row).toHaveAttribute('aria-current', 'true');
    else await expect(row).not.toHaveAttribute('aria-current', 'true');
  }
  const other = rows.nth(index === 0 ? 1 : 0);
  const background = (row: Locator) => row.evaluate((el) => getComputedStyle(el).backgroundColor);
  expect(await background(rows.nth(index)), 'highlighted row looks different').not.toBe(
    await background(other),
  );
}

async function expectInactive(page: Page) {
  await expect(page.getByRole('tooltip')).toBeHidden();
  await expect(legendRows(page).and(page.locator('[aria-current="true"]'))).toHaveCount(0);
}

test('AC1 Chart is a group named by its title with one labelled segment per datum', async ({
  page,
}) => {
  for (const name of fixtureNames) {
    await openFixture(page, name);
    const names = expected(fixtures[name].data).map(
      (s) => `${s.label}: ${format(s.value)} (${s.percent}%)`,
    );
    await expect(chart(page, name)).toBeVisible();
    await expect(segments(page, name)).toHaveCount(names.length);
    for (const [i, label] of names.entries()) {
      await expect(segments(page, name).nth(i)).toHaveAccessibleName(label);
    }
  }
});

test('AC2 Segment angles are proportional to values, clockwise from 12 o’clock', async ({
  page,
}) => {
  for (const name of fixtureNames) {
    await openFixture(page, name);
    for (const [i, segment] of expected(fixtures[name].data).entries()) {
      const { x, y } = await pointOnRing(page, name, segment.middle);
      const hit = await segments(page, name)
        .nth(i)
        .evaluate((el, [px, py]) => el.contains(document.elementFromPoint(px!, py!)), [x, y]);
      expect(hit, `${segment.label} is drawn at its mid-angle`).toBe(true);
    }
  }
});

test('AC3 The centre shows "Total" and the sum of the values', async ({ page }) => {
  for (const name of fixtureNames) {
    await openFixture(page, name);
    const total = fixtures[name].data.reduce((sum, s) => sum + s.value, 0);
    await expect(chart(page, name)).toContainText('Total');
    await expect(chart(page, name)).toContainText(format(total));
  }
});

test('AC4 The legend lists every label, value and percentage in order', async ({ page }) => {
  for (const name of fixtureNames) {
    await openFixture(page, name);
    const segs = expected(fixtures[name].data);
    await expect(legendRows(page)).toHaveCount(segs.length);
    for (const [i, s] of segs.entries()) {
      const row = legendRows(page).nth(i);
      await expect(row).toContainText(s.label);
      await expect(row).toContainText(format(s.value));
      await expect(row).toContainText(`${s.percent}%`);
    }
  }
});

test('AC5 Hovering a segment shows its tooltip and highlights its legend row', async ({ page }) => {
  for (const name of fixtureNames) {
    await openFixture(page, name);
    await expectInactive(page);
    for (const [i, segment] of expected(fixtures[name].data).entries()) {
      const { x, y } = await pointOnRing(page, name, segment.middle);
      await page.mouse.move(x, y);
      await expectActive(page, i, segment);
    }
    await page.mouse.move(1, 1);
    await expectInactive(page);
  }
});

test('AC6 Arrow keys, Home and End move focus between segments; Tab enters and leaves', async ({
  page,
}) => {
  const name = 'alternate';
  await openFixture(page, name);
  const segs = segments(page, name);
  const last = fixtures[name].data.length - 1;

  await page.keyboard.press('Tab');
  await expect(segs.nth(0), 'Tab focuses the first segment').toBeFocused();

  const steps: [string, number][] = [
    ['ArrowRight', 1],
    ['ArrowDown', 2],
    ['ArrowLeft', 1],
    ['ArrowUp', 0],
    ['ArrowLeft', last],
    ['ArrowRight', 0],
    ['End', last],
    ['Home', 0],
  ];
  for (const [key, index] of steps) {
    await page.keyboard.press(key);
    await expect(segs.nth(index), `${key} focuses segment ${index}`).toBeFocused();
  }

  await page.keyboard.press('Tab');
  const stillInside = await chart(page, name).evaluate((el) => el.contains(document.activeElement));
  expect(stillInside, 'one Tab leaves the chart: only one segment is a tab stop').toBe(false);
});

test('AC7 A focused segment shows its tooltip and legend highlight; Escape hides the tooltip', async ({
  page,
}) => {
  const name = 'alternate';
  await openFixture(page, name);
  const segs = expected(fixtures[name].data);

  await page.keyboard.press('Tab');
  await expectActive(page, 0, segs[0]!);
  await page.keyboard.press('ArrowRight');
  await expectActive(page, 1, segs[1]!);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('tooltip')).toBeHidden();
  await expect(segments(page, name).nth(1)).toBeFocused();
});

test('AC8 The legend sits beside the chart from 640px and below it when narrower', async ({
  page,
}) => {
  await openFixture(page);
  const legend = page.getByRole('list', { name: 'Legend' });

  await page.setViewportSize({ width: 700, height: 800 });
  let [svg] = await boxes(chart(page, 'default'));
  let [list] = await boxes(legend);
  expect(list!.x, 'legend is right of the chart').toBeGreaterThanOrEqual(svg!.x + svg!.width);

  await page.setViewportSize({ width: 375, height: 800 });
  [svg] = await boxes(chart(page, 'default'));
  [list] = await boxes(legend);
  expect(list!.y, 'legend is below the chart').toBeGreaterThanOrEqual(svg!.y + svg!.height);
  expect(svg!.x, 'chart fits the viewport').toBeGreaterThanOrEqual(0);
  expect(svg!.x + svg!.width, 'chart fits the viewport').toBeLessThanOrEqual(375);
  await expectNoHorizontalScroll(page);
});

test('AC9 Matches reference.png at 1280x800 (at most 1% of pixels differ)', async ({ page }) => {
  await openFixture(page);
  await expect(page).toHaveScreenshot('reference.png');
});
