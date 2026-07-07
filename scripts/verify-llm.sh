#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
echo "==> virtual-science-lab — verify"
python3 -m venv venv 2>/dev/null || true
source venv/bin/activate
pip install -q -r requirements.txt
PYTHONPATH=. pytest tests/ -q
(cd client && npm ci && npm run build)
