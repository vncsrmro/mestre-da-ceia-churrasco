const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ff = 'E:/Tools/ffmpeg/ffmpeg-9.0.2-essentials_build/bin/ffmpeg.exe';
const ugcDir = 'E:/romeiro.dev/criativos v2/public/mestre-ceia/ugc';
const previewDir = 'E:/romeiro.dev/NATAL/videos/ugc_preview';

fs.mkdirSync(previewDir, { recursive: true });

const files = fs.readdirSync(ugcDir).filter(f => f.endsWith('.mp4'));

files.forEach(f => {
  const base = path.parse(f).name;
  const inPath = path.join(ugcDir, f);
  const outPath = path.join(previewDir, `${base}.jpg`);
  spawnSync(ff, ['-hide_banner', '-y', '-ss', '2', '-i', inPath, '-vframes', '1', outPath]);
  console.log('Saved preview:', base);
});
