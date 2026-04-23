#!/usr/bin/env bash
# smoke.sh — fast project health check for shared-brain.
# Runs typecheck + production build. Use before committing app code.

set -uo pipefail
cd "$(dirname "$0")/.."

fail() { echo "[FAIL] $1"; exit 1; }
ok()   { echo "[OK]   $1"; }

command -v npm >/dev/null || fail "npm not found on PATH"
[ -d node_modules ] || fail "node_modules missing — run 'npm install --no-bin-links'"

echo "[...] typecheck"
# Direct node invocation — FUSE filesystem (Android) doesn't support .bin/ symlinks
node ./node_modules/typescript/bin/tsc --noEmit || fail "typecheck failed"
ok "typecheck"

echo "[...] production build"
npm run build >/dev/null 2>&1 || fail "build failed — run 'npm run build' to see errors"
ok "build"

ok "smoke passed"
