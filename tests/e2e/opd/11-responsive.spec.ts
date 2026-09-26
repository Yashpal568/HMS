import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import puppeteer, { Browser, Page } from 'puppeteer-core';

describe('OPD Test Suite 11: Responsive UI & Multi-Viewport Layout Integrity', () => {
  let browser: Browser;
  let page: Page;

  beforeAll(async () => {
    browser = await puppeteer.launch({
      executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    page = await browser.newPage();

    // Login once
    await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle2' });
    await page.type('input[type="email"]', 'admin@hms.local');
    await page.type('input[type="password"]', 'Admin@HMS2026');
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle2' }),
      page.click('button[type="submit"]'),
    ]);
    await page.waitForFunction(() => !document.body.innerText.includes('Verifying HMS Session'));
  });

  afterAll(async () => {
    if (browser) await browser.close();
  });

  it('OPD-RESP-01: Desktop viewport (1920x1080) maintains clean grid layout without horizontal overflow', async () => {
    await page.setViewport({ width: 1920, height: 1080 });
    await page.goto('http://localhost:3000/appointments', { waitUntil: 'networkidle2' });
    await new Promise((r) => setTimeout(r, 1000));

    const hasHorizontalOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });

    expect(hasHorizontalOverflow).toBe(false);
  });

  it('OPD-RESP-02: Tablet viewport (768x1024) wraps action controls gracefully', async () => {
    await page.setViewport({ width: 768, height: 1024 });
    await page.goto('http://localhost:3000/appointments', { waitUntil: 'networkidle2' });
    await new Promise((r) => setTimeout(r, 1000));

    const hasHorizontalOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });

    expect(hasHorizontalOverflow).toBe(false);
  });

  it('OPD-RESP-03: Mobile viewport (375x812) maintains responsive layout and readable controls', async () => {
    await page.setViewport({ width: 375, height: 812 });
    await page.goto('http://localhost:3000/emr', { waitUntil: 'networkidle2' });
    await new Promise((r) => setTimeout(r, 1000));

    const hasHorizontalOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });

    expect(hasHorizontalOverflow).toBe(false);
  });
});
