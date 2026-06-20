/**
 * 2D版ゲーム画面を README 用 PNG に出力
 * Usage: npm run build && npm run screenshot:2d
 */
import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const outPath = path.join(root, 'assets', 'readme-2d.png');
const port = 5188;
const url = `http://127.0.0.1:${port}/index-2d.html#screenshot`;

function wait(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function waitForServer(maxMs = 30000) {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {
      // retry
    }
    await wait(300);
  }
  throw new Error('Static server did not start in time');
}

function startServer() {
  return spawn('npx', ['serve', 'docs', '-l', String(port)], {
    cwd: root,
    stdio: 'pipe',
    shell: true,
  });
}

async function main() {
  await mkdir(path.join(root, 'assets'), { recursive: true });

  const server = startServer();
  let browser;
  try {
    await waitForServer();
    const puppeteer = await import('puppeteer');
    browser = await puppeteer.default.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 960, height: 540, deviceScaleFactor: 1 });
    await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });
    await page.waitForSelector('body[data-demo="1"]', { timeout: 10000 });
    await page.waitForSelector('#game-canvas');
    await wait(800);

    const app = await page.$('#app');
    if (!app) throw new Error('#app not found');
    await app.screenshot({ path: outPath, type: 'png' });
    console.log(`Saved ${outPath}`);
  } finally {
    if (browser) await browser.close();
    server.kill('SIGTERM');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
