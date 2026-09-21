# Revisão crítica de publicação — Etapa 5

Data da auditoria: 2026-09-21 (UTC)  
Projeto: `/workspaces/cronometro-oficial`  
Branch auditada: `development`  
Commit auditado: `677530a9fffc5efa83994550bd1d08e0e6e3b834` — `chore(build): torna release autocontida`

## Conclusão executiva

# NÃO SEGURO PARA PUSH

Um `git push origin development` não atualizaria apenas a Beta. O workflow `.github/workflows/pages.yml` seria acionado, reconstruiria Beta **e Oficial**, substituiria o conteúdo público de `main`, faria push de `main` e, consequentemente, alteraria o site Oficial servido pelo GitHub Pages.

O commit resolve corretamente o conflito da Beta: `analytics-ui.js` remoto era carregado depois de `cronometro-v092-advanced-analytics.js` e executava `renderStats = renderAnalytics`, substituindo integralmente o v092. A remoção é necessária para Beta/development.

Entretanto, `origin/stable` (`284610e3e6730d8ae8c98ee309290835a79c4a33`) **não contém v092**. A Oficial publicada hoje usa `analytics-ui.js` e `analytics.css` para o painel avançado de estatísticas. Com o commit atual, a Oficial não ficaria sem qualquer estatística, mas perderia esse painel e voltaria ao painel nativo mais antigo de `stable`. Isso é uma mudança funcional e de experiência não isolada à Beta.

A situação arquitetural é a opção **B**: a direção autocontida está correta, mas Beta e Oficial precisam temporariamente de regras de composição diferentes até a Oficial possuir analytics local equivalente. Há também um aspecto da opção C: `presentation.css` mistura estilos de demonstração com refinamentos genéricos que precisam ser localizados, não removidos ou preservados em bloco sem avaliação.

## Respostas obrigatórias

1. **O push desse commit mudaria a Oficial pública?** Sim.
2. **Exatamente o quê?** Removeria as quatro camadas e suas referências/precache; trocaria o painel avançado remoto pelo painel nativo de `stable`; restauraria os renders nativos de histórico, detalhes, notas e barra; removeria refinamentos visuais genéricos de `presentation.css`. O rebuild também removeria o Eruda inserido manualmente em `main`, mudança independente da Etapa 5.
3. **Isso seria regressão ou remoção desejada?** Na Beta, remoção desejada e necessária. Na Oficial, a remoção do analytics avançado é uma regressão funcional silenciosa. A remoção do `presentation-ui.js` é majoritariamente desejável porque a camada é UZE/incompatível e o detalhe publicado contém uma referência ausente; porém ela também altera textos e layout. Parte de `presentation.css` é refinamento genérico potencialmente útil e não deve ser decidida em bloco.
4. **Beta e Oficial precisam temporariamente de regras diferentes?** Sim. Beta deve usar v092 local sem as quatro camadas. Oficial precisa de compatibilidade local/pinada para o analytics atual, ou de v092 portado e validado em `stable`, antes de abandonar o painel remoto.
5. **O commit pode ser enviado como está?** Não.

## 1. Fluxo real de publicação

### Push em development

O gatilho do workflow é:

```yaml
on:
  push:
    branches: ["development"]
```

O job faz, em ordem:

1. checkout de `main` na raiz do runner, com credencial de escrita;
2. checkout de `development` em `_dev`;
3. checkout de `stable` em `_stable`;
4. leitura das versões em `_dev/environments.json` (`official.release = 0.8.9`, `beta.release = 0.8.9-beta.22`);
5. instalação de Pillow e geração do ícone Beta;
6. montagem da Beta com `_dev/prepare_release.py _dev _dev/_beta_site`;
7. montagem da Oficial com **o mesmo script de development**, `_dev/prepare_release.py _stable _dev/_stable_site`;
8. composição de `_dev/site` por `prepare_environments.py`, finalização de metadados e histórico;
9. validações;
10. remoção dos arquivos públicos existentes no checkout de `main` (preservando `.git`, `.github`, `_dev` e `_stable`), cópia de `_dev/site` para a raiz e remoção dos checkouts auxiliares;
11. commit e `git push origin main` quando houver diff.

### Fontes de cada pacote

- **Beta:** arquivos de `development`, copiados por `prepare_release.py` para `_beta_site`; `prepare_environments.py` acrescenta isolamento de banco, ferramentas Beta, metadados, ícones e runtime.
- **Oficial:** arquivos de `stable`, copiados por `prepare_release.py` para `_stable_site`; páginas de suporte ausentes podem vir do diretório do script em development; `prepare_environments.py` usa esse snapshot para a raiz de `site` e acrescenta infraestrutura pública.
- **Stable:** vem de checkout explícito `ref: stable`; localmente a referência disponível é `origin/stable` em `284610e3...`. Não existe branch local `stable`.
- **Main:** não é fonte do motor. É substituída pelo pacote final e recebe push automático do workflow.

Portanto, o `prepare_release.py` atual de development é usado para ambos os ambientes. Alterá-lo pode mudar a Oficial sem alterar a branch `stable`.

## 2. Comparação de publicação

Foram produzidos em `/tmp/etapa5-audit.KWVOio` dois pipelines completos, usando a mesma `HEAD`, o mesmo `origin/stable` e Pillow temporário:

- `repo-old/site`: `prepare_release.py` obtido de `677530a9^`, baixando as quatro camadas reais;
- `repo-current/site`: `prepare_release.py` do commit auditado.

Os hashes das camadas baixadas pelo build antigo coincidiram exatamente com os arquivos hoje em `origin/main`:

| Arquivo | SHA-256 |
|---|---|
| `presentation-ui.js` | `2ef6a8848272e7f1f5ee8ee6c0062d246dde9e527e05cb5ff6973bc272790cb4` |
| `presentation.css` | `2bf2cf95043f076334ad1bc893ec7be5c7e2b4b1fbecc41f09064283a934289c` |
| `analytics-ui.js` | `ad92f146a9e8d4d81440cdda4696b2f2b5f858950f3d273b49b709efeaf059a9` |
| `analytics.css` | `13bf562050f21bc826cf6d2560e30e7b478b2168f9d7265f957b2ef1dba94441` |

O diff antigo × novo isolou **18 entradas**, todas explicadas pela Etapa 5:

- exclusão dos quatro arquivos na Oficial, Beta e Simple (12 entradas);
- remoção dos quatro links/scripts em `index.html` dos três ambientes (3 entradas);
- remoção dos quatro assets do precache em `sw.js` dos três ambientes (3 entradas).

Não houve outro diff entre os dois builds finais.

### Comparação com a main publicada

Na raiz da Oficial, além da Etapa 5, o novo build removeria o Eruda carregado de `cdn.jsdelivr.net`. Essa remoção não é causada por `677530a9`: Eruda foi acrescentado manualmente a `main` no commit `be0641f` e não existe em `stable`. A Beta publicada também possui alteração manual equivalente em `main`. Como o workflow substitui `main` pelo pacote gerado, ambas seriam removidas no próximo rebuild.

A comparação global de `origin/main` com o pacote novo também contém mudanças Beta acumuladas desde a última publicação (v090, v091, v092, Visual Lab e outros arquivos). Elas não são diferenças exclusivas da Etapa 5.

## 3. Impacto funcional e de experiência na Oficial

### Analytics — regressão funcional

Na Oficial publicada, `analytics-ui.js` é carregado por último e faz:

```js
renderStats = renderAnalytics;
```

Ele fornece:

- períodos de 15, 30, 90 dias e 1 ano;
- filtro por modelo;
- evolução contra o período anterior;
- média, mediana, consistência e proporção de pausas;
- gráfico de evolução;
- etapas que mais mudaram;
- gargalos;
- recorrência e frequência de clientes;
- distribuição por modelo;
- estatísticas globais.

Sem a camada, `stable` volta ao `renderStats` de `cronometro-v082-04.js`, que fornece outro painel:

- dados da área ativa;
- resumo de registros, tempo acumulado e média;
- clientes da área;
- médias/frequência por cronômetro;
- últimos tempos por registro;
- tendência simples entre metades do histórico.

Logo, estatísticas não desaparecem por completo, mas o painel avançado publicado desaparece e sua semântica muda de forma substancial. `stable` não possui `cronometro-v092-advanced-analytics.js/.css`.

Na Beta, o carregamento era: v092 local e depois `analytics-ui.js` remoto. O último sobrescrevia v092. A remoção é correta e indispensável na Beta.

### Presentation UI

Classificação dos monkey patches:

| Patch | Efeito publicado | Classificação |
|---|---|---|
| `renderHistory` | troca “Registros” por “Histórico” | somente texto/nomenclatura |
| `renderBottomBarLab` | troca “Registros” por “Histórico” na prévia | somente texto/nomenclatura |
| `renderNotesEditor` | troca “Sobre este atendimento” por “Notas do atendimento” | somente texto/nomenclatura |
| `renderSessionMenu` | mesma troca no registro em andamento | somente texto/nomenclatura |
| `renderSessionDetail` | substitui integralmente o detalhe nativo por layout da demonstração | funcional, UZE e incompatível com `stable` |
| wrapper de `renderStats` | adiciona ícone/cor à tendência do painel anterior | visual, mas é posteriormente descartado porque `analytics-ui.js` substitui `renderStats` |

O `renderSessionDetail` remoto remove ou reorganiza capacidades do detalhe nativo, incluindo contexto/alteração de área, apresentação das duas notas e navegação de cliente. Ele também chama `clientNotesDisclosureDemo(s)`. Essa função não existe em nenhum JavaScript de `origin/stable`; a própria camada só a redefine se ela já existir. A busca no pacote publicado encontrou apenas a condição, a atribuição condicional e a chamada. Portanto, pela composição estática efetivamente publicada, abrir o detalhe entra em `ReferenceError` nesse ponto. Remover esse override restaura o detalhe nativo e corrige uma incompatibilidade, embora mude visivelmente a tela.

### Presentation CSS

- **Demonstração/UZE ou inerte na Oficial:** backdrop/aviso `.demo-presentation-*`, `.demo-pause-status`, classes do detalhe demo/cliente e vários seletores que só existem junto do override remoto.
- **Refinamentos visuais genéricos potencialmente preserváveis:** rotação mais estável do ícone ativo no Safari, labels visíveis na barra inferior padrão, alvos maiores para fechar/concluir, compactação do cartão de backup.
- **Duplicado/inativo:** estilos de tendência de `presentation.css` não governam o painel final porque `analytics-ui.js` troca a função depois; estilos do detalhe demo dependem do override que não deve ser preservado em bloco.
- **Incompatível:** preservar `presentation-ui.js` inteiro na Oficial perpetuaria o override quebrado e decisões específicas de cliente/atendimento da demonstração.

## 4. Alterações separadas por natureza

### Funcionais

- Beta: v092 volta a ser o painel efetivo — desejado.
- Oficial: analytics avançado remoto é substituído pelo painel legado nativo — regressão de experiência.
- Oficial: detalhe nativo de registro volta e o override incompatível sai — correção desejável, mas mudança funcional visível.
- Oficial/Beta: Eruda manual sai no rebuild — mudança independente, desejável para produção, mas deve ser reconhecida.

### Apenas visuais

- barra inferior padrão perde labels/ajustes definidos por `presentation.css`;
- ícone ativo perde o workaround de rotação no contêiner;
- botões de fechar/concluir voltam aos tamanhos nativos;
- backup perde compactação adicional;
- detalhe volta ao estilo nativo.

### Texto/nomenclatura

- “Histórico” volta a “Registros” no cabeçalho e na prévia da barra;
- “Notas do atendimento” volta a “Sobre este atendimento” onde o patch atuava;
- detalhe volta aos textos próprios de `stable`.

### Recursos que desapareceriam

- painel remoto com períodos, KPIs, gráficos, gargalos, recorrência e distribuição;
- layout remoto do detalhe;
- refinamentos CSS citados.

### Recursos que já existem de outra forma

- histórico, notas, detalhe do registro, barra inferior e estatísticas continuam existindo nativamente em `stable`;
- as estatísticas nativas são funcionalmente mais simples e organizadas por área ativa;
- Beta possui v092 local, mais adequado à arquitetura atual.

### Específicos de demonstração/UZE ou que não deveriam estar no Oficial

- nomes/classes `demo-*` e apresentação orientada a cliente/atendimento;
- override integral de `renderSessionDetail` vindo de outro projeto;
- download mutável de código funcional de `cronometro-app/main` durante o release;
- Eruda/CDN no pacote Oficial.

## 5. Correção mínima recomendada — não implementada

Antes do push:

1. manter Beta/development exatamente sem as quatro camadas, para que v092 seja soberano;
2. separar explicitamente perfis de build (`beta` e `official`) em vez de aplicar a mesma lista de overlays a ambos;
3. para a Oficial, até `stable` receber v092 ou equivalente, preservar **localmente e com hash/teste fixos** o painel `analytics-ui.js` + `analytics.css` hoje publicado; não voltar a baixar `main` remotamente durante o build;
4. não preservar `presentation-ui.js` inteiro: ele é incompatível com `stable`; localizar somente refinamentos genéricos aprovados em uma camada de compatibilidade Oficial ou portar esses refinamentos para a fonte correta;
5. adicionar teste que monte simultaneamente Beta e Oficial e afirme qual implementação final de `renderStats` cada uma carrega;
6. opcionalmente, tornar o rebuild da Oficial dependente de alteração/autorização explícita de `stable`, impedindo que todo push de development mude silenciosamente a raiz pública.

A alternativa definitiva é promover para `stable` um analytics local validado e então remover também a compatibilidade Oficial. Isso exige autorização de promoção e não faz parte desta auditoria.

## 6. Testes e verificações

Todos passaram:

- `python3 tools/test_release_integrity.py`
- `node tools/test_advanced_analytics.js`
- `node tools/test_data_safety_net.js`
- `node ../cronometro-app-reference/tools/test_uze_reconciliation.js`
- `node ../cronometro-app-reference/tools/test_analytics_ui.js`
- `node --check` para todos os JavaScript rastreados no projeto
- `python3 -m py_compile` para todos os Python rastreados, com cache direcionado a `/tmp`
- `git diff --check HEAD^ HEAD`
- pipeline completo atual em `/tmp`, incluindo Pillow, `prepare_beta_icon.py`, os dois `prepare_release.py`, `prepare_environments.py`, `finalize_public_metadata.py` e `prepare_version_history.py`
- pipeline completo com a versão anterior de `prepare_release.py`
- bloco de validação manual do workflow: `WORKFLOW_MANUAL_VALIDATION_OK`
- verificação de referências em `index.html` e assets de `sw.js` para Oficial, Beta e Simple, nos builds antigo e novo: nenhuma referência ausente

Pillow não foi instalado globalmente. Foi instalado em `/tmp/etapa5-audit.KWVOio/pillow` e usado via `PYTHONPATH`. O workflow oficial instala Pillow com pip da mesma forma conceitual no runner.

### Limitação

Não foi executado teste visual em navegador real/iPhone. A comparação funcional foi feita por fluxo de build, diff exato, ordem de scripts, análise dos monkey patches, contratos Node existentes e inspeção das implementações finais. A falha de `clientNotesDisclosureDemo` é uma conclusão estática da composição dos scripts publicados, não uma captura de navegador.

## 7. Estado Git e segurança

- `development` local: `677530a9...`, exatamente 1 commit à frente de `origin/development`;
- `origin/development`: `ace249d5352de2f97a48ac10c3f8aa92005809d8`;
- `main` local e `origin/main`: `abb2adcfa29516615ee4b6f40602f278a91d06cb`;
- `origin/stable`: `284610e3e6730d8ae8c98ee309290835a79c4a33`;
- não existe branch local `stable` e nenhuma referência de código foi alterada;
- `cronometro-app-reference`: limpa, `e1b217d3ba81b86a8eb5d8d6e3b10a95289fcaa1`;
- nenhum arquivo do projeto foi alterado pela auditoria;
- nenhum commit, amend, merge, push de código ou deploy foi executado;
- o único push autorizado será este relatório para `codex-reports`.

## Recomendação final

Bloquear o push de `677530a9` até separar o tratamento de Beta e Oficial. A Beta deve continuar autocontida com v092. A Oficial precisa manter temporariamente o analytics publicado por uma camada local e imutável, ou receber uma promoção validada de analytics local em `stable`. Os refinamentos genéricos de apresentação devem ser localizados; a camada `presentation-ui.js` inteira não deve ser mantida.

# NÃO SEGURO PARA PUSH
