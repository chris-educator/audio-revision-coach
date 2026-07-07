#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
echo "==> audio-revision-coach — ship"
bash scripts/verify-llm.sh
git push origin HEAD
HEALTH_URL="${APP_PUBLIC_URL:-https://revise.appstax.ai}/api/health"
curl -fsS "$HEALTH_URL"
