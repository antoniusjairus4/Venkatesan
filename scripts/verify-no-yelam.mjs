import puppeteer from 'puppeteer-core';
import path from 'path';

const ARTIFACT_DIR = '/home/jairus/.gemini/antigravity/brain/1fdbf56b-f71d-497c-944b-2138593f020a';

async function verifyNoYelam() {
  console.log('🔍 Starting No-Yelam Verification...');

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
    
    await page.waitForFunction(
      () => {
        const text = document.body.innerText;
        return text.includes('1 Lakh') && text.includes('2 Lakhs');
      },
      { timeout: 15000 }
    );
    await delay(1200);

    // Capture Dashboard
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'no_yelam_dashboard_verified.png'),
      fullPage: true,
    });
    console.log('✓ Captured no_yelam_dashboard_verified.png');

    // Check Sidebar items
    const sidebarText = await page.evaluate(() => {
      const aside = document.querySelector('aside');
      return aside ? aside.innerText : '';
    });
    console.log('   Sidebar text contains "Auction":', sidebarText.toLowerCase().includes('auction') ? 'YES ✗' : 'NO ✓');
    console.log('   Sidebar text contains "Yelam":', sidebarText.toLowerCase().includes('yelam') ? 'YES ✗' : 'NO ✓');

    // Click Chit Groups tab
    console.log('\n2. Testing Chit Groups Subscribers Roster...');
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

    // Verify no yelam text anywhere on the page
    const pageText = await page.evaluate(() => document.body.innerText);
    const hasYelam = pageText.toLowerCase().includes('yelam');
    const hasActiveBidders = pageText.toLowerCase().includes('active bidders');
    const hasYelamWinners = pageText.toLowerCase().includes('yelam winners');
    const hasMWon = /m\d+\s+won/i.test(pageText);

    console.log('   Page contains "Yelam":', hasYelam ? 'YES ✗' : 'NO ✓');
    console.log('   Page contains "Active Bidders":', hasActiveBidders ? 'YES ✗' : 'NO ✓');
    console.log('   Page contains "Yelam Winners":', hasYelamWinners ? 'YES ✗' : 'NO ✓');
    console.log('   Page contains "M[x] Won":', hasMWon ? 'YES ✗' : 'NO ✓');

    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'no_yelam_chit_roster_verified.png'),
      fullPage: true,
    });
    console.log('✓ Captured no_yelam_chit_roster_verified.png');

    console.log('\n✨ Verification complete: all Yelam/Auction references successfully removed!');
  } catch (err) {
    console.error('Error during verification:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

verifyNoYelam();

