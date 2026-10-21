// ========================================================
// WEBHOOK STRIPE -> SUPABASE (LIBERAÇÃO AUTOMÁTICA)
// Vercel Serverless Function: /api/stripe-webhook
// ========================================================

const https = require('https');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://iurqyexfdlulmzsliyfg.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

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
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  const event = req.body;

  if (!event || !event.type) {
    return res.status(400).json({ error: 'Evento inválido' });
  }

  console.log('Recebido evento Stripe:', event.type);

  try {
    // Processa quando o checkout for completado com sucesso
    if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
      const session = event.data.object;

      if (session.payment_status === 'paid') {
        const email = session.customer_details ? session.customer_details.email : null;
        const name = session.customer_details ? session.customer_details.name : '';
        const customerId = session.customer;

        if (email) {
          console.log(`Liberando acesso para: ${email} (${name})`);

          // 1. Gravar na tabela de acesso
          await supabaseRequest('/rest/v1/usuarios_acesso', 'POST', {
            email: email.toLowerCase().trim(),
            nome: name,
            stripe_customer_id: customerId,
            stripe_session_id: session.id,
            has_access: true,
            valor_pago: (session.amount_total || 1990) / 100,
            plano: 'vitalicio'
          });

          // 2. Criar usuário no Auth se não existir
          try {
            await supabaseRequest('/auth/v1/admin/users', 'POST', {
              email: email.toLowerCase().trim(),
              email_confirm: true,
              user_metadata: { nome: name, stripe_customer_id: customerId }
            });
          } catch (e) {
            console.log('Usuário já existe no Auth.');
          }
        }
      }
    }

    return res.status(200).json({ received: true });
  } catch (err) {
    console.error('Erro no processamento do webhook:', err);
    return res.status(500).json({ error: err.message });
  }
};
