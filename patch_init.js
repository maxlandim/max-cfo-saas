const fs = require('fs');
let c = fs.readFileSync('app/dashboard/page.js', 'utf8');

c = c.replace(/const initScripts = async \(\) => \{[\s\S]*?initScripts\(\);/, `const initScripts = async () => {
      if (!document.querySelector('script[src="/engine.js"]')) {
        await loadScript('/engine.js');
      }
      if (!document.querySelector('script[src="/app.js"]')) {
        await loadScript('/app.js');
      }
      if (typeof window.initMaxCfoApp === 'function') {
        window.initMaxCfoApp();
      }
    };

    initScripts();`);

fs.writeFileSync('app/dashboard/page.js', c);
console.log('Init patched.');
