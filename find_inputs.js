const fs = require('fs');
const html = fs.readFileSync('test_bot_dump.html', 'utf8');
const regex = /<input[^>]*type=[\"']?(text|number)[\"']?[^>]*>/gi;
let match;
while ((match = regex.exec(html)) !== null) {
    console.log(match[0]);
}
