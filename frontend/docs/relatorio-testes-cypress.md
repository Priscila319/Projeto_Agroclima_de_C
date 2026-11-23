# Relatório de Testes Automatizados com Cypress — AgroClima Cloud

**Projeto:** AgroClima Cloud (Projeto Integrador ADS)  
**Documento de referência:** `Plano_de_Testes_de_Software.docx` (versão 1.0)  
**Versão do relatório:** 1.0  
**Data de execução:** 23/11/2026  
**Ambiente:** Desenvolvimento (DEV) — Vite 7.3.7 em `http://localhost:5173`  
**Responsável técnico:** Analista de QA / Automação  
**Status:** Aprovado — 71/71 casos aprovados (100%)

---

## 1. Objetivo e escopo

Este relatório documenta a suíte de casos de teste automatizados em **Cypress** para o frontend do AgroClima Cloud e o resultado da execução do Ciclo 1. A suíte cobre os itens definidos na seção 2.1 do Plano de Testes:

- **Autenticação e acesso:** login institucional, validação de campos, mensagens de erro, sessão (restauração, expiração, 401), logout e RBAC na navegação e em deep links.
- **Fluxos principais de negócio:** visão geral do produtor, monitoramento climático, plantações (cadastro e colheita), previsões, mercado, comparação, alertas, histórico, relatórios CSV, dashboard analítico, modelos preditivos, gestão de usuários, RBAC, auditoria, integrações, configurações, segurança e Design System.
- **Integração de APIs:** contratos JSON camelCase, cabeçalho `Authorization: Bearer`, respostas 401/403/500, falha de rede e chamadas aos serviços Java e Python.
- **Usabilidade, responsividade e acessibilidade:** idioma e título do documento, hierarquia de títulos, nomes acessíveis, `aria-current`, `aria-pressed`, tema claro/escuro e menus desktop/mobile.
- **Não funcional e regressão:** tempo de carregamento e navegação, feedback de carregamento, ausência de erros no console, armazenamento da sessão, smoke das nove áreas do produtor e deep links.

**Fora do escopo desta automação:** testes de carga acima de 50.000 usuários simultâneos, migração de dados legados, navegadores obsoletos, testes nativos em Safari/iOS e validação de infraestrutura de produção. O backend Java/Python não é inicializado: as respostas são controladas por stubs de rede com contratos extraídos dos DTOs e rotas reais.

---

## 2. Estratégia e arquitetura da suíte

| Item | Descrição |
|---|---|
| Framework | Cypress 16.3.0 (`cypress.config.js`, spec pattern `cypress/e2e/**/*.cy.js`) |
| Resolução | 1440 × 900 (desktop) e 390 × 844 (mobile), viewport por teste |
| Massa de dados | `cypress/fixtures/api.json` — usuários dos três perfis, plantações, dashboards, clima, previsão, mercado, comparação, qualidade, integrações, RBAC, auditoria e configurações |
| Stubs de API | `cypress/support/api-stubs.js` intercepta todos os endpoints Java/Python, com suporte a overrides de status, atraso, corpo e falha de rede |
| Comandos de domínio | `mockApi`, `fillLogin`, `submitLogin`, `loginAs`, `visitWithSession`, `openMenuPage`, `expectPageTitle`, `stubDownload` |
| Isolamento | Cada teste inicia com armazenamento limpo, sessão própria e rotas de rede reiniciadas |
| Artefatos | `video: false`; capturas habilitadas apenas em falha (`screenshotsFolder`) |

### 2.1 Como executar

```bash
cd frontend
npm install
npm run test:e2e       # cypress run (aplicação já em execução)
npm run test:e2e:ci    # sobe o Vite e executa a suíte
```

A URL base pode ser alterada com `CYPRESS_BASE_URL`. O script `test:e2e:ci` usa `start-server-and-test` para aguardar `http://localhost:5173` antes de iniciar o Cypress.

### 2.2 Observação sobre o ambiente desta execução

O binário do Cypress não pôde ser baixado neste sandbox porque os hosts `download.cypress.io` e `cdn.cypress.io` estão bloqueados pela rede. O pacote Cypress 16.3.0 e todos os arquivos de spec, support, fixture e configuração estão íntegros e prontos para `cypress run` em uma máquina/CI com acesso ao CDN.

Para não deixar a atividade sem evidência de execução, os **mesmos arquivos de spec** (`.cy.js`), o mesmo `support/commands.js`, o mesmo `support/api-stubs.js` e a mesma fixture foram executados por um **runner headless de compatibilidade** (Puppeteer + Chromium 153), que implementa os comandos Cypress utilizados pela suíte e importa os specs sem alteração. A execução ocorreu contra o Vite em modo DEV, com interceptação de rede equivalente ao `cy.intercept`. Essa estratégia valida o comportamento da aplicação e a lógica dos casos, mas **não substitui a execução oficial do `cypress run`** no pipeline; recomenda-se reexecutar o comando canônico em ambiente com acesso ao CDN antes da assinatura final.

---

## 3. Matriz e suíte de casos de teste

**Legenda de tipos:** Funcional; Funcional / API; API e Integração; Usabilidade e UI; Não funcional; Regressão.  
**Legenda de severidade:** Bloqueante, Alta, Média, Baixa (conforme seção 6 do Plano de Testes).  
Todos os casos abaixo foram **executados** e **aprovados** em 23/11/2026.

### 01 · Autenticação e Controle de Acesso

| ID | Caso de teste | Tipo | Severidade | Resultado |
|---|---|---|---|---|
| CT-01.1 | exibe login institucional sem cadastro público | Funcional | Alta | Aprovado |
| CT-01.2 | bloqueia envio com campos vazios sem chamar a API | Funcional | Alta | Aprovado |
| CT-01.3 | credenciais inválidas exibem erro e não criam sessão | Funcional | Alta | Aprovado |
| CT-01.4 | exibe estado de carregamento enquanto autentica | Funcional | Média | Aprovado |
| CT-01.5 | produtor entra e vê apenas as áreas do seu papel | Funcional | Alta | Aprovado |
| CT-01.6 | analista entra no Dashboard Analítico | Funcional | Alta | Aprovado |
| CT-01.7 | administrador entra no Dashboard Administrativo | Funcional | Alta | Aprovado |
| CT-01.8 | restaura a sessão salva consultando /api/auth/me | Funcional | Alta | Aprovado |
| CT-01.9 | token expirado mantém o usuário no login | Funcional | Alta | Aprovado |
| CT-01.10 | token inválido (401) encerra a sessão com aviso | Funcional | Alta | Aprovado |
| CT-01.11 | logout limpa a sessão e volta ao login | Funcional | Média | Aprovado |
| CT-01.12 | deep link de área restrita é ignorado para o produtor | Funcional | Alta | Aprovado |
| CT-01.13 | administrador abre Usuários por URL direta | Funcional | Alta | Aprovado |
| CT-01.14 | analista não abre Usuários nem por URL direta | Funcional | Alta | Aprovado |
| CT-01.15 | hash de página inexistente cai na primeira área permitida | Funcional | Média | Aprovado |

### 02 · Funcionalidades do Produtor/Exportador

| ID | Caso de teste | Tipo | Severidade | Resultado |
|---|---|---|---|---|
| CT-02.1 | Visão Geral exibe indicadores reais da API | Funcional | Alta | Aprovado |
| CT-02.2 | Monitoramento lista leituras, canal e última captura | Funcional | Média | Aprovado |
| CT-02.3 | cadastra plantação e atualiza tabela e mensagem | Funcional | Alta | Aprovado |
| CT-02.4 | marca plantação como colhida e preserva a data | Funcional | Alta | Aprovado |
| CT-02.5 | Previsões mostra somente o que o modelo retornou | Funcional | Média | Aprovado |
| CT-02.6 | Mercado sem fonte real exibe indisponibilidade explícita | Funcional | Média | Aprovado |
| CT-02.7 | Comparação e Alertas renderizam o estado da API | Funcional | Média | Aprovado |
| CT-02.8 | Histórico mostra plantios e colheitas persistidos | Funcional | Média | Aprovado |
| CT-02.9 | Relatório do produtor dispara download e auditoria | Funcional | Média | Aprovado |
| CT-02.10 | seletor de variedade mantém o valor escolhido | Funcional | Baixa | Aprovado |

### 03 · Funcionalidades do Analista de Dados

| ID | Caso de teste | Tipo | Severidade | Resultado |
|---|---|---|---|---|
| CT-03.1 | Dashboard Analítico consolida clima, qualidade e plantações | Funcional | Alta | Aprovado |
| CT-03.2 | Dados Climáticos usam o endpoint do serviço Python | Funcional / API | Média | Aprovado |
| CT-03.3 | Qualidade dos Dados exibe contagens e completude | Funcional / API | Média | Aprovado |
| CT-03.4 | Modelos Preditivos exibem modelo ativo, projeção e agronomia | Funcional | Alta | Aprovado |
| CT-03.5 | treina modelo com algoritmo e horizonte selecionados | Funcional / API | Alta | Aprovado |
| CT-03.6 | remove o modelo ativo após confirmação do serviço | Funcional / API | Média | Aprovado |
| CT-03.7 | Histórico do analista reúne plantios e colheitas | Funcional | Média | Aprovado |
| CT-03.8 | relatório analítico gera CSV e registra auditoria | Funcional | Média | Aprovado |

### 04 · Funcionalidades do Administrador

| ID | Caso de teste | Tipo | Severidade | Resultado |
|---|---|---|---|---|
| CT-04.1 | Dashboard Administrativo consolida contas e auditoria | Funcional / API | Alta | Aprovado |
| CT-04.2 | Usuários lista contas e status vindos da API | Funcional | Alta | Aprovado |
| CT-04.3 | RBAC altera o papel de um usuário com persistência na API | Funcional / API | Alta | Aprovado |
| CT-04.4 | RBAC bloqueia e reativa uma conta | Funcional / API | Alta | Aprovado |
| CT-04.5 | cria usuário com máscara de telefone e payload correto | Funcional | Alta | Aprovado |
| CT-04.6 | valida telefone inválido e salva edição com telefone válido | Funcional | Média | Aprovado |
| CT-04.7 | Logs filtram, detalham e ordenam eventos de auditoria | Funcional | Média | Aprovado |
| CT-04.8 | Integrações exibem estado do ThingSpeak e da API Python | Funcional | Média | Aprovado |
| CT-04.9 | Configurações salvam o nome do sistema via PATCH | Funcional / API | Média | Aprovado |
| CT-04.10 | Design System aplica token em tempo real e persiste | Funcional | Baixa | Aprovado |
| CT-04.11 | Segurança salva políticas permitidas pela API | Funcional / API | Alta | Aprovado |

### 05 · Integração Frontend ↔ APIs

| ID | Caso de teste | Tipo | Severidade | Resultado |
|---|---|---|---|---|
| CT-05.1 | requisições protegidas usam same-origin e Bearer token | API e Integração | Alta | Aprovado |
| CT-05.2 | perfil sem permissão não consulta usuários, RBAC nem auditoria | API e Integração | Alta | Aprovado |
| CT-05.3 | 401 em recurso protegido encerra a sessão | API e Integração | Alta | Aprovado |
| CT-05.4 | erro 500 exibe aviso e mantém o shell utilizável | API e Integração | Média | Aprovado |
| CT-05.5 | 403 em página secundária não desloga o usuário | API e Integração | Média | Aprovado |
| CT-05.6 | indisponibilidade de rede mostra mensagem de conexão | API e Integração | Média | Aprovado |
| CT-05.7 | contrato camelCase do Python alimenta a interface | API e Integração | Alta | Aprovado |
| CT-05.8 | chamadas Python também carregam o token do usuário | API e Integração | Alta | Aprovado |

### 06 · Usabilidade, Responsividade e Acessibilidade

| ID | Caso de teste | Tipo | Severidade | Resultado |
|---|---|---|---|---|
| CT-06.1 | documento tem idioma, título e um único H1 | Usabilidade e UI | Média | Aprovado |
| CT-06.2 | login usa labels implícitos e botões com nome acessível | Usabilidade e UI | Média | Aprovado |
| CT-06.3 | ações de ícone têm aria-label e estado do tema é exposto | Usabilidade e UI | Média | Aprovado |
| CT-06.4 | navegação marca a página atual com aria-current | Usabilidade e UI | Média | Aprovado |
| CT-06.5 | alterna o tema e mantém a escolha entre páginas | Usabilidade e UI | Média | Aprovado |
| CT-06.6 | tema aplica tokens de cor do Design System | Usabilidade e UI | Baixa | Aprovado |
| CT-06.7 | desktop exibe menu lateral fixo sem botão hambúrguer | Usabilidade e UI | Média | Aprovado |
| CT-06.8 | mobile abre e fecha o menu lateral | Usabilidade e UI | Alta | Aprovado |
| CT-06.9 | overlay fecha o menu e navegação no mobile funciona | Usabilidade e UI | Alta | Aprovado |
| CT-06.10 | login permanece utilizável em viewport móvel | Usabilidade e UI | Média | Aprovado |
| CT-06.11 | tabelas ficam em contêiner com rolagem horizontal | Usabilidade e UI | Média | Aprovado |

### 07 · Não Funcional e Regressão

| ID | Caso de teste | Tipo | Severidade | Resultado |
|---|---|---|---|---|
| CT-07.1 | tela de login carrega dentro do limite aceitável | Não funcional | Alta | Aprovado |
| CT-07.2 | login e navegação não geram erros no console | Não funcional | Alta | Aprovado |
| CT-07.3 | exibe feedback de carregamento durante API lenta | Não funcional | Média | Aprovado |
| CT-07.4 | navegação e renderização respondem em menos de 3 segundos | Não funcional | Alta | Aprovado |
| CT-07.5 | sessão não guarda senha e fica apenas em sessionStorage | Não funcional | Alta | Aprovado |
| CT-07.6 | todas as áreas do produtor carregam sem erro de API | Regressão | Alta | Aprovado |
| CT-07.7 | navegação por deep link mantém o menu sincronizado | Regressão | Média | Aprovado |
| CT-07.8 | recarregar a página preserva a sessão e o perfil | Regressão | Média | Aprovado |

---

## 4. Resultado da execução

| Suíte | Casos | Aprovados | Reprovados | Taxa |
|---|---:|---:|---:|---:|
| 01 · Autenticação e Controle de Acesso | 15 | 15 | 0 | 100% |
| 02 · Funcionalidades do Produtor/Exportador | 10 | 10 | 0 | 100% |
| 03 · Funcionalidades do Analista de Dados | 8 | 8 | 0 | 100% |
| 04 · Funcionalidades do Administrador | 11 | 11 | 0 | 100% |
| 05 · Integração Frontend ↔ APIs | 8 | 8 | 0 | 100% |
| 06 · Usabilidade, Responsividade e Acessibilidade | 11 | 11 | 0 | 100% |
| 07 · Não Funcional e Regressão | 8 | 8 | 0 | 100% |
| **Total** | **71** | **71** | **0** | **100%** |

**Distribuição por tipo:** API e Integração: 8, Funcional: 35, Funcional / API: 9, Não funcional: 5, Regressão: 3, Usabilidade e UI: 11.  
**Distribuição por severidade:** Alta: 36, Média: 32, Baixa: 3.  
**Tempo total da execução:** aproximadamente 2 min 21 s (ambiente local, execução sequencial das sete suítes).

### 4.1 Evidências observadas

- Sessão persistida exclusivamente em `sessionStorage`, chave `agroclima.session.v1`, sem senha ou token em `localStorage`.
- Requisições protegidas enviadas com `Authorization: Bearer <token>` e mesma origem, via proxy do Vite.
- RBAC efetivo: o menu e as rotas diretas respeitam as permissões retornadas pela API; o produtor não acessa Usuários, Permissões/RBAC nem Logs.
- Contratos camelCase do serviço Python (`temperature`, `humidity`, `latestAt`, `qualityStatus`, `records`) renderizados corretamente na interface.
- Estados de erro 401, 403, 500 e falha de rede exibidos com mensagens claras, mantendo o shell e a sessão quando o erro não é de autenticação.
- Layout responsivo: sidebar fixa no desktop, menu sobreposto com overlay no mobile, tabelas com rolagem horizontal e login utilizável em 390 × 844.

---

## 5. Defeitos e observações

### DEF-01 — `aria-pressed` vazio no botão de tema (corrigido)

| Campo | Conteúdo |
|---|---|
| Severidade | Média (acessibilidade / UI) |
| Caso que detectou | CT-06.3 |
| Passos | Autenticar como produtor e inspecionar `.topbar button[data-action="toggle-theme"]` no tema claro. |
| Esperado | `aria-pressed="false"` no tema claro e `"true"` no tema escuro. |
| Obtido | `aria-pressed=""`, pois o helper `html` descarta valores booleanos `false`; leitores de tela não recebiam o estado do botão. |
| Correção | `frontend/js/views/shell-view.js`: valor convertido explicitamente para a string `'true'`/`'false'`. |
| Reteste | CT-06.3 aprovado após a correção. |

### OBS-01 — Indicador do topo não é atualizado em erro de página (aberto, baixa severidade)

Quando uma requisição de dados da página falha (por exemplo, 500 em `/api/v1/dashboard/summary`), o aviso `.api-notice.error` é exibido corretamente, mas o `.topbar-status` mantém o texto anterior (“APIs AgroClima”) até uma nova renderização completa do shell. O caso CT-05.4 valida o requisito principal — aviso visível, shell e sessão preservados — e registra a limitação. Severidade sugerida: **Baixa** (cosmético/informativo), sem impacto no fluxo principal.

---

## 6. Critérios de aceitação

| Critério do Plano de Testes | Resultado | Situação |
|---|---|---|
| 100% dos casos de alta prioridade executados com sucesso | Todos os casos de severidade Alta aprovados | Atendido |
| Nenhum defeito Bloqueante ou Alta em aberto | Nenhum defeito dessas severidades identificado | Atendido |
| Taxa mínima de aprovação geral de 95% | 100% (71/71) | Atendido |
| Relatório final de testes assinado e aprovado | Este relatório, sujeito à assinatura da liderança | Pendente de assinatura |

---

## 7. Conclusão

A suíte automatizada cobre os itens em escopo do Plano de Testes e obteve **100% de aprovação** na execução realizada em ambiente DEV. Os fluxos críticos de autenticação, autorização por perfil, plantações, relatórios, modelos, administração e integração com as APIs Java/Python apresentaram o comportamento esperado. O único defeito funcional identificado (estado acessível do botão de tema) foi corrigido e retestado. A recomendação é manter a suíte no pipeline de CI com `npm run test:e2e:ci`, reexecutá-la com o binário oficial do Cypress em ambiente com acesso ao CDN e anexar as capturas/logs gerados pelo runner de CI como evidência complementar.

---

### Anexos e arquivos relacionados

- `frontend/cypress/e2e/01-autenticacao-acesso.cy.js` … `07-nao-funcional-regressao.cy.js`
- `frontend/cypress/support/commands.js`, `frontend/cypress/support/api-stubs.js`, `frontend/cypress/support/e2e.js`
- `frontend/cypress/fixtures/api.json`
- `frontend/cypress.config.js`
- `frontend/package.json` (scripts `test:e2e`, `test:e2e:open`, `test:e2e:ci`)
