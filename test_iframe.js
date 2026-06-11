const puppeteer = require('puppeteer');
const Tesseract = require('tesseract.js');

(async () => {
    try {
        console.log("Launching browser...");
        const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64)');
        
        console.log("Navigating to https://ke.com.pk/bills-e-payments/...");
        await page.goto('https://ke.com.pk/bills-e-payments/', { waitUntil: 'networkidle2', timeout: 30000 });
        
        console.log("Waiting for iframe...");
        // Wait for iframe
        const frameElement = await page.waitForSelector('iframe[src*="DuplicateBill.aspx"]', { timeout: 15000 });
        const frame = await frameElement.contentFrame();
        
        console.log("Typing account number...");
        await frame.waitForSelector('#txtAccNo', { timeout: 5000 });
        await frame.type('#txtAccNo', '0400005331186');
        
        // Check for Captcha
        const captchaImg = await frame.$('#imgCaptcha');
        if (captchaImg) {
            console.log("Captcha detected. Running OCR...");
            const base64Data = await frame.$eval('#imgCaptcha', el => {
                const canvas = document.createElement('canvas');
                canvas.width = el.width;
                canvas.height = el.height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(el, 0, 0);
                return canvas.toDataURL('image/png').split(',')[1];
            });
            
            const buffer = Buffer.from(base64Data, 'base64');
            const { data: { text } } = await Tesseract.recognize(buffer, 'eng');
            const cleanText = text.replace(/[^a-zA-Z0-9]/g, '').trim();
            console.log(`OCR solved: ${cleanText}`);
            
            await frame.type('#txtimgcode', cleanText);
        } else {
            console.log("No captcha image found!");
        }
        
        console.log("Submitting...");
        await Promise.all([
            page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }).catch(e=>console.log("Nav timeout")),
            frame.click('#formSubmit').catch(async () => {
                await frame.click('#paymentSubmit').catch(async () => {
                    await frame.click('button[value="View Bill"]').catch(() => console.log("Could not find submit button"));
                });
            })
        ]);
        
        await page.screenshot({ path: 'scratch/iframe_test.png', fullPage: true });
        console.log("Saved scratch/iframe_test.png");
        
        await browser.close();
    } catch(e) {
        console.error(e);
    }
})();
