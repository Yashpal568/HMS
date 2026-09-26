import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import puppeteer, { Browser, Page } from 'puppeteer-core';

describe('OPD Test Suite 12: Accessibility & Semantic Structure', () => {
  let browser: Browser;
  let page: Page;

  beforeAll(async () => {
    browser = await puppeteer.launch({
      executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    // Login
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

  it('OPD-A11Y-01: OPD Appointments page maintains descriptive headings and landmarks', async () => {
    await page.goto('http://localhost:3000/appointments', { waitUntil: 'networkidle2' });
    await new Promise((r) => setTimeout(r, 1000));

    const h1Count = await page.evaluate(() => document.querySelectorAll('h1').length);
    expect(h1Count).toBeGreaterThanOrEqual(1);

    const mainCount = await page.evaluate(() => document.querySelectorAll('main').length);
    expect(mainCount).toBeGreaterThanOrEqual(1);
  });

  it('OPD-A11Y-02: All interactive buttons on the OPD workboard have accessible text or aria-labels', async () => {
    const buttonsWithoutAccessibleNames = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      return btns.filter((btn) => {
        const text = btn.innerText.trim();
        const ariaLabel = btn.getAttribute('aria-label');
        const title = btn.getAttribute('title');
        return !text && !ariaLabel && !title;
      }).length;
    });

    expect(buttonsWithoutAccessibleNames).toBe(0);
  });

  it('OPD-A11Y-03: Doctor consultation page inputs maintain explicit labels or accessible placeholders', async () => {
    await page.goto('http://localhost:3000/emr', { waitUntil: 'networkidle2' });
    await new Promise((r) => setTimeout(r, 1000));

    const inputsWithoutLabels = await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input:not([type="hidden"])'));
      return inputs.filter((inp) => {
        const id = inp.getAttribute('id');
        const hasLabel = id ? !!document.querySelector(`label[for="${id}"]`) : false;
        const ariaLabel = inp.getAttribute('aria-label');
        const placeholder = inp.getAttribute('placeholder');
        return !hasLabel && !ariaLabel && !placeholder;
      }).length;
    });

    expect(inputsWithoutLabels).toBe(0);
  });
});
