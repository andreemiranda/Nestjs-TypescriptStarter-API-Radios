(function () {
  var FAVICON_DATA_URI =
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAMAAABEpIrGAAAAkFBMVEUAAAAQM0QWNUYWNkYXNkYALjoWNUYYOEUXN0YaPEUPMUAUM0QVNUYWNkYWNUYWNUUWNUYVNEYWNkYWNUYWM0eF6i0XNkchR0OB5SwzZj9wyTEvXkA3az5apTZ+4C5DgDt31C9frjU5bz5uxTI/eDxzzjAmT0IsWUEeQkVltzR62S6D6CxIhzpKijpJiDpOkDl4b43lAAAAFXRSTlMAFc304QeZ/vj+ECB3xKlGilPXvS2Ka/h0AAABfklEQVR42oVT2XaCMBAdJRAi7pYJa2QHxbb//3ctSSAUPfa+THLmzj4DBvZpvyauS9b7kw3PWDkWsrD6fFQhQ9dZLfVbC5M88CWCPERr+8fLZodJ5M8QJbjbGL1H2M1fIGfEm+wJN+bGCSc6EXtNS/8FSrq2VX6YDv++XLpJ8SgDWMnwqznGo6alcTbIxB2CHKn8VFikk2mMV2lEnV+CJd9+jJlxXmMr5dW14YCqwgbFpO8FNvJxwwM4TPWPo5QalEsRMAcusXpi58/QUEWPL0AK1ThM5oQCUyXPoPINkdd922VBw4XgTV9zDGWWFrgjIQs4vwvOg6xr+6gbCTqE+DYhlMGX0CF2OknK5gQ2JrkDh/W6TOEbYDeVecKbJtyNXiCfGmW7V93J2hDus1bDfhxWbIZVYDXITA7Lo6E0Ktgg9eB4KWuR44aj7ppBVPazhQH7/M/KgWe9X1qAg8XypT6nxIMJH+T94QCsLvj29IYwZxyO9/F8vCbO9tX5/wDGjEZ7vrgFZwAAAABJRU5ErkJggg==';

  function applyFavicon() {
    try {
      var head = document.head || document.getElementsByTagName('head')[0];
      var links = document.querySelectorAll("link[rel*='icon']");
      if (!links || links.length === 0) {
        var newFav = document.createElement('link');
        newFav.rel = 'icon';
        newFav.type = 'image/png';
        newFav.sizes = '32x32';
        newFav.href = FAVICON_DATA_URI;
        head.appendChild(newFav);
      } else {
        for (var i = 0; i < links.length; i++) {
          links[i].setAttribute('href', FAVICON_DATA_URI);
          links[i].setAttribute('type', 'image/png');
        }
      }
    } catch (_) {}
  }

  function setupHeaderLink() {
    // 0. Garante que o favicon do Swagger UI esteja definido na aba do navegador
    applyFavicon();

    // 1. Vincula o título principal "RadiosWave API" no cabeçalho do Swagger à página inicial
    var titleEl = document.querySelector('.swagger-ui .info h2.title');
    if (titleEl && !titleEl.querySelector('a.radioswave-home-link')) {
      var versionEl = titleEl.querySelector('small');
      var versionHtml = versionEl ? versionEl.outerHTML : '';
      titleEl.innerHTML =
        '<a href="/" class="radioswave-home-link" title="Página Inicial - RadiosWave API">RadiosWave API</a> ' +
        versionHtml;
    }

    // 2. Insere cabeçalho de navegação no topo com link da página inicial
    var existingHeader = document.getElementById('radioswave-topbar');
    if (!existingHeader) {
      var header = document.createElement('header');
      header.id = 'radioswave-topbar';
      header.className = 'radioswave-header';
      header.innerHTML =
        '<div class="radioswave-header-container">' +
        '  <a href="/" class="radioswave-brand" title="Ir para a Página Inicial">' +
        '    <span class="radioswave-icon">📻</span>' +
        '    <span class="radioswave-title">RadiosWave API</span>' +
        '  </a>' +
        '  <nav class="radioswave-nav">' +
        '    <a href="/" class="radioswave-nav-link" title="Página Inicial">Página Inicial</a>' +
        '    <a href="/api/health" target="_blank" class="radioswave-nav-link" title="Verificação de Saúde">Health</a>' +
        '    <a href="https://radioswave.netlify.app" target="_blank" rel="noopener noreferrer" class="radioswave-nav-badge" title="Acessar Web App Oficial">Web App ↗</a>' +
        '  </nav>' +
        '</div>';

      var swaggerContainer = document.getElementById('swagger-ui');
      if (swaggerContainer && swaggerContainer.parentNode) {
        swaggerContainer.parentNode.insertBefore(header, swaggerContainer);
      } else {
        document.body.insertBefore(header, document.body.firstChild);
      }
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupHeaderLink);
  } else {
    setupHeaderLink();
  }

  // MutationObserver para garantir renderização após hidratação do React
  var observer = new MutationObserver(function () {
    var titleEl = document.querySelector('.swagger-ui .info h2.title');
    if (titleEl && !titleEl.querySelector('a.radioswave-home-link')) {
      setupHeaderLink();
    }
  });

  if (document.body) {
    observer.observe(document.body, { childList: true, subtree: true });
  } else {
    document.addEventListener('DOMContentLoaded', function () {
      observer.observe(document.body, { childList: true, subtree: true });
    });
  }
})();
