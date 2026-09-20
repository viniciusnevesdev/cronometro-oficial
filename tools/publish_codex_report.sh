#!/usr/bin/env bash
set -euo pipefail

SOURCE="${1:-}"
SLUG="${2:-relatorio}"

if [[ -z "$SOURCE" || ! -f "$SOURCE" ]]; then
  echo "Uso: $0 /caminho/relatorio.md [slug]" >&2
  exit 2
fi

ROOT="$(git rev-parse --show-toplevel)"
cd "$ROOT"

git fetch origin codex-reports >/dev/null

TMP="$(mktemp -d)"
cleanup() {
  git worktree remove --force "$TMP" >/dev/null 2>&1 || true
  rm -rf "$TMP" >/dev/null 2>&1 || true
}
trap cleanup EXIT

git worktree add --detach "$TMP" origin/codex-reports >/dev/null

SAFE_SLUG="$(printf '%s' "$SLUG" | tr '[:upper:] ' '[:lower:]-' | tr -cd 'a-z0-9._-')"
[[ -n "$SAFE_SLUG" ]] || SAFE_SLUG="relatorio"

STAMP="$(date -u +%Y-%m-%dT%H-%M-%SZ)"
REPORT_DIR="$TMP/.codex-reports"
mkdir -p "$REPORT_DIR"

cp "$SOURCE" "$REPORT_DIR/latest.md"
cp "$SOURCE" "$REPORT_DIR/${STAMP}-${SAFE_SLUG}.md"

cd "$TMP"
git add .codex-reports

if git diff --cached --quiet; then
  echo "Relatório sem mudanças; nada para publicar."
  exit 0
fi

git -c user.name="Codex Reports" \
    -c user.email="codex-reports@users.noreply.github.com" \
    commit -m "docs(reports): ${SAFE_SLUG} ${STAMP}" >/dev/null

git push origin HEAD:codex-reports >/dev/null

echo "Relatório publicado em codex-reports:"
echo "  .codex-reports/latest.md"
echo "  .codex-reports/${STAMP}-${SAFE_SLUG}.md"
