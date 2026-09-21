# CORREÇÃO FINAL — MANIFESTO DE ASSETS OFICIAL PROTEGIDO

## Resumo

A correção do único bloqueador da Etapa 5B foi implementada e incorporada por amend ao commit local `chore(build): torna release autocontida`.

- Novo SHA: `42d05943736280347b079ac4b309c2242f3cbcf2`
- `origin/development`: `ace249d5352de2f97a48ac10c3f8aa92005809d8`
- Situação: `development` exatamente 1 commit à frente, working tree limpa.
- Nenhum push de código, merge ou deploy foi realizado.

## Causa do bug

O sincronizador lia `files` de `.official-assets.json` e executava `output / name` seguido de `unlink()` sem validar estrutura, ownership ou confinamento. Assim, uma entrada como `../escape-marker.txt` podia atingir conteúdo externo, e `menu/index.html` podia remover conteúdo público compartilhado. A validação posterior de preservação da Beta não evitava deleções anteriores.

## Validação integral e atomicidade

`build_official` agora valida o manifesto localizado no snapshot público **antes** de copiar ou modificar o candidato. A rotina:

1. exige `.official-assets.json` como arquivo regular, não symlink;
2. faz parse do JSON e exige raiz objeto;
3. exige o campo `files` e que ele seja lista;
4. exige itens string, não vazios e sem duplicatas;
5. valida todas as entradas, ownership, symlinks e destinos canônicos;
6. constrói todos os destinos em memória;
7. somente após a validação integral copia o snapshot e remove os assets antigos.

Qualquer erro encerra o build antes de qualquer deleção. O caso `['obsolete-official.js', '../escape.txt', 'another-valid.js']` foi testado e preservou os dois arquivos válidos, o arquivo externo, Beta e menu.

## Política explícita de ownership

O manifesto pode gerenciar somente basenames simples na raiz do pacote Oficial que tenham tipos de asset produzidos pelo build (`html`, `css`, `js`, `json`, `webmanifest`, `svg`, `png`, `txt`) ou o nome especial `.nojekyll`.

São explicitamente reservados e não removíveis pelo manifesto: `.codex-reports`, `.git`, `.github`, `.official-assets.json`, `_source`, `ambientes.json`, `beta`, `CNAME`, `diagnostico`, `historico-versoes.html`, `menu`, `menu.html`, `simple` e `versoes`.

Essa política permite remover assets Oficiais obsoletos normais sem aceitar que o próprio manifesto atribua ownership sobre diretórios ou conteúdo compartilhado.

## Path traversal, destino canônico e symlinks

- Entradas com `/` ou `\`, paths absolutos POSIX, drives Windows, `.`, `..` ou qualquer valor que não seja basename top-level são rejeitadas.
- Cada destino é resolvido canonicamente e seu parent deve ser exatamente a raiz candidata resolvida.
- Symlinks no snapshot público ou no destino candidato são rejeitados antes das deleções; o alvo externo nunca é seguido nem removido.
- `.official-assets.json` não pode listar a si próprio como asset removível.

## Testes adversariais

Foram cobertos:

- `../escape.txt`, `../../escape.txt`, path absoluto POSIX e `C:\arquivo.txt`;
- `beta/index.html`, `menu/index.html`, `diagnostico/index.html`;
- `menu.html`, `ambientes.json`, `historico-versoes.html`, `.official-assets.json`;
- valores não-string, `files` não-lista, lista duplicada, string vazia, raiz incorreta, campo ausente e JSON inválido;
- lista com entrada válida antes de traversal, comprovando ausência de deleção parcial;
- symlink apontando para arquivo externo;
- remoção normal de `obsolete-official.js` permitido;
- primeira execução sem manifesto;
- limpeza válida e segunda execução idempotente;
- `sync-beta` e `sync-official` executados duas vezes;
- adulteração de Beta no fluxo Oficial e adulteração da Oficial no fluxo Beta, ambas bloqueadas.

Reprodução exata dos bugs anteriores após a correção:

```text
E_TRAVERSAL_DELETED_OUTSIDE=False
E_SHARED_MENU_DELETED=False
E_TRAVERSAL_PARTIAL_DELETE=False
E_MENU_PARTIAL_DELETE=False
BETA_INTACT=True
VALID_OBSOLETE_REMOVED=True
VALID_BETA_PRESERVED=True
VALID_MENU_PRESERVED=True
OFFICIAL_REBUILD_IDEMPOTENT=True
```

## Simulações completas de publicação

### Development

Uma cópia de `origin/main` recebeu o build Beta completo, incluindo a geração do ícone realizada pelo workflow, e `sync-beta`.

```text
Beta sincronizada isoladamente: 70 arquivos; Oficial byte a byte preservada.
DEVELOPMENT_OFFICIAL_BYTE_IDENTICAL=True
```

O `diff` recursivo de todos os arquivos fora de `beta/` contra a cópia original de `origin/main` ficou vazio.

### Stable

Uma cópia limpa de `origin/main` recebeu o pacote Oficial montado a partir de `origin/stable` e `sync-official`.

```text
Oficial sincronizada isoladamente: 407 arquivos públicos verificados; Beta byte a byte preservada.
STABLE_BETA_BYTE_IDENTICAL=True
```

O `diff` recursivo de `beta/` antes/depois ficou vazio.

## Arquivos modificados nesta correção

- `prepare_isolated_publication.py`
- `tools/test_publication_isolation.py`

O diff completo da Etapa 5 continua limitado a workflow/documentação/build/testes. Analytics v092, diretório de clientes v091, bancos, schema e dados não foram alterados. As quatro camadas remotas continuam removidas do build.

## Testes e verificações executados

Todos passaram:

- `python3 tools/test_publication_isolation.py`
- `python3 tools/test_release_integrity.py`
- `node tools/test_advanced_analytics.js`
- `node tools/test_data_safety_net.js`
- `node ../cronometro-app-reference/tools/test_uze_reconciliation.js`
- `node ../cronometro-app-reference/tools/test_analytics_ui.js`
- `node --check` em todos os JavaScript rastreados
- `python3 -m py_compile` em todos os Python rastreados, com cache em `/tmp`
- parse real de `.github/workflows/pages.yml` com PyYAML
- `git diff --check HEAD^ HEAD`
- builds completos Beta/Oficial em `/tmp` com Pillow instalado somente em `/tmp`
- reproduções adversariais completas e rebuild Oficial idempotente

## Estado Git e escopo

- HEAD: `42d05943736280347b079ac4b309c2242f3cbcf2`
- Mensagem: `chore(build): torna release autocontida`
- `development` está 1 commit à frente de `origin/development`.
- Working tree limpa.
- `main` local e `origin/main`: `abb2adcfa29516615ee4b6f40602f278a91d06cb`.
- `origin/stable`: `284610e3e6730d8ae8c98ee309290835a79c4a33`; não há branch local `stable` e o ref remoto não foi modificado.
- Repositório de referência limpo em `e1b217d3ba81b86a8eb5d8d6e3b10a95289fcaa1`.
- Nenhum push de código, merge ou deploy ocorreu.

## Riscos residuais

A política pressupõe que futuros conteúdos públicos compartilhados top-level sejam adicionados ao conjunto reservado antes de sua introdução. Isso é uma regra de governança futura; os compartilhados existentes foram identificados e protegidos. Symlinks permanecem deliberadamente bloqueados pelo manifesto.

## Conclusão

MANIFESTO PROTEGIDO E PRONTO PARA REVISÃO
