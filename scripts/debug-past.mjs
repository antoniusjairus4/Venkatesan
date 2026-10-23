import puppeteer from 'puppeteer-core';

async function debugPast() {
  const browser = await puppeteer.launch({
    executablePath: '/usr/bin/google-chrome',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  page.on('console', (msg) => console.log('PAGE LOG:', msg.type(), msg.text()));
  page.on('pageerror', (err) => console.log('PAGE ERROR:', err));

  await page.goto('http://127.0.0.1:5173');

  // Login
  await page.waitForSelector('input[type="password"]');
  await page.type('input[type="text"]', 'venkatesan');
  await page.type('input[type="password"]', 'MahiVenkat@1722');
  await page.click('button[type="submit"]');

  await page.waitForFunction(() => document.body.innerText.includes('RAJAMANICKAM'));
  console.log('Logged in successfully.');

  // Go to Chits
  await page.waitForSelector('button[data-tab="chits"]');
  await page.click('button[data-tab="chits"]');

  await page.waitForFunction(() => document.body.innerText.includes('Active Groups'));
  console.log('Chits page loaded.');

  // Click Past Groups
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const b = btns.find((x) => x.innerText.includes('Past Groups'));
    if (b) b.click();
  });
  console.log('Clicked Past Groups.');

  for (let i = 0; i < 10; i++) {
    await new Promise((r) => setTimeout(r, 1000));
    const text = await page.evaluate(() => document.body.innerText);
    const hasLoading = text.includes('Loading historical archive snapshot...');
    const hasTotalColl = text.includes('Total Collected');
    const hasPeriods = text.includes('Completed Time Periods');
    console.log(`[Second ${i + 1}] hasPeriods: ${hasPeriods}, hasLoading: ${hasLoading}, hasTotalColl: ${hasTotalColl}`);
    if (hasTotalColl) {
      console.log('SUCCESS: Found Total Collected!');
      break;
    }
  }

  await browser.close();
}

debugPast().catch(console.error);

