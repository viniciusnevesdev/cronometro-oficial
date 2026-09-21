# ETAPA 5B — PUBLICAÇÃO BETA/OFICIAL ISOLADA

Data: 2026-09-21 (UTC)  
Projeto: `/workspaces/cronometro-oficial`  
Branch: `development`

## Conclusão

# PUBLICAÇÃO ISOLADA PRONTA PARA REVISÃO

A publicação foi separada definitivamente por branch e por diretório protegido:

- push em `development` monta e sincroniza somente `beta/`;
- push ou promoção aprovada em `stable` monta a Oficial e preserva `beta/` byte a byte;
- `main` continua sendo somente o pacote público servido pelo GitHub Pages.

O commit local da Etapa 5 foi amendado, sem criar um segundo commit:

- SHA anterior: `677530a9fffc5efa83994550bd1d08e0e6e3b834`;
- novo SHA: `b10e6193658f01faddffefbaeb0864e79f608298`;
- mensagem preservada: `chore(build): torna release autocontida`.

Nenhuma alteração foi feita no analytics v092 nesta tarefa.

## Workflow final

`.github/workflows/pages.yml` agora é acionado por `development` e `stable` e determina obrigatoriamente o alvo a partir da branch:

```text
development -> PUBLICATION_TARGET=beta
stable      -> PUBLICATION_TARGET=official
qualquer outra branch -> falha fechada
```

O workflow:

1. faz checkout de `main` na raiz, que representa o site público atual;
2. faz checkout somente da branch acionadora em `_source`;
3. lê somente a release correspondente ao alvo;
4. executa somente o construtor do ambiente autorizado;
5. sincroniza o ambiente com verificação de hashes do ambiente protegido;
6. remove somente o checkout temporário `_source`;
7. prepara o diff Git e bloqueia caminhos fora do escopo;
8. somente então cria e envia um commit para `main`.

O grupo de concorrência permanece único, mas `cancel-in-progress` passou a `false`. Publicações Beta e Oficial são serializadas, evitando que uma execução cancele a outra no meio da atualização.

O antigo trecho que apagava amplamente a raiz com `find ... -exec rm -rf` foi removido. O workflow também não chama mais `prepare_environments.py`, que montava os dois ambientes em conjunto.

### Defesa adicional pelo diff Git

- publicação Beta falha se qualquer caminho alterado não começar por `beta/`;
- publicação Oficial falha se qualquer caminho alterado começar por `beta/`.

## Montador e sincronizador isolado

Foi adicionado `prepare_isolated_publication.py` com quatro operações explícitas:

- `build-beta`: monta somente o pacote Beta;
- `sync-beta`: substitui exclusivamente `beta/` e compara todos os hashes externos antes/depois;
- `build-official`: monta um candidato Oficial sobre uma cópia do pacote público atual;
- `sync-official`: sincroniza o candidato fora de `beta/` e compara integralmente os hashes da Beta antes/depois.

O caminho Beta mantém:

- banco `cronometro_beta_v1`;
- Service Worker desabilitado durante o desenvolvimento;
- ícones e páginas de suporte próprios;
- ferramentas e Laboratório Visual exclusivos;
- analytics v092 local;
- ausência de `presentation-ui.js`, `presentation.css`, `analytics-ui.js` e `analytics.css`.

O caminho Oficial:

- parte do snapshot público de `main` para preservar áreas compartilhadas;
- sobrepõe somente o snapshot gerado de `stable` e infraestrutura Oficial;
- remove as quatro camadas remotas da Etapa 5;
- gera o Service Worker Oficial contra o candidato completo;
- mantém um manifesto `.official-assets.json` para controlar assets próprios em publicações futuras;
- exige que o conteúdo de `beta/` no candidato seja idêntico ao publicado antes da sincronização.

## Teste de development

Simulação completa em `/tmp/etapa5b.ubxkd3`:

1. `origin/main` foi extraída duas vezes para cópias antes/depois;
2. a fonte atual de `development` foi montada por `prepare_release.py`;
3. `build-beta` produziu o pacote Beta autocontido;
4. `sync-beta` foi executado sobre a cópia da `main`;
5. todos os arquivos fora de `beta/` foram comparados por caminho e SHA-256.

Resultado:

```text
DEVELOPMENT_OFFICIAL_FILES 412
DEVELOPMENT_OFFICIAL_BYTE_IDENTICAL True
DEVELOPMENT_BETA_CHANGED True
DEVELOPMENT_BETA_CHANGED_FILES 27
```

### Prova de preservação da Oficial

Os mapas de SHA-256 dos 412 arquivos fora de `beta/` eram exatamente iguais antes e depois. Nenhum arquivo Oficial, compartilhado ou de infraestrutura pública foi alterado pelo cenário `development`.

Somente `beta/**` mudou. O pacote resultante contém v092 local e não contém nem referencia as quatro camadas remotas.

## Teste de stable

Simulação completa em `/tmp/etapa5b.ubxkd3`:

1. outra cópia limpa de `origin/main` foi usada como pacote público inicial;
2. `origin/stable` (`284610e3e6730d8ae8c98ee309290835a79c4a33`) foi montada por `prepare_release.py`;
3. `build-official` criou um candidato Oficial sobre a cópia da `main`;
4. `sync-official` foi executado;
5. todos os arquivos de `beta/` foram comparados por caminho e SHA-256.

Resultado:

```text
STABLE_BETA_FILES 66
STABLE_BETA_BYTE_IDENTICAL True
STABLE_PUBLIC_CHANGED True
STABLE_CHANGED_FILES 8
STABLE_BETA_PATH_CHANGES []
```

Os oito caminhos alterados na simulação foram:

- `.official-assets.json`;
- `index.html`;
- `manifest.webmanifest`;
- `sw.js`;
- remoção de `presentation-ui.js`;
- remoção de `presentation.css`;
- remoção de `analytics-ui.js`;
- remoção de `analytics.css`.

### Prova de preservação da Beta

Os mapas de SHA-256 dos 66 arquivos de `beta/` eram exatamente iguais antes e depois. Nenhum caminho sob `beta/` foi adicionado, removido ou modificado pelo cenário `stable`.

## Arquivos modificados no commit amendado

O commit completo da Etapa 5 agora contém:

- `.github/workflows/pages.yml` — gatilhos e publicação isolada;
- `prepare_isolated_publication.py` — builders e sincronizadores protegidos;
- `tools/test_publication_isolation.py` — contratos de isolamento;
- `prepare_release.py` — release autocontido da Etapa 5;
- `tools/test_release_integrity.py` — contrato sem camadas remotas;
- `README.md` — arquitetura de publicação atualizada;
- `DEVELOPMENT.txt` — regras operacionais atualizadas.

Nenhum arquivo `cronometro-v092-*` foi modificado.

## Testes executados

- simulação completa `development` sobre cópia de `origin/main` — OK;
- comparação SHA-256 de todos os arquivos fora de `beta/` — 412/412 idênticos;
- simulação completa `stable` sobre cópia de `origin/main` — OK;
- comparação SHA-256 de todos os arquivos de `beta/` — 66/66 idênticos;
- verificação de v092 local na Beta — OK;
- verificação da ausência das quatro camadas remotas na Beta e Oficial geradas — OK;
- `python3 tools/test_publication_isolation.py` — OK;
- `python3 tools/test_release_integrity.py` — OK;
- `node tools/test_data_safety_net.js` — OK;
- `node --check` em todos os JavaScript rastreados — OK;
- `python3 -m py_compile` em todos os Python rastreados, com cache em `/tmp` — OK;
- parsing YAML do workflow — OK;
- `git diff --check HEAD^ HEAD` — OK.

## Estado Git

- `HEAD`: `b10e6193658f01faddffefbaeb0864e79f608298`;
- `origin/development`: `ace249d5352de2f97a48ac10c3f8aa92005809d8`;
- `development` permanece exatamente um commit à frente;
- `origin/main`: `abb2adcfa29516615ee4b6f40602f278a91d06cb`;
- `origin/stable`: `284610e3e6730d8ae8c98ee309290835a79c4a33`;
- árvore de trabalho limpa;
- `cronometro-app-reference` limpa;
- nenhum push de código, merge ou deploy foi executado.

## Riscos residuais

- O workflow ainda precisa de uma execução real do GitHub Actions para validar o ambiente hospedado e permissões do runner; nenhum deploy foi autorizado nesta tarefa.
- A primeira publicação Oficial isolada adicionará `.official-assets.json` à raiz pública para permitir limpeza controlada nas promoções seguintes.
- O teste byte a byte compara o conteúdo de cada arquivo por SHA-256; metadados de filesystem, que não fazem parte do conteúdo servido pelo GitHub Pages, não são considerados.
- Páginas compartilhadas existentes em `main` são preservadas nos dois cenários, salvo quando um futuro snapshot Oficial passar a possuí-las explicitamente como assets Oficiais.

# PUBLICAÇÃO ISOLADA PRONTA PARA REVISÃO
