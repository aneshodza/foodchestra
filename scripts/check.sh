#!/usr/bin/env bash
# Full lint + typecheck across all workspaces. Runs automatically on git push.
# Also useful before opening a PR: npm run check

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

GREEN='\033[0;32m'
ORANGE='\033[0;33m'
RED='\033[0;31m'
BOLD='\033[1m'
NC='\033[0m'

info()    { printf "\n${BOLD}==> %s${NC}\n" "$1"; }
success() { printf "${GREEN}    ✔ %s${NC}\n" "$1"; }
fail()    { printf "${RED}    ✘ %s${NC}\n" "$1"; }

FAILED=()

run() {
  local label="$1"; shift
  if "$@"; then
    success "$label"
  else
    fail "$label"
    FAILED+=("$label")
  fi
}

info "ESLint (all workspaces)..."
run "backend"  npm run lint --workspace=backend  --prefix "$ROOT"
run "frontend" npm run lint --workspace=frontend --prefix "$ROOT"
run "sdk"      npm run lint --workspace=sdk      --prefix "$ROOT"
run "agent"    npm run lint --workspace=agent    --prefix "$ROOT"
run "mcp"      npm run lint --workspace=mcp      --prefix "$ROOT"

info "Stylelint (frontend SCSS)..."
run "frontend scss" npm run lint:scss --workspace=frontend --prefix "$ROOT"

info "TypeScript type-check (all workspaces)..."
run "backend typecheck"  npm run typecheck --workspace=backend  --prefix "$ROOT"
run "frontend typecheck" npm run typecheck --workspace=frontend --prefix "$ROOT"
run "sdk typecheck"      npm run typecheck --workspace=sdk      --prefix "$ROOT"
run "agent typecheck"    npm run typecheck --workspace=agent    --prefix "$ROOT"
run "mcp typecheck"      npm run typecheck --workspace=mcp      --prefix "$ROOT"

echo ""
if [ ${#FAILED[@]} -eq 0 ]; then
  printf "${GREEN}${BOLD}✔ All checks passed${NC}\n"
else
  printf "${RED}${BOLD}✘ ${#FAILED[@]} check(s) failed:${NC}\n"
  for f in "${FAILED[@]}"; do
    printf "${RED}    - %s${NC}\n" "$f"
  done
  exit 1
fi
