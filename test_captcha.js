const puppeteer = require('puppeteer');

(async () => {
    try {
        console.log("Launching browser...");
        const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
        const page = await browser.newPage();
        
        console.log("Navigating to KE...");
        await page.goto('https://staging.ke.com.pk:24555/ReBrand/DuplicateBill.aspx', { waitUntil: 'networkidle2' });
        
        // Wait for captcha image
        await page.waitForSelector('#imgCaptcha');
        
        // Get the base64 of the captcha image
        const base64 = await page.$eval('#imgCaptcha', el => {
            const canvas = document.createElement('canvas');
            canvas.width = el.width;
            canvas.height = el.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(el, 0, 0);
            return canvas.toDataURL('image/png');
        });
        
        console.log("Captcha image length:", base64.length);
        
        await browser.close();
    } catch(e) {
        console.error(e);
    }
})();
