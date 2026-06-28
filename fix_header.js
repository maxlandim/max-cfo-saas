const fs = require('fs');
let c = fs.readFileSync('app/dashboard/page.js', 'utf8');
c = c.replace(/'use[\s\S]*?client';/, "'use client';");
fs.writeFileSync('app/dashboard/page.js', c);
console.log('Fixed header');
