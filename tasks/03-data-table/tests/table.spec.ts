import { expect, test, type Locator, type Page } from '@playwright/test';
import { boxes, expectNoHorizontalScroll, openFixture } from '../../../grade/support.ts';
import type { Account } from './contract.ts';
import { fixtures } from './fixtures.ts';

const COLUMNS = ['Account', 'Region', 'Revenue', 'Growth', 'Trend'];

const usd = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});
const pct = new Intl.NumberFormat('en-US', {
  style: 'percent',
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
  signDisplay: 'exceptZero',
});

const table = (page: Page) => page.getByRole('table', { name: 'Accounts' });
const dataRows = (page: Page) =>
  table(page)
    .getByRole('row')
    .filter({ hasNot: page.getByRole('columnheader') });
const filterBox = (page: Page) => page.getByRole('searchbox', { name: 'Filter accounts' });
const sortButton = (page: Page, column: string) =>
  table(page)
    .getByRole('columnheader', { name: column, exact: true })
    .getByRole('button', { name: column, exact: true });

/** Text of every cell, one array per data row. Row headers count as cells. */
async function cellTexts(page: Page): Promise<string[][]> {
  const rows = dataRows(page);
  const texts = await rows.getByRole('cell').or(rows.getByRole('rowheader')).allInnerTexts();
  const result: string[][] = [];
  for (let i = 0; i < texts.length; i += COLUMNS.length) {
    result.push(texts.slice(i, i + COLUMNS.length).map((t) => t.trim()));
  }
  return result;
}

const names = async (page: Page) => (await cellTexts(page)).map((row) => row[0]);

type SortKey = 'name' | 'region' | 'revenue' | 'growth';

function sorted(rows: Account[], key: SortKey, direction: 'ascending' | 'descending') {
  const sign = direction === 'ascending' ? 1 : -1;
  return [...rows]
    .sort((a, b) => {
      const x = a[key];
      const y = b[key];
      const order =
        typeof x === 'string' && typeof y === 'string'
          ? x.localeCompare(y, 'en', { sensitivity: 'base' })
          : Number(x) - Number(y);
      return order * sign;
    })
    .map((row) => row.name);
}

function direction(trend: number[]) {
  const first = trend[0]!;
  const last = trend.at(-1)!;
  return last > first ? 'up' : last < first ? 'down' : 'flat';
}

async function expectSortedBy(page: Page, column: string, order: string[], dir: string) {
  await expect(
    table(page).getByRole('columnheader', { name: column, exact: true }),
  ).toHaveAttribute('aria-sort', dir);
  for (const other of COLUMNS.filter((c) => c !== column)) {
    await expect(
      table(page).getByRole('columnheader', { name: other, exact: true }),
    ).not.toHaveAttribute('aria-sort', /ascending|descending/);
  }
  expect(await names(page)).toEqual(order);
}

/**
 * Reads the canvas back and checks that it plots `trend`: the line spans the canvas, and its
 * left and right ends sit at the heights of the first and last values (max at the top).
 */
async function expectPlots(canvas: Locator, trend: number[]) {
  const shape = await canvas.evaluate((el) => {
    if (!(el instanceof HTMLCanvasElement)) return null;
    const context = el.getContext('2d');
    if (!context) return null;
    const { width, height } = el;
    const { data } = context.getImageData(0, 0, width, height);
    const painted = (x: number, y: number) => (data[(y * width + x) * 4 + 3] ?? 0) > 64;
    const columnYs = (x: number) =>
      Array.from({ length: height }, (_, y) => y).filter((y) => painted(x, y));
    const columns = Array.from({ length: width }, (_, x) => x).filter(
      (x) => columnYs(x).length > 0,
    );
    if (columns.length === 0) return { blank: true as const };
    const left = Math.min(...columns);
    const right = Math.max(...columns);
    const meanY = (from: number, to: number) => {
      const ys = Array.from({ length: to - from + 1 }, (_, i) => columnYs(from + i)).flat();
      return ys.reduce((sum, y) => sum + y, 0) / ys.length;
    };
    const allYs = columns.flatMap(columnYs);
    return {
      blank: false as const,
      spanX: (right - left) / width,
      spanY: (Math.max(...allYs) - Math.min(...allYs)) / height,
      firstY: meanY(left, left + 2) / height,
      lastY: meanY(right - 2, right) / height,
    };
  });

  expect(shape, 'trend is drawn on a 2D <canvas>').not.toBeNull();
  expect(shape?.blank, 'canvas is not blank').toBe(false);
  if (!shape || shape.blank) return;

  const min = Math.min(...trend);
  const max = Math.max(...trend);
  const level = (v: number) => (max === min ? 0.5 : (max - v) / (max - min));
  expect(shape.spanX, 'line spans the canvas width').toBeGreaterThan(0.85);
  if (max !== min) expect(shape.spanY, 'line spans min to max').toBeGreaterThan(0.7);
  expect(Math.abs(shape.firstY - level(trend[0]!)), 'first point height').toBeLessThan(0.15);
  expect(Math.abs(shape.lastY - level(trend.at(-1)!)), 'last point height').toBeLessThan(0.15);
}

async function expectSparklinesMatchRows(page: Page, data: Account[]) {
  const shown = await names(page);
  expect(shown.length, 'rows are rendered').toBeGreaterThan(0);
  for (const name of shown) {
    const account = data.find((a) => a.name === name)!;
    const canvas = dataRows(page)
      .filter({ hasText: name })
      .getByRole('img', { name: `Trend for ${name}, ${direction(account.trend)}`, exact: true });
    await expectPlots(canvas, account.trend);
  }
}

test('AC1 A table named "Accounts" with the five columns and one row per account', async ({
  page,
}) => {
  for (const name of ['default', 'alternate'] as const) {
    await openFixture(page, name);
    await expect(table(page).getByRole('columnheader')).toHaveText(COLUMNS);
    await expect(dataRows(page)).toHaveCount(fixtures[name].length);
    expect(await names(page)).toEqual(fixtures[name].map((a) => a.name));
  }
});

test('AC2 Cells show name, region, revenue as whole dollars and signed growth', async ({
  page,
}) => {
  for (const name of ['default', 'alternate'] as const) {
    await openFixture(page, name);
    const expected = fixtures[name].map((a) => [
      a.name,
      a.region,
      usd.format(a.revenue),
      pct.format(a.growth / 100),
    ]);
    const actual = (await cellTexts(page)).map((row) => row.slice(0, 4));
    expect(actual).toEqual(expected);
  }
});

test('AC3 Clicking a header sorts ascending, then descending, and sets aria-sort', async ({
  page,
}) => {
  const data = fixtures.alternate;
  await openFixture(page, 'alternate');
  for (const [column, key] of [
    ['Account', 'name'],
    ['Region', 'region'],
    ['Revenue', 'revenue'],
    ['Growth', 'growth'],
  ] as const) {
    await sortButton(page, column).click();
    await expectSortedBy(page, column, sorted(data, key, 'ascending'), 'ascending');
    await sortButton(page, column).click();
    await expectSortedBy(page, column, sorted(data, key, 'descending'), 'descending');
  }
});

test('AC4 Sorting works from the keyboard', async ({ page }) => {
  const data = fixtures.default;
  await openFixture(page);
  await filterBox(page).focus();

  await page.keyboard.press('Tab');
  await expect(sortButton(page, 'Account')).toBeFocused();
  await page.keyboard.press('Enter');
  await expectSortedBy(page, 'Account', sorted(data, 'name', 'ascending'), 'ascending');

  await page.keyboard.press('Tab');
  await expect(sortButton(page, 'Region')).toBeFocused();
  await page.keyboard.press('Space');
  await expectSortedBy(page, 'Region', sorted(data, 'region', 'ascending'), 'ascending');
  await page.keyboard.press('Space');
  await expectSortedBy(page, 'Region', sorted(data, 'region', 'descending'), 'descending');
});

test('AC5 Filtering matches name or region, ignoring case, and reports the count', async ({
  page,
}) => {
  const data = fixtures.default;
  await openFixture(page);
  const status = page.getByRole('status');
  await expect(status).toHaveText(`Showing ${data.length} of ${data.length} accounts`);

  for (const query of ['emea', 'GLO', '  apac ', 'north']) {
    await filterBox(page).fill(query);
    const needle = query.trim().toLowerCase();
    const expected = data
      .filter((a) => `${a.name}\n${a.region}`.toLowerCase().includes(needle))
      .map((a) => a.name);
    expect(await names(page), `filter "${query}"`).toEqual(expected);
    await expect(status).toHaveText(`Showing ${expected.length} of ${data.length} accounts`);
  }
});

test('AC6 Empty states: no matches offers "Clear filter"; no data says so', async ({ page }) => {
  await openFixture(page);
  await filterBox(page).fill('zzz');
  await expect(table(page)).toContainText('No accounts match “zzz”.');
  await expect(page.getByRole('status')).toHaveText('Showing 0 of 8 accounts');

  await table(page).getByRole('button', { name: 'Clear filter' }).click();
  await expect(filterBox(page)).toHaveValue('');
  await expect(filterBox(page)).toBeFocused();
  await expect(dataRows(page)).toHaveCount(fixtures.default.length);

  await openFixture(page, 'empty');
  await expect(table(page)).toContainText('No accounts yet.');
  await expect(page.getByRole('button', { name: 'Clear filter' })).toHaveCount(0);
  await expect(page.getByRole('status')).toHaveText('Showing 0 of 0 accounts');
});

test('AC7 Each row has a labelled canvas sparkline that plots its trend', async ({ page }) => {
  for (const name of ['default', 'alternate'] as const) {
    await openFixture(page, name);
    await expectSparklinesMatchRows(page, fixtures[name]);
  }
});

test('AC8 Sparklines stay with their rows after sorting and filtering', async ({ page }) => {
  const data = fixtures.default;
  await openFixture(page);
  await sortButton(page, 'Growth').click();
  await sortButton(page, 'Growth').click();
  await expectSparklinesMatchRows(page, data);
  await filterBox(page).fill('a');
  await sortButton(page, 'Revenue').click();
  await expectSparklinesMatchRows(page, data);
});

test('AC9 The header row stays visible while the rows scroll', async ({ page }) => {
  await openFixture(page, 'many');
  const scroller = await table(page).evaluate((el) => {
    let node: HTMLElement | null = el.parentElement;
    while (node && node !== document.body) {
      const { overflowY } = getComputedStyle(node);
      if (/(auto|scroll)/.test(overflowY) && node.scrollHeight > node.clientHeight) break;
      node = node.parentElement;
    }
    const target = node && node !== document.body ? node : document.scrollingElement!;
    target.scrollTop += 600;
    const top = target === document.scrollingElement ? 0 : target.getBoundingClientRect().top;
    return { top, scrolled: target.scrollTop };
  });
  expect(scroller.scrolled, 'the rows scroll').toBeGreaterThan(0);

  const [header] = await boxes(table(page).getByRole('columnheader', { name: 'Account' }));
  const [firstRow] = await boxes(dataRows(page).first());
  expect(Math.abs(header!.y - scroller.top), 'header is pinned to the top').toBeLessThanOrEqual(2);
  expect(firstRow!.y, 'first row has scrolled under the header').toBeLessThan(header!.y);
});

test('AC10 At 375px the page does not scroll sideways; the table scrolls inside', async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 800 });
  await openFixture(page);
  await expectNoHorizontalScroll(page);
  const [search] = await boxes(filterBox(page));
  expect(search!.x + search!.width, 'filter fits the viewport').toBeLessThanOrEqual(375);
  await expect(sortButton(page, 'Account')).toBeVisible();
});

test('AC11 Matches reference.png at 1280x800 (at most 1% of pixels differ)', async ({ page }) => {
  await openFixture(page);
  await expect(page).toHaveScreenshot('reference.png');
});
