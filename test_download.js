const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
    const browser = await chromium.launch({ 
        headless: true,
        args: ['--disable-blink-features=AutomationControlled']
    });
    const context = await browser.newContext({
        acceptDownloads: true,
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    });
    const page = await context.newPage();
    try {
        console.log("Navigating to Staging URL...");
        await page.goto('https://staging.ke.com.pk:24555/ReBrand/DuplicateBill.aspx', { waitUntil: 'domcontentloaded', timeout: 30000 });
        
        await page.locator('#txtAccNo').waitFor({ state: 'visible', timeout: 15000 });
        await page.locator('#txtAccNo').fill('0400005331186');

        const captchaLoc = page.locator('#lblCaptcha');
        if (await captchaLoc.isVisible()) {
            const captchaText = await captchaLoc.innerText();
            await page.locator('#txtimgcode').fill(captchaText);
        }

        await page.locator('#btnViewBill').click();
        await page.waitForTimeout(5000);
        
        console.log("Trying to click the first download button...");
        const btn = page.locator('#GridView1 input[value="Download"]').first();
        if (await btn.count() > 0) {
            console.log("Found download button, clicking...");
            
            // Wait for either a download or a popup/navigation
            const [download] = await Promise.all([
                page.waitForEvent('download', { timeout: 15000 }).catch(e => null),
                btn.click()
            ]);
            
            if (download) {
                console.log("Download event triggered!");
                const path = await download.path();
                console.log("Downloaded to:", path);
                const stat = fs.statSync(path);
                console.log("File size:", stat.size);
            } else {
                console.log("No download event. Maybe it opened a popup?");
                const popup = await page.context().waitForEvent('page', { timeout: 5000 }).catch(e => null);
                if (popup) {
                    console.log("Popup opened! URL:", popup.url());
                } else {
                    console.log("No popup either. Check page content.");
                }
            }
        } else {
            console.log("No download button found.");
        }
    } catch(e) {
        console.error("Error:", e);
    } finally {
        await browser.close();
    }
})();
