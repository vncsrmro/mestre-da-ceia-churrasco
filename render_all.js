const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

async function renderAll() {
  const imagesDir = path.join(__dirname, 'images');
  if (!fs.existsSync(imagesDir)) {
    fs.mkdirSync(imagesDir, { recursive: true });
  }

  console.log('Launching Edge browser...');
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security']
  });

  const page = await browser.newPage();

  const boards = [
    {
      file: 'boards/board_4_5_6.html',
      out: 'board-telas-4-5-6.png',
      width: 1920,
      height: 1080,
      scale: 2
    },
    {
      file: 'boards/board_7_8_9.html',
      out: 'board-telas-7-8-9.png',
      width: 1920,
      height: 1080,
      scale: 2
    },
    {
      file: 'boards/board_1_2_3.html',
      out: 'board-telas-1-2-3.png',
      width: 1920,
      height: 1080,
      scale: 2
    },
    {
      file: 'boards/board_all_6.html',
      out: 'board-ecossistema-6-telas.png',
      width: 2560,
      height: 1440,
      scale: 1.5
    }
  ];

  for (const b of boards) {
    console.log(`Rendering ${b.out}...`);
    await page.setViewport({ width: b.width, height: b.height, deviceScaleFactor: b.scale });
    const fullPath = path.resolve(__dirname, b.file);
    const fileUrl = 'file:///' + fullPath.replace(/\\/g, '/');
    await page.goto(fileUrl, { waitUntil: 'networkidle0' });
    await page.evaluate(() => document.fonts.ready);
    await new Promise(r => setTimeout(r, 600)); // Small wait for styles & SVGs
    const outPath = path.join(imagesDir, b.out);
    await page.screenshot({ path: outPath, type: 'png' });
    console.log(`Saved ${outPath}`);
  }

  // Individual phone screens
  const singleScreens = [
    { num: 1, out: 'tela-01-planejador-setup.png' },
    { num: 2, out: 'tela-02-lista-compras.png' },
    { num: 3, out: 'tela-03-rateio-pix.png' },
    { num: 4, out: 'tela-04-link-convidado.png' },
    { num: 5, out: 'tela-05-receitas-economicas.png' },
    { num: 6, out: 'tela-06-cronograma-anti-caos.png' },
    { num: 7, out: 'tela-07-calculadora-drinks.png' },
    { num: 8, out: 'tela-08-amigo-secreto-tv.png' },
    { num: 9, out: 'tela-09-hub-vitrine-cadeados.png' }
  ];

  await page.setViewport({ width: 640, height: 980, deviceScaleFactor: 2 });
  for (const s of singleScreens) {
    console.log(`Rendering Screen ${s.num}: ${s.out}...`);
    const singlePath = path.resolve(__dirname, 'boards/single_phone.html');
    const fileUrl = 'file:///' + singlePath.replace(/\\/g, '/') + `?screen=${s.num}`;
    await page.goto(fileUrl, { waitUntil: 'networkidle0' });
    await page.evaluate(() => document.fonts.ready);
    await new Promise(r => setTimeout(r, 400));
    const outPath = path.join(imagesDir, s.out);
    await page.screenshot({ path: outPath, type: 'png' });
    console.log(`Saved ${outPath}`);
  }

  await browser.close();
  console.log('ALL RENDERS COMPLETED SUCCESSFULLY!');
}

renderAll().catch(err => {
  console.error('Render error:', err);
  process.exit(1);
});
