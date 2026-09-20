# Revisão crítica — diretório de clientes

## Commit revisado

- SHA: `e7a710a8e6cfe2bc2d24ed9fabf4394d96e9ef14`
- Mensagem: `feat(clients): adiciona diretório por área`
- Branch: `development`

## Resumo da implementação

O commit acrescenta a camada isolada `v091` para um diretório de clientes.
O diretório lista e busca clientes somente em áreas com `type: "clients"`,
permite escolher a área quando há mais de uma, criar cliente com WhatsApp
opcional, abrir perfil, editar cadastro e excluir logicamente.

A exclusão mantém sessões, IDs, títulos e `clientNameSnapshot`: apenas marca
o cadastro com `deletedAt`, escondendo-o das listas ativas. A edição atualiza
o snapshot de nome das sessões vinculadas sem reescrever seus títulos.

Não há mudança de schema, stores IndexedDB, migração automática, analytics,
áreas genéricas, dados iniciais ou banco de produção.

## Arquivos modificados

- `README.md`
- `cronometro-v090-settings.js`
- `cronometro-v091-client-directory.css`
- `cronometro-v091-client-directory.js`
- `index.html`
- `sw.js`
- `tools/test_data_safety_net.js`

## Verificações executadas

- `node tools/test_data_safety_net.js` — passou.
- `node ../cronometro-app-reference/tools/test_uze_reconciliation.js` — passou.
- `node ../cronometro-app-reference/tools/test_analytics_ui.js` — passou.
- `node --check` em todos os JavaScript da fonte e de `tools/` — passou.
- `git diff --check HEAD^` — passou.
- Auditoria de referências locais de `index.html`, manifest e pré-cache — passou;
  os dois módulos v091 estão presentes e incluídos no service worker.

Os testes de segurança cobrem cliente existente/novo, busca, criação
idempotente, edição, exclusão lógica com sessões, cliente sem `createdAt`,
nomes semelhantes, preservação de título/sessão e área genérica.

## Problemas encontrados

Nenhum problema funcional bloqueante foi encontrado na revisão.

## Riscos residuais

- O ambiente não disponibiliza navegador nem servidor local; faltam apenas
  testes visuais manuais em Safari/iPhone para teclado, modal, rolagem e a
  abertura do WhatsApp.
- O número de WhatsApp é usado como informado; para abrir corretamente no
  WhatsApp Web/App, o cadastro deve incluir código do país quando necessário.

## Integridade do repositório

- `cronometro-app-reference` permanece limpo em `uze-beta`.
- `main` permanece em `abb2adcfa29516615ee4b6f40602f278a91d06cb`.
- Nenhum push de código, merge ou deploy foi realizado durante a revisão.

## Conclusão

**SEGURO PARA PUSH**
