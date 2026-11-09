#!/usr/bin/env bash
# Smoke test every demo in the gallery. Needs the dev server on port 5180.
set -uo pipefail
DEMOS=(third-person first-person top-down twin-stick arena chess portal farm tron delivery vehicle tower-defense platformer characters inventory blank)
failed=0
for demo in "${DEMOS[@]}"; do
    printf '%-14s ' "$demo"
    if ! node tools/smoke.mjs "http://localhost:5180/?demo=$demo" >/tmp/smoke-$demo.log 2>&1; then
        echo "FAIL (see /tmp/smoke-$demo.log)"
        failed=1
    else
        tail -1 /tmp/smoke-$demo.log
    fi
done
exit $failed
