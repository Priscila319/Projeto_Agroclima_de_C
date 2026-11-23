import { installApiStubs } from './api-stubs.js';

const SESSION_KEY = 'agroclima.session.v1';

/**
 * Registra os stubs das APIs antes de qualquer visita da aplicação.
 * `options.overrides` permite simular falhas (401/403/500) ou respostas
 * diferentes sem alterar o restante da massa de dados.
 */
Cypress.Commands.add('mockApi', (role = 'PRODUCER', options = {}) => {
  cy.fixture('api').then((data) => {
    installApiStubs(data, role, options);
  });
});

/** Preenche e envia o formulário de login. Não valida o resultado. */
Cypress.Commands.add('fillLogin', (role = 'PRODUCER', password) => {
  cy.fixture('api').then((data) => {
    const user = data.users[String(role).toLowerCase()] || data.users.producer;
    cy.get('form[data-form="login"]').should('be.visible');
    cy.get('#login-email').clear().type(user.email);
    cy.get('input[name="password"]').clear().type(password ?? data.credentials.password);
    cy.get('form[data-form="login"] button[type="submit"]').click();
  });
});

const ROLE_LABELS = {
  producer: 'Produtor/Exportador',
  analyst: 'Analista de Dados',
  admin: 'Administrador',
};

/** Executa o login e valida que o shell autenticado foi montado. */
Cypress.Commands.add('submitLogin', (role = 'PRODUCER', password) => {
  const roleName = ROLE_LABELS[String(role).toLowerCase()] || ROLE_LABELS.producer;
  cy.fillLogin(role, password);
  cy.get('.app-shell').should('exist');
  cy.get('.sidebar').should('be.visible');
  cy.get('.sidebar .role-pill strong').should('contain', roleName);
});

/** Mock + visita + login em um único passo. */
Cypress.Commands.add('loginAs', (role = 'PRODUCER', options = {}) => {
  cy.mockApi(role, options);
  cy.visit(options.path || '/');
  if (options.expectFailure) {
    cy.fillLogin(role, options.password);
  } else {
    cy.submitLogin(role, options.password);
  }
});

/**
 * Abre a aplicação já autenticada, gravando um token em sessionStorage.
 * Usado para testar a restauração de sessão e deep links (#/pagina).
 */
Cypress.Commands.add('visitWithSession', (role = 'PRODUCER', { path = '/', token, expiresAt } = {}) => {
  cy.mockApi(role);
  const session = {
    accessToken: token || `token-${String(role).toLowerCase()}`,
    expiresAt: expiresAt || new Date(Date.now() + 60 * 60 * 1000).toISOString(),
  };
  cy.visit(path, {
    onBeforeLoad(win) {
      win.sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    },
  });
});

/** Clica no item de menu do perfil autenticado. */
Cypress.Commands.add('openMenuPage', (pageName) => {
  cy.get(`.sidebar nav button[data-page="${pageName}"]`).should('be.visible').click();
});

/** Espera o conteúdo de uma página pelo <h1> do cabeçalho. */
Cypress.Commands.add('expectPageTitle', (title) => {
  cy.get('.page-content h1').should('be.visible').and('have.text', title);
});

/** Evita baixar arquivos durante o teste, registrando o clique no link. */
Cypress.Commands.add('stubDownload', () => {
  cy.window().then((win) => {
    if (!win.URL.createObjectURL) win.URL.createObjectURL = () => 'blob:cypress';
    cy.stub(win.URL, 'createObjectURL').as('createObjectUrl').returns('blob:cypress');
    cy.stub(win.URL, 'revokeObjectURL').as('revokeObjectUrl');
    cy.stub(win.HTMLAnchorElement.prototype, 'click').as('downloadClick');
  });
});

export { SESSION_KEY };
