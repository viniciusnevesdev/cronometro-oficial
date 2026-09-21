# Etapa 5 — build autocontido e determinístico

## Commit local

- SHA: `677530a9fffc5efa83994550bd1d08e0e6e3b834`
- Mensagem: `chore(build): torna release autocontida`
- Branch: `development` (um commit à frente de `origin/development`)

## Diagnóstico do comportamento anterior

`prepare_release.py` baixava, a cada montagem, `presentation-ui.js`, `presentation.css`, `analytics-ui.js` e `analytics.css` de `raw.githubusercontent.com` e os injetava no `index.html` do pacote depois das camadas locais.

O conflito de analytics era real: a ordem final era v091, v092, `presentation-ui.js` e `analytics-ui.js`; o último arquivo executava `renderStats = renderAnalytics`. Portanto, ele substituía integralmente o `renderStats` protegido do v092, e não apenas adicionava estilo.

`presentation-ui.js` também fazia monkey patches de `renderHistory`, `renderBottomBarLab`, `renderNotesEditor`, `renderSessionMenu`, `renderSessionDetail` e um wrapper de `renderStats`. A camada de apresentação dependia de classes/textos de demonstração e de fluxos de clientes específicos da referência.

## Decisão de integração

As quatro camadas remotas foram descartadas do build; nenhuma foi copiada para o Oficial.

| Camada | Diagnóstico | Decisão |
| --- | --- | --- |
| `analytics-ui.js` | Implementação concorrente, UZE/demonstração, substituía `renderStats` após o v092 | Descartada; v092 local permanece válida |
| `analytics.css` | Estilos exclusivos da UI de analytics remota e regras UZE | Descartada; CSS v092 local permanece válido |
| `presentation-ui.js` | Monkey patches de telas centrais e detalhe de registro | Descartada; evitar comportamento de demonstração e duplicação |
| `presentation.css` | Aviso de demonstração e estilos acoplados a classes `demo-*` | Descartada; refinamentos visuais podem ser avaliados isoladamente depois |

Os refinamentos locais já aprovados de clientes v091 e analytics v092 continuam carregados por `index.html`. Nenhum texto, dado fictício ou regra UZE foi introduzido no pacote normal.

## Alterações

- `prepare_release.py`: removidos `urllib`, downloads de rede, injeção de links/scripts e requisitos artificiais das quatro camadas externas.
- `tools/test_release_integrity.py`: novo teste estrutural e de montagem em diretório temporário. Ele verifica ausência de dependências remotas, existência de todos os assets do `index`, presença e ordem v091/v092, ausência de camada posterior que sobrescreva o analytics, integridade do pré-cache e separação declarada dos bancos Oficial/Beta.
- `README.md`: documentação atualizada para registrar a montagem autocontida e a limitação de Pillow apenas para ícones derivados.

## Validações executadas

- `python3 tools/test_release_integrity.py` — OK; montou pacote temporário sem rede.
- Montagem temporária Beta a partir de development — OK; v091/v092 presentes e nenhuma das quatro camadas remotas no pacote.
- Montagem temporária Oficial a partir de `origin/stable` — OK; nenhuma camada remota e banco Oficial preservado.
- `node tools/test_advanced_analytics.js` — OK.
- `node tools/test_data_safety_net.js` — OK.
- `node ../cronometro-app-reference/tools/test_uze_reconciliation.js` — OK.
- `node ../cronometro-app-reference/tools/test_analytics_ui.js` — OK.
- `node --check` em todos os JavaScript relevantes — OK.
- `python -m py_compile prepare_release.py prepare_environments.py tools/test_release_integrity.py` — OK.
- `git diff --check HEAD^ HEAD` — OK.

## Limitação do ambiente

O pipeline completo `prepare_environments.py` não foi executado porque Pillow não está instalado neste ambiente. Isso só bloqueou a geração temporária dos ícones derivados; `prepare_release.py`, que era a dependência de rede removida nesta etapa, foi montado e validado para Beta e Oficial em `/tmp` sem acesso de rede.

## Segurança

- Nenhum JS/CSS funcional remoto entra mais no build.
- O analytics v092 local é a única camada de analytics adicionada pela fonte development.
- Não houve alteração de schema, IndexedDB, backups, clientes, sessões ou dados reais.
- `main` permanece em `abb2adcfa29516615ee4b6f40602f278a91d06cb`.
- `origin/stable` permanece em `284610e3e6730d8ae8c98ee309290835a79c4a33` e não foi alterada.
- `cronometro-app-reference` permanece limpa em `uze-beta`.
- Não houve push de código, merge ou deploy.

## Riscos residuais

- O detalhe de registro e alguns ajustes visuais da demonstração não foram portados, deliberadamente: precisam de uma etapa visual própria e comparação em iPhone antes de integração.
- O pós-processamento completo de ícones/manifests requer teste adicional em ambiente com Pillow; não há dependência de rede para JS/CSS funcional.

## Conclusão

**BUILD AUTOCONTIDO PRONTO PARA REVISÃO**
