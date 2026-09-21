# REVISÃO FINAL — MANIFESTO OFICIAL PROTEGIDO

## Conclusão executiva

O commit `42d05943736280347b079ac4b309c2242f3cbcf2` elimina o bloqueador de segurança de `.official-assets.json` sem romper o isolamento Beta/Oficial da Etapa 5B.

**SEGURO PARA PUSH**

## SHA revisado

- HEAD: `42d05943736280347b079ac4b309c2242f3cbcf2`
- Mensagem: `chore(build): torna release autocontida`
- Base remota: `origin/development = ace249d5352de2f97a48ac10c3f8aa92005809d8`
- `development` permanece exatamente 1 commit à frente.

## Validação do manifesto

A revisão de `prepare_isolated_publication.py` confirmou:

- JSON ilegível, malformado ou com raiz de tipo incorreto falha fechado;
- `files` é obrigatório e precisa ser lista;
- todo item precisa ser string não vazia;
- duplicatas são rejeitadas;
- qualquer `/` ou `\` é rejeitado;
- paths absolutos POSIX, drives Windows, `.` e `..` são rejeitados;
- o valor precisa ser exatamente um basename top-level;
- o destino canônico precisa ter como parent exatamente a raiz Oficial candidata;
- o manifesto inteiro é validado antes de `copy_public_snapshot` e antes de qualquer remoção;
- `remove_previous_official_assets` resolve e valida toda a lista em memória antes do primeiro `unlink`;
- uma entrada inválida não permite deleção parcial.

Os erros são reportados como `Manifesto Oficial inválido: ...` e encerram o build antes de modificar o candidato.

## Política de ownership

O manifesto só aceita basenames top-level com tipos de arquivo gerados pelo build Oficial (`html`, `css`, `js`, `json`, `webmanifest`, `svg`, `png`, `txt`) ou `.nojekyll`, excluindo explicitamente conteúdo reservado.

Proteções confirmadas:

- `beta`
- `menu`
- `menu.html`
- `diagnostico`
- `ambientes.json`
- `historico-versoes.html`
- `.git`
- `.github`
- `_source`
- `.official-assets.json`
- `simple`
- `versoes`
- `.codex-reports`
- `CNAME`

A comparação com todos os nomes top-level atuais de `origin/main` não encontrou outro conteúdo compartilhado existente desprotegido. Arquivos como `environment.json`, `version.json`, scripts `cronometro-*`, estilos, ícones e páginas do aplicativo pertencem ao pacote Oficial.

Um asset obsoleto legítimo, `obsolete-official.js`, foi removido normalmente em build completo, enquanto Beta e menu foram preservados.

## Symlinks

O manifesto em si precisa ser arquivo regular. Entradas cujo arquivo correspondente seja symlink no snapshot público ou no candidato são rejeitadas antes das deleções. A resolução canônica também impede saída da raiz.

Teste independente:

```text
SYMLINK_EXTERNAL_PRESERVED=True
SYMLINK_LINK_PRESERVED=True
```

Nenhum alvo externo foi seguido ou apagado.

## Atomicidade

Manifesto testado:

```json
[
  "obsolete-official.js",
  "../escape.txt",
  "another-valid.js"
]
```

Resultado:

```text
ATOMIC_OBSOLETE_PRESERVED=True
ATOMIC_ANOTHER_PRESERVED=True
ATOMIC_EXTERNAL_PRESERVED=True
ATOMIC_BETA_PRESERVED=True
ATOMIC_MENU_PRESERVED=True
```

A entrada inválida foi descoberta antes de qualquer cópia ou deleção.

## Reproduções adversariais

As duas reproduções originais foram refeitas contra `build-official` completo em `/tmp`:

```text
E_TRAVERSAL_DELETED_OUTSIDE=False
E_SHARED_MENU_DELETED=False
TRAVERSAL_VALID_PREFIX_PRESERVED=True
MENU_VALID_PREFIX_PRESERVED=True
```

Os testes automatizados também cobrem JSON inválido, `files` ausente ou de tipo incorreto, itens não-string, duplicatas, string vazia, paths POSIX/Windows, `beta/`, `menu/`, `diagnostico/`, nomes compartilhados e symlink.

## Isolamento Beta/Oficial

### Push em development

Simulação completa sobre cópia de `origin/main`, com geração do ícone Beta e build equivalente ao workflow:

```text
Beta sincronizada isoladamente: 70 arquivos; Oficial byte a byte preservada.
DEVELOPMENT_OFFICIAL_BYTE_IDENTICAL=True
```

O diff de todos os arquivos fora de `beta/` ficou vazio.

### Push em stable

Simulação completa sobre outra cópia limpa de `origin/main`, usando `origin/stable` como fonte:

```text
Oficial sincronizada isoladamente: 407 arquivos públicos verificados; Beta byte a byte preservada.
STABLE_BETA_BYTE_IDENTICAL=True
```

O diff integral de `beta/` antes/depois ficou vazio.

O workflow continua selecionando exclusivamente `build-beta`/`sync-beta` para `development` e `build-official`/`sync-official` para `stable`, com bloqueio final pelo diff preparado.

## Testes completos

Todos passaram:

- `python3 tools/test_publication_isolation.py`
- `python3 tools/test_release_integrity.py`
- `node tools/test_advanced_analytics.js`
- `node tools/test_data_safety_net.js`
- `node ../cronometro-app-reference/tools/test_uze_reconciliation.js`
- `node ../cronometro-app-reference/tools/test_analytics_ui.js`
- `node --check` em todos os JavaScript rastreados
- `python3 -m py_compile` em todos os Python rastreados, com cache direcionado a `/tmp`
- parse real do YAML de `.github/workflows/pages.yml`
- `git diff --check HEAD^ HEAD`
- builds completos Beta e Oficial em `/tmp`
- reprodução adversarial de traversal, compartilhados, atomicidade e symlink

## Risco residual não bloqueante

Na primeira publicação histórica sem manifesto anterior, `sw.js` não inclui `.official-assets.json` no precache. Após o manifesto passar a existir, o próximo build inclui esse arquivo na lista de assets do Service Worker; por isso a transição da primeira para a segunda geração não é byte a byte idêntica apenas em `sw.js`. Da segunda para a terceira geração, o build foi idempotente (`POST_MIGRATION_REBUILD_IDEMPOTENT=True`).

Isso não afeta deleções, ownership, Beta, menu, conteúdo externo ou isolamento de publicação. É uma diferença de cache da primeira migração e não um bloqueador de segurança ou publicação.

## Estado Git

- Working tree limpa após todos os testes.
- `development` exatamente 1 commit à frente de `origin/development`.
- `main` local e `origin/main`: `abb2adcfa29516615ee4b6f40602f278a91d06cb`.
- `origin/stable`: `284610e3e6730d8ae8c98ee309290835a79c4a33`.
- Repositório `cronometro-app-reference` limpo em `e1b217d3ba81b86a8eb5d8d6e3b10a95289fcaa1`.
- Nenhum commit, amend, merge, deploy ou push de código foi realizado nesta revisão.

## Conclusão final

SEGURO PARA PUSH
