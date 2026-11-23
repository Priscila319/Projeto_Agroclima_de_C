/**
 * Suíte 02 — Funcionalidades principais do Produtor/Exportador
 * Plano de Testes, seção 2.1 (Fluxos principais de negócio).
 *
 * Cobre: visão geral, monitoramento climático, cadastro/colheita de
 * plantações, previsões, mercado, comparação, alertas, histórico e relatório CSV.
 */

describe('CT-02 · Produtor/Exportador', () => {
  beforeEach(() => {
    cy.loginAs('PRODUCER');
  });

  it('CT-02.1 Visão Geral exibe indicadores reais da API', () => {
    cy.expectPageTitle('Visão Geral');
    cy.get('@dashboardSummary.all').should('have.length.at.least', 1);
    cy.contains('.metric', 'Temperatura').should('contain', '27,4 °C');
    cy.contains('.metric', 'Umidade do ar').should('contain', '64 %');
    cy.contains('.metric', 'Plantações em cultivo').should('contain', '2');
    cy.contains('.metric', 'Leituras climáticas').should('contain', '3');
    cy.contains('.sync-strip', '3 leituras persistidas').should('be.visible');
    cy.contains('.sync-strip', 'ThingSpeak').should('be.visible');
    cy.contains('.card-title h3', 'Temperatura nas últimas 24 horas').should('be.visible');
    cy.contains('.card-title h3', 'Umidade do ar').should('be.visible');
    cy.contains('Comparativo de plantações').should('be.visible');
    cy.contains('td', 'Uva Itália').should('be.visible');
  });

  it('CT-02.2 Monitoramento lista leituras, canal e última captura', () => {
    cy.openMenuPage('Monitoramento');
    cy.wait('@climate').its('response.statusCode').should('eq', 200);
    cy.expectPageTitle('Monitoramento Climático');
    cy.contains('.integration-status', 'ThingSpeak').should('be.visible');
    cy.contains('.integration-status', '3141592').should('be.visible');
    cy.contains('.metric', 'Temperatura atual').should('contain', '27,4 °C');
    cy.contains('.metric', 'Umidade atual').should('contain', '64 %');
    cy.contains('.metric', 'Amostras').should('contain', '3');
    cy.get('.table-scroll tbody tr').should('have.length', 3);
    cy.contains('th', 'Temperatura (°C)').should('be.visible');
    cy.contains('th', 'Qualidade').should('be.visible');
  });

  it('CT-02.3 cadastra plantação e atualiza tabela e mensagem', () => {
    cy.openMenuPage('Minhas Plantações');
    cy.expectPageTitle('Minhas Plantações');
    cy.get('.table-scroll tbody tr').should('have.length', 3);

    cy.fixture('api').then((data) => {
      const list = [...data.plantations];
      cy.intercept('POST', '**/api/java/api/plantations', (request) => {
        const created = {
          id: 'bbbbbbbb-bbbb-4bbb-8bbb-000000000099',
          ownerId: data.users.producer.id,
          ownerName: data.users.producer.name,
          variety: request.body.variety,
          quantity: request.body.quantity,
          field: request.body.field,
          notes: request.body.notes,
          status: 'Em cultivo',
          plantedAt: '2026-11-23T12:00:00Z',
          harvestedAt: null,
          createdAt: '2026-11-23T12:00:00Z',
          archivedAt: null,
        };
        list.unshift(created);
        request.reply({ statusCode: 201, body: created });
      }).as('createPlantation');
      cy.intercept('GET', '**/api/java/api/plantations', { statusCode: 200, body: list }).as('plantationsAfterCreate');
    });

    cy.get('form[data-form="create-plantation"] select[name="variety"]').select('Sweet Globe');
    cy.get('form[data-form="create-plantation"] input[name="quantity"]').type('900');
    cy.get('form[data-form="create-plantation"] input[name="field"]').type('Talhão Novo');
    cy.get('form[data-form="create-plantation"] textarea[name="notes"]').type('Plantio de teste E2E');
    cy.get('form[data-form="create-plantation"] button[type="submit"]').click();

    cy.wait('@createPlantation').then(({ request }) => {
      expect(request.body).to.deep.include({
        variety: 'Sweet Globe',
        quantity: 900,
        field: 'Talhão Novo',
        notes: 'Plantio de teste E2E',
      });
    });
    cy.get('.form-feedback[role="status"]')
      .should('contain', 'Plantação de Sweet Globe cadastrada');
    cy.get('.table-scroll tbody tr').should('have.length', 4);
    cy.contains('td', 'Sweet Globe').should('be.visible');
    cy.contains('.metric', 'Plantas registradas').should('contain', '3.550');
  });

  it('CT-02.4 marca plantação como colhida e preserva a data', () => {
    cy.openMenuPage('Minhas Plantações');

    cy.fixture('api').then((data) => {
      const updated = data.plantations.map((item) => (
        item.variety === 'Uva Itália'
          ? { ...item, status: 'Colhida', harvestedAt: '2026-11-23T12:30:00Z' }
          : item
      ));
      cy.intercept('POST', '**/api/java/api/plantations/*/harvest', {
        statusCode: 200,
        body: updated[0],
      }).as('harvestRequest');
      cy.intercept('GET', '**/api/java/api/plantations', { statusCode: 200, body: updated }).as('plantationsAfterHarvest');
    });

    cy.contains('tr', 'Uva Itália').find('[data-action="harvest-plantation"]').click();
    cy.wait('@harvestRequest').its('request.body').should('deep.eq', {});
    cy.get('.form-feedback[role="status"]')
      .should('contain', 'Colheita de Uva Itália registrada pelo servidor.');
    cy.contains('tr', 'Uva Itália').should('contain', 'Colhida');
    cy.contains('tr', 'Uva Itália').find('[data-action="harvest-plantation"]').should('not.exist');
    cy.contains('.metric', 'Já colhidas').should('contain', '2');
  });

  it('CT-02.5 Previsões mostra somente o que o modelo retornou', () => {
    cy.openMenuPage('Previsões');
    cy.wait('@forecast').its('response.statusCode').should('eq', 200);
    cy.expectPageTitle('Previsões');
    cy.contains('.metric', 'Horizonte').should('contain', '2 pontos');
    cy.contains('Modelo conectado').should('be.visible');
    cy.contains('Regressão linear (estatístico)').should('be.visible');
    cy.contains('li', '2026-11-24 · 28.2').should('be.visible');
    cy.contains('Previsões disponíveis').should('be.visible');
  });

  it('CT-02.6 Mercado sem fonte real exibe indisponibilidade explícita', () => {
    cy.openMenuPage('Mercado e Exportação');
    cy.wait('@market').its('response.statusCode').should('eq', 200);
    cy.expectPageTitle('Mercado e Exportação');
    cy.contains('Dados de mercado indisponíveis').should('be.visible');
    cy.contains('Nenhuma fonte de mercado está configurada').should('be.visible');
    cy.contains('.metric', 'Fonte de preço').should('contain', 'Não configurada');
    cy.get('.table-scroll').should('not.exist');
  });

  it('CT-02.7 Comparação e Alertas renderizam o estado da API', () => {
    cy.openMenuPage('Comparação');
    cy.wait('@comparison').its('response.statusCode').should('eq', 200);
    cy.expectPageTitle('Análise Comparativa');
    cy.contains('.ranking', '1º').should('be.visible');
    cy.contains('.ranking', '1.200 plantas').should('be.visible');
    cy.contains('Plantas registradas por variedade').should('be.visible');

    cy.openMenuPage('Alertas');
    cy.expectPageTitle('Central de Alertas');
    cy.contains('Nenhum alerta fornecido pelos serviços').should('be.visible');
  });

  it('CT-02.8 Histórico mostra plantios e colheitas persistidos', () => {
    cy.openMenuPage('Histórico');
    cy.wait('@plantationHistory').its('response.statusCode').should('eq', 200);
    cy.expectPageTitle('Histórico');
    cy.contains('Plantio de Uva Itália cadastrado').should('be.visible');
    cy.contains('Colheita de Thompson Seedless registrada').should('be.visible');
    cy.get('.plantation-timeline article').should('have.length', 4);
  });

  it('CT-02.9 Relatório do produtor dispara download e auditoria', () => {
    cy.openMenuPage('Relatórios');
    cy.expectPageTitle('Relatórios');
    cy.contains('.metric', 'Plantações').should('contain', '3');
    cy.contains('.metric', 'Já colhidas').should('contain', '1');
    cy.get('.table-scroll tbody tr').should('have.length', 5);
    cy.stubDownload();
    cy.get('[data-action="download-producer-report"]').click();
    cy.get('@downloadClick').should('have.been.calledOnce');
    cy.wait('@createAuditEvent').then(({ request }) => {
      expect(request.body.action).to.eq('Baixou relatório de plantações');
      expect(request.body.resource).to.eq('Relatórios');
    });
  });

  it('CT-02.10 seletor de variedade mantém o valor escolhido', () => {
    cy.get('select[data-action="change-variety"]').should('have.value', 'Uva Itália');
    cy.get('select[data-action="change-variety"]').select('Crimson Seedless');
    cy.get('select[data-action="change-variety"]').should('have.value', 'Crimson Seedless');
    cy.expectPageTitle('Visão Geral');
  });
});
