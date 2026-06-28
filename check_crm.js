const fs = require('fs');
const content = fs.readFileSync('app/dashboard/page.js', 'utf8');
console.log('Has nav-crm (escaped):', content.includes('id=\\"nav-crm\\"'));
console.log('Has view-crm (escaped):', content.includes('id=\\"view-crm\\"'));
