const fs = require('fs');

async function test() {
  const content = fs.readFileSync('E:/romeiro.dev/PaperX/paperx/functions/.env', 'utf8');
  const keys = content.match(/sk-proj-[^\s"'\r\n]+/g) || [];
  console.log('Found keys:', keys.map(k => k.slice(0, 15) + '...'));
  
  for (const k of keys) {
    try {
      const res = await fetch('https://api.openai.com/v1/audio/speech', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + k,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'tts-1',
          voice: 'onyx',
          input: 'Mestre da Ceia e Churrasco. Seu fim de ano sem aperto.',
          response_format: 'mp3'
        })
      });
      console.log('Key', k.slice(0, 15), '-> Status:', res.status);
      if (res.ok) {
        const buf = await res.arrayBuffer();
        console.log('SUCCESS! Audio bytes:', buf.byteLength);
        fs.writeFileSync('E:/romeiro.dev/NATAL/test_voice.mp3', Buffer.from(buf));
        console.log('Saved test_voice.mp3');
        return;
      } else {
        console.log('Error body:', await res.text());
      }
    } catch(err) {
      console.log('Fetch error:', err.message);
    }
  }
}

test();
