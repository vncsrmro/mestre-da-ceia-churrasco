const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

async function renderCriativos() {
  const outDir = path.join(__dirname, 'images', 'criativos');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  console.log('Iniciando renderizador de criativos...');
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security']
  });

  const page = await browser.newPage();
  const fileUrl = 'file:///' + path.resolve(__dirname, 'criativos/ads_visual.html').replace(/\\/g, '/');

  await page.goto(fileUrl, { waitUntil: 'networkidle0' });
  await page.evaluate(() => document.fonts.ready);
  await new Promise(r => setTimeout(r, 600));

  const items = [
    { selector: '#ad-feed-1', filename: 'anuncio-feed-01-fim-do-calote.png', width: 1080, height: 1080 },
    { selector: '#ad-feed-2', filename: 'anuncio-feed-02-economia-mercado.png', width: 1080, height: 1080 },
    { selector: '#ad-story-1', filename: 'anuncio-story-01-cobrar-familia.png', width: 1080, height: 1920 }
  ];

  for (const item of items) {
    console.log(`Renderizando ${item.filename}...`);
    await page.setViewport({ width: item.width + 100, height: item.height + 200, deviceScaleFactor: 1 });
    const element = await page.$(item.selector);
    if (element) {
      const outPath = path.join(outDir, item.filename);
      await element.screenshot({ path: outPath, type: 'png' });
      console.log(`✅ Salvo: ${outPath}`);
    } else {
      console.error(`❌ Elemento não encontrado: ${item.selector}`);
    }
  }

  await browser.close();
  console.log('Todos os criativos visuais foram renderizados com sucesso!');
}

renderCriativos().catch(err => {
  console.error('Erro na renderização:', err);
  process.exit(1);
});
