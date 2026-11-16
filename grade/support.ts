import { expect, type Locator, type Page } from '@playwright/test';

/** Opens the grader harness with one of the task's hidden fixtures mounted. */
export async function openFixture(page: Page, fixture = 'default'): Promise<void> {
  await page.goto(`/?fixture=${encodeURIComponent(fixture)}`);
  await expect(page.locator('#root > *').first()).toBeAttached();
}

export async function expectNoHorizontalScroll(page: Page): Promise<void> {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow, 'page scrolls horizontally').toBeLessThanOrEqual(0);
}

export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Viewport-relative boxes of every element the locator matches, in DOM order. */
export function boxes(locator: Locator): Promise<Box[]> {
  return locator.evaluateAll((elements) =>
    elements.map((element) => {
      const { x, y, width, height } = element.getBoundingClientRect();
      return { x, y, width, height };
    }),
  );
}
