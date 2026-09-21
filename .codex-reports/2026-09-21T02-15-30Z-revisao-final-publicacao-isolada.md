# REVISÃO FINAL — PUBLICAÇÃO BETA/OFICIAL ISOLADA

Data: 2026-09-21 (UTC)  
Projeto: `/workspaces/cronometro-oficial`  
Branch: `development`  
SHA revisado: `b10e6193658f01faddffefbaeb0864e79f608298`

## Conclusão

# NÃO SEGURO PARA PUSH

A separação normal entre Beta e Oficial funciona e os testes regulares passam. Entretanto, a auditoria adversarial encontrou um bloqueador real em `.official-assets.json`: as entradas do manifesto anterior são concatenadas ao diretório do candidato e apagadas sem qualquer validação de path ou de propriedade do asset.

Foram reproduzidas duas deleções indevidas:

- `../escape-marker.txt` apagou um arquivo fora do diretório candidato durante `build-official`;
- `menu/index.html` foi aceito como asset Oficial obsoleto e removido do pacote público compartilhado durante `sync-official`.

Logo, o manifesto pode causar path traversal e remoção de conteúdo compartilhado. A proteção de `beta/` bloqueia uma alteração direta à Beta antes da sincronização, mas não impede uma deleção fora do candidato durante o build e não protege `menu/`, `diagnostico/` ou outros caminhos compartilhados.

## 1. Arquivos revisados

Foram lidos integralmente e comparados com o commit anterior:

- `.github/workflows/pages.yml`;
- `prepare_isolated_publication.py`;
- `prepare_release.py`;
- `tools/test_publication_isolation.py`;
- `tools/test_release_integrity.py`;
- `README.md`;
- `DEVELOPMENT.txt`.

Nenhum arquivo foi modificado nesta revisão.

## 2. Auditoria do workflow

### Gatilhos e seleção do ambiente

O YAML possui gatilhos de push somente para:

```yaml
branches: ["development", "stable"]
```

O primeiro passo faz seleção fechada:

- `development` grava `PUBLICATION_TARGET=beta`;
- `stable` grava `PUBLICATION_TARGET=official`;
- qualquer outro `GITHUB_REF_NAME` encerra o job com status de erro.

`workflow_dispatch` também passa por essa seleção; uma execução manual em branch diferente de `development` ou `stable` falha antes dos checkouts.

As condições dos passos estão corretas:

- `if: env.PUBLICATION_TARGET == 'beta'` chama somente `build-beta`;
- `if: env.PUBLICATION_TARGET == 'official'` chama somente `build-official`.

As variáveis gravadas em `$GITHUB_ENV` ficam disponíveis nos passos posteriores. `github.ref_name` é adequado para os eventos de push e para o ref selecionado no dispatch. Não foi encontrada condição invertida, problema de quoting ou fallback aberto entre Beta e Oficial.

### Checkouts e Git

- o primeiro `actions/checkout` coloca `main` na raiz do workspace e mantém a credencial necessária ao push final;
- o segundo checkout coloca exatamente `${{ github.ref_name }}` em `_source` e usa `persist-credentials: false` somente nesse repositório aninhado;
- todos os comandos de build usam caminhos `_source/...`, mas os comandos Git finais são executados na raiz, que continua sendo o checkout de `main`;
- `_source`, incluindo seu `.git` aninhado, é removido antes de `git add -A`;
- não há `working-directory` que desloque os comandos Git para `_source`;
- `git commit` e `git push origin main` operam no checkout raiz de `main`.

Não foi encontrado risco de push acidental para `development` ou `stable` nesse fluxo.

## 3. Publicação development

### build-beta

O construtor:

- copia o snapshot gerado para uma saída nova;
- substitui o banco pelo identificador Beta;
- injeta runtime, ícones, suporte, ferramentas e Visual Lab da Beta;
- desabilita o registro do Service Worker durante desenvolvimento;
- gera manifest, metadados e `beta/sw.js` próprios;
- exige v092 local;
- rejeita as quatro camadas remotas.

### sync-beta

Antes da alteração, `file_map` calcula SHA-256 de todos os arquivos fora de `beta/`, `.git`, `.github` e `_source`. Em seguida:

1. remove especificamente o diretório público `beta/`;
2. copia integralmente o pacote novo;
3. calcula novamente os hashes externos;
4. falha se qualquer arquivo externo foi criado, removido ou alterado.

Como a Beta antiga é removida antes da cópia, assets que deixaram de existir são eliminados e não há acúmulo de lixo antigo.

O teste de mudança concorrente fora de `beta/` foi bloqueado corretamente. O diff Git final ainda adiciona uma segunda defesa: toda alteração preparada deve começar por `beta/`.

### Paths e symlinks

O destino de escrita é fixo em `public/beta`; nomes internos vêm da árvore construída e não são usados para compor destinos com `..`. Um `beta/` público que fosse symlink faria `shutil.rmtree` falhar fechado, em vez de seguir o link. Não foi encontrado escape de escrita no caminho normal de `sync-beta`.

## 4. Publicação stable

### build-official

O construtor copia a publicação atual para um candidato, omitindo `.git`, `.github` e `_source`. Depois remove assets do manifesto anterior, sobrepõe os arquivos gerados de `stable`, remove as quatro camadas remotas, gera os assets Oficiais e valida o banco/índice.

### sync-official

Antes de tocar no público, compara o mapa SHA-256 integral de `public/beta` com `candidate/beta`. Qualquer arquivo Beta novo, alterado ou removido bloqueia a sincronização. Depois sincroniza somente os arquivos fora de `beta/` e repete a comparação da Beta ao final.

O teste adversarial com `candidate/beta/index.html` alterado falhou antes de qualquer mudança pública. A publicação pública permaneceu intacta.

Assets Oficiais obsoletos válidos podem ser removidos: um `obsolete-official.js` listado no manifesto foi retirado, enquanto todos os hashes da Beta permaneceram iguais.

## 5. Auditoria de `.official-assets.json`

### Criação normal

O manifesto novo recebe:

- todos os arquivos top-level de `prepare_release.py`, usando apenas `path.name`;
- nomes fixos de assets gerados, como ícones, runtime, páginas de suporte, metadados e `sw.js`.

Na criação normal, as entradas são basenames e não incluem `beta/`, `menu/` ou `diagnostico/`.

### Uso do manifesto anterior

O trecho vulnerável lê livremente `files` e executa:

```python
target = output / name
if target.is_file() or target.is_symlink():
    target.unlink()
```

Não há validação de:

- tipo de `name`;
- path absoluto;
- `..`;
- separadores `/` ou `\`;
- resolução final dentro de `output`;
- pertencimento a um conjunto de assets Oficiais;
- nomes compartilhados ou protegidos.

O manifesto inteiro também não é validado antes da primeira deleção.

### Primeira execução e idempotência

- sem manifesto anterior, a primeira execução normal é segura quanto a essa etapa: nenhuma lista arbitrária é consumida;
- com manifesto válido gerado pelo próprio script, rebuild e sincronização repetidos foram byte a byte idempotentes;
- com manifesto corrompido ou adulterado, a execução não é segura.

### Bloqueador reproduzido

```text
E_TRAVERSAL_DELETED_OUTSIDE True
E_BETA_MANIFEST_BLOCKED_AT_SYNC True
PUBLIC_BETA_STILL_PRESENT True
E_SHARED_MENU_DELETED True
```

O bloqueio da Beta ocorre tarde demais para impedir a deleção externa já realizada no build. No caso de `menu/index.html`, não existe proteção equivalente e a deleção chega ao pacote público.

## 6. Concorrência

O grupo é único:

```yaml
group: "cronometro-publicacao-main"
cancel-in-progress: false
```

Para duas execuções próximas, apenas uma executa por vez. A segunda inicia seus passos após a primeira e, portanto, faz checkout da `main` já atualizada. Isso evita que os dois jobs normais construam simultaneamente sobre snapshots diferentes e reduz o risco de push non-fast-forward.

Um push externo concorrente para `main` ainda pode fazer o push do workflow falhar como non-fast-forward; o workflow não força nem sobrescreve histórico, portanto a falha é segura.

Risco operacional residual: a concorrência do GitHub Actions mantém no máximo uma execução em andamento e uma pendente por grupo. Em uma rajada de três ou mais eventos, uma execução pendente pode ser substituída por outra mais nova mesmo com `cancel-in-progress: false`. Assim, a serialização impede sobreposição, mas não é uma fila durável de todos os eventos. Uma promoção `stable` pendente poderia ser omitida se outro evento ocupar o slot pendente. Isso não causa mistura de arquivos, mas pode deixar uma publicação solicitada sem executar.

## 7. Service Workers

- `development` substitui somente `beta/`; `sw.js` da raiz permanece byte a byte igual;
- o SW raiz possui tratamento explícito para `rel.startsWith('beta/')` e responde com rede direta, sem fallback/cache Oficial;
- `root_assets` do SW Oficial considera arquivos top-level e páginas especiais, mas não percorre nem precacheia `beta/`;
- Beta gera `beta/sw.js` com cache próprio `cronometro-beta-*`;
- o runtime Beta desabilita o registro e tenta remover registrations/caches Beta antigos;
- a atualização Beta não exige alterar o SW raiz;
- `stable` preserva `beta/sw.js` e todos os demais bytes de `beta/`.

Não foi encontrado conflito de cache que anule o isolamento de arquivos.

## 8. Menu, diagnóstico e metadados compartilhados

Em push de `development`, ficam preservados:

- `menu.html` e `menu/`;
- `diagnostico/`;
- `ambientes.json`;
- demais metadados fora de `beta/`.

No estado atual, `origin/main` e `HEAD` usam a mesma release Beta `0.8.9-beta.22`, portanto o primeiro push deste commit não cria divergência de versão nesses arquivos.

Em uma futura mudança de `beta.release`, entretanto:

- o menu continuará exibindo a release Beta anterior;
- o diagnóstico continuará embutindo a release Beta anterior;
- `ambientes.json` continuará anunciando a release Beta anterior;
- os links relativos para `beta/` continuarão corretos.

Classificação: **dívida para etapa posterior**, não o bloqueador desta revisão. Para manter a regra de que somente `beta/` muda, esses consumidores deverão ler dinamicamente `beta/version.json` ou os metadados Beta deverão ser movidos para dentro de `beta/`. Atualizá-los diretamente em um push de development violaria o isolamento byte a byte definido.

## 9. Testes adversariais

Resultados:

```text
A_OUTSIDE_CHANGE_BLOCKED True
B_BETA_CHANGE_BLOCKED True PUBLIC_UNCHANGED True
C_OLD_BETA_REMOVED True
D_OBSOLETE_OFFICIAL_REMOVED True BETA_PRESERVED True
E_TRAVERSAL_DELETED_OUTSIDE True
E_BETA_MANIFEST_BLOCKED_AT_SYNC True PUBLIC_BETA_STILL_PRESENT True
E_SHARED_MENU_DELETED True
F_SYNC_BETA_IDEMPOTENT True
G_SYNC_OFFICIAL_IDEMPOTENT True
OFFICIAL_REBUILD_BYTE_IDENTICAL True
OFFICIAL_SECOND_BUILD_SYNC_IDEMPOTENT True
```

Os cenários A, B, C, D, F e G se comportaram corretamente. O cenário E revelou o bloqueador.

## 10. Testes obrigatórios

Todos os testes regulares passaram:

- `python3 tools/test_publication_isolation.py` — OK;
- `python3 tools/test_release_integrity.py` — OK;
- `node tools/test_advanced_analytics.js` — OK;
- `node tools/test_data_safety_net.js` — OK;
- `node ../cronometro-app-reference/tools/test_uze_reconciliation.js` — OK;
- `node ../cronometro-app-reference/tools/test_analytics_ui.js` — OK;
- `node --check` em todos os JavaScript rastreados — OK;
- `python3 -m py_compile` em todos os Python rastreados, com cache em `/tmp` — OK;
- parsing YAML — OK;
- `git diff --check HEAD^ HEAD` — OK.

Os testes existentes não incluem manifesto corrompido, path traversal, path compartilhado, alteração concorrente externa nem idempotência completa do rebuild. Por isso passaram apesar do bloqueador.

## 11. Correção mínima recomendada — não implementada

Antes do push:

1. carregar e validar **toda** a lista do manifesto antes de qualquer deleção;
2. exigir que `files` seja uma lista de strings únicas;
3. aceitar somente basenames top-level: rejeitar paths absolutos, `..`, `.`, strings vazias e qualquer `/` ou `\`;
4. confirmar por resolução canônica que cada destino possui exatamente `output` como diretório pai;
5. rejeitar explicitamente namespaces protegidos/compartilhados e nomes como `menu.html`, `ambientes.json`, `historico-versoes.html`, `.git`, `.github`, `_source`, `beta` e o próprio manifesto;
6. definir em código uma política confiável de quais basenames podem pertencer à Oficial, em vez de usar o manifesto como prova única de propriedade;
7. somente após validar a lista completa executar `unlink`;
8. adicionar testes adversariais para `../`, path absoluto, `beta/`, `menu/`, arquivo compartilhado top-level e garantia de zero efeitos colaterais quando a validação falhar.

## 12. Estado Git

- `HEAD`: `b10e6193658f01faddffefbaeb0864e79f608298`;
- `origin/development`: `ace249d5352de2f97a48ac10c3f8aa92005809d8`;
- `development` está exatamente 1 commit à frente e 0 atrás;
- `main` local e `origin/main`: `abb2adcfa29516615ee4b6f40602f278a91d06cb`;
- `origin/stable`: `284610e3e6730d8ae8c98ee309290835a79c4a33`;
- `cronometro-app-reference`: limpa em `e1b217d3ba81b86a8eb5d8d6e3b10a95289fcaa1`;
- árvore de trabalho limpa;
- nenhum commit, amend, merge, deploy ou push de código foi executado nesta revisão;
- o único push autorizado será este relatório para `codex-reports`.

# NÃO SEGURO PARA PUSH
