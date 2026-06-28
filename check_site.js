const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => {
    console.log(`[Browser Console] ${msg.type().toUpperCase()}: ${msg.text()}`);
  });
  page.on('pageerror', error => {
    console.log(`[Browser PageError] ${error.message}`);
  });
  page.on('requestfailed', request => {
    console.log(`[Browser RequestFailed] ${request.url()} - ${request.failure().errorText}`);
  });

  await page.goto('https://max-cfo-saas.vercel.app/login', { waitUntil: 'networkidle0' });
  await page.evaluate(() => {
    localStorage.setItem('maxcfo_user', JSON.stringify({ name: "User" }));
  });
  
  console.log("Navigating to dashboard...");
  await page.goto('https://max-cfo-saas.vercel.app/dashboard', { waitUntil: 'networkidle0' });

  // Click on CRM
  console.log("Clicking on CRM module...");
  await page.evaluate(() => {
    const btn = document.querySelector('[data-view="crm"]');
    if (btn) btn.click();
    else console.error('Button not found');
  });

  await new Promise(r => setTimeout(r, 1000));
  await browser.close();
})();
