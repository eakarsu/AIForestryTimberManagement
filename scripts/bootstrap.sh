#!/usr/bin/env bash
set -euo pipefail
root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
(cd "$root" && npm ci)
(cd "$root/client" && npm ci)
echo 'Dependencies installed from lockfiles. Configure .env, then run scripts/migrate.sh.'
