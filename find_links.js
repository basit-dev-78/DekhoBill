const fs = require('fs');
const html = fs.readFileSync('test_bot_dump.html', 'utf8');
const regex = /<a[^>]*>/gi;
let match;
while ((match = regex.exec(html)) !== null) {
    if (match[0].toLowerCase().includes('history') || match[0].toLowerCase().includes('month')) {
        console.log(match[0]);
    }
}
