const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');

['index.html', 'pagina-de-vendas.html'].forEach(filename => {
  const filePath = path.join(root, filename);
  let c = fs.readFileSync(filePath, 'utf8');

  // 1. Atualizar Pixel listener para aceitar qualquer link buy.stripe.com
  c = c.replace(
    "if (url.origin !== 'https://buy.stripe.com' || url.pathname !== '/7sYaEZexC2R1cP96lR1Jm06') return;",
    "if (url.origin !== 'https://buy.stripe.com') return;"
  );

  // 2. Atualizar link padrão do botão principal
  c = c.replace(
    'href="https://buy.stripe.com/7sYaEZexC2R1cP96lR1Jm06"',
    'href="https://buy.stripe.com/fZu4gBahm0IT3ezaC71Jm07"'
  );

  // 3. Atualizar painel do produtor
  c = c.replace(
    'value="https://buy.stripe.com/7sYaEZexC2R1cP96lR1Jm06"',
    'value="https://buy.stripe.com/fZu4gBahm0IT3ezaC71Jm07"'
  );

  // 4. Atualizar stripeLinks dinâmico
  const oldStripeLinks = `const stripeLinks = {
        base: 'https://buy.stripe.com/7sYaEZexC2R1cP96lR1Jm06', // Checkout Unificado c/ Order Bumps nativos
        drinks: 'https://buy.stripe.com/dRm14pfBGgHRaH17pV1Jm01',
        anticaos: 'https://buy.stripe.com/dRm6oJexCdvF16rbGb1Jm02',
        vip: 'https://buy.stripe.com/5kQ8wRblqajt5mHeSn1Jm03'
      };`;

  const newStripeLinks = `const stripeLinks = {
        base: 'https://buy.stripe.com/fZu4gBahm0IT3ezaC71Jm07', // 100% Pix Unificado c/ Order Bumps nativos
        drinks: 'https://buy.stripe.com/28E7sN6164Z9dTd9y31Jm08',
        anticaos: 'https://buy.stripe.com/eVq5kFblqezJ5mH8tZ1Jm09',
        vip: 'https://buy.stripe.com/28E9AVgFKezJ5mHaC71Jm0a'
      };`;

  c = c.replace(oldStripeLinks, newStripeLinks);

  fs.writeFileSync(filePath, c, 'utf8');
  console.log(`✓ ${filename} atualizado com links 100% Pix!`);
});
