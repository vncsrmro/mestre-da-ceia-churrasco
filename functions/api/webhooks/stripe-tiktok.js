// ========================================================
// CLOUDFLARE PAGES FUNCTION: /api/webhooks/stripe-tiktok
// Integração Stripe Checkout -> TikTok Events API + Supabase
// ========================================================

const TARGET_PAYMENT_LINK = 'plink_1UT6WlRefo3PGHeaqSdbzLLe';
const ALLOWED_PAYMENT_LINKS = new Set([
  'plink_1UT6WlRefo3PGHeaqSdbzLLe', // Alvo oficial Mestre da Ceia (Checkout Unificado)
  'plink_1UT8LwRefo3PGHeasadO5gjy', // Mestre da Ceia (100% Pix)
  'plink_1UT8MYRefo3PGHeaovxyzoGb',
  'plink_1UT8MYRefo3PGHea5hsU9bWo',
  'plink_1UT8MZRefo3PGHea3sJfXxxS',
  'plink_1UT6BHRefo3PGHeaD4s0JWO6',
  'plink_1UT6BIRefo3PGHeaYaOiEKMu',
  'plink_1UT6BIRefo3PGHeavGlGy44V',
  'plink_1UT6BIRefo3PGHeao2sROehs',
  'plink_1UT6BJRefo3PGHeanLqObG1s'
]);
const TIKTOK_PIXEL_ID = 'DBCJB9BC77U4J2JQ94IG';
const SUPABASE_URL = 'https://iurqyexfdlulmzsliyfg.supabase.co';

// Helper: Hashing SHA-256 para e-mail e telefone
async function sha256(str) {
  if (!str) return undefined;
  const clean = str.trim().toLowerCase();
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(clean));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// Helper: Verificação de assinatura Stripe-Signature
async function verifyStripeSignature(rawBody, signatureHeader, secret) {
  if (!signatureHeader || !secret) return false;

  const parts = signatureHeader.split(',').reduce((acc, part) => {
    const [k, v] = part.split('=');
    if (k && v) acc[k.trim()] = v.trim();
    return acc;
  }, {});

  const timestamp = parts.t;
  const signature = parts.v1;
  if (!timestamp || !signature) return false;

  // Tolerância de 5 minutos (300 segundos)
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - parseInt(timestamp, 10)) > 300) {
    return false;
  }

  const signedPayload = `${timestamp}.${rawBody}`;
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(signedPayload));
  const hexSig = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');

  return hexSig === signature;
}

// Helper: Buscar itens comprados na API Stripe
async function getSessionLineItems(sessionId, stripeKey) {
  if (!stripeKey) return null;
  try {
    const resp = await fetch(`https://api.stripe.com/v1/checkout/sessions/${sessionId}/line_items`, {
      headers: {
        'Authorization': `Bearer ${stripeKey}`
      }
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    return data.data || null;
  } catch (e) {
    console.error('Erro ao buscar line_items no Stripe:', e);
    return null;
  }
}

// Helper: Salvar liberação no Supabase
async function saveBuyerAccess(session, env) {
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) return;

  const email = session.customer_details?.email;
  const name = session.customer_details?.name || '';
  const customerId = session.customer || '';
  if (!email) return;

  const body = {
    email: email.toLowerCase().trim(),
    nome: name,
    stripe_customer_id: customerId,
    stripe_session_id: session.id,
    has_access: true,
    valor_pago: (session.amount_total || 1990) / 100,
    plano: 'vitalicio'
  };

  try {
    await fetch(`${SUPABASE_URL}/rest/v1/usuarios_acesso`, {
      method: 'POST',
      headers: {
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates,return=representation'
      },
      body: JSON.stringify(body)
    });
  } catch (e) {
    console.error('Erro ao salvar no Supabase:', e);
  }
}

// Helper: Enviar evento Purchase para a TikTok Events API v1.3
async function sendTikTokPurchaseEvent(session, trackingInfo, lineItems, env) {
  const token = env.TIKTOK_ACCESS_TOKEN;
  if (!token) {
    console.warn('TIKTOK_ACCESS_TOKEN não configurado no servidor. O evento Purchase não pôde ser enviado ao TikTok.');
    return { skipped: true, reason: 'missing_token' };
  }

  const rawEmail = session.customer_details?.email;
  const rawPhone = session.customer_details?.phone;
  const hashedEmail = rawEmail ? await sha256(rawEmail) : undefined;
  const hashedPhone = rawPhone ? await sha256(rawPhone) : undefined;

  let contents = [];
  if (lineItems && lineItems.length > 0) {
    contents = lineItems.map(item => ({
      content_id: item.price?.product || item.id || 'mestre-da-ceia',
      content_type: 'product',
      content_name: item.description || 'Mestre da Ceia & Churrasco',
      quantity: item.quantity || 1,
      price: (item.amount_total || item.amount_subtotal || 0) / 100
    }));
  } else {
    contents = [{
      content_id: 'mestre-da-ceia',
      content_type: 'product',
      content_name: 'Mestre da Ceia & Churrasco',
      quantity: 1,
      price: (session.amount_total || 1990) / 100
    }];
  }

  const user = {};
  if (trackingInfo?.ttclid) user.ttclid = trackingInfo.ttclid;
  if (trackingInfo?.ttp) user.ttp = trackingInfo.ttp;
  if (hashedEmail) user.email = hashedEmail;
  if (hashedPhone) user.phone = hashedPhone;
  if (trackingInfo?.ip) user.ip = trackingInfo.ip;
  if (trackingInfo?.user_agent) user.user_agent = trackingInfo.user_agent;

  const eventData = {
    event: 'Purchase',
    event_id: `stripe_purchase_${session.id}`,
    event_time: session.created || Math.floor(Date.now() / 1000),
    user: user,
    properties: {
      contents: contents,
      currency: (session.currency || 'BRL').toUpperCase(),
      value: (session.amount_total || 0) / 100
    }
  };

  const payload = {
    event_source: 'web',
    event_source_id: TIKTOK_PIXEL_ID,
    data: [eventData]
  };

  if (env.TIKTOK_TEST_EVENT_CODE) {
    payload.test_event_code = env.TIKTOK_TEST_EVENT_CODE;
  }

  const response = await fetch('https://business-api.tiktok.com/open_api/v1.3/event/track/', {
    method: 'POST',
    headers: {
      'Access-Token': token,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  const resText = await response.text();
  let resJson;
  try {
    resJson = JSON.parse(resText);
  } catch (e) {
    resJson = { raw: resText };
  }

  if (!response.ok || (resJson.code !== undefined && resJson.code !== 0)) {
    throw new Error(`TikTok Events API retornou erro (${response.status}): ${JSON.stringify(resJson)}`);
  }

  return resJson;
}

export async function onRequestPost(context) {
  const { request, env } = context;

  const signatureHeader = request.headers.get('stripe-signature');
  const rawBody = await request.text();

  // 1. Verificação da Assinatura do Stripe
  if (env.STRIPE_WEBHOOK_SECRET) {
    const isValid = await verifyStripeSignature(rawBody, signatureHeader, env.STRIPE_WEBHOOK_SECRET);
    if (!isValid) {
      console.error('Assinatura Stripe inválida!');
      return new Response(JSON.stringify({ error: 'Assinatura Stripe inválida' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  let event;
  try {
    event = JSON.parse(rawBody);
  } catch (e) {
    return new Response(JSON.stringify({ error: 'JSON malformado' }), { status: 400 });
  }

  console.log(`Evento recebido: ${event.type}`);

  // 2. Filtrar apenas eventos relevantes de conclusão de checkout
  if (event.type !== 'checkout.session.completed' && event.type !== 'checkout.session.async_payment_succeeded') {
    return new Response(JSON.stringify({ received: true, ignored: true, reason: 'unhandled_event' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const session = event.data?.object;
  if (!session) {
    return new Response(JSON.stringify({ error: 'Objeto de sessão ausente' }), { status: 400 });
  }

  // 3. Processar SOMENTE sessões do Payment Link indicado (ignora outros produtos da conta)
  if (!session.payment_link || !ALLOWED_PAYMENT_LINKS.has(session.payment_link)) {
    console.log(`Sessão ignorada (Payment link ${session.payment_link} não pertence ao Mestre da Ceia)`);
    return new Response(JSON.stringify({ received: true, ignored: true, reason: 'other_product' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // 4. Processar compra apenas quando payment_status for 'paid'
  if (session.payment_status !== 'paid') {
    console.log(`Status de pagamento não pago: ${session.payment_status}`);
    return new Response(JSON.stringify({ received: true, ignored: true, reason: 'unpaid' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // 5. Prevenção de duplicação (Deduplicação atômica via KV)
  const dedupKey = `purchase_${session.id}`;
  if (env.STRIPE_EVENTS) {
    const status = await env.STRIPE_EVENTS.get(dedupKey);
    if (status === 'completed') {
      console.log(`Sessão ${session.id} já foi processada anteriormente. Deduplicando.`);
      return new Response(JSON.stringify({ received: true, deduplicated: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  // 6. Recuperar dados de atribuição do TikTok (_ttp e ttclid) via client_reference_id
  let trackingInfo = null;
  if (session.client_reference_id && env.TIKTOK_TRACKING) {
    try {
      trackingInfo = await env.TIKTOK_TRACKING.get(session.client_reference_id, 'json');
    } catch (e) {
      console.error('Erro ao recuperar tracking info do KV:', e);
    }
  }

  // 7. Obter itens comprados detalhados
  const lineItems = await getSessionLineItems(session.id, env.STRIPE_SECRET_KEY);

  // 8. Enviar evento Purchase para TikTok Events API
  try {
    await sendTikTokPurchaseEvent(session, trackingInfo, lineItems, env);
  } catch (err) {
    console.error('Erro no envio para TikTok Events API:', err);
    // Retorna 500 para o Stripe efetuar retentativa automática conforme instrução
    return new Response(JSON.stringify({ error: 'TikTok Events API failure', details: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // 9. Registrar no banco KV como concluído (TTL 90 dias)
  if (env.STRIPE_EVENTS) {
    try {
      await env.STRIPE_EVENTS.put(dedupKey, 'completed', { expirationTtl: 7776000 });
    } catch (e) {}
  }

  // 10. Gravar comprador e liberar acesso no Supabase
  await saveBuyerAccess(session, env);

  return new Response(JSON.stringify({
    received: true,
    success: true,
    event_id: `stripe_purchase_${session.id}`,
    amount_total: (session.amount_total || 0) / 100,
    currency: (session.currency || 'BRL').toUpperCase()
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Stripe-Signature'
    }
  });
}
