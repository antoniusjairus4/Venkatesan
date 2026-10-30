import puppeteer from 'puppeteer-core';
import path from 'path';

const artifactDir = '/home/jairus/.gemini/antigravity/brain/1fdbf56b-f71d-497c-944b-2138593f020a';
const delay = (ms) => new Promise((res) => setTimeout(res, ms));

async function captureModal() {
  const browser = await puppeteer.launch({
    executablePath: '/usr/bin/google-chrome',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--window-size=1920,1080'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });

  await page.goto('http://127.0.0.1:5173', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    const sessionData = JSON.stringify({
      authenticated: true,
      user: 'Venkatesan',
      timestamp: new Date().toISOString(),
    });
    localStorage.setItem('rajamanickam_admin_auth', sessionData);
    sessionStorage.setItem('rajamanickam_admin_auth', sessionData);
  });
  await page.goto('http://127.0.0.1:5173', { waitUntil: 'networkidle0' });
  await delay(1000);

  // Navigate to Monthly Payments
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('aside button, aside a'));
    const btn = btns.find((b) => b.innerText.includes('Monthly Payments'));
    if (btn) btn.click();
  });
  await delay(2500);

  // Switch to All Members
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const allMembersBtn = btns.find((b) => b.innerText.trim().startsWith('All Status') || b.innerText.trim().startsWith('All Members'));
    if (allMembersBtn) allMembersBtn.click();
  });
  await delay(1500);

  // Open modal
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const collectBtn = btns.find((b) => b.innerText.includes('Collect'));
    if (collectBtn) collectBtn.click();
  });
  await delay(1500);

  // Scroll the modal form down to show the date fields and payment mode
  await page.evaluate(() => {
    const form = document.querySelector('form');
    if (form) {
      form.scrollTop = form.scrollHeight;
    }
  });
  await delay(1000);

  const capturePath = path.join(artifactDir, 'dates_2_record_payment_modal_scrolled_inputs.png');
  await page.screenshot({ path: capturePath });
  console.log('✓ Captured dates_2_record_payment_modal_scrolled_inputs.png');

  await browser.close();
}

captureModal().catch((e) => {
  console.error(e);
  process.exit(1);
});
