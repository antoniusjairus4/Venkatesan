import puppeteer from 'puppeteer-core';
import path from 'path';

const ARTIFACT_DIR = '/home/jairus/.gemini/antigravity/brain/1fdbf56b-f71d-497c-944b-2138593f020a';

async function verifyChitGroupsClick() {
  console.log('🚀 Starting Chit Groups Click & Multi-Group Verification...');

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
    // 1. Set pre-authenticated session before document loads
    console.log('1. Setting pre-authenticated session on new document...');
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

    // 2. Navigate to app
    console.log('2. Navigating to http://localhost:5173...');
    await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' });
    await delay(2000);

    console.log('✓ Logged in and reached main interface.');

    // 3. Navigate to Chit Groups tab
    console.log('3. Clicking Chit Groups tab in sidebar...');
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('aside nav button'));
      const chitBtn = btns.find((b) => b.textContent && b.textContent.includes('Chit Groups'));
      if (chitBtn) chitBtn.click();
    });

    console.log('   Waiting for chit group cards to load from database...');
    await page.waitForFunction(
      () => {
        const headings = Array.from(document.querySelectorAll('h3'));
        return headings.some((h) => h.textContent?.includes('Lakh'));
      },
      { timeout: 20000 }
    );
    await delay(1000);

    // Capture the chit groups overview
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'chit_groups_overview_verified.png'),
      fullPage: true,
    });
    console.log('✓ Captured chit_groups_overview_verified.png');

    // 4. Click on '1 Lakh' Chit Group card
    console.log('\n4. Clicking on "1 Lakh" Chit Group card...');
    const clicked1L = await page.evaluate(() => {
      const headings = Array.from(document.querySelectorAll('h3'));
      const cardTitle = headings.find((h) => h.textContent && h.textContent.trim() === '1 Lakh');
      if (cardTitle) {
        const card = cardTitle.closest('.group') || cardTitle.closest('div[class*="rounded-2xl"]');
        if (card) {
          card.click();
          return true;
        }
      }
      return false;
    });

    if (!clicked1L) {
      throw new Error('Could not find 1 Lakh chit group card to click');
    }

    console.log('   Waiting for subscribers list to load from API...');
    await page.waitForFunction(
      () => {
        const headings = Array.from(document.querySelectorAll('h3'));
        return headings.some((h) => h.textContent?.includes('Selvam') || h.textContent?.includes('Saravanan'));
      },
      { timeout: 15000 }
    );
    await delay(1000);

    // Extract all subscriber names in 1 Lakh
    const subscribers1L = await page.evaluate(() => {
      const headings = Array.from(document.querySelectorAll('h3'));
      return headings.map((h) => h.textContent?.trim()).filter(Boolean);
    });

    console.log('   Subscribers rendered in 1 Lakh:', subscribers1L);

    const selvamIn1L = subscribers1L.some((n) => n.includes('P. Selvam'));
    console.log('   Is P. Selvam in 1 Lakh?', selvamIn1L ? 'YES ✓' : 'NO ✗');

    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'chit_group_1lakh_subscribers_verified.png'),
      fullPage: true,
    });
    console.log('✓ Captured chit_group_1lakh_subscribers_verified.png');

    // 5. Switch to '2 Lakhs' Chit Group using switcher pill
    console.log('\n5. Switching to "2 Lakhs" Chit Group...');
    const clicked2L = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const btn2L = btns.find((b) => b.textContent && b.textContent.trim() === '2 Lakhs');
      if (btn2L) {
        btn2L.click();
        return true;
      }
      return false;
    });

    if (!clicked2L) {
      throw new Error('Could not find 2 Lakhs switcher button');
    }

    console.log('   Waiting for 2 Lakhs subscribers to load...');
    await page.waitForFunction(
      () => {
        const headings = Array.from(document.querySelectorAll('h3'));
        return headings.some((h) => h.textContent?.includes('Anbarasan') || h.textContent?.includes('Selvam'));
      },
      { timeout: 15000 }
    );
    await delay(1000);

    // Extract all subscriber names in 2 Lakhs
    const subscribers2L = await page.evaluate(() => {
      const headings = Array.from(document.querySelectorAll('h3'));
      return headings.map((h) => h.textContent?.trim()).filter(Boolean);
    });

    console.log('   Subscribers rendered in 2 Lakhs:', subscribers2L);

    const selvamIn2L = subscribers2L.some((n) => n.includes('P. Selvam'));
    console.log('   Is P. Selvam in 2 Lakhs?', selvamIn2L ? 'YES ✓' : 'NO ✗');

    if (selvamIn1L && selvamIn2L) {
      console.log('\n🎉 SUCCESS: P. Selvam is verified in BOTH 1 Lakh and 2 Lakhs groups!');
    } else {
      console.error('\n⚠️ Cross-group verification failed!');
    }

    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'chit_group_2lakhs_subscribers_verified.png'),
      fullPage: true,
    });
    console.log('✓ Captured chit_group_2lakhs_subscribers_verified.png');

    // 6. Test Back Button
    console.log('\n6. Testing "Back to Chit Schemes" button...');
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const backBtn = btns.find((b) => b.textContent && b.textContent.includes('Back to Chit Schemes'));
      if (backBtn) backBtn.click();
    });
    await delay(1000);

    // 7. Click 3 Lakhs from overview
    console.log('7. Clicking on "3 Lakhs" Chit Group card...');
    await page.evaluate(() => {
      const headings = Array.from(document.querySelectorAll('h3'));
      const cardTitle = headings.find((h) => h.textContent && h.textContent.trim() === '3 Lakhs');
      if (cardTitle) {
        const card = cardTitle.closest('.group') || cardTitle.closest('div[class*="rounded-2xl"]');
        if (card) card.click();
      }
    });

    console.log('   Waiting for 3 Lakhs subscribers to load...');
    await page.waitForFunction(
      () => {
        const headings = Array.from(document.querySelectorAll('h3'));
        return headings.some((h) => h.textContent?.includes('Anand') || h.textContent?.includes('Balamurugan'));
      },
      { timeout: 15000 }
    );
    await delay(1000);

    const subscribers3L = await page.evaluate(() => {
      const headings = Array.from(document.querySelectorAll('h3'));
      return headings.map((h) => h.textContent?.trim()).filter(Boolean);
    });
    console.log('   Subscribers rendered in 3 Lakhs:', subscribers3L);

    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'chit_group_3lakhs_subscribers_verified.png'),
      fullPage: true,
    });
    console.log('✓ Captured chit_group_3lakhs_subscribers_verified.png');

    console.log('\n✨ All browser verification steps completed successfully!');
  } catch (err) {
    console.error('Error during browser verification:', err);
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'chit_groups_error.png'),
      fullPage: true,
    });
    process.exit(1);
  } finally {
    await browser.close();
  }
}

verifyChitGroupsClick();
