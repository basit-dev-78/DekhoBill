const puppeteer = require('puppeteer');

(async () => {
    try {
        const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox'] });
        const page = await browser.newPage();
        await page.goto('https://staging.ke.com.pk:24555/ReBrand/DuplicateBill.aspx', { waitUntil: 'networkidle2' });
        
        console.log("Page loaded.");
        const html = await page.content();
        console.log(html.substring(0, 1000));
        
        const hasCaptcha = await page.$('#imgCaptcha');
        console.log("Has Captcha: ", !!hasCaptcha);
        
        await browser.close();
    } catch(e) {
        console.error(e);
    }
})();
