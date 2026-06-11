const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');
const { chromium } = require('playwright');
const crypto = require('crypto');

const app = express();
const port = 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname)));

// Initialize SQLite database
const db = new sqlite3.Database(path.join(__dirname, 'records.db'), (err) => {
    if (err) console.error('Error connecting to SQLite:', err.message);
    else {
        console.log('Connected to SQLite database.');
        db.run(`
            CREATE TABLE IF NOT EXISTS utility_records (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                provider TEXT NOT NULL,
                account_number TEXT NOT NULL,
                expected_date TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);
    }
});

// In-memory store for active scraping sessions
const activeSessions = new Map();

// Cleanup stale sessions every 5 minutes
setInterval(() => {
    const now = Date.now();
    for (const [sessionId, session] of activeSessions.entries()) {
        if (now - session.timestamp > 5 * 60 * 1000) {
            console.log(`[!] Cleaning up stale session: ${sessionId}`);
            if (session.browser) session.browser.close().catch(()=>{});
            activeSessions.delete(sessionId);
        }
    }
}, 60000);

app.post('/api/records', (req, res) => {
    const { billType, accountNo, expectedDate } = req.body;
    if (!billType || !Array.isArray(billType) || billType.length === 0) {
        return res.status(400).json({ success: false, message: 'Please select at least one Utility Provider.' });
    }
    if (!accountNo || !expectedDate || !Array.isArray(accountNo) || !Array.isArray(expectedDate) || accountNo.length !== expectedDate.length) {
        return res.status(400).json({ success: false, message: 'Invalid account records data.' });
    }

    db.serialize(() => {
        const stmt = db.prepare(`INSERT INTO utility_records (provider, account_number, expected_date) VALUES (?, ?, ?)`);
        let insertCount = 0;
        billType.forEach(provider => {
            for (let i = 0; i < accountNo.length; i++) {
                const acc = accountNo[i].trim();
                const date = expectedDate[i].trim();
                if (acc && date) {
                    stmt.run(provider, acc, date);
                    insertCount++;
                }
            }
        });
        stmt.finalize((err) => {
            if (err) return res.status(500).json({ success: false, message: 'Failed to save records.' });
            res.json({ success: true, message: `Successfully saved ${insertCount} record(s)!` });
        });
    });
});

// STEP 1: Init KE Scrape & Get Captcha
app.post('/api/ke/init', async (req, res) => {
    const { account } = req.body;
    if (!account) return res.status(400).json({ success: false, message: 'Account Number is required.' });

    const sessionId = crypto.randomBytes(16).toString('hex');
    let browser;
    try {
        console.log(`\n[🔍] Session ${sessionId}: Starting KE scrape for Account: ${account}`);
        // Use Bot Bypass techniques
        browser = await chromium.launch({ 
            headless: true,
            args: ['--disable-blink-features=AutomationControlled']
        });
        const context = await browser.newContext({
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            viewport: { width: 1280, height: 720 }
        });
        await context.addInitScript("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})");
        const page = await context.newPage();

        let gotoSuccess = false;
        for (let i = 0; i < 3; i++) {
            try {
                await page.goto('https://staging.ke.com.pk:24555/ReBrand/DuplicateBill.aspx', { waitUntil: 'domcontentloaded', timeout: 30000 });
                gotoSuccess = true;
                break;
            } catch (e) {
                console.log(`[!] Session ${sessionId}: goto timeout, retrying (${i+1}/3)...`);
            }
        }
        if (!gotoSuccess) {
            throw new Error('Timeout connecting to KE Staging Server.');
        }
        
        // Simulate mouse movements to bypass Bot Protection
        await page.mouse.move(100, 100);
        await page.mouse.move(200, 200);
        await page.waitForTimeout(1000);
        
        await page.locator('#txtAccNo').waitFor({ state: 'visible', timeout: 15000 });
        await page.locator('#txtAccNo').fill(account);

        // Wait up to 15 seconds for the captcha image or text span
        let captchaBase64 = null;
        try {
            const captchaLoc = page.locator('#imgCaptcha, #lblCaptcha');
            await captchaLoc.first().waitFor({ state: 'visible', timeout: 15000 });
            const buffer = await captchaLoc.first().screenshot();
            captchaBase64 = buffer.toString('base64');
        } catch (e) {
            console.log(`[!] Session ${sessionId}: Captcha element not visible.`);
        }

        // Store session
        activeSessions.set(sessionId, {
            browser,
            page,
            timestamp: Date.now()
        });

        if (!captchaBase64) {
            console.log(`[!] Session ${sessionId}: No Captcha found. Proceeding in automated bypass mode.`);
            // DO NOT ABORT! The staging site often has the Captcha disabled!
        }

        res.json({ success: true, sessionId, captchaBase64 });

    } catch (e) {
        if (browser) await browser.close();
        console.error(`[❌] Session ${sessionId}: Error in init: ${e.message}`);
        res.status(500).json({ success: false, message: 'Failed to initialize KE portal.' });
    }
});

// STEP 2: Submit Captcha & Fetch Bill
app.post('/api/ke/submit', async (req, res) => {
    const { sessionId, captchaText } = req.body;
    
    if (!sessionId || !activeSessions.has(sessionId)) {
        return res.status(400).json({ success: false, message: 'Invalid or expired session. Please try again.' });
    }

    const session = activeSessions.get(sessionId);
    const { browser, page } = session;

    try {
        console.log(`[>>] Session ${sessionId}: Submitting captcha...`);
        
        if (captchaText) {
            const hasInput = await page.locator('#txtimgcode').isVisible().catch(() => false);
            if (hasInput) {
                await page.locator('#txtimgcode').fill(captchaText);
            }
        }

        try {
            const btnLoc = page.locator('button, input[type="button"], input[type="submit"]').filter({ hasText: /View Bill|Submit/i });
            if (await btnLoc.count() > 0) {
                await btnLoc.first().click();
            } else {
                await page.locator('#btnViewBill, #btnSubmit, #formSubmit').first().click();
            }
        } catch (e) {}

        // Check if there is an error message on the screen
        const errorVisible = await page.locator('.error, .alert, #lblMessage, span[style*="red"]').isVisible().catch(() => false);
        
        // If there's an explicit error, assume it failed. Otherwise assume success!
        if (errorVisible) {
            console.log(`[!] Session ${sessionId}: Error found on page.`);
            res.json({ success: false, message: 'Invalid Account Number or Error from KE.', retryable: false });
            // Close the browser since we can't retry without refreshing
            activeSessions.delete(sessionId);
            await browser.close();
        } else {
            // Wait for PDF to generate or iframe to load
            await page.waitForTimeout(5000);
            
            let amount = null;
            try {
                amount = await page.locator('body').evaluate((body) => {
                    const text = body.innerText;
                    const match = text.match(/(?:Payable Amount|Amount Payable|Payable Within Due Date)[^\d]*((?:\d{1,3},)?\d{1,3}(?:,\d{3})*(?:\.\d+)?)/i);
                    if (match && match[1]) return parseFloat(match[1].replace(/,/g, ''));
                    const match2 = text.match(/(?:Total|Amount)[^\d]*((?:\d{1,3},)?\d{1,3}(?:,\d{3})*(?:\.\d+)?)/i);
                    if (match2 && match2[1]) return parseFloat(match2[1].replace(/,/g, ''));
                    return null;
                });
            } catch(e) {}

            const buffer = await page.pdf({ format: 'A4', printBackground: true });
            
            // Cleanup session
            activeSessions.delete(sessionId);
            await browser.close();

            res.json({ 
                success: true, 
                status: 'Bill Generated', 
                amount: amount || 'See PDF',
                pdfBase64: buffer.toString('base64')
            });
            
        }

    } catch (e) {
        activeSessions.delete(sessionId);
        if (browser) await browser.close();
        console.error(`[❌] Session ${sessionId}: Submit Error: ${e.message}`);
        res.status(500).json({ success: false, message: 'Failed to submit KE portal.' });
    }
});

// Endpoint to manually abort a session
app.post('/api/ke/abort', async (req, res) => {
    const { sessionId } = req.body;
    if (sessionId && activeSessions.has(sessionId)) {
        const session = activeSessions.get(sessionId);
        if (session.browser) await session.browser.close().catch(()=>{});
        activeSessions.delete(sessionId);
    }
    res.json({ success: true });
});

app.listen(port, () => {
    console.log(`\n======================================`);
    console.log(`🚀 DekhoBill Backend is running!`);
    console.log(`👉 Access your app at: http://localhost:${port}`);
    console.log(`======================================\n`);
});
