# Revisão crítica — diretório de analytics avançado

## Commit revisado

- SHA: `48cd17127740873a4300b7ef8ea92873d05675dd`
- Mensagem: `feat(analytics): adiciona painel avançado por área`
- Branch auditada: `development` (um commit à frente de `origin/development`)
- Base: `e7a710a8e6cfe2bc2d24ed9fabf4394d96e9ef14`

## Escopo do commit

O commit contém exatamente seis arquivos, todos relacionados ao painel v092:

- `README.md`
- `cronometro-v092-advanced-analytics.css`
- `cronometro-v092-advanced-analytics.js`
- `index.html`
- `sw.js`
- `tools/test_advanced_analytics.js`

O carregamento de CSS/JS no `index.html` está após v091, e os dois assets v092 estão no pré-cache do service worker. Não há alteração de schema, IndexedDB, backup/restauração ou dados de produção no diff.

## Cálculos e comportamento validados

- Os limites implementados são início inclusivo e fim exclusivo (`[start, end)`); o período anterior é contíguo e de mesma duração (`[start-duração, start)`).
- Contagem, total, média e mediana operam sobre sessões salvas, não apagadas, medidas e com duração positiva.
- A consistência segue a fórmula documentada: `max(0, 100 - desvio-padrão populacional / média * 100)`, somente com ao menos duas amostras.
- Pausas são calculadas como `pausas / (tempo de trabalho + pausas)`; comparação anterior não emite percentual quando a base é vazia.
- Agrupamentos por modelo e área, etapas, curva diária e filtros combinados por área/cliente/modelo foram inspecionados. Áreas genéricas permanecem filtros/agrupamentos, sem conversão em clientes.
- Para todo o histórico, novos e recorrentes ficam indisponíveis. Essa é uma decisão conservadora e semanticamente correta: sem limite inicial não há como classificar "novo no período" ou recorrência prévia sem inventar uma data.
- O fallback v092 não recursa: captura a exceção e chama a referência anterior de `renderStats`. O teste existente comprova esse caminho com um fallback simulado.

## Problemas encontrados — bloqueadores

### 1. Data nula é interpretada como 1970 e impede o fallback para `savedAt`

Em `cronometro-v092-advanced-analytics.js:7-8`, `number(null)` resulta em `0`, pois `Number(null)` é zero. Assim, `dateOf()` considera `originalRecordedAt: null` uma data válida e não chega a avaliar um `savedAt` real.

Reprodução isolada com uma sessão salva, medida, `originalRecordedAt: null` e `savedAt` válido de um dia atrás:

- filtro de 30 dias: `finiteCount: 0` (a sessão real é omitida);
- todo o histórico: a sessão aparece na curva como `1970-01-01`.

Isto inventa uma posição temporal e pode excluir do painel atual dados legados perfeitamente datáveis por `savedAt`. Também contraria a exigência de não inventar dados/datas para registros parcialmente antigos. Os testes v092 só usam `originalRecordedAt` numérico e não cobrem esse contrato.

### 2. Registro legado sem `timers` derruba o cálculo avançado

Em `cronometro-v092-advanced-analytics.js:45`, há uma expressão intermediária não utilizada que executa `session.timers.map(...)`. Embora os cálculos de etapas nas linhas seguintes usem `session.timers || []`, a expressão anterior lança `TypeError` quando um registro antigo não possui o campo opcional `timers`.

Reprodução isolada de uma sessão válida com data e duração, mas sem `timers`: `TypeError: Cannot read properties of undefined (reading 'map')`.

O wrapper de renderização tenta voltar ao painel v082, preservando uma tela funcional, porém todo o analytics avançado deixa de funcionar enquanto esse registro existir. Além disso, o fallback v082 é limitado à área ativa, portanto não é equivalente ao painel global/filtros v092. O requisito da rede de segurança inclui registros antigos com campos opcionais ausentes; o teste v092 não cobre esse caso.

## Riscos residuais não bloqueadores

- A classificação de recorrência procura uma sessão salva anterior sem exigir que ela tenha medição. Isso pode contar como recorrente uma cliente cujo único atendimento prévio foi "sem medição"; é uma decisão de produto que precisa ser definida.
- Para cada cliente filtrado, o cálculo executa uma busca em todas as sessões (`allSaved.some(...)`). Junto dos agrupamentos de etapas, renderizações repetidas podem se tornar custosas em histórico muito grande. Não foi observada corrupção, mas convém indexar/pré-agrupar ao otimizar futuramente.
- Não foi possível realizar validação visual em Safari/iPhone neste ambiente; a checagem foi estrutural. Tema e modos Clássico/Ultra não tiveram alteração direta além do CSS isolado v092.

## Verificações executadas

Todas passaram, salvo as duas reproduções isoladas acima que demonstram os defeitos:

- `node tools/test_advanced_analytics.js` — OK
- `node tools/test_data_safety_net.js` — OK
- `node ../cronometro-app-reference/tools/test_uze_reconciliation.js` — OK
- `node ../cronometro-app-reference/tools/test_analytics_ui.js` — OK
- `node --check` para todos os `*.js` e `tools/*.js` — OK
- `git diff --check 48cd171^ 48cd171` — OK
- revisão de `git show`, stat e lista de arquivos — OK
- reprodução de data legada nula — confirmou defeito
- reprodução de `timers` ausente — confirmou defeito

## Segurança do repositório

- `development` permanece em `48cd171`; `main` permanece em `abb2adcfa29516615ee4b6f40602f278a91d06cb`.
- A árvore do Oficial permaneceu sem modificações nesta revisão.
- `../cronometro-app-reference` permanece limpa em `uze-beta`.
- Nenhum push de código, merge ou deploy foi realizado.

## Conclusão

**NÃO SEGURO PARA PUSH**

Antes do envio, o commit precisa tratar valores de data ausentes como ausentes (permitindo usar `savedAt`/`openedAt` reais) e suportar `timers` ausente sem lançar exceção. Esses dois casos devem receber testes de regressão no painel v092.
