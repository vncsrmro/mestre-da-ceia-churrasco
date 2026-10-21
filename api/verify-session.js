// ========================================================
// API DE VERIFICAÇÃO DE SESSÃO DO STRIPE & ATIVAÇÃO SUPABASE
// Vercel Serverless Function: /api/verify-session
// ========================================================

const https = require('https');

const STRIPE_KEY = process.env.STRIPE_SECRET_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://iurqyexfdlulmzsliyfg.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function stripeGet(path) {
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'api.stripe.com',
      path: path,
      method: 'GET',
      headers: {
        'Authorization': 'Bearer ' + STRIPE_KEY
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

function supabaseRequest(path, method, body) {
  return new Promise((resolve, reject) => {
    const postData = body ? JSON.stringify(body) : '';
    const req = https.request({
      hostname: 'iurqyexfdlulmzsliyfg.supabase.co',
      path: path,
      method: method,
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': 'Bearer ' + SUPABASE_SERVICE_KEY,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates,return=representation',
        'Content-Length': Buffer.byteLength(postData)
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });
    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

module.exports = async (req, res) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const sessionId = req.query.session_id || (req.body && req.body.session_id);

  if (!sessionId) {
    return res.status(400).json({ error: 'Parâmetro session_id é obrigatório' });
  }

  try {
    // 1. Consultar sessão no Stripe
    const stripeRes = await stripeGet(`/v1/checkout/sessions/${sessionId}`);

    if (stripeRes.status !== 200 || !stripeRes.data) {
      return res.status(400).json({ error: 'Sessão do Stripe não encontrada', details: stripeRes.data });
    }

    const session = stripeRes.data;

    // Verificar se o pagamento foi confirmado
    if (session.payment_status !== 'paid') {
      return res.status(402).json({
        error: 'Pagamento pendente ou não aprovado',
        status: session.payment_status
      });
    }

    const email = session.customer_details ? session.customer_details.email : null;
    const name = session.customer_details ? session.customer_details.name : '';
    const customerId = session.customer;

    if (!email) {
      return res.status(400).json({ error: 'E-mail do comprador não encontrado na sessão' });
    }

    // 2. Registrar / Atualizar na tabela de compradores do Supabase
    const dbRes = await supabaseRequest('/rest/v1/usuarios_acesso', 'POST', {
      email: email.toLowerCase().trim(),
      nome: name,
      stripe_customer_id: customerId,
      stripe_session_id: session.id,
      has_access: true,
      valor_pago: (session.amount_total || 1990) / 100,
      plano: 'vitalicio'
    });

    // 3. Criar usuário no Supabase Auth se ainda não existir
    try {
      await supabaseRequest('/auth/v1/admin/users', 'POST', {
        email: email.toLowerCase().trim(),
        email_confirm: true,
        user_metadata: { nome: name, stripe_customer_id: customerId }
      });
    } catch (authErr) {
      // Se o usuário já existir no Auth, prossegue normalmente
      console.log('Usuário já existe no Auth ou foi criado previamente.');
    }

    return res.status(200).json({
      success: true,
      message: 'Acesso liberado com sucesso!',
      user: {
        email: email,
        name: name,
        has_access: true
      }
    });

  } catch (error) {
    console.error('Erro na verificação de sessão:', error);
    return res.status(500).json({ error: 'Erro interno ao processar liberação', message: error.message });
  }
};
