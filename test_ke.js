const puppeteer = require('puppeteer');

(async () => {
    try {
        console.log("Launching browser...");
        const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64)');
        
        console.log("Navigating to KE Bills E-Payments...");
        const response = await page.goto('https://ke.com.pk/bills-e-payments/', { waitUntil: 'networkidle2', timeout: 30000 });
        console.log("Status:", response.status());
        
        // Find input fields
        const inputs = await page.$$eval('input', els => els.map(e => ({ name: e.name, id: e.id, type: e.type, placeholder: e.placeholder })));
        console.log("Inputs found:");
        console.log(inputs);
        
        await browser.close();
    } catch(e) {
        console.error(e);
    }
})();
