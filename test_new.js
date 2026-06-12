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
        
        console.log("Waiting for txtAccNo...");
        await page.locator('#txtAccNo').waitFor({ state: 'visible', timeout: 15000 });
        await page.locator('#txtAccNo').fill('0400005331186');

        console.log("Checking for Captcha...");
        const captchaLoc = page.locator('#lblCaptcha');
        if (await captchaLoc.isVisible()) {
            const captchaText = await captchaLoc.innerText();
            console.log("Found Captcha Text:", captchaText);
            await page.locator('#txtimgcode').fill(captchaText);
        }

        console.log("Clicking Submit...");
        await page.locator('#btnViewBill').click();

        console.log("Waiting for result...");
        await page.waitForTimeout(5000);
        
        const html = await page.content();
        fs.writeFileSync('new_test_result.html', html);
        console.log("Saved to new_test_result.html");
    } catch(e) {
        console.error("Error:", e);
    } finally {
        await browser.close();
    }
})();
