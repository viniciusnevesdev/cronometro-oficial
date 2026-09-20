# Etapa 4 — analytics avançado

## Conclusão

**ANALYTICS AVANÇADO PRONTO PARA REVISÃO**

## Commit

- SHA: `48cd171`
- Mensagem: `feat(analytics): adiciona painel avançado por área`
- Branch: `development`

## Funcionalidades adicionadas

- Camada isolada `cronometro-v092-advanced-analytics.*`.
- Filtros combináveis para 7, 30, 90, 180, 365 dias e todo o histórico;
  área, cliente e modelo.
- Média, mediana, total, contagem, pausas, consistência, comparação com o
  período anterior, curva temporal, distribuição por modelo/área, gargalos e
  evolução por etapa.
- Indicadores separados para clientes novos com data real, recorrentes,
  clientes com data desconhecida e sessões sem cliente.
- Fallback para o painel de estatísticas anterior se a camada avançada lançar
  erro por dados incompatíveis.

## Fórmulas e decisões

- Mediana é calculada sobre a duração das sessões medidas filtradas.
- Consistência é `max(0, 100 - desvio-padrão/média*100)` e só aparece com
  duas ou mais amostras.
- Pausas são `pausas / (tempo medido + pausas)`.
- A comparação usa período anterior de mesma duração; quando não há amostra
  ou a base anterior é zero, exibe mensagem neutra em vez de percentual.
- "Novo" exige `createdAt` numérico e dentro de período fechado. Clientes
  legados sem data nunca são classificados como novos. Em todo o histórico,
  novo e recorrente aparecem como indisponíveis, pois não existe período
  anterior definido.

## Arquivos modificados

- `README.md`
- `index.html`
- `sw.js`
- `cronometro-v092-advanced-analytics.js`
- `cronometro-v092-advanced-analytics.css`
- `tools/test_advanced_analytics.js`

## Testes executados

- `node tools/test_advanced_analytics.js` — passou.
- `node tools/test_data_safety_net.js` — passou.
- `node ../cronometro-app-reference/tools/test_uze_reconciliation.js` — passou.
- `node ../cronometro-app-reference/tools/test_analytics_ui.js` — passou.
- `node --check` em todos os JavaScript da fonte e de `tools/` — passou.
- `git diff --check HEAD^` — passou.

Os testes cobrem todos os filtros temporais solicitados, filtros combinados,
mediana, comparação sem base, áreas múltiplas/genérica, cliente novo com data,
legado sem data, recorrente, sem cliente, pausas, gargalos, etapas e
idempotência do cálculo.

## Segurança e limitações

- Nenhum schema, store IndexedDB, dado real ou migração foi alterado.
- Nenhuma área genérica foi convertida.
- `cronometro-app-reference` permanece limpo em `uze-beta`.
- `main` permanece em `abb2adcfa29516615ee4b6f40602f278a91d06cb`.
- Não houve push de código, merge ou deploy.
- O ambiente não possui navegador: falta validação visual manual em Safari/iPhone
  para os controles e gráficos nas larguras 375, 390 e 430 px.
