const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
    const browser = await chromium.launch({ 
        headless: true,
        args: ['--disable-blink-features=AutomationControlled']
    });
    const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        viewport: { width: 1280, height: 720 }
    });
    await context.addInitScript("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})");
    const page = await context.newPage();
    try {
        console.log("Navigating to Staging URL...");
        await page.goto('https://staging.ke.com.pk:24555/ReBrand/DuplicateBill.aspx', { waitUntil: 'domcontentloaded', timeout: 30000 });
        
        console.log("Moving mouse...");
        await page.mouse.move(100, 100);
        await page.mouse.move(200, 200);
        await page.waitForTimeout(2000);
        
        console.log("Waiting for txtAccNo...");
        await page.locator('#txtAccNo').waitFor({ state: 'visible', timeout: 15000 });
        console.log("Account input found! Filling...");

        await page.locator('#txtAccNo').fill('0400005331186');
        
        console.log("Clicking View Bill button...");
        const btnLoc = page.locator('button, input[type="button"], input[type="submit"]').filter({ hasText: /View Bill|Submit/i });
        if (await btnLoc.count() > 0) {
            await btnLoc.first().click();
        } else {
            await page.locator('#btnViewBill, #btnSubmit, #formSubmit').first().click();
        }

        console.log("Waiting for result...");
        await page.waitForTimeout(10000);

        console.log("Taking screenshot of the result...");
        await page.screenshot({ path: 'staging_result.png', fullPage: true });

        console.log("Done.");
    } catch(e) {
        console.error("Error:", e);
    } finally {
        await browser.close();
    }
})();
