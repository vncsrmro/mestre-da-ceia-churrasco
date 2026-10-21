const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

async function renderCovers() {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 6000, deviceScaleFactor: 1 });

  const fullPath = path.resolve(__dirname, 'boards/capas_produtos.html');
  await page.goto('file:///' + fullPath.replace(/\\/g, '/'), { waitUntil: 'networkidle0' });
  await page.evaluate(() => document.fonts.ready);
  await new Promise(r => setTimeout(r, 1200));

  const items = [
    { id: '#cover-mestre', out: 'capa-produto-mestre-da-ceia.png' },
    { id: '#cover-drinks', out: 'capa-produto-guia-drinks.png' },
    { id: '#cover-anticaos', out: 'capa-produto-cronograma-anti-caos.png' },
    { id: '#cover-vip', out: 'capa-produto-combo-vip.png' }
  ];

  for (const item of items) {
    const el = await page.$(item.id);
    if (el) {
      const outPath = path.join(__dirname, 'images', item.out);
      await el.screenshot({ path: outPath, type: 'png' });
      console.log('Saved cover:', outPath, fs.statSync(outPath).size, 'bytes');
    }
  }

  await browser.close();
}

renderCovers().catch(console.error);
