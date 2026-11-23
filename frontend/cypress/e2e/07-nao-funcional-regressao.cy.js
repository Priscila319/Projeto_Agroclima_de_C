/**
 * Suíte 07 — Testes Não Funcionais e Regressão
 * Plano de Testes, seções 3 (Testes de Regressão / Não Funcionais) e 5.2.
 *
 * Cobre: tempo de carregamento, ausência de erros no console, feedback de
 * carregamento, armazenamento seguro da sessão e navegação estável por todas
 * as áreas do perfil (smoke de regressão).
 */

describe('CT-07 · Não funcional', () => {
  it('CT-07.1 tela de login carrega dentro do limite aceitável', () => {
    cy.mockApi('PRODUCER');
    cy.visit('/');
    cy.get('#login-email').should('be.visible');
    cy.window().then((win) => {
      const navigation = win.performance.getEntriesByType('navigation')[0];
      expect(navigation, 'Navigation Timing disponível').to.exist;
      expect(navigation.domContentLoadedEventEnd, 'DOMContentLoaded (ms)').to.be.lessThan(5000);
      expect(navigation.loadEventEnd, 'load (ms)').to.be.lessThan(8000);
    });
  });

  it('CT-07.2 login e navegação não geram erros no console', () => {
    cy.mockApi('PRODUCER');
    cy.visit('/', {
      onBeforeLoad(win) {
        cy.stub(win.console, 'error').as('consoleError');
      },
    });
    cy.submitLogin('PRODUCER');
    cy.openMenuPage('Monitoramento');
    cy.get('.page-content h1').should('have.text', 'Monitoramento Climático');
    cy.openMenuPage('Minhas Plantações');
    cy.get('.page-content h1').should('have.text', 'Minhas Plantações');
    cy.get('@consoleError').should('not.have.been.called');
  });

  it('CT-07.3 exibe feedback de carregamento durante API lenta', () => {
    cy.fixture('api').then((data) => {
      cy.mockApi('PRODUCER', {
        overrides: [{
          method: 'GET',
          url: '**/api/python/api/v1/dashboard/summary',
          handler: (request) => {
            request.reply({ delay: 1200, statusCode: 200, body: data.dashboardSummary });
          },
        }],
      });
    });
    cy.visit('/');
    cy.fillLogin('PRODUCER');
    cy.get('.api-notice.loading').should('be.visible').and('contain', 'Atualizando dados do serviço');
    cy.get('.api-notice.loading').should('not.exist');
    cy.contains('.metric', 'Temperatura').should('contain', '27,4 °C');
  });

  it('CT-07.4 navegação e renderização respondem em menos de 3 segundos', () => {
    cy.loginAs('PRODUCER');
    let started = 0;
    cy.window().then(() => {
      started = Date.now();
    });
    cy.openMenuPage('Monitoramento');
    cy.wait('@climate');
    cy.contains('.metric', 'Amostras').should('contain', '3').then(() => {
      const elapsed = Date.now() - started;
      expect(elapsed, 'tempo até renderizar os indicadores (ms)').to.be.lessThan(3000);
    });
  });

  it('CT-07.5 sessão não guarda senha e fica apenas em sessionStorage', () => {
    cy.loginAs('PRODUCER');
    cy.window().then((win) => {
      const localDump = JSON.stringify({ ...win.localStorage });
      expect(localDump).to.not.contain('SenhaSegura123');
      expect(localDump).to.not.contain('token-producer');
      const session = win.sessionStorage.getItem('agroclima.session.v1');
      expect(session, 'sessão salva').to.be.a('string');
      expect(session).to.contain('token-producer');
      expect(session).to.not.contain('SenhaSegura123');
    });
  });
});

describe('CT-07 · Regressão e smoke de navegação', () => {
  it('CT-07.6 todas as áreas do produtor carregam sem erro de API', () => {
    cy.loginAs('PRODUCER');
    const pages = [
      ['Visão Geral', 'Visão Geral'],
      ['Minhas Plantações', 'Minhas Plantações'],
      ['Monitoramento', 'Monitoramento Climático'],
      ['Previsões', 'Previsões'],
      ['Mercado e Exportação', 'Mercado e Exportação'],
      ['Comparação', 'Análise Comparativa'],
      ['Alertas', 'Central de Alertas'],
      ['Histórico', 'Histórico'],
      ['Relatórios', 'Relatórios'],
    ];
    pages.forEach(([menu, title]) => {
      cy.openMenuPage(menu);
      cy.get('.page-content h1').should('have.text', title);
    });

    // Dados que só aparecem quando a resposta da API é aplicada ao estado.
    cy.openMenuPage('Visão Geral');
    cy.contains('.sync-strip strong', '3 leituras persistidas').should('be.visible');
    cy.openMenuPage('Monitoramento');
    cy.contains('.metric', 'Amostras').should('contain', '3');
    cy.openMenuPage('Previsões');
    cy.contains('Regressão linear (estatístico)').should('be.visible');
    cy.openMenuPage('Mercado e Exportação');
    cy.contains('Nenhuma fonte de mercado está configurada').should('be.visible');
    cy.openMenuPage('Comparação');
    cy.contains('.ranking', '1.200 plantas').should('be.visible');
    cy.openMenuPage('Histórico');
    cy.get('.plantation-timeline article').should('have.length', 4);
    cy.openMenuPage('Relatórios');
    cy.contains('.metric', 'Plantações').should('contain', '3');
    cy.get('.api-notice.error').should('not.exist');
  });

  it('CT-07.7 navegação por deep link mantém o menu sincronizado', () => {
    cy.loginAs('PRODUCER');
    cy.visit('/#/previsoes');
    cy.get('.page-content h1').should('have.text', 'Previsões');
    cy.get('.sidebar nav button[data-page="Previsões"]')
      .should('have.attr', 'aria-current', 'page');
    cy.url().should('include', '#/previsoes');
  });

  it('CT-07.8 recarregar a página preserva a sessão e o perfil', () => {
    cy.loginAs('ADMIN');
    cy.reload();
    cy.get('.sidebar .role-pill strong').should('have.text', 'Administrador');
    cy.get('.page-content h1').should('have.text', 'Dashboard Administrativo');
    cy.get('@apiMe.all').should('have.length.at.least', 1);
  });
});
