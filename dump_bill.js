const puppeteer = require('puppeteer');
const Tesseract = require('tesseract.js');
const fs = require('fs');

(async () => {
    try {
        const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox'] });
        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
        
        await page.goto('https://staging.ke.com.pk:24555/ReBrand/DuplicateBill.aspx', { waitUntil: 'networkidle2' });
        
        let billGenerated = false;
        let attempts = 0;
        
        while (!billGenerated && attempts < 3) {
            attempts++;
            if (attempts > 1) await page.reload({ waitUntil: 'networkidle2' });

            await page.waitForSelector('#txtAccNo', { timeout: 5000 });
            await page.type('#txtAccNo', '0400005331186'); // the user's tested account
            
            const captchaImg = await page.$('#imgCaptcha');
            if (captchaImg) {
                const base64Data = await page.$eval('#imgCaptcha', el => {
                    const canvas = document.createElement('canvas');
                    canvas.width = el.width;
                    canvas.height = el.height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(el, 0, 0);
                    return canvas.toDataURL('image/png').split(',')[1];
                });
                const buffer = Buffer.from(base64Data, 'base64');
                const { data: { text } } = await Tesseract.recognize(buffer, 'eng');
                await page.type('#txtimgcode', text.replace(/[^a-zA-Z0-9]/g, '').trim());
            }

            page.evaluate(() => {
                const viewBtn = Array.from(document.querySelectorAll('input, button')).find(b => (b.value||'').toLowerCase().includes('view bill') || (b.innerText||'').toLowerCase().includes('view bill'));
                if (viewBtn) viewBtn.click();
                else document.querySelector('#formSubmit')?.click();
            }).catch(() => {});
            
            await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }).catch(() => {});
            await new Promise(r => setTimeout(r, 4000));

            if (!(await page.$('#txtimgcode'))) {
                billGenerated = true;
                const html = await page.content();
                fs.writeFileSync('scratch/bill_output.html', html);
                console.log("Successfully dumped bill HTML");
            }
        }
        await browser.close();
    } catch(e) { console.error(e); }
})();
