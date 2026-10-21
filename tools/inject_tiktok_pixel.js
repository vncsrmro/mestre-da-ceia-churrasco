// Injeta o TikTok Pixel (base + eventos da LP) nos HTMLs do site.
// Idempotente: não reinjeta se o pixel já estiver presente.
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const PIXEL_ID = 'DBCJB9BC77U4J2JQ94IG';

const base = `  <!-- TikTok Pixel Code Start -->
  <script>
  !function (w, d, t) {
    w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie","holdConsent","revokeConsent","grantConsent"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(
  var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e},ttq.load=function(e,n){var r="https://analytics.tiktok.com/i18n/pixel/events.js",o=n&&n.partner;ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=r,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};n=document.createElement("script")
  ;n.type="text/javascript",n.async=!0,n.src=r+"?sdkid="+e+"&lib="+t;e=document.getElementsByTagName("script")[0];e.parentNode.insertBefore(n,e)};
    ttq.load('${PIXEL_ID}');
    ttq.page();
  }(window, document, 'ttq');
  </script>
  <!-- TikTok Pixel Code End -->
`;

// Eventos da LP: ViewContent ao carregar e InitiateCheckout ao clicar em qualquer link Stripe.
// O botão principal troca de link conforme os order bumps, então o valor é lido no momento do clique.
const events = `  <!-- TikTok Pixel: eventos da LP (ViewContent + InitiateCheckout) -->
  <script>
  (function () {
    if (window.__mestreCeiaTikTokEvents || !window.ttq) return;
    window.__mestreCeiaTikTokEvents = true;
    var BASE = { id: 'mestre-da-ceia', name: 'Mestre da Ceia & Churrasco', price: 19.90 };
    var BUMPS = [
      { el: 'bump-drinks', id: 'guia-drinks', name: 'Guia de Drinks em Jarra & Cooler', price: 9.90 },
      { el: 'bump-anti-caos', id: 'cronograma-anti-caos', name: 'Cronograma Horário Anti-Caos', price: 12.90 }
    ];
    function buildPayload(includeBumps) {
      var contents = [{ content_id: BASE.id, content_type: 'product', content_name: BASE.name, price: BASE.price, quantity: 1 }];
      var value = BASE.price;
      if (includeBumps) {
        BUMPS.forEach(function (b) {
          var box = document.getElementById(b.el);
          if (box && box.checked) {
            contents.push({ content_id: b.id, content_type: 'product', content_name: b.name, price: b.price, quantity: 1 });
            value += b.price;
          }
        });
      }
      return { contents: contents, value: Math.round(value * 100) / 100, currency: 'BRL' };
    }
    ttq.track('ViewContent', buildPayload(false));
    var lastClick = 0;
    document.addEventListener('click', function (event) {
      var link = event.target instanceof Element ? event.target.closest('a[href]') : null;
      if (!link) return;
      var url;
      try { url = new URL(link.href, window.location.href); } catch (e) { return; }
      if (url.origin !== 'https://buy.stripe.com') return;
      if (Date.now() - lastClick < 1500) return;
      lastClick = Date.now();
      ttq.track('InitiateCheckout', buildPayload(true));
    });
  })();
  </script>
`;

const targets = [
  { file: 'index.html', withEvents: true },
  { file: 'pagina-de-vendas.html', withEvents: true },
  { file: 'app.html', withEvents: false },
];

for (const t of targets) {
  const p = path.join(root, t.file);
  let html = fs.readFileSync(p, 'utf8');
  if (html.includes(`ttq.load('${PIXEL_ID}')`)) {
    console.log(`= ${t.file}: pixel já instalado, ignorando`);
    continue;
  }
  // Base logo após a abertura do <head>
  html = html.replace(/<head>\s*\n/, (m) => m + base);
  if (t.withEvents) {
    html = html.replace('</body>', events + '</body>');
  }
  fs.writeFileSync(p, html);
  console.log(`✓ ${t.file}: pixel base${t.withEvents ? ' + eventos' : ''} instalado`);
}
