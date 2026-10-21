const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ff = 'E:/Tools/ffmpeg/ffmpeg-9.0.2-essentials_build/bin/ffprobe.exe';
const baseAudioDir = 'E:/romeiro.dev/criativos v2/public/mestre-ceia/audio';

['ugc1', 'ugc2', 'ugc3'].forEach(v => {
  console.log(`\n=== Medições para ${v} ===`);
  let totalSecs = 0;
  for (let i = 1; i <= 5; i++) {
    const p = path.join(baseAudioDir, v, `voice-${i}.wav`);
    if (!fs.existsSync(p)) {
      console.log(`  voice-${i}.wav não existe ainda`);
      continue;
    }
    const res = spawnSync(ff, [
      '-v', 'error',
      '-show_entries', 'format=duration',
      '-of', 'default=noprint_wrappers=1:nokey=1',
      p
    ], { encoding: 'utf8' });
    const dur = parseFloat(res.stdout.trim() || 0);
    const frames = Math.round(dur * 30);
    totalSecs += dur;
    console.log(`  Cena ${i}: ${dur.toFixed(2)}s (${frames} frames @ 30fps)`);
  }
  console.log(`  Total Áudio: ${totalSecs.toFixed(2)}s (${Math.round(totalSecs * 30)} frames)`);
});
