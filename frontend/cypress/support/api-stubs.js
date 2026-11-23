/**
 * Stubs das APIs Java e Python usados pelos testes E2E.
 *
 * Os testes de interface não dependem de MySQL, Maven ou do serviço FastAPI:
 * as respostas seguem os mesmos contratos entregues por
 * backend-java (DTOs) e backend-python (modelos Pydantic em camelCase).
 * Assim a suíte é determinística e pode rodar em CI sem infraestrutura.
 *
 * Regra de precedência do Cypress: o ÚLTIMO intercept registrado vence.
 * Por isso as substituições (`overrides`) são registradas no final.
 */

const ROLE_LABELS = {
  PRODUCER: 'Produtor/Exportador',
  ANALYST: 'Analista de Dados',
  ADMIN: 'Administrador',
};

function clone(value) {
  return value === undefined ? value : JSON.parse(JSON.stringify(value));
}

function mergeSettings(base, patch) {
  const result = clone(base);
  Object.entries(patch || {}).forEach(([section, values]) => {
    if (values && typeof values === 'object' && !Array.isArray(values)) {
      result[section] = { ...(result[section] || {}), ...values };
    } else {
      result[section] = values;
    }
  });
  return result;
}

function idFromUrl(url, segment) {
  const match = String(url).match(new RegExp(`/${segment}/([^/?]+)`));
  return match ? decodeURIComponent(match[1]) : '';
}

function rolePermissions(data, roleKey) {
  return data.roles.find((role) => role.key === roleKey)?.permissionKeys || [];
}

export function installApiStubs(data, role = 'PRODUCER', options = {}) {
  const roleKey = String(role).toUpperCase();
  const account = data.users[roleKey.toLowerCase()] || data.users.producer;
  const token = `token-${account.roleKey.toLowerCase()}`;
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

  /* ------------------------------ Autenticação ------------------------------ */

  cy.intercept('POST', '**/api/java/api/auth/login', (request) => {
    if (options.loginStatus) {
      request.reply({
        statusCode: options.loginStatus,
        body: { message: options.loginMessage || 'Credenciais inválidas.' },
      });
      return;
    }
    const email = String(request.body?.email || '').trim().toLowerCase();
    const password = String(request.body?.password || '');
    const found = data.usersList.find((user) => user.email.toLowerCase() === email);
    if (!found || password !== data.credentials.password || found.status !== 'Ativo') {
      request.reply({ statusCode: 401, body: { message: 'Credenciais inválidas.' } });
      return;
    }
    request.reply({
      statusCode: 200,
      body: {
        accessToken: `token-${found.roleKey.toLowerCase()}`,
        tokenType: 'Bearer',
        expiresAt,
        user: found,
      },
    });
  }).as('apiLogin');

  cy.intercept('GET', '**/api/java/api/auth/me', (request) => {
    const authorization = request.headers.authorization || '';
    const match = String(authorization).match(/^Bearer token-(producer|analyst|admin)$/i);
    if (!match) {
      request.reply({ statusCode: 401, body: { message: 'Sessão expirada ou inválida.' } });
      return;
    }
    request.reply({ statusCode: 200, body: data.users[match[1].toLowerCase()] });
  }).as('apiMe');

  /* --------------------------- Catálogo e configurações --------------------------- */

  cy.intercept('GET', '**/api/java/api/varieties', { statusCode: 200, body: data.varieties }).as('varieties');
  cy.intercept('GET', '**/api/java/api/settings/public', { statusCode: 200, body: data.publicSettings }).as('publicSettings');
  cy.intercept('GET', '**/api/java/api/settings', { statusCode: 200, body: data.settings }).as('settings');

  cy.intercept('PATCH', '**/api/java/api/settings', (request) => {
    data.settings = mergeSettings(data.settings, request.body);
    request.reply({ statusCode: 200, body: data.settings });
  }).as('saveSettings');

  /* -------------------------------- Plantações -------------------------------- */

  cy.intercept('GET', '**/api/java/api/plantations/history', { statusCode: 200, body: data.plantations }).as('plantationHistory');
  cy.intercept('GET', '**/api/java/api/plantations', { statusCode: 200, body: data.plantations }).as('plantations');

  cy.intercept('POST', '**/api/java/api/plantations', (request) => {
    const created = {
      id: `dddddddd-dddd-4ddd-8ddd-${String(Date.now()).slice(-12).padStart(12, '0')}`,
      ownerId: account.id,
      ownerName: account.name,
      variety: request.body?.variety,
      quantity: Number(request.body?.quantity),
      field: request.body?.field || '',
      notes: request.body?.notes || '',
      status: 'Em cultivo',
      plantedAt: new Date().toISOString(),
      harvestedAt: null,
      createdAt: new Date().toISOString(),
      archivedAt: null,
    };
    request.reply({ statusCode: 201, body: created });
  }).as('createPlantation');

  cy.intercept('POST', '**/api/java/api/plantations/*/harvest', (request) => {
    const id = idFromUrl(request.url, 'plantations');
    const base = data.plantations.find((item) => item.id === id) || data.plantations[0];
    request.reply({
      statusCode: 200,
      body: {
        ...base,
        id: id || base.id,
        status: 'Colhida',
        harvestedAt: new Date().toISOString(),
      },
    });
  }).as('harvestPlantation');

  /* ---------------------------------- Usuários ---------------------------------- */

  cy.intercept('GET', '**/api/java/api/users', { statusCode: 200, body: data.usersList }).as('users');

  cy.intercept('POST', '**/api/java/api/users', (request) => {
    const created = {
      id: `eeeeeeee-eeee-4eee-8eee-${String(Date.now()).slice(-12).padStart(12, '0')}`,
      name: request.body?.fullName,
      email: request.body?.email,
      phone: request.body?.phone || '',
      organization: request.body?.organization || '',
      jobTitle: request.body?.jobTitle || '',
      roleKey: request.body?.roleKey,
      role: ROLE_LABELS[request.body?.roleKey] || request.body?.roleKey,
      status: 'Ativo',
      createdAt: new Date().toISOString(),
      lastLoginAt: null,
      permissionKeys: rolePermissions(data, request.body?.roleKey),
    };
    request.reply({ statusCode: 201, body: created });
  }).as('createUser');

  cy.intercept('PATCH', '**/api/java/api/users/*', (request) => {
    const id = idFromUrl(request.url, 'users');
    const base = data.usersList.find((user) => user.id === id) || data.usersList[0];
    request.reply({
      statusCode: 200,
      body: {
        ...base,
        name: request.body?.fullName || base.name,
        phone: request.body?.phone ?? base.phone,
        organization: request.body?.organization ?? base.organization,
        jobTitle: request.body?.jobTitle ?? base.jobTitle,
      },
    });
  }).as('updateUser');

  cy.intercept('PATCH', '**/api/java/api/users/*/role', (request) => {
    const id = idFromUrl(request.url, 'users');
    const base = data.usersList.find((user) => user.id === id) || data.usersList[0];
    request.reply({
      statusCode: 200,
      body: {
        ...base,
        roleKey: request.body?.roleKey,
        role: ROLE_LABELS[request.body?.roleKey] || request.body?.roleKey,
        permissionKeys: rolePermissions(data, request.body?.roleKey),
      },
    });
  }).as('changeUserRole');

  cy.intercept('PATCH', '**/api/java/api/users/*/status', (request) => {
    const id = idFromUrl(request.url, 'users');
    const base = data.usersList.find((user) => user.id === id) || data.usersList[0];
    request.reply({
      statusCode: 200,
      body: { ...base, status: request.body?.status === 'ACTIVE' ? 'Ativo' : 'Bloqueado' },
    });
  }).as('changeUserStatus');

  /* ----------------------------------- RBAC ----------------------------------- */

  cy.intercept('GET', '**/api/java/api/roles', { statusCode: 200, body: data.roles }).as('roles');
  cy.intercept('GET', '**/api/java/api/permissions', { statusCode: 200, body: data.permissions }).as('permissions');

  cy.intercept('PATCH', '**/api/java/api/roles/*/permissions', (request) => {
    const key = idFromUrl(request.url, 'roles').toUpperCase();
    const base = data.roles.find((role) => role.key === key) || data.roles[0];
    request.reply({
      statusCode: 200,
      body: { ...base, permissionKeys: request.body?.permissionKeys || [] },
    });
  }).as('rolePermissions');

  /* ---------------------------------- Auditoria ---------------------------------- */

  cy.intercept('GET', '**/api/java/api/audit-events', { statusCode: 200, body: data.auditEvents }).as('auditEvents');

  cy.intercept('POST', '**/api/java/api/audit-events', (request) => {
    request.reply({
      statusCode: 201,
      body: {
        id: `ffffffff-ffff-4fff-8fff-${String(Date.now()).slice(-12).padStart(12, '0')}`,
        user: account.name,
        email: account.email,
        action: request.body?.action,
        resource: request.body?.resource,
        occurredAt: new Date().toISOString(),
        source: 'API Java',
        status: 'Concluído',
        details: request.body?.details || '',
      },
    });
  }).as('createAuditEvent');

  /* ---------------------------------- API Python ---------------------------------- */

  cy.intercept('GET', '**/api/python/api/v1/dashboard/summary', { statusCode: 200, body: data.dashboardSummary }).as('dashboardSummary');
  cy.intercept('GET', '**/api/python/api/v1/dashboard/analyst', { statusCode: 200, body: data.analystDashboard }).as('analystDashboard');
  cy.intercept('GET', '**/api/python/api/v1/climate/current', { statusCode: 200, body: data.climate }).as('climate');
  cy.intercept('GET', '**/api/python/api/v1/dashboard/forecast', { statusCode: 200, body: data.forecast }).as('forecast');
  cy.intercept('GET', '**/api/python/api/v1/dashboard/market', { statusCode: 200, body: data.market }).as('market');
  cy.intercept('GET', '**/api/python/api/v1/dashboard/comparison', { statusCode: 200, body: data.comparison }).as('comparison');
  cy.intercept('GET', '**/api/python/api/v1/dashboard/quality', { statusCode: 200, body: data.quality }).as('quality');
  cy.intercept('GET', '**/api/python/api/v1/models/forecast', { statusCode: 200, body: data.modelsForecast }).as('modelsForecast');
  cy.intercept('GET', '**/api/python/api/v1/models/status', { statusCode: 200, body: data.modelStatus }).as('modelStatus');
  cy.intercept('GET', '**/api/python/api/v1/agronomy/plantations', { statusCode: 200, body: data.agronomy }).as('agronomy');
  cy.intercept('GET', '**/api/python/api/v1/integrations/thingspeak/status', { statusCode: 200, body: data.integrationStatus }).as('integrationStatus');
  cy.intercept('GET', '**/api/python/health', { statusCode: 200, body: data.health }).as('pythonHealth');

  cy.intercept('POST', '**/api/python/api/v1/models/train', (request) => {
    request.reply({
      statusCode: 200,
      body: {
        model: { ...data.modelStatus.activeModel, algorithm: request.body?.algorithm === 'auto' ? 'random_forest' : request.body?.algorithm },
        message: 'Modelo treinado e ativado.',
      },
    });
  }).as('trainModel');

  cy.intercept('DELETE', '**/api/python/api/v1/models/active', {
    statusCode: 200,
    body: { ...data.modelStatus, activeModel: null, mlEnabled: false, message: 'Nenhum modelo ativo.' },
  }).as('deleteModel');

  /* ------------------------------- Substituições ------------------------------- */

  (options.overrides || []).forEach((override) => {
    const handler = override.handler
      ?? {
        statusCode: override.statusCode || 200,
        body: override.body ?? {},
      };
    const intercepted = cy.intercept(override.method || 'GET', override.url, handler);
    if (override.alias) intercepted.as(override.alias);
  });
}

export default installApiStubs;
