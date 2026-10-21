const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');

const block = `<!-- Colar este bloco UMA VEZ antes de </head> na landing page do Mestre da Ceia.
Ativar conforme o consentimento de cookies do site. Não adicionar outro pixel igual. -->
<!-- Código oficial copiado do TikTok. Inserir uma vez no <head>, conforme o consentimento do site. -->
<!-- TikTok Pixel Code Start -->
<script>
!function (w, d, t) {
  w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie","holdConsent","revokeConsent","grantConsent"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(
var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e},ttq.load=function(e,n){var r="https://analytics.tiktok.com/i18n/pixel/events.js",o=n&&n.partner;ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=r,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};n=document.createElement("script")
;n.type="text/javascript",n.async=!0,n.src=r+"?sdkid="+e+"&lib="+t;e=document.getElementsByTagName("script")[0];e.parentNode.insertBefore(n,e)};
  ttq.load('DBCJB9BC77U4J2JQ94IG');
  ttq.page();
}(window, document, 'ttq');
</script>
<!-- TikTok Pixel Code End -->

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
  var lastClick = 0;
  document.addEventListener('click', function (event) {
    var link = event.target instanceof Element ? event.target.closest('a[href]') : null;
    if (!link) return;
    var url = new URL(link.href, window.location.href);
    if (url.origin !== 'https://buy.stripe.com') return;
    if (Date.now() - lastClick < 1500) return;
    lastClick = Date.now();
    ttq.track('InitiateCheckout', product);
  });
})();
</script>
`;

['index.html', 'pagina-de-vendas.html'].forEach(filename => {
  const file = path.join(root, filename);
  let content = fs.readFileSync(file, 'utf8');

  // 1. Remove qualquer bloco antigo do TikTok Pixel do <head>
  content = content.replace(/\s*<!-- TikTok Pixel Code Start -->[\s\S]*?<!-- TikTok Pixel Code End -->\s*/g, '\n');

  // 2. Remove qualquer bloco antigo de eventos do TikTok antes do </body>
  content = content.replace(/\s*<!-- TikTok Pixel: eventos da LP[\s\S]*?<\/script>\s*(?=<\/body>)/g, '\n');

  // 3. Remove qualquer comentário anterior do bloco se houver
  content = content.replace(/\s*<!-- Colar este bloco UMA VEZ antes de <\/head>[\s\S]*?<\/script>\s*(?=<\/head>)/g, '\n');

  // 4. Insere o bloco exato UMA VEZ imediatamente antes de </head>
  content = content.replace('</head>', '\n' + block + '</head>');

  fs.writeFileSync(file, content, 'utf8');
  console.log(`✓ ${filename} atualizado com o bloco exato antes de </head>`);
});
