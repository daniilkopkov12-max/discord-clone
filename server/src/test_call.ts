import puppeteer from 'puppeteer-core';
import path from 'path';
import fs from 'fs';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ARTIFACT_DIR = 'C:\\Users\\Windows\\.gemini\\antigravity\\brain\\466cd374-23f7-4b4b-a5af-d42caf417bda';

async function runCallTest() {
  console.log('🎥 Starting Live WebRTC Multi-User Video & Audio Call Test...');

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

    // 1. Alex Login in Browser 1
    console.log('👤 Logging in Alex in Browser 1...');
    await page1.goto('http://localhost:5000', { waitUntil: 'networkidle0' });
    await page1.waitForFunction(() => document.body.innerText.includes('Welcome back'));
    await page1.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const btn = buttons.find((b) => b.textContent?.includes('AlexDev'));
      if (btn) btn.click();
    });
    await page1.waitForSelector('main', { timeout: 10000 });

    // 2. Sarah Login in Browser 2
    console.log('👤 Logging in Sarah in Browser 2...');
    await page2.goto('http://localhost:5000', { waitUntil: 'networkidle0' });
    await page2.waitForFunction(() => document.body.innerText.includes('Welcome back'));
    await page2.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const btn = buttons.find((b) => b.textContent?.includes('SarahTech'));
      if (btn) btn.click();
    });
    await page2.waitForSelector('main', { timeout: 10000 });

    // 3. Alex joins "General Voice"
    console.log('🎙️ Alex joining General Voice...');
    await page1.evaluate(() => {
      const spans = Array.from(document.querySelectorAll('span'));
      const vCh = spans.find((s) => s.textContent === 'General Voice');
      vCh?.closest('div')?.click();
    });
    await new Promise((r) => setTimeout(r, 2000));

    // 4. Sarah also joins "General Voice"
    console.log('🎙️ Sarah joining General Voice...');
    await page2.evaluate(() => {
      const spans = Array.from(document.querySelectorAll('span'));
      const vCh = spans.find((s) => s.textContent === 'General Voice');
      vCh?.closest('div')?.click();
    });
    await new Promise((r) => setTimeout(r, 3000));

    // 5. Alex turns on camera
    console.log('📹 Alex turning on video camera...');
    await page1.evaluate(() => {
      const camBtn = document.querySelector('button[title*="Camera"]') as HTMLButtonElement;
      if (camBtn) camBtn.click();
    });
    await new Promise((r) => setTimeout(r, 2500));

    // 6. Sarah turns on camera
    console.log('📹 Sarah turning on video camera...');
    await page2.evaluate(() => {
      const camBtn = document.querySelector('button[title*="Camera"]') as HTMLButtonElement;
      if (camBtn) camBtn.click();
    });
    await new Promise((r) => setTimeout(r, 3000));

    // Capture Dual Video WebRTC Call from Alex viewpoint
    await page1.screenshot({ path: path.join(ARTIFACT_DIR, '07_live_webrtc_call_dual_video.png') });
    console.log('📸 Saved 07_live_webrtc_call_dual_video.png');

    // 7. Sarah viewpoint screenshot
    await page2.screenshot({ path: path.join(ARTIFACT_DIR, '08_sarah_view_webrtc_call.png') });
    console.log('📸 Saved 08_sarah_view_webrtc_call.png');

    console.log('🎉 WebRTC Dual Video Call test completed successfully!');
  } finally {
    await browser1.close();
    await browser2.close();
  }
}

runCallTest().catch((e) => {
  console.error(e);
  process.exit(1);
});
