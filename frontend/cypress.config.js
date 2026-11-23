import { defineConfig } from 'cypress';

/**
 * Configuração E2E do AgroClima Cloud.
 *
 * Execução local:
 *   1. npm run dev          (frontend em http://localhost:5173)
 *   2. npm run test:e2e     (headless)
 *   3. npm run test:e2e:open (modo interativo)
 *
 * As APIs são simuladas com cy.intercept (fixtures em cypress/fixtures/api.json),
 * portanto Java/Python/MySQL não precisam estar em execução.
 */
export default defineConfig({
  e2e: {
    baseUrl: process.env.CYPRESS_BASE_URL || 'http://localhost:5173',
    specPattern: 'cypress/e2e/**/*.cy.js',
    supportFile: 'cypress/support/e2e.js',
    fixturesFolder: 'cypress/fixtures',
    screenshotsFolder: 'cypress/screenshots',
    videosFolder: 'cypress/videos',
    downloadsFolder: 'cypress/downloads',
    viewportWidth: 1440,
    viewportHeight: 900,
    defaultCommandTimeout: 8000,
    requestTimeout: 10000,
    responseTimeout: 10000,
    video: false,
    screenshotOnRunFailure: true,
    retries: {
      runMode: 1,
      openMode: 0,
    },
    env: {
      apiMode: 'mock',
    },
  },
});
