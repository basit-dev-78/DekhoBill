const http = require('http');

const optionsInit = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/ke/init',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json'
    }
};

const reqInit = http.request(optionsInit, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        console.log('Init Response:', data);
        const parsed = JSON.parse(data);
        if (parsed.success) {
            console.log('Got Session ID:', parsed.sessionId);
            console.log('Captcha Base64:', parsed.captchaBase64);
            
            // Now test submit
            const optionsSubmit = {
                hostname: 'localhost',
                port: 3000,
                path: '/api/ke/submit',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            };
            
            const reqSubmit = http.request(optionsSubmit, (resSubmit) => {
                let dataSubmit = '';
                resSubmit.on('data', chunk => dataSubmit += chunk);
                resSubmit.on('end', () => {
                    console.log('Submit Response:', dataSubmit);
                    process.exit(0);
                });
            });
            
            reqSubmit.write(JSON.stringify({
                sessionId: parsed.sessionId,
                captchaText: '', // It should be auto-filled
                expectedDate: ''
            }));
            reqSubmit.end();
            
        } else {
            console.error('Init failed');
            process.exit(1);
        }
    });
});

reqInit.on('error', error => {
    console.error('Error:', error);
});

reqInit.write(JSON.stringify({ account: '0400005331186' }));
reqInit.end();
