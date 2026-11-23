/**
 * Suíte 01 — Autenticação e Controle de Acesso
 * Plano de Testes, seção 2.1 (Autenticação e Acesso).
 *
 * Cobre: tela de login, validação nativa, credenciais inválidas,
 * login por perfil, restauração/expiração de sessão, logout e RBAC
 * (menu por permissão + deep link bloqueado).
 */

describe('CT-01 · Tela de login', () => {
  beforeEach(() => {
    cy.mockApi('PRODUCER');
    cy.visit('/');
  });

  it('CT-01.1 exibe login institucional sem cadastro público', () => {
    cy.get('.auth-form h1').should('have.text', 'Bem-vindo ao AgroClima Cloud');
    cy.get('#login-email')
      .should('be.visible')
      .and('have.attr', 'type', 'email')
      .and('have.attr', 'required');
    cy.get('input[name="password"]')
      .should('have.attr', 'type', 'password')
      .and('have.attr', 'maxlength', '72')
      .and('have.attr', 'required');
    cy.contains('button', 'Entrar na plataforma').should('be.visible');
    cy.contains('Contas são criadas exclusivamente pelo administrador').should('be.visible');
    cy.get('.auth-form').should('not.contain', 'Criar conta');
    cy.get('.auth-form').should('not.contain', 'Cadastre-se');
    cy.title().should('eq', 'AgroClima Cloud');
  });

  it('CT-01.2 bloqueia envio com campos vazios sem chamar a API', () => {
    cy.get('form[data-form="login"]').then(($form) => {
      expect($form[0].checkValidity(), 'formulário inválido sem e-mail/senha').to.eq(false);
    });
    cy.get('form[data-form="login"] button[type="submit"]').click();
    cy.get('@apiLogin.all').should('have.length', 0);
    cy.get('.auth-form h1').should('be.visible');
    cy.get('.app-shell').should('not.exist');
  });

  it('CT-01.3 credenciais inválidas exibem erro e não criam sessão', () => {
    cy.fillLogin('PRODUCER', 'SenhaIncorreta1');
    cy.wait('@apiLogin').its('response.statusCode').should('eq', 401);
    cy.get('.auth-feedback')
      .should('be.visible')
      .and('contain', 'Credenciais inválidas');
    cy.window().then((win) => {
      expect(win.sessionStorage.getItem('agroclima.session.v1')).to.be.null;
    });
    cy.get('.app-shell').should('not.exist');
  });

  it('CT-01.4 exibe estado de carregamento enquanto autentica', () => {
    cy.mockApi('PRODUCER', {
      overrides: [{
        method: 'POST',
        url: '**/api/java/api/auth/login',
        handler: (request) => {
          request.reply({
            delay: 600,
            statusCode: 200,
            body: {
              accessToken: 'token-producer',
              tokenType: 'Bearer',
              expiresAt: new Date(Date.now() + 3_600_000).toISOString(),
              user: {
                id: '11111111-1111-4111-8111-111111111111',
                name: 'Mariana Costa',
                email: 'produtor@agroclima.com',
                roleKey: 'PRODUCER',
                role: 'Produtor/Exportador',
                status: 'Ativo',
                permissionKeys: ['overview.view', 'plantations.manage', 'monitoring.view', 'analytics.view', 'reports.view'],
              },
            },
          });
        },
      }],
    });
    cy.fillLogin('PRODUCER');
    cy.contains('button', 'Entrando…').should('be.disabled');
    cy.get('.app-shell').should('exist');
  });
});

describe('CT-01 · Sessão autenticada por perfil', () => {
  it('CT-01.5 produtor entra e vê apenas as áreas do seu papel', () => {
    cy.loginAs('PRODUCER');
    cy.get('.topbar .profile strong').should('contain', 'Mariana Costa');
    cy.get('.sidebar nav button').should('have.length', 9);
    cy.get('.sidebar nav button[data-page="Visão Geral"]').should('have.attr', 'aria-current', 'page');
    cy.get('.sidebar nav button[data-page="Minhas Plantações"]').should('be.visible');
    cy.get('.sidebar nav button[data-page="Relatórios"]').should('be.visible');
    cy.get('.sidebar nav button[data-page="Usuários"]').should('not.exist');
    cy.get('.sidebar nav button[data-page="Permissões e RBAC"]').should('not.exist');
    cy.get('.sidebar nav button[data-page="Logs do Sistema"]').should('not.exist');
    cy.url().should('include', '#/visao-geral');
    cy.expectPageTitle('Visão Geral');
  });

  it('CT-01.6 analista entra no Dashboard Analítico', () => {
    cy.loginAs('ANALYST');
    cy.get('.topbar .profile strong').should('contain', 'Rafael Nunes');
    cy.get('.sidebar .role-pill strong').should('have.text', 'Analista de Dados');
    cy.expectPageTitle('Dashboard Analítico');
    cy.get('.sidebar nav button[data-page="Modelos Preditivos"]').should('be.visible');
    cy.get('.sidebar nav button[data-page="Usuários"]').should('not.exist');
  });

  it('CT-01.7 administrador entra no Dashboard Administrativo', () => {
    cy.loginAs('ADMIN');
    cy.get('.topbar .profile strong').should('contain', 'Carlos Almeida');
    cy.expectPageTitle('Dashboard Administrativo');
    cy.get('.sidebar nav button').should('have.length', 8);
    ['Usuários', 'Permissões e RBAC', 'Segurança', 'Logs do Sistema', 'Configurações'].forEach((page) => {
      cy.get(`.sidebar nav button[data-page="${page}"]`).should('be.visible');
    });
  });

  it('CT-01.8 restaura a sessão salva consultando /api/auth/me', () => {
    cy.visitWithSession('ANALYST');
    cy.expectPageTitle('Dashboard Analítico');
    cy.get('@apiMe.all').then((calls) => {
      expect(calls, 'chamadas a /api/auth/me').to.have.length.at.least(1);
      const last = calls[calls.length - 1];
      expect(last.request.headers.authorization).to.eq('Bearer token-analyst');
      expect(last.response.statusCode).to.eq(200);
    });
    cy.get('.app-shell').should('exist');
  });

  it('CT-01.9 token expirado mantém o usuário no login', () => {
    cy.visitWithSession('PRODUCER', { expiresAt: '2020-01-01T00:00:00Z' });
    cy.get('#login-email').should('be.visible');
    cy.get('@apiMe.all').should('have.length', 0);
    cy.get('.app-shell').should('not.exist');
  });

  it('CT-01.10 token inválido (401) encerra a sessão com aviso', () => {
    cy.visitWithSession('PRODUCER', { token: 'token-invalido' });
    cy.get('@apiMe.all').then((calls) => {
      expect(calls, 'chamadas a /api/auth/me').to.have.length.at.least(1);
      expect(calls[calls.length - 1].response.statusCode).to.eq(401);
    });
    cy.get('.auth-feedback')
      .should('be.visible')
      .and('contain', 'Sua sessão expirou');
    cy.get('.app-shell').should('not.exist');
  });

  it('CT-01.11 logout limpa a sessão e volta ao login', () => {
    cy.loginAs('PRODUCER');
    cy.get('.topbar button[data-action="logout"]').click();
    cy.get('.auth-form h1').should('contain', 'Bem-vindo ao AgroClima Cloud');
    cy.window().then((win) => {
      expect(win.sessionStorage.getItem('agroclima.session.v1')).to.be.null;
    });
    cy.get('.app-shell').should('not.exist');
    cy.hash().should('eq', '');
  });
});

describe('CT-01 · RBAC e deep links', () => {
  it('CT-01.12 deep link de área restrita é ignorado para o produtor', () => {
    cy.mockApi('PRODUCER');
    cy.visit('/#/usuarios');
    cy.submitLogin('PRODUCER');
    cy.expectPageTitle('Visão Geral');
    cy.url().should('include', '#/visao-geral');
    cy.get('.page-content').should('not.contain', 'Permissões e RBAC');
  });

  it('CT-01.13 administrador abre Usuários por URL direta', () => {
    cy.loginAs('ADMIN');
    cy.visit('/#/usuarios');
    cy.expectPageTitle('Usuários');
    cy.url().should('include', '#/usuarios');
    cy.get('.table-scroll tbody tr').should('have.length', 4);
  });

  it('CT-01.14 analista não abre Usuários nem por URL direta', () => {
    cy.loginAs('ANALYST');
    cy.visit('/#/usuarios');
    cy.expectPageTitle('Dashboard Analítico');
    cy.url().should('include', '#/dashboard-analitico');
    cy.get('.page-content h1').should('not.have.text', 'Usuários');
  });

  it('CT-01.15 hash de página inexistente cai na primeira área permitida', () => {
    cy.mockApi('PRODUCER');
    cy.visit('/#/pagina-inexistente');
    cy.submitLogin('PRODUCER');
    cy.expectPageTitle('Visão Geral');
  });
});
