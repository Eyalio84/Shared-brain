#!/usr/bin/env bash
# smoke.sh — fast project health check for shared-brain.
# Runs typecheck + production build. Use before committing app code.

set -uo pipefail
cd "$(dirname "$0")/.."

fail() { echo "[FAIL] $1"; exit 1; }
ok()   { echo "[OK]   $1"; }

command -v npm >/dev/null || fail "npm not found on PATH"
[ -d node_modules ] || fail "node_modules missing — run 'npm install' (on Termux: 'npm install --no-bin-links --ignore-scripts')"

# Detect Termux — runtime (build) is blocked there by Android's dlopen policy.
IS_TERMUX=0
[ -d /data/data/com.termux ] && [ -z "${PROOT_ROOT:-}" ] && IS_TERMUX=1

echo "[...] typecheck"
# Direct node invocation works on every platform and doesn't need .bin/ symlinks.
node ./node_modules/typescript/bin/tsc --noEmit || fail "typecheck failed"
ok "typecheck"

if [ "$IS_TERMUX" = "1" ]; then
  echo "[SKIP] build — Termux detected. Native modules (lightningcss) can't dlopen from /storage."
  echo "        Run 'npm run build' in proot Ubuntu or on laptop/PC instead."
  ok "smoke passed (typecheck only — Termux)"
  exit 0
fi

echo "[...] production build"
npm run build >/dev/null 2>&1 || fail "build failed — run 'npm run build' to see errors"
ok "build"

ok "smoke passed"
