const https = require('https');

const hostnames = [
    'kelive.ke.com.pk',
    'app.ke.com.pk',
    'portal.ke.com.pk',
    'mobile.ke.com.pk',
    'api.kelive.ke.com.pk'
];

hostnames.forEach(host => {
    // We will test the API the user provided
    const url = `https://${host}/api/bill/download-pdf?ContractNo=0400005331186&BillingMonth=2026-05`;
    console.log(`Testing ${url}`);
    
    https.get(url, (res) => {
        console.log(`[${host}] Status: ${res.statusCode}`);
    }).on('error', (e) => {
        console.log(`[${host}] Error: ${e.message}`);
    });
});
