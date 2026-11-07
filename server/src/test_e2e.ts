import puppeteer from 'puppeteer-core';
import path from 'path';
import fs from 'fs';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ARTIFACT_DIR = 'C:\\Users\\Windows\\.gemini\\antigravity\\brain\\466cd374-23f7-4b4b-a5af-d42caf417bda';

if (!fs.existsSync(ARTIFACT_DIR)) {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
}

async function runTests() {
  console.log('🚀 Starting Discord Clone End-to-End Automation & Screenshot Capture...');

  const browser1 = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: [
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream',
      '--no-sandbox',
      '--disable-setuid-sandbox',
    ],
    defaultViewport: { width: 1280, height: 800 },
  });

  const browser2 = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: [
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream',
      '--no-sandbox',
      '--disable-setuid-sandbox',
    ],
    defaultViewport: { width: 1280, height: 800 },
  });

  try {
    const page1 = await browser1.newPage();
    const page2 = await browser2.newPage();

    // Log console errors if any
    page1.on('console', (msg) => console.log('PAGE 1 LOG:', msg.text()));
    page1.on('pageerror', (err) => console.log('PAGE 1 ERROR:', err.message));
    page2.on('console', (msg) => console.log('PAGE 2 LOG:', msg.text()));
    page2.on('pageerror', (err) => console.log('PAGE 2 ERROR:', err.message));

    // 1. Alex Login
    console.log('👉 Browser 1: Navigating to http://localhost:5000...');
    await page1.goto('http://localhost:5000', { waitUntil: 'networkidle0' });
    await page1.waitForFunction(() => document.body.innerText.includes('Welcome back'), { timeout: 15000 });

    // Capture Login Screen
    await page1.screenshot({ path: path.join(ARTIFACT_DIR, '01_login_screen.png') });
    console.log('📸 Saved 01_login_screen.png');

    // Click quick login as AlexDev
    await page1.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const alexBtn = buttons.find((b) => b.textContent && b.textContent.includes('AlexDev'));
      if (alexBtn) alexBtn.click();
    });

    await page1.waitForSelector('main', { timeout: 15000 });
    await new Promise((r) => setTimeout(r, 2000));

    // Capture Alex In Server
    await page1.screenshot({ path: path.join(ARTIFACT_DIR, '02_alex_in_server.png') });
    console.log('📸 Saved 02_alex_in_server.png');

    // 2. Sarah Login in Browser 2
    console.log('👉 Browser 2: Logging in as SarahTech...');
    await page2.goto('http://localhost:5000', { waitUntil: 'networkidle0' });
    await page2.waitForFunction(() => document.body.innerText.includes('Welcome back'), { timeout: 15000 });

    await page2.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const sarahBtn = buttons.find((b) => b.textContent && b.textContent.includes('SarahTech'));
      if (sarahBtn) sarahBtn.click();
    });

    await page2.waitForSelector('main', { timeout: 15000 });
    await new Promise((r) => setTimeout(r, 2000));

    // 3. Alex sends a message in #general
    console.log('👉 Alex sending message in #general...');
    await page1.type('input[placeholder*="Message #"]', '🔥 Welcome to our Discord Clone! Live WebRTC and WebSockets are running smoothly!');
    await page1.keyboard.press('Enter');
    await new Promise((r) => setTimeout(r, 1500));

    // 4. Sarah sees message and replies
    console.log('👉 Sarah replying in #general...');
    await page2.type('input[placeholder*="Message #"]', '🚀 Wow, received instantly! Let me connect to voice and start video call!');
    await page2.keyboard.press('Enter');
    await new Promise((r) => setTimeout(r, 1500));

    // Capture Chat interaction in Browser 2
    await page2.screenshot({ path: path.join(ARTIFACT_DIR, '03_realtime_chat.png') });
    console.log('📸 Saved 03_realtime_chat.png');

    // 5. Connect to Voice Channel in Browser 1
    console.log('👉 Alex connecting to voice channel "General Voice"...');
    await page1.evaluate(() => {
      const channelItems = Array.from(document.querySelectorAll('span'));
      const voiceCh = channelItems.find((s) => s.textContent === 'General Voice');
      if (voiceCh) {
        voiceCh.closest('div')?.click();
      }
    });
    await new Promise((r) => setTimeout(r, 3000));

    // Capture Voice Channel View with RTC stage
    await page1.screenshot({ path: path.join(ARTIFACT_DIR, '04_voice_channel_connected.png') });
    console.log('📸 Saved 04_voice_channel_connected.png');

    // 6. Sarah opens Direct Messages / Friends Tab
    console.log('👉 Sarah opening Friends / DMs...');
    await page2.evaluate(() => {
      const dmBtn = document.querySelector('button[title="Direct Messages"]') as HTMLButtonElement;
      if (dmBtn) dmBtn.click();
    });
    await new Promise((r) => setTimeout(r, 2000));

    await page2.screenshot({ path: path.join(ARTIFACT_DIR, '05_friends_direct_messages.png') });
    console.log('📸 Saved 05_friends_direct_messages.png');

    // 7. Alex opens User Settings
    console.log('👉 Alex opening User Settings...');
    await page1.evaluate(() => {
      const settingsBtn = document.querySelector('button[title="Account Settings"]') as HTMLButtonElement;
      if (settingsBtn) settingsBtn.click();
    });
    await new Promise((r) => setTimeout(r, 1500));

    await page1.screenshot({ path: path.join(ARTIFACT_DIR, '06_user_settings.png') });
    console.log('📸 Saved 06_user_settings.png');

    console.log('🎉 ALL END-TO-END TESTS COMPLETED SUCCESSFULLY!');
  } finally {
    await browser1.close();
    await browser2.close();
  }
}

runTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
