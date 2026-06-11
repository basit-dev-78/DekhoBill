const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    try {
        console.log("Navigating to Staging URL...");
        await page.goto('https://staging.ke.com.pk:24555/ReBrand/DuplicateBill.aspx', { waitUntil: 'domcontentloaded', timeout: 30000 });
        console.log("Saving screenshot...");
        await page.screenshot({ path: 'staging_screenshot.png' });
        console.log("Saving HTML...");
        const html = await page.content();
        fs.writeFileSync('staging_dump.html', html);
        console.log("Done!");
    } catch(e) {
        console.error("Error:", e);
    } finally {
        await browser.close();
    }
})();
