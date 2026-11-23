/**
 * Suíte 06 — Usabilidade, Responsividade e Acessibilidade (UX/UI)
 * Plano de Testes, seções 1.2 (Qualidade de Interface) e 2.1
 * (Compatibilidade de Plataformas: Desktop e Mobile).
 */

describe('CT-06 · Acessibilidade básica', () => {
  it('CT-06.1 documento tem idioma, título e um único H1', () => {
    cy.loginAs('PRODUCER');
    cy.get('html').should('have.attr', 'lang', 'pt-BR');
    cy.title().should('not.be.empty');
    cy.get('h1').should('have.length', 1);
    cy.get('.page-content h1').should('have.text', 'Visão Geral');
  });

  it('CT-06.2 login usa labels implícitos e botões com nome acessível', () => {
    cy.mockApi('PRODUCER');
    cy.visit('/');
    cy.get('.auth-form label.field').should('have.length', 2);
    cy.get('.auth-form label.field').each(($label) => {
      expect($label.find('input').length, 'label associado a input').to.be.at.least(1);
    });
    cy.get('input[name="password"]').should('have.attr', 'autocomplete', 'current-password');
    cy.get('#login-email').should('have.attr', 'autocomplete', 'username');
    cy.get('form[data-form="login"] button[type="submit"]').should('contain', 'Entrar na plataforma');
  });

  it('CT-06.3 ações de ícone têm aria-label e estado do tema é exposto', () => {
    cy.loginAs('PRODUCER');
    cy.get('.topbar button[aria-label="Buscar"]').should('be.visible');
    cy.get('.topbar button[data-action="toggle-theme"]')
      .should('have.attr', 'aria-label', 'Ativar tema escuro')
      .and('have.attr', 'aria-pressed', 'false');
    cy.get('.topbar button[aria-label="Notificações"]').should('be.visible');
    cy.get('.topbar button[aria-label="Sair"]').should('be.visible');
  });

  it('CT-06.4 navegação marca a página atual com aria-current', () => {
    cy.loginAs('PRODUCER');
    cy.get('.sidebar nav button[aria-current="page"]').should('have.length', 1);
    cy.get('.sidebar nav button[aria-current="page"]').should('contain', 'Visão Geral');
    cy.openMenuPage('Monitoramento');
    cy.get('.sidebar nav button[aria-current="page"]').should('have.length', 1);
    cy.get('.sidebar nav button[aria-current="page"]').should('contain', 'Monitoramento');
    cy.get('.sidebar nav button[data-page="Visão Geral"]').should('not.have.attr', 'aria-current');
  });
});

describe('CT-06 · Tema claro/escuro', () => {
  it('CT-06.5 alterna o tema e mantém a escolha entre páginas', () => {
    cy.loginAs('PRODUCER');
    cy.get('html').should('have.attr', 'data-theme', 'light');
    cy.get('.theme-toggle').click();
    cy.get('html').should('have.attr', 'data-theme', 'dark');
    cy.get('.theme-toggle')
      .should('have.attr', 'aria-pressed', 'true')
      .and('have.attr', 'aria-label', 'Ativar tema claro');
    cy.openMenuPage('Monitoramento');
    cy.get('html').should('have.attr', 'data-theme', 'dark');
    cy.get('.theme-toggle').click();
    cy.get('html').should('have.attr', 'data-theme', 'light');
  });

  it('CT-06.6 tema aplica tokens de cor do Design System', () => {
    cy.loginAs('PRODUCER');
    cy.document().then((doc) => {
      expect(doc.documentElement.style.getPropertyValue('--green')).to.eq('#167c55');
      expect(doc.documentElement.style.getPropertyValue('--canvas')).to.eq('#f5f8f6');
    });
    cy.get('.theme-toggle').click();
    cy.document().then((doc) => {
      expect(doc.documentElement.style.getPropertyValue('--green')).to.eq('#5fc28d');
      expect(doc.documentElement.style.getPropertyValue('--canvas')).to.eq('#101a15');
    });
  });
});

describe('CT-06 · Responsividade Desktop e Mobile', () => {
  it('CT-06.7 desktop exibe menu lateral fixo sem botão hambúrguer', () => {
    cy.viewport(1440, 900);
    cy.loginAs('PRODUCER');
    cy.get('.sidebar').should('be.visible');
    cy.get('.menu-btn').should('not.be.visible');
    cy.get('.sidebar nav button').should('have.length', 9);
  });

  it('CT-06.8 mobile abre e fecha o menu lateral', () => {
    cy.viewport(390, 844);
    cy.loginAs('PRODUCER');
    cy.get('.menu-btn').should('be.visible');
    cy.get('.sidebar').should('not.have.class', 'open');
    cy.get('.menu-btn').click();
    cy.get('.sidebar').should('have.class', 'open');
    cy.get('.sidebar-overlay').should('have.class', 'show');
    cy.get('.mobile-close').click();
    cy.get('.sidebar').should('not.have.class', 'open');
    cy.get('.sidebar-overlay').should('not.have.class', 'show');
  });

  it('CT-06.9 overlay fecha o menu e navegação no mobile funciona', () => {
    cy.viewport(390, 844);
    cy.loginAs('PRODUCER');
    cy.get('.menu-btn').click();
    cy.get('.sidebar-overlay').should('have.class', 'show').click({ force: true });
    cy.get('.sidebar').should('not.have.class', 'open');
    cy.get('.menu-btn').click();
    cy.get('.sidebar nav button[data-page="Previsões"]').click();
    cy.get('.page-content h1').should('have.text', 'Previsões');
    cy.get('.sidebar').should('not.have.class', 'open');
  });

  it('CT-06.10 login permanece utilizável em viewport móvel', () => {
    cy.viewport(375, 667);
    cy.mockApi('PRODUCER');
    cy.visit('/');
    cy.get('.auth-visual').should('not.be.visible');
    cy.get('#login-email').should('be.visible');
    cy.get('input[name="password"]').should('be.visible');
    cy.get('form[data-form="login"] button[type="submit"]').should('be.visible');
    cy.get('#login-email').invoke('outerWidth').should('be.lessThan', 375);
  });

  it('CT-06.11 tabelas ficam em contêiner com rolagem horizontal', () => {
    cy.viewport(390, 844);
    cy.loginAs('PRODUCER');
    cy.openMenuPage('Monitoramento');
    cy.get('.table-scroll').should('be.visible').and('have.css', 'overflow-x', 'auto');
    cy.get('.table-scroll table').should('exist');
  });
});
