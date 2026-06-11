const { chromium } = require('playwright');
(async () => {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto('https://ke.com.pk/bills-e-payments/', { waitUntil: 'domcontentloaded' });
    const frame = page.frameLocator('iframe[src*="DuplicateBill.aspx"]');
    await frame.locator('#txtAccNo').waitFor({ state: 'visible', timeout: 15000 });
    const html = await frame.locator('body').innerHTML();
    console.log("Iframe HTML length: ", html.length);
    if (html.toLowerCase().includes('month') || html.toLowerCase().includes('period')) {
        console.log("Found month/period options");
    }
    await browser.close();
})();
