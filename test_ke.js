const puppeteer = require('puppeteer');

(async () => {
    try {
        console.log("Launching browser...");
        const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64)');
        
        console.log("Navigating to actual KE Duplicate Bill...");
        const response = await page.goto('https://staging.ke.com.pk:24555/ReBrand/DuplicateBill.aspx', { waitUntil: 'networkidle2', timeout: 30000 });
        console.log("Status:", response.status());
        
        const inputs = await page.$$eval('input[type="text"], input[type="submit"], button', els => els.map(e => ({ name: e.name, id: e.id, type: e.type, tagName: e.tagName, value: e.value })));
        console.log("Visible Inputs found:", inputs);
        
        await browser.close();
    } catch(e) {
        console.error(e);
    }
})();
