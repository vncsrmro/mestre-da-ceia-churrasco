const { spawnSync } = require('child_process');
const ff = 'E:/Tools/ffmpeg/ffmpeg-9.0.2-essentials_build/bin/ffmpeg.exe';

for (let i = 1; i <= 5; i++) {
  const p = `E:/romeiro.dev/criativos v2/public/mestre-ceia/audio/voice-${i}.wav`;
  const res = spawnSync(ff, ['-i', p], { encoding: 'utf8' });
  const m = res.stderr.match(/Duration: (\d{2}):(\d{2}):(\d{2}\.\d{2})/);
  if (m) {
    const secs = parseFloat(m[3]) + parseInt(m[2]) * 60;
    console.log(`Voice ${i}: ${secs.toFixed(2)}s (${Math.round(secs * 30)} frames)`);
  }
}
