const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  // Set the flag in localStorage to simulate registration
  await page.goto('about:blank'); // Go to a blank page to set localStorage
  await page.evaluate(() => {
    localStorage.setItem('accountJustCreated', 'true');
  });

  // Navigate to the home page
  await page.goto('http://localhost:8000/index.html');

  // Wait for the notification bubble to appear
  await page.waitForSelector('.notification-bubble');

  // Take the screenshot
  await page.screenshot({ path: '/home/jules/verification/index_page_with_notification_final.png' });

  await browser.close();
})();
