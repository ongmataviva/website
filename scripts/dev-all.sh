#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
# Dev local único: servidor CMS (proxy → filesystem) + Worker.
# Localmente nunca se usa GitHub/Google: o proxy (localhost:9191)
# escreve direto em content/ e o Painel faz login automático.
#   - cms:server → http://localhost:9191  (backend proxy do admin)
#   - wrangler dev → http://localhost:8786 (assets dist/ + Worker)
# ─────────────────────────────────────────────────────────────
set -euo pipefail
cd "$(dirname "$0")/.."

# Se o proxy já estiver no ar (ex.: outra instância do cms:server), reutiliza.
CMS_PID=""
if curl -sf -X POST -H "Content-Type: application/json" \
  -d '{"action":"info"}' http://localhost:9191/api/v1 >/dev/null 2>&1; then
  echo "cms:server já está rodando em :9191 — reutilizando."
else
  # cms:server = esbuild do server/index.mjs + node. Sobe o proxy em 9191.
  pnpm cms:server &
  CMS_PID=$!
fi

cleanup() {
  if [ -n "$CMS_PID" ]; then
    kill "$CMS_PID" 2>/dev/null || true
    wait "$CMS_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT INT TERM

# wrangler dev = assets (dist) + Worker (porta 8786, wrangler.jsonc).
pnpm dev:worker
