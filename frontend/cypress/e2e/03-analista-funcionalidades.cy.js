/**
 * Suíte 03 — Funcionalidades do Analista de Dados
 * Plano de Testes, seção 2.1 (Fluxos principais e integração de APIs).
 *
 * Cobre: dashboard analítico, dados climáticos, qualidade,
 * modelos preditivos (treino/remoção), histórico e relatório CSV.
 */

describe('CT-03 · Analista de Dados', () => {
  beforeEach(() => {
    cy.loginAs('ANALYST');
  });

  it('CT-03.1 Dashboard Analítico consolida clima, qualidade e plantações', () => {
    cy.expectPageTitle('Dashboard Analítico');
    cy.get('@analystDashboard.all').should('have.length.at.least', 1);
    cy.contains('.metric', 'Registros climáticos').should('contain', '3');
    cy.contains('.metric', 'Completude').should('contain', '93,3%');
    cy.contains('.metric', 'Plantações').should('contain', '3');
    cy.contains('.metric', 'Plantações').should('contain', '2.650 plantas registradas');
    cy.contains('Estado das fontes de dados').should('be.visible');
    cy.contains('API Java e persistência').should('be.visible');
    cy.contains('Qualidade dos dados').should('be.visible');
  });

  it('CT-03.2 Dados Climáticos usam o endpoint do serviço Python', () => {
    cy.openMenuPage('Dados Climáticos');
    cy.wait('@climate').then(({ request }) => {
      expect(request.url).to.include('/api/python/api/v1/climate/current');
    });
    cy.expectPageTitle('Monitoramento Climático');
    cy.contains('.metric', 'Amostras').should('contain', '3');
    cy.get('.table-scroll tbody tr').should('have.length', 3);
  });

  it('CT-03.3 Qualidade dos Dados exibe contagens e completude', () => {
    cy.openMenuPage('Qualidade dos Dados');
    cy.wait('@quality').its('response.statusCode').should('eq', 200);
    cy.wait('@climate');
    cy.expectPageTitle('Qualidade dos Dados');
    cy.contains('.metric', 'Completude').should('contain', '93,3%');
    cy.contains('.metric', 'Válidos').should('contain', '112');
    cy.contains('.metric', 'Para revisar').should('contain', '6');
    cy.contains('.metric', 'Rejeitados').should('contain', '2');
    cy.contains('Qualidade das leituras').should('be.visible');
    cy.get('.table-scroll tbody tr').should('have.length', 3);
  });

  it('CT-03.4 Modelos Preditivos exibem modelo ativo, projeção e agronomia', () => {
    cy.openMenuPage('Modelos Preditivos');
    cy.wait('@modelsForecast').its('response.statusCode').should('eq', 200);
    cy.wait('@modelStatus');
    cy.wait('@agronomy');
    cy.expectPageTitle('Modelos Preditivos');
    cy.contains('Random Forest').should('be.visible');
    cy.contains('.metric', 'Dias completos').should('contain', '120');
    cy.contains('.metric', 'Modelo ativo').should('contain', 'Random Forest');
    cy.contains('.metric', 'MAE temperatura').should('contain', '0,84 °C');
    cy.contains('Temperatura projetada').should('be.visible');
    cy.get('.table-scroll tbody tr').should('have.length.at.least', 3);
    cy.contains('td', '24/11/2026').should('be.visible');
    cy.contains('Indicadores agronômicos').should('be.visible');
    cy.contains('.agronomy-card', 'Uva Itália').should('contain', '74,7%');
    cy.contains('.agronomy-card', 'Uva Itália').should('contain', 'Moderado');
    cy.contains('.agronomy-card', 'ET0').should('contain', '5,1');
  });

  it('CT-03.5 treina modelo com algoritmo e horizonte selecionados', () => {
    cy.openMenuPage('Modelos Preditivos');
    cy.get('select[data-action="model-algorithm"]').select('gradient_boosting');
    cy.get('select[data-action="model-horizon"]').select('5');
    cy.get('[data-action="train-model"]').should('not.be.disabled').click();
    cy.wait('@trainModel').then(({ request }) => {
      expect(request.body).to.deep.eq({ algorithm: 'gradient_boosting', horizonDays: 5 });
    });
    cy.get('.form-feedback.success')
      .should('be.visible')
      .and('contain', 'Modelo treinado e ativado.');
  });

  it('CT-03.6 remove o modelo ativo após confirmação do serviço', () => {
    cy.openMenuPage('Modelos Preditivos');
    cy.get('[data-action="delete-model"]').should('be.visible').click();
    cy.wait('@deleteModel').its('response.statusCode').should('eq', 200);
    cy.get('.form-feedback.success')
      .should('be.visible')
      .and('contain', 'Modelo removido');
  });

  it('CT-03.7 Histórico do analista reúne plantios e colheitas', () => {
    cy.openMenuPage('Histórico');
    cy.wait('@plantationHistory').its('response.statusCode').should('eq', 200);
    cy.expectPageTitle('Histórico');
    cy.get('.event-timeline-item').should('have.length', 4);
    cy.contains('Plantio de Crimson Seedless cadastrado').should('be.visible');
    cy.contains('Colheita de Thompson Seedless registrada').should('be.visible');
  });

  it('CT-03.8 relatório analítico gera CSV e registra auditoria', () => {
    cy.openMenuPage('Relatórios');
    cy.wait('@plantationHistory');
    cy.expectPageTitle('Relatórios');
    cy.contains('Somente dados reais retornados pelos serviços').should('be.visible');
    cy.contains('.metric', 'Leituras climáticas').should('contain', '3');
    cy.stubDownload();
    cy.get('[data-action="download-analyst-report"]').click();
    cy.get('@downloadClick').should('have.been.calledOnce');
    cy.wait('@createAuditEvent').then(({ request }) => {
      expect(request.body.action).to.eq('Gerou relatório CSV');
      expect(request.body.resource).to.eq('Relatórios');
    });
  });
});
