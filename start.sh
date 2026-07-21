#!/usr/bin/env bash
set -euo pipefail
root="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
[[ -f "$root/.env" ]] || { echo 'Missing .env; copy .env.example and configure it.' >&2; exit 1; }
[[ -d "$root/node_modules" && -d "$root/client/node_modules" ]] || { echo 'Dependencies missing; run scripts/bootstrap.sh.' >&2; exit 1; }
BACKEND_PORT="${BACKEND_PORT:-${PORT:-3001}}"; PORT="$BACKEND_PORT"; FRONTEND_PORT="${FRONTEND_PORT:-5173}"; CORS_ORIGINS="${CORS_ORIGINS:-http://127.0.0.1:$FRONTEND_PORT,http://localhost:$FRONTEND_PORT}"; export BACKEND_PORT PORT FRONTEND_PORT CORS_ORIGINS
for port in "$BACKEND_PORT" "$FRONTEND_PORT"; do ! lsof -nP -iTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1 || { echo "Port $port is already in use; refusing to terminate its owner." >&2; exit 1; }; done
cleanup(){ kill "${backend_pid:-}" "${frontend_pid:-}" 2>/dev/null || true; }
trap cleanup EXIT INT TERM
(cd "$root" && node server/index.js) & backend_pid=$!
(cd "$root/client" && npm run dev -- --host 127.0.0.1 --port "$FRONTEND_PORT") & frontend_pid=$!
wait "$backend_pid" "$frontend_pid"
