(function () {
  function setupHeaderLink() {
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
