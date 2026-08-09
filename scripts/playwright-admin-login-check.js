const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const events = [];

  page.on('requestfailed', (request) => {
    events.push({ type: 'requestfailed', url: request.url(), failure: request.failure()?.message });
  });

  page.on('response', (response) => {
    if (response.status() >= 400) {
      events.push({ type: 'response', status: response.status(), url: response.url(), bodySnippet: response.request()?.postData() || '' });
    }
  });

  await page.goto('https://vidyut-solar-electricals.onrender.com/auth.html?mode=admin&next=%2Fowner-projects.html', { waituntil: 'load', timeout: 15000 });
  await page.locator('#loginEmail').fill('admin@vidyutsolar.in');
  await page.locator('#loginPassword').fill('VidyutAdmin@2026');
  await page.locator('#ownerKey').fill('');
  await page.locator('#loginForm button[type="submit"]').click();
  await page.waitForTimeout(1500);

  const statusText = await page.locator('#loginStatus').innerText();
  const finalUrl = page.url();

  console.log(JSON.stringify({ events, statusText, finalUrl }, null, 2));

  await browser.close();
})();
