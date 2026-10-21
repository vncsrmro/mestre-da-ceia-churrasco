const path = require('path');
const { bundle } = require('@remotion/bundler');

async function test() {
  const root = 'E:/romeiro.dev/criativos v2';
  process.chdir(root);
  console.log('Testing bundle for src/index.tsx...');
  const serveUrl = await bundle({
    entryPoint: path.join(root, 'src/index.tsx'),
    outDir: path.join(root, 'out/test_bundle'),
  });
  console.log('SUCCESS! Bundled at:', serveUrl);
}

test().catch(err => {
  console.error('Bundle error:', err);
  process.exit(1);
});
