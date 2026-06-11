const puppeteer = require('puppeteer');

(async () => {
    try {
        const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
        const page = await browser.newPage();
        await page.goto('https://staging.ke.com.pk:24555/ReBrand/DuplicateBill.aspx', { waitUntil: 'networkidle2' });
        
        const html = await page.$eval('form', e => e.innerHTML);
        require('fs').writeFileSync('scratch/form.html', html);
        
        await browser.close();
    } catch(e) {
        console.error(e);
    }
})();
