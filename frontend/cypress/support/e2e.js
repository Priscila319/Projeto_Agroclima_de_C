import './commands.js';

/**
 * A aplicação não usa frameworks de UI, mas navegadores podem emitir
 * "ResizeObserver loop completed with undelivered notifications" durante
 * mudanças de layout. Esse aviso não representa falha funcional.
 */
Cypress.on('uncaught:exception', (error) => {
  if (/ResizeObserver loop/i.test(error.message)) return false;
  return undefined;
});

// Falhas de rede propositais são testadas (500/401); não as escondemos.
