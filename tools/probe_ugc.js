const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ff = 'E:/Tools/ffmpeg/ffmpeg-9.0.2-essentials_build/bin/ffprobe.exe';
const ugcDir = 'E:/romeiro.dev/NATAL/videos/ugc';

const files = fs.readdirSync(ugcDir).filter(f => f.endsWith('.mp4'));

console.log(`Found ${files.length} UGC clips:`);
files.forEach(f => {
  const full = path.join(ugcDir, f);
  const res = spawnSync(ff, [
    '-v', 'error',
    '-show_entries', 'format=duration:stream=width,height,r_frame_rate',
    '-of', 'json',
    full
  ], { encoding: 'utf8' });

  try {
    const data = JSON.parse(res.stdout);
    const dur = parseFloat(data.format?.duration || 0);
    const videoStream = (data.streams || []).find(s => s.width);
    console.log(`- ${f}:`);
    console.log(`  Duration: ${dur.toFixed(2)}s (${Math.round(dur * 30)} frames @ 30fps)`);
    console.log(`  Resolution: ${videoStream?.width}x${videoStream?.height}`);
    console.log(`  Framerate: ${videoStream?.r_frame_rate}`);
  } catch (err) {
    console.log(`- ${f}: error parsing ffprobe: ${err.message}`);
  }
});
