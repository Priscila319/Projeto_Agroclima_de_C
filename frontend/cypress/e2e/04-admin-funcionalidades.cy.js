/**
 * Suíte 04 — Funcionalidades do Administrador
 * Plano de Testes, seções 2.1 e 5 (gestão de usuários, RBAC, auditoria,
 * configurações e critérios de aceitação funcionais).
 */

describe('CT-04 · Administrador', () => {
  beforeEach(() => {
    cy.loginAs('ADMIN');
  });

  it('CT-04.1 Dashboard Administrativo consolida contas e auditoria', () => {
    cy.expectPageTitle('Dashboard Administrativo');
    cy.get('@dashboardSummary.all').should('have.length.at.least', 1);
    cy.contains('.metric', 'Usuários ativos').should('contain', '3');
    cy.contains('.metric', 'Usuários bloqueados').should('contain', '1');
    cy.contains('.metric', 'Acessos hoje').should('contain', '2');
    cy.contains('.metric', 'Eventos com falha').should('contain', '1');
    cy.contains('.service-card', 'API Java').should('contain', 'Disponível');
    cy.contains('.activity-list', 'Iniciou sessão').should('be.visible');
    cy.get('.activity-list > div').should('have.length', 4);
    cy.contains('Sessões auditadas').should('be.visible');
    cy.contains('Usuários por papel').should('be.visible');
  });

  it('CT-04.2 Usuários lista contas e status vindos da API', () => {
    cy.openMenuPage('Usuários');
    cy.expectPageTitle('Usuários');
    cy.get('@users.all').should('have.length.at.least', 1);
    cy.get('.table-scroll tbody tr').should('have.length', 4);
    cy.contains('td', 'produtor@agroclima.com').should('be.visible');
    cy.contains('td', 'analista@agroclima.com').should('be.visible');
    cy.contains('td', 'admin@agroclima.com').should('be.visible');
    cy.contains('tr', 'João Pereira').should('contain', 'Bloqueado');
    cy.get('[data-page="Permissões e RBAC"]').should('have.length.at.least', 1);
  });

  it('CT-04.3 RBAC altera o papel de um usuário com persistência na API', () => {
    cy.openMenuPage('Permissões e RBAC');
    cy.expectPageTitle('Permissões e RBAC');
    cy.get('.rbac-role-card').should('have.length', 3);
    cy.contains('.metric', 'Permissões').should('contain', '14');
    cy.get('.permission-matrix tbody tr').should('have.length', 14);
    cy.get('.permission-matrix input[data-role="ADMIN"]').first().should('be.disabled');

    cy.contains('tr', 'Mariana Costa')
      .find('select[data-action="rbac-user-role"]')
      .select('ANALYST');
    cy.wait('@changeUserRole').then(({ request }) => {
      expect(request.body).to.deep.eq({ roleKey: 'ANALYST' });
    });
    cy.get('.form-feedback[role="status"]')
      .should('contain', 'Papel atualizado no servidor.');
    cy.contains('tr', 'Mariana Costa')
      .find('select[data-action="rbac-user-role"]')
      .should('have.value', 'ANALYST');
  });

  it('CT-04.4 RBAC bloqueia e reativa uma conta', () => {
    cy.openMenuPage('Permissões e RBAC');
    cy.contains('tr', 'Mariana Costa')
      .find('select[data-action="user-status"]')
      .select('BLOCKED');
    cy.wait('@changeUserStatus').then(({ request }) => {
      expect(request.body).to.deep.eq({ status: 'BLOCKED' });
    });
    cy.get('.form-feedback[role="status"]')
      .should('contain', 'Situação da conta atualizada no servidor.');
    cy.contains('tr', 'Mariana Costa')
      .find('select[data-action="user-status"]')
      .should('have.value', 'BLOCKED');
  });

  it('CT-04.5 cria usuário com máscara de telefone e payload correto', () => {
    cy.openMenuPage('Permissões e RBAC');
    const form = 'form[data-form="rbac-user"]';
    cy.get(`${form} input[name="name"]`).type('Ana Souza');
    cy.get(`${form} input[name="email"]`).type('ana.souza@agroclima.com');
    cy.get(`${form} input[name="password"]`).type('SenhaSegura123');
    cy.get(`${form} input[name="phone"]`).type('81999998888');
    cy.get(`${form} input[name="phone"]`).should('have.value', '(81) 99999-8888');
    cy.get(`${form} select[name="role"]`).select('ANALYST');
    cy.get(`${form} button[type="submit"]`).click();

    cy.wait('@createUser').then(({ request }) => {
      expect(request.body).to.deep.include({
        fullName: 'Ana Souza',
        email: 'ana.souza@agroclima.com',
        phone: '5581999998888',
        roleKey: 'ANALYST',
      });
      expect(request.body.password).to.eq('SenhaSegura123');
    });
    cy.get('.form-feedback[role="status"]')
      .should('contain', 'Conta de Ana Souza criada no servidor.');
  });

  it('CT-04.6 valida telefone inválido e salva edição com telefone válido', () => {
    cy.openMenuPage('Permissões e RBAC');
    cy.contains('tr', 'Mariana Costa').find('[data-action="edit-user"]').click();
    const form = 'form[data-form="edit-user"]';
    cy.get(form).should('be.visible');
    cy.get(`${form} input[name="phone"]`).clear().type('123');
    cy.get(`${form} button[type="submit"]`).click();
    cy.get('.form-feedback.error')
      .should('be.visible')
      .and('contain', 'Telefone incompleto');
    cy.get('@updateUser.all').should('have.length', 0);

    cy.get(`${form} input[name="phone"]`).clear().type('81999998888');
    cy.get(`${form} input[name="phone"]`).should('have.value', '(81) 99999-8888');
    cy.get(`${form} button[type="submit"]`).click();
    cy.wait('@updateUser').then(({ request }) => {
      expect(request.body).to.deep.include({ fullName: 'Mariana Costa', phone: '5581999998888' });
    });
    cy.get('.form-feedback[role="status"]')
      .should('contain', 'Dados do usuário atualizados no servidor.');
  });

  it('CT-04.7 Logs filtram, detalham e ordenam eventos de auditoria', () => {
    cy.openMenuPage('Logs do Sistema');
    cy.expectPageTitle('Logs do Sistema');
    cy.get('@auditEvents.all').should('have.length.at.least', 1);
    cy.contains('.metric', 'Eventos registrados').should('contain', '6');
    cy.get('.table-scroll tbody tr').should('have.length', 6);

    cy.get('form[data-form="filter-logs"] input[name="search"]').type('Mariana');
    cy.get('form[data-form="filter-logs"] button[type="submit"]').click();
    cy.get('.table-scroll tbody tr').should('have.length', 2);
    cy.get('.table-scroll tbody').should('not.contain', 'Carlos Almeida');

    cy.contains('tr', 'Mariana Costa').first()
      .find('[data-action="toggle-log-details"]')
      .click();
    cy.get('.log-detail-row').should('be.visible').and('contain', 'Detalhes do evento');
    cy.contains('button', 'Fechar').should('be.visible');

    cy.get('[data-action="clear-log-filters"]').click();
    cy.get('.table-scroll tbody tr').should('have.length', 6);
    cy.get('[data-action="sort-logs"]').should('contain', 'Mais recentes primeiro').click();
    cy.get('[data-action="sort-logs"]').should('contain', 'Mais antigos primeiro');
    cy.get('.table-scroll tbody tr').first().should('contain', 'Rafael Nunes');
  });

  it('CT-04.8 Integrações exibem estado do ThingSpeak e da API Python', () => {
    cy.openMenuPage('Integrações');
    cy.wait('@integrationStatus').its('response.statusCode').should('eq', 200);
    cy.wait('@pythonHealth').its('response.body.status').should('eq', 'UP');
    cy.expectPageTitle('Integrações');
    cy.contains('.integration-card', 'ThingSpeak').should('contain', 'Configurado');
    cy.contains('.integration-card', 'ThingSpeak').should('contain', 'Canal 3141592');
    cy.contains('.integration-card', 'API Python').should('contain', 'UP');
    cy.contains('Arquitetura integrada').should('be.visible');
  });

  it('CT-04.9 Configurações salvam o nome do sistema via PATCH', () => {
    cy.openMenuPage('Configurações');
    cy.expectPageTitle('Configurações');
    cy.get('input[name="systemName"]').should('have.value', 'AgroClima Cloud');
    cy.get('input[name="systemName"]').clear().type('AgroClima Vale');
    cy.get('form[data-form="settings"] button[type="submit"]').click();
    cy.wait('@saveSettings').then(({ request }) => {
      expect(request.body.general.systemName).to.eq('AgroClima Vale');
      expect(request.body).to.have.property('general');
    });
    cy.get('.form-feedback[role="status"]')
      .should('contain', 'Configurações salvas no servidor.');
    cy.get('.sidebar .logo').should('contain', 'AgroClima').and('contain', 'Vale');
  });

  it('CT-04.10 Design System aplica token em tempo real e persiste', () => {
    cy.openMenuPage('Design System');
    cy.expectPageTitle('Design System');
    cy.get('input[data-design="light.primary"]').invoke('val', '#123456').trigger('change');
    cy.get('code[data-design-value="light.primary"]').should('have.text', '#123456');
    cy.document().then((doc) => {
      expect(doc.documentElement.style.getPropertyValue('--green')).to.eq('#123456');
    });

    cy.get('form[data-form="design-system"] button[type="submit"]').click();
    cy.wait('@saveSettings').then(({ request }) => {
      expect(request.body.design.light.primary).to.eq('#123456');
      expect(request.body.appearance.theme).to.eq('light');
    });
    cy.get('.form-feedback[role="status"]').should('contain', 'Design salvo no servidor.');

    cy.get('[data-action="design-reset"]').click();
    cy.wait('@saveSettings').then(({ request }) => {
      expect(request.body.design.light.primary).to.eq('#167c55');
    });
    cy.get('.form-feedback[role="status"]')
      .should('contain', 'Design restaurado para o padrão original');
  });

  it('CT-04.11 Segurança salva políticas permitidas pela API', () => {
    cy.openMenuPage('Segurança');
    cy.expectPageTitle('Segurança');
    cy.contains('.metric', 'Política de senha forte').should('contain', 'Ativa');
    cy.contains('.metric', 'Duração do token').should('contain', '30 min');
    cy.get('input[name="requireMfa"]').should('be.disabled');
    cy.get('input[name="notifyNewLogin"]').should('be.disabled');
    cy.contains('1 tentativa(s) de acesso negada(s)').should('be.visible');

    cy.get('form[data-form="settings"] button[type="submit"]').click();
    cy.wait('@saveSettings').then(({ request }) => {
      expect(request.body.security).to.deep.include({
        strongPasswords: true,
        lockAfterFailures: true,
        sessionTimeout: '30',
      });
      expect(request.body.security).to.not.have.property('requireMfa');
      expect(request.body.security).to.not.have.property('notifyNewLogin');
    });
  });
});
