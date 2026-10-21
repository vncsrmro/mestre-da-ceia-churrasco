// ========================================================
// CLOUDFLARE PAGES FUNCTION: /api/track-session
// Captura e armazena ttclid e _ttp vinculados a uma ref aleatória
// ========================================================

export async function onRequest(context) {
  const { request, env } = context;

  // Resposta para pre-flight CORS
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    });
  }

  const url = new URL(request.url);
  let ref = url.searchParams.get('ref');
  let ttclid = url.searchParams.get('ttclid');
  let ttp = url.searchParams.get('ttp');

  if (request.method === 'POST') {
    try {
      const body = await request.json();
      if (body.ref) ref = body.ref;
      if (body.ttclid) ttclid = body.ttclid;
      if (body.ttp) ttp = body.ttp;
    } catch (e) {}
  }

  // Gera referência opaca se não fornecida
  if (!ref) {
    ref = 'ref_' + Math.random().toString(36).substring(2, 10) + '_' + Date.now().toString(36);
  }

  const clientIp = request.headers.get('cf-connecting-ip') || '';
  const userAgent = request.headers.get('user-agent') || '';

  const trackingData = {
    ref,
    ttclid: ttclid || null,
    ttp: ttp || null,
    ip: clientIp,
    user_agent: userAgent,
    timestamp: Date.now()
  };

  // Salva no KV TIKTOK_TRACKING com TTL de 30 dias (2.592.000 segundos)
  if (env.TIKTOK_TRACKING) {
    try {
      await env.TIKTOK_TRACKING.put(ref, JSON.stringify(trackingData), {
        expirationTtl: 2592000
      });
    } catch (err) {
      console.error('Erro ao salvar no KV TIKTOK_TRACKING:', err);
    }
  }

  return new Response(JSON.stringify({ ok: true, ref, trackingData }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  });
}
