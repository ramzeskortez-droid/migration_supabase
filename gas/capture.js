import puppeteer from 'puppeteer';

(async () => {
  try {
    console.log('Launching browser...');
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    
    // Capture Console Logs
    page.on('console', msg => {
      const type = msg.type().toUpperCase();
      console.log(`[BROWSER ${type}]: ${msg.text()}`);
    });

    // Capture Page Errors
    page.on('pageerror', err => {
      console.error(`[BROWSER ERROR]: ${err.message}`);
    });

    // Capture Failed Requests
    page.on('requestfailed', request => {
      console.error(`[NETWORK FAIL]: ${request.url()} - ${request.failure().errorText}`);
    });

    console.log('Navigating to http://localhost:3000...');
    await page.setViewport({ width: 1280, height: 800 });
    
    const response = await page.goto('http://localhost:3000', { waitUntil: 'networkidle0', timeout: 30000 });

    if (response.status() >= 400) {
        console.error(`[HTTP ERROR]: ${response.status()} ${response.statusText()}`);
    } else {
        console.log(`[HTTP SUCCESS]: ${response.status()}`);
    }

    console.log('Taking screenshot...');
    await page.screenshot({ path: 'app_screenshot.png', fullPage: true });
    console.log('Screenshot saved to app_screenshot.png');
    
    await browser.close();
  } catch (error) {
    console.error('Error taking screenshot:', error);
    process.exit(1);
  }
})();
