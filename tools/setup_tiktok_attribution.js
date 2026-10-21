const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');

const attributionSnippet = `<!-- TikTok Pixel Code End -->

<!-- Inserir depois do código base, apenas na LP do produto. Executar junto ao consentimento do pixel. -->
<script>
(function () {
  if (window.__mestreCeiaTikTokEvents || !window.ttq) return;
  window.__mestreCeiaTikTokEvents = true;

  var product = {
    contents: [{content_id: 'mestre-da-ceia', content_type: 'product', content_name: 'Mestre da Ceia & Churrasco'}],
    value: 19.90,
    currency: 'BRL'
  };

  ttq.track('ViewContent', product);

  // 1. Capturar ou recuperar ttclid da URL
  var urlParams = new URLSearchParams(window.location.search);
  var ttclid = urlParams.get('ttclid');
  if (ttclid) {
    try { sessionStorage.setItem('ttclid', ttclid); } catch (e) {}
  } else {
    try { ttclid = sessionStorage.getItem('ttclid') || ''; } catch (e) {}
  }

  // 2. Capturar cookie _ttp gerado pelo Pixel do TikTok
  function getCookie(name) {
    var match = document.cookie.match(new RegExp('(?:^|;\\\\s*)' + name + '=([^;]*)'));
    return match ? decodeURIComponent(match[1]) : '';
  }

  // 3. Obter ou gerar client_reference_id persistente na sessão do navegador
  var refKey = '__mestre_ref_id';
  var clientRef = '';
  try { clientRef = sessionStorage.getItem(refKey); } catch (e) {}
  if (!clientRef) {
    clientRef = 'ref_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now().toString(36);
    try { sessionStorage.setItem(refKey, clientRef); } catch (e) {}
  }
  window.__mestreClientRef = clientRef;

  // 4. Salvar associação de atribuição no servidor (/api/track-session) para recuperação no Webhook
  function syncTracking() {
    var ttp = getCookie('_ttp');
    var payload = { ref: clientRef, ttclid: ttclid || '', ttp: ttp || '' };
    if (navigator.sendBeacon) {
      navigator.sendBeacon('/api/track-session', new Blob([JSON.stringify(payload)], { type: 'application/json' }));
    } else {
      fetch('/api/track-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        keepalive: true
      }).catch(function () {});
    }
  }

  syncTracking();
  setTimeout(syncTracking, 2000);

  // 5. Função utilitária para acrescentar client_reference_id ao link do Stripe
  function appendClientRef(urlStr) {
    if (!urlStr) return urlStr;
    try {
      var u = new URL(urlStr, window.location.href);
      if (u.origin === 'https://buy.stripe.com') {
        u.searchParams.set('client_reference_id', clientRef);
        return u.toString();
      }
    } catch (e) {}
    return urlStr;
  }
  window.__appendClientRef = appendClientRef;

  // Atualizar links da Stripe existentes no DOM
  function updateAllCheckoutLinks() {
    document.querySelectorAll('a[href*="buy.stripe.com"]').forEach(function (a) {
      a.href = appendClientRef(a.href);
    });
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', updateAllCheckoutLinks);
  } else {
    updateAllCheckoutLinks();
  }

  // 6. Listener de clique com InitiateCheckout e garantia de client_reference_id
  var lastClick = 0;
  document.addEventListener('click', function (event) {
    var link = event.target instanceof Element ? event.target.closest('a[href]') : null;
    if (!link) return;
    var url = new URL(link.href, window.location.href);
    if (url.origin !== 'https://buy.stripe.com') return;

    link.href = appendClientRef(link.href);

    if (Date.now() - lastClick < 1500) return;
    lastClick = Date.now();
    ttq.track('InitiateCheckout', product);
  }, true);
})();
</script>`;

['index.html', 'pagina-de-vendas.html'].forEach(filename => {
  const filePath = path.join(root, filename);
  let c = fs.readFileSync(filePath, 'utf8');

  // Substituir bloco de eventos pelo snippet com ponte de atribuição
  const startMarker = '<!-- TikTok Pixel Code End -->';
  const endMarker = '</head>';
  const startIdx = c.indexOf(startMarker);
  const endIdx = c.indexOf(endMarker, startIdx);

  if (startIdx !== -1 && endIdx !== -1) {
    c = c.substring(0, startIdx) + attributionSnippet + '\n' + c.substring(endIdx);
  }

  // Restaurar link base conforme solicitado no checklist: https://buy.stripe.com/7sYaEZexC2R1cP96lR1Jm06
  c = c.replace(/href="https:\/\/buy\.stripe\.com\/[a-zA-Z0-9]+"/g, 'href="https://buy.stripe.com/7sYaEZexC2R1cP96lR1Jm06"');
  c = c.replace(/value="https:\/\/buy\.stripe\.com\/[a-zA-Z0-9]+"/g, 'value="https://buy.stripe.com/7sYaEZexC2R1cP96lR1Jm06"');

  // Atualizar const stripeLinks para incluir o base 7sYaEZexC2R1cP96lR1Jm06
  c = c.replace(
    /base:\s*'https:\/\/buy\.stripe\.com\/[a-zA-Z0-9]+'/,
    "base: 'https://buy.stripe.com/7sYaEZexC2R1cP96lR1Jm06'"
  );

  // Garantir que mainBtn.href aplique __appendClientRef
  c = c.replace(
    'if (mainBtn) mainBtn.href = selectedLink;',
    'if (mainBtn) mainBtn.href = window.__appendClientRef ? window.__appendClientRef(selectedLink) : selectedLink;'
  );

  fs.writeFileSync(filePath, c, 'utf8');
  console.log(`✓ ${filename} atualizado com Attribution Bridge e Checkout Unificado!`);
});
