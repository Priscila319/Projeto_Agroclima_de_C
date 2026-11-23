/**
 * Suíte 05 — Integração de APIs (contratos, autenticação e falhas)
 * Plano de Testes, seções 2.1 (Integração de APIs) e 6 (Gestão de Defeitos).
 *
 * Verifica: same-origin, Authorization Bearer, chamadas por permissão,
 * tratamento de 401/403/500, indisponibilidade de rede e contratos camelCase
 * entregues pelo Java e pelo Python.
 */

describe('CT-05 · Integração frontend ↔ APIs', () => {
  it('CT-05.1 requisições protegidas usam same-origin e Bearer token', () => {
    cy.loginAs('PRODUCER');
    cy.expectPageTitle('Visão Geral');

    cy.get('@apiLogin.all').then((calls) => {
      expect(calls).to.have.length(1);
      const login = calls[0].request;
      expect(login.url).to.include('/api/java/api/auth/login');
      expect(new URL(login.url).origin).to.eq(new URL(Cypress.config('baseUrl')).origin);
      expect(login.headers.authorization, 'login não envia token').to.be.undefined;
    });

    cy.get('@varieties.all').then((calls) => {
      expect(calls.length).to.be.at.least(1);
      expect(calls[0].request.headers.authorization).to.eq('Bearer token-producer');
    });

    cy.get('@dashboardSummary.all').then((calls) => {
      expect(calls.length).to.be.at.least(1);
      const request = calls[0].request;
      expect(request.url).to.include('/api/python/api/v1/dashboard/summary');
      expect(new URL(request.url).origin).to.eq(new URL(Cypress.config('baseUrl')).origin);
      expect(request.headers.authorization).to.eq('Bearer token-producer');
    });
  });

  it('CT-05.2 perfil sem permissão não consulta usuários, RBAC nem auditoria', () => {
    cy.loginAs('PRODUCER');
    cy.expectPageTitle('Visão Geral');
    cy.get('@users.all').should('have.length', 0);
    cy.get('@roles.all').should('have.length', 0);
    cy.get('@permissions.all').should('have.length', 0);
    cy.get('@auditEvents.all').should('have.length', 0);
    cy.get('@settings.all').should('have.length', 0);
    cy.get('@publicSettings.all').should('have.length.at.least', 1);
  });

  it('CT-05.3 401 em recurso protegido encerra a sessão', () => {
    cy.loginAs('PRODUCER', {
      expectFailure: true,
      overrides: [{
        method: 'GET',
        url: '**/api/python/api/v1/dashboard/summary',
        statusCode: 401,
        body: { message: 'Sessão inválida.' },
        alias: 'summaryUnauthorized',
      }],
    });
    cy.get('.auth-feedback')
      .should('be.visible')
      .and('contain', 'Sua sessão expirou ou foi encerrada');
    cy.get('.auth-form h1').should('contain', 'Bem-vindo ao AgroClima Cloud');
    cy.window().then((win) => {
      expect(win.sessionStorage.getItem('agroclima.session.v1')).to.be.null;
    });
  });

  it('CT-05.4 erro 500 exibe aviso e mantém o shell utilizável', () => {
    cy.loginAs('PRODUCER', {
      overrides: [{
        method: 'GET',
        url: '**/api/python/api/v1/dashboard/summary',
        statusCode: 500,
        body: { message: 'Falha interna simulada.' },
        alias: 'summaryFailure',
      }],
    });
    cy.get('.api-notice.error')
      .should('be.visible')
      .and('contain', 'Falha interna simulada.');
    cy.get('.sidebar').should('be.visible');
    // O aviso é renderizado no conteúdo; o shell e a sessão continuam ativos.
    cy.get('.topbar-status').should('be.visible');
    cy.get('.topbar .profile strong').should('contain', 'Mariana Costa');
    cy.window().then((win) => {
      expect(win.sessionStorage.getItem('agroclima.session.v1')).to.not.be.null;
    });
  });

  it('CT-05.5 403 em página secundária não desloga o usuário', () => {
    cy.loginAs('PRODUCER');
    cy.intercept('GET', '**/api/python/api/v1/climate/current', {
      statusCode: 403,
      body: { message: 'Acesso negado pela API.' },
    }).as('climateForbidden');
    cy.openMenuPage('Monitoramento');
    cy.wait('@climateForbidden').its('response.statusCode').should('eq', 403);
    cy.get('.api-notice.error').should('contain', 'Acesso negado pela API.');
    cy.get('.sidebar').should('be.visible');
    cy.window().then((win) => {
      expect(win.sessionStorage.getItem('agroclima.session.v1')).to.not.be.null;
    });
  });

  it('CT-05.6 indisponibilidade de rede mostra mensagem de conexão', () => {
    cy.loginAs('PRODUCER', {
      overrides: [{
        method: 'GET',
        url: '**/api/python/api/v1/dashboard/summary',
        handler: { forceNetworkError: true },
        alias: 'summaryOffline',
      }],
    });
    cy.get('.api-notice.error')
      .should('be.visible')
      .and('contain', 'Não foi possível conectar aos serviços');
    cy.get('.sidebar').should('be.visible');
  });

  it('CT-05.7 contrato camelCase do Python alimenta a interface', () => {
    cy.loginAs('PRODUCER');
    cy.openMenuPage('Monitoramento');
    cy.wait('@climate').then(({ response }) => {
      expect(response.body.channelId).to.eq('3141592');
      expect(response.body.latestAt).to.eq('2026-11-23T09:00:00Z');
      expect(response.body.records).to.eq(3);
      expect(response.body.metrics.temperature.current).to.eq(27.4);
    });
    cy.contains('.integration-status', '3141592').should('be.visible');
    cy.contains('.metric', 'Amostras').should('contain', '3');
    cy.contains('.metric', 'Última captura').should('not.contain', 'Sem captura');
  });

  it('CT-05.8 chamadas Python também carregam o token do usuário', () => {
    cy.loginAs('ANALYST');
    cy.openMenuPage('Qualidade dos Dados');
    cy.wait('@quality').then(({ request }) => {
      expect(request.headers.authorization).to.eq('Bearer token-analyst');
      expect(request.url).to.include('/api/python/api/v1/dashboard/quality');
    });
    cy.get('.page-content h1').should('have.text', 'Qualidade dos Dados');
  });
});
