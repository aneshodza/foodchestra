#!/usr/bin/env bash
# Drops and recreates the local dev database.
# Migrations run automatically on next backend start.
# Usage: npm run db:reset

GREEN='\033[0;32m'
ORANGE='\033[0;33m'
RED='\033[0;31m'
BOLD='\033[1m'
NC='\033[0m'

info()    { printf "${BOLD}==> %s${NC}\n" "$1"; }
success() { printf "${GREEN}    ✔ %s${NC}\n" "$1"; }
warn()    { printf "${ORANGE}    ~ %s${NC}\n" "$1"; }
fail()    { printf "${RED}    ✘ %s${NC}\n" "$1"; }

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="$ROOT/backend/.env"

if [ ! -f "$ENV_FILE" ]; then
  fail "backend/.env not found — run npm run setup first"
  exit 1
fi

# Extract DATABASE_URL from .env
DATABASE_URL=$(grep -E '^DATABASE_URL=' "$ENV_FILE" | cut -d '=' -f2-)
if [ -z "$DATABASE_URL" ]; then
  fail "DATABASE_URL not set in backend/.env"
  exit 1
fi

warn "This will DROP and recreate the local database. All data will be lost."
printf "${ORANGE}Continue? [y/N] ${NC}"
read -r confirm
if [[ "$confirm" != "y" && "$confirm" != "Y" ]]; then
  warn "Aborted"
  exit 0
fi

info "Stopping backend (if running on port 3000)..."
lsof -ti :3000 | xargs kill -9 2>/dev/null && success "Backend stopped" || warn "Nothing running on port 3000"

info "Dropping database..."
if docker compose -f "$ROOT/docker-compose.yml" exec -T db psql "$DATABASE_URL" -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"; then
  success "Database dropped and recreated"
else
  fail "Could not connect to database — is Docker running? (docker compose up -d)"
  exit 1
fi

success "Done — migrations will run automatically on next: npm run dev:backend"
