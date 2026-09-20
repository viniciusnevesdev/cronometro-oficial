# Segunda revisão crítica — analytics avançado v092

## Commit revisado

- SHA: `ace249d5352de2f97a48ac10c3f8aa92005809d8`
- Mensagem: `feat(analytics): adiciona painel avançado por área`
- Base: `e7a710a8e6cfe2bc2d24ed9fabf4394d96e9ef14`

## Escopo e integração

O commit contém exatamente seis arquivos: `README.md`, CSS e JS v092, `index.html`, `sw.js` e o teste v092. O CSS está isolado sob classes `analytics-v092-*`; o JS é carregado depois de v091; ambos os assets estão no pré-cache e existem na árvore. Não há alteração de schema, IndexedDB, backup/restauração ou dados de produção.

## Revalidação das regressões corrigidas

### Datas

A função `timestamp` rejeita `null`, `undefined`, string vazia, `NaN`, infinito, zero e negativos. A ordem é correta: `originalRecordedAt` real, depois `savedAt`, depois `openedAt`; ausência total continua como ausência.

Reprodução isolada confirmou que:

- `originalRecordedAt` nulo, indefinido ou vazio usa `savedAt` real;
- `NaN`, infinito, zero e valores negativos caem corretamente para `openedAt` real;
- `originalRecordedAt` real tem prioridade sobre as outras fontes;
- uma sessão sem data não entra no filtro fechado nem em todo o histórico;
- a curva não contém `1970-01-01` (`has1970: false`).

Não há outro uso de `Date` ou conversão de data no v092 capaz de inserir uma sessão sem data na curva: o único `new Date(...)` ocorre após `inBounds`, que exige a data validada.

### Timers legados

`timersOf` normaliza ausente, `null` e valores não-array para lista vazia. O v092 não possui outro acesso direto a `session.timers`.

As reproduções e testes cobrem `timers` ausente, `null`, vazio e normal. Registros sem timers não criam etapas fictícias nem derrubam o cálculo; sessões normais continuam compondo duração, área, modelo e demais métricas. Como não há duração mensurável sem timers, nenhuma duração é inferida artificialmente.

## Métricas e filtros revisados

- Períodos 7/30/90/180/365 usam intervalo início inclusivo e fim exclusivo; o período anterior é contíguo e tem a mesma duração.
- Contagem, total, média e mediana usam somente sessões salvas, não apagadas, medidas e com duração positiva.
- Consistência só é calculada com duas ou mais amostras e é limitada a 0–100; pausas usam `pausas / (trabalho + pausas)`.
- Base anterior vazia produz estado indisponível, sem percentual artificial/infinito.
- Distribuições, gargalos e evolução ignoram etapas de duração zero; as divisões relevantes têm guarda de base zero.
- Os filtros de área, cliente e modelo são combinados; múltiplas áreas são preservadas e a área genérica continua independente de clientes.
- Cliente legado sem `createdAt` não é contado como novo; sessão sem cliente continua separada. Para todo o histórico, novos e recorrentes ficam indisponíveis de forma conservadora, pois não existe limite inicial confiável.

## Fallback

O wrapper captura a referência anterior de `renderStats` antes de sobrescrevê-la, portanto não cria recursão. Uma reprodução com exceção real dentro da computação v092 retornou o painel anterior e confirmou que `data` permaneceu byte a byte inalterado.

## Validações executadas

- `node tools/test_advanced_analytics.js` — OK
- `node tools/test_data_safety_net.js` — OK
- `node ../cronometro-app-reference/tools/test_uze_reconciliation.js` — OK
- `node ../cronometro-app-reference/tools/test_analytics_ui.js` — OK
- `node --check` em todos os JavaScript da raiz e `tools/` — OK
- `git diff --check HEAD^ HEAD` — OK
- reproduções isoladas de datas nulas/ausentes, prioridade de data, timers ausente/nulo e fallback — OK

## Segurança do repositório

- `development` está exatamente um commit à frente de `origin/development`.
- `main` permanece em `abb2adcfa29516615ee4b6f40602f278a91d06cb`.
- `cronometro-app-reference` permanece limpa em `uze-beta`.
- Não houve alteração local adicional, push de código, merge ou deploy nesta revisão.

## Riscos residuais

- Recorrência ainda considera uma sessão salva anterior mesmo que ela seja sem medição; isso é decisão de produto futura, não regressão introduzida pela correção.
- `allSaved.some(...)` por cliente tem custo quadrático no pior caso; é aceitável para o estado atual, mas merece indexação/pré-agregação se o histórico crescer muito.
- A inspeção visual em Safari/iPhone continua pendente de navegador real.

## Conclusão

**SEGURO PARA PUSH**
