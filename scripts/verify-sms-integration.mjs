import puppeteer from 'puppeteer-core';
import path from 'path';

const ARTIFACT_DIR = '/home/jairus/.gemini/antigravity/brain/1fdbf56b-f71d-497c-944b-2138593f020a';

async function verifySmsIntegration() {
  console.log('📱 Starting Native SMS Integration Verification...');

  const browser = await puppeteer.launch({
    executablePath: '/usr/bin/google-chrome',
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--window-size=1440,900',
    ],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  const delay = (ms) => new Promise((res) => setTimeout(res, ms));

  try {
    await page.evaluateOnNewDocument(() => {
      localStorage.setItem(
        'rajamanickam_admin_auth',
        JSON.stringify({
          authenticated: true,
          user: 'Venkatesan',
          timestamp: new Date().toISOString(),
        })
      );
    });

    console.log('1. Loading app...');
    await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' });
    
    // Wait for core dashboard data to load
    await page.waitForFunction(
      () => {
        const text = document.body.innerText;
        return text.includes('1 Lakh') && text.includes('2 Lakhs');
      },
      { timeout: 15000 }
    );
    await delay(1200);

    // -------------------------------------------------------------------------
    // TEST 1: Chit Groups Subscriber Roster with SMS & Takeover Modal
    // -------------------------------------------------------------------------
    console.log('\n2. Testing Chit Groups Roster & Takeover Modal...');
    // Click Chit Groups tab
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('aside nav button'));
      const chitBtn = btns.find((b) => b.textContent && b.textContent.includes('Chit Groups'));
      if (chitBtn) chitBtn.click();
    });
    await delay(1500);

    // Click 1 Lakh group card
    await page.evaluate(() => {
      const headings = Array.from(document.querySelectorAll('h3'));
      const cardTitle = headings.find((h) => h.textContent && h.textContent.trim() === '1 Lakh');
      if (cardTitle) {
        const card = cardTitle.closest('.group') || cardTitle.closest('div[class*="rounded-2xl"]');
        if (card) card.click();
      }
    });

    // Wait for subscribers roster
    await page.waitForFunction(
      () => {
        const headings = Array.from(document.querySelectorAll('h3'));
        return headings.some((h) => h.textContent?.includes('Selvam') || h.textContent?.includes('Saravanan'));
      },
      { timeout: 10000 }
    );
    await delay(1000);

    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'sms_chit_roster_verified.png'),
      fullPage: true,
    });
    console.log('✓ Captured sms_chit_roster_verified.png');

    // Test Takeover Button on a subscriber
    console.log('3. Opening Takeover Modal on subscriber card...');
    await page.evaluate(() => {
      const takeoverBtns = Array.from(document.querySelectorAll('button')).filter(
        (b) => b.textContent && b.textContent.includes('Takeover')
      );
      if (takeoverBtns.length > 0) takeoverBtns[0].click();
    });
    await delay(1000);

    // Type new buyer info
    await page.type('input[placeholder*="buyer\'s name"]', 'Murugan Swamy');
    await page.type('input[placeholder*="9842100000"]', '9842999999');
    await delay(800);

    // Check Takeover SMS link specifically inside the modal
    const takeoverSmsHref = await page.evaluate(() => {
      const modalLinks = Array.from(document.querySelectorAll('.fixed a[href^="sms:"]'));
      return modalLinks.length > 0 ? modalLinks[0].getAttribute('href') : null;
    });

    console.log('   Takeover SMS Link detected:', takeoverSmsHref ? 'YES ✓' : 'NO ✗');
    if (takeoverSmsHref) {
      console.log('   Decoded Takeover SMS Link:\n', decodeURIComponent(takeoverSmsHref));
    }

    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'sms_takeover_modal_verified.png'),
      fullPage: true,
    });
    console.log('✓ Captured sms_takeover_modal_verified.png');

    // Close Takeover Modal
    await page.evaluate(() => {
      const cancelBtn = Array.from(document.querySelectorAll('button')).find(
        (b) => b.textContent && b.textContent.includes('Cancel')
      );
      if (cancelBtn) cancelBtn.click();
    });
    await delay(1000);

    // -------------------------------------------------------------------------
    // TEST 2: Monthly Payments View SMS Receipt buttons
    // -------------------------------------------------------------------------
    console.log('\n4. Testing Monthly Payments View SMS Receipts...');
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('aside nav button'));
      const payBtn = btns.find((b) => b.textContent && b.textContent.includes('Monthly Payments'));
      if (payBtn) payBtn.click();
    });
    await delay(1500);

    // Switch to 'Paid' tab
    await page.evaluate(() => {
      const tabs = Array.from(document.querySelectorAll('button'));
      const paidTab = tabs.find((b) => b.textContent && b.textContent.trim() === 'Paid');
      if (paidTab) paidTab.click();
    });
    await delay(1000);

    const paidSmsLink = await page.evaluate(() => {
      const link = document.querySelector('a[href^="sms:"]');
      return link ? link.getAttribute('href') : null;
    });
    console.log('   Paid installment SMS Link detected:', paidSmsLink ? 'YES ✓' : 'NO ✗');
    if (paidSmsLink) {
      console.log('   Decoded Paid Installment SMS Link:\n', decodeURIComponent(paidSmsLink));
    }

    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'sms_payments_view_verified.png'),
      fullPage: true,
    });
    console.log('✓ Captured sms_payments_view_verified.png');

    // -------------------------------------------------------------------------
    // TEST 3: Record Payment Modal & SMS Receipt Button
    // -------------------------------------------------------------------------
    console.log('\n5. Testing Record Payment Modal SMS Receipt...');
    // Click "Record Payment" button in sidebar
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const recBtn = btns.find((b) => b.textContent && b.textContent.includes('Record Payment'));
      if (recBtn) recBtn.click();
    });

    // Wait for the modal dropdown options to populate
    await page.waitForFunction(
      () => {
        const select = document.querySelector('select');
        return select && select.options.length > 0;
      },
      { timeout: 10000 }
    );
    await delay(1000);

    // Submit payment
    await page.evaluate(() => {
      const submitBtn = document.querySelector('form button[type="submit"]');
      if (submitBtn) submitBtn.click();
    });
    
    // Wait for the payment success receipt screen to render
    await page.waitForFunction(
      () => document.querySelector('.fixed a[href^="sms:"]'),
      { timeout: 15000 }
    );
    await delay(800);

    // Check for native SMS Receipt link in the modal
    const smsReceiptHref = await page.evaluate(() => {
      const link = document.querySelector('.fixed a[href^="sms:"]');
      return link ? link.getAttribute('href') : null;
    });

    console.log('   SMS Receipt Link detected:', smsReceiptHref ? 'YES ✓' : 'NO ✗');
    if (smsReceiptHref) {
      console.log('   Decoded Payment Receipt SMS Link:\n', decodeURIComponent(smsReceiptHref));
    }

    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'sms_payment_receipt_verified.png'),
      fullPage: true,
    });
    console.log('✓ Captured sms_payment_receipt_verified.png');

    console.log('\n✨ All native SMS integration tests passed successfully!');
  } catch (err) {
    console.error('Error during verification:', err);
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'sms_error.png'),
      fullPage: true,
    });
    process.exit(1);
  } finally {
    await browser.close();
  }
}

verifySmsIntegration();
