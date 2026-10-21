const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const root = __dirname;
const dist = path.join(root, 'dist');

console.log('🧹 Preparando pasta dist/ para Cloudflare Pages...');
if (fs.existsSync(dist)) {
  fs.rmSync(dist, { recursive: true, force: true });
}
fs.mkdirSync(dist, { recursive: true });

// Arquivos HTML principais
['index.html', 'pagina-de-vendas.html', 'app.html'].forEach(f => {
  const src = path.join(root, f);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, path.join(dist, f));
    console.log(`✓ Copiado ${f}`);
  }
});

// Pastas de assets
function copyFolderSync(from, to) {
  if (!fs.existsSync(from)) return;
  fs.mkdirSync(to, { recursive: true });
  fs.readdirSync(from).forEach(element => {
    const fromPath = path.join(from, element);
    const toPath = path.join(to, element);
    if (fs.lstatSync(fromPath).isDirectory()) {
      copyFolderSync(fromPath, toPath);
    } else {
      // Ignorar vídeos grandes > 20MB
      if (fs.statSync(fromPath).size < 20 * 1024 * 1024) {
        fs.copyFileSync(fromPath, toPath);
      }
    }
  });
}

console.log('📂 Copiando imagens e boards...');
copyFolderSync(path.join(root, 'images'), path.join(dist, 'images'));
copyFolderSync(path.join(root, 'boards'), path.join(dist, 'boards'));

// Cloudflare Pages Redirects
// Pages já serve /app e /pagina-de-vendas nativamente (URLs limpas).
// Reescrever para *.html causa loop 308, então usamos apenas redirecionamentos de atalho.
const redirectsContent = `
/vendas /pagina-de-vendas 301
/login /app 301
`;
fs.writeFileSync(path.join(dist, '_redirects'), redirectsContent.trim());
console.log('✓ Criado _redirects');

// Cloudflare Pages Headers (CORS e Cache)
const headersContent = `
/*
  Access-Control-Allow-Origin: *
`;
fs.writeFileSync(path.join(dist, '_headers'), headersContent.trim());
console.log('✓ Criado _headers');

console.log('\n🚀 Executando Deploy no Cloudflare Pages (projeto: mestre-da-ceia)...');
const deployArgs = [
  'wrangler',
  'pages',
  'deploy',
  dist,
  '--project-name',
  'mestre-da-ceia',
  '--branch',
  'main',
  '--commit-dirty=true'
];

const res = spawnSync('npx', deployArgs, {
  cwd: root,
  stdio: 'inherit',
  shell: true
});

if (res.status === 0) {
  console.log('\n🎉 DEPLOY NA CLOUDFLARE PAGES CONCLUÍDO COM SUCESSO!');
} else {
  console.error('\n❌ Erro no deploy. Código de saída:', res.status);
  process.exit(1);
}
