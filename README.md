# Cronômetro

PWA local em HTML, CSS e JavaScript puro. Não há backend: os modelos,
registros, notas e ajustes ficam no IndexedDB do navegador. O banco do
aplicativo Oficial é `cronometro_local_v1`.

## Branches e ambientes

- `development` é a fonte de Desenvolvimento/Testes. É a branch normal para
  mudanças.
- `main` contém o pacote Oficial/Estável que o GitHub Pages publica. Não é
  uma branch de desenvolvimento.
- `stable` é o snapshot usado pelo pipeline para montar o pacote Oficial.

O pacote Beta gerado a partir de `development` usa o banco separado
`cronometro_beta_v1`. As ferramentas da Beta permitem somente a cópia
Oficial → Beta; elas não escrevem no banco Oficial.

O pipeline lê as releases de publicação em `environments.json`:

- `official.release` para o pacote Oficial;
- `beta.release` para o pacote Beta;
- `simple.release` para a variante simples.

`version.json` na raiz e o `window.APP_RELEASE` inline de `index.html`
acompanham a release da fonte Beta e devem ser atualizados juntos. Nos
pacotes gerados, cada `version.json`, o valor de `window.APP_RELEASE`, o
badge e os metadados de interface são escritos pelo pipeline a partir de
`environments.json`. Os arquivos `cronometro-v081-version.js` e
`cronometro-v083-version.js` preservam fallbacks para executar snapshots
históricos; não são uma fonte independente de release.

## Estrutura da fonte

O motor é modular e a ordem de carregamento em `index.html` faz parte da
arquitetura:

- `cronometro-v080-*.js` e `cronometro-v080-*.css`: núcleo, dados e interface
  inicial;
- `cronometro-v081-*`, `v082-*` e `v083-*`: camadas de modelos, áreas,
  clientes, histórico e estatísticas;
- `cronometro-v084-bottom-bar-lab.*`: editor da barra inferior;
- `cronometro-v085-sound-settings.js`: ajustes de som;
- `cronometro-v086-stats-icon.js`: ícone de estatísticas;
- `cronometro-v087-data-backup.*`: interface de backup;
- `cronometro-v088-ultra-visual.*`: modos Clássico e Ultra;
- `cronometro-v090-settings.*`: organização atual dos ajustes.
- `cronometro-v091-client-directory.*`: diretório de clientes por área de
  atendimentos, sem alterar áreas genéricas.
- `cronometro-v092-advanced-analytics.*`: filtros e métricas avançadas em
  modo somente leitura, com fallback para o painel anterior.

Arquivos auxiliares relevantes:

- `boot-resilient.js`: inicialização com fallback para diagnóstico/modo
  seguro, sem alterar IndexedDB;
- `beta-tools.js`: ferramentas exclusivas da Beta;
- `visual-lab.js` e `visual-lab-bridge.css`: Laboratório Visual exclusivo do
  pacote Beta;
- `launch.html`, `recover.html` e `safe.html`: páginas independentes de
  suporte;
- `sw.js`, `manifest.webmanifest` e `app-icon-192.png`: metadados e assets da
  fonte PWA.

`styles.css` permanece no repositório, mas não é carregado pelo `index.html`
atual; a interface da fonte usa as folhas modulares listadas acima.

## Fonte versus pacote público

A raiz de `development` também pode ser aberta diretamente: o
`app-icon-192.png` da fonte é usado tanto como favicon quanto como Apple Touch
Icon. `prepare_environments.py` gera, para os pacotes públicos, os assets
derivados do ícone aprovado:

- `app-icon-512.png`;
- `apple-touch-icon.png`;
- equivalentes Beta (`app-icon-beta-512.png` e
  `apple-touch-icon-beta.png`).

Por isso, os tamanhos 512 px e 180 px não são duplicados na árvore-fonte.
Durante a montagem, o pipeline substitui o Apple Touch Icon da fonte pelo
arquivo de 180 px, reescreve o manifest com os ícones de 192/512 px e gera
service workers com a lista real de assets de cada pacote.

O `sw.js` da fonte é uma configuração de desenvolvimento autocontida. O nome
do seu cache ainda acompanha a release Beta manualmente e deve ser mantido em
sincronia com a fonte. O service worker dos pacotes Oficial, Beta e Simples é
gerado por `prepare_environments.py`, com cache versionado pela release do
pipeline e todos os arquivos finais no pré-cache.

## Build e publicação

O workflow [pages.yml](.github/workflows/pages.yml) publica cada ambiente de
forma isolada:

- push em `development` monta a Beta e sincroniza somente `beta/` em `main`;
- push/promoção aprovada em `stable` monta a Oficial e preserva `beta/` byte a
  byte;
- `main` continua contendo somente o pacote que o GitHub Pages serve.

`prepare_isolated_publication.py` constrói e sincroniza o ambiente autorizado,
verifica os hashes do ambiente protegido e bloqueia qualquer alteração fora do
escopo. O workflow também valida o diff preparado antes de gravar `main`.

Executar esse workflow, publicar ou alterar `main` exige autorização
explícita. Não use `site/` como fonte de edição.

`prepare_release.py` monta cada snapshot somente a partir dos arquivos locais
versionados do respectivo snapshot. Ele não baixa JavaScript ou CSS funcional
da demonstração pública: o analytics v092 e as camadas de interface carregadas
por `index.html` são a fonte válida do pacote. A etapa de release é
reproduzível sem rede; Pillow continua necessário apenas para gerar os ícones
derivados em `prepare_environments.py`.

## Verificações locais seguras

Sem montar ou publicar pacote, é possível validar a fonte com:

```bash
for file in *.js; do node --check "$file"; done
git diff --check
```

Os contratos de segurança de dados podem ser executados sem navegador ou
rede:

```bash
node tools/test_data_safety_net.js
node tools/test_advanced_analytics.js
```

Eles usam somente fixtures sintéticas e uma store em memória para cobrir o
schema, áreas, clientes, sessões, backups e invariantes de migração
conservadora. Os testes do projeto de referência não fazem parte deste
repositório nem substituem os testes do aplicativo Oficial.

Antes de uma alteração que afete formato de dados, exporte um backup JSON.
Nunca corrija problemas removendo `cronometro_local_v1`.
