#!/usr/bin/env bash
set -e

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

GREEN='\033[0;32m'
ORANGE='\033[0;33m'
RED='\033[0;31m'
BOLD='\033[1m'
NC='\033[0m'

info()    { printf "${BOLD}==> %s${NC}\n" "$1"; }
success() { printf "${GREEN}    ✔ %s${NC}\n" "$1"; }
skip()    { printf "${ORANGE}    ~ %s${NC}\n" "$1"; }
fail()    { printf "${RED}    ✘ %s${NC}\n" "$1"; }

trap 'fail "Setup failed (see error above)"; exit 1' ERR

info "Installing dependencies..."
npm install --prefix "$ROOT"
success "Dependencies installed"

echo ""
info "Copying .env files..."
for workspace in backend frontend agent; do
  src="$ROOT/$workspace/.env.example"
  dst="$ROOT/$workspace/.env"
  if [ -f "$src" ] && [ ! -f "$dst" ]; then
    cp "$src" "$dst"
    success "Created $workspace/.env"
  elif [ -f "$dst" ]; then
    skip "Skipped $workspace/.env (already exists)"
  else
    fail "No .env.example found in $workspace — skipping"
  fi
done

echo ""
info "Setting up git hooks (husky)..."
cd "$ROOT" && ./node_modules/.bin/husky
success "Git hooks installed"

echo ""
info "Building SDK (required by frontend, backend, mcp, agent)..."
npm run build --workspace=sdk
success "SDK built"

echo ""
info "Building MCP (required by agent)..."
npm run build --workspace=mcp
success "MCP built"

echo ""
printf "${GREEN}${BOLD}Done!${NC} Next steps:\n"
printf "${ORANGE}  1.${NC} Fill in secrets in backend/.env, frontend/.env, agent/.env\n"
printf "${ORANGE}  2.${NC} Start Postgres: ${BOLD}docker compose up -d${NC}\n"
printf "${ORANGE}  3.${NC} Start all services: ${BOLD}npm run dev${NC}\n"
