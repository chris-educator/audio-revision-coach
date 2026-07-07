# AGENTS — Virtual Science Lab (V1)

PhET simulations with AI explanations for Australian secondary students.

## Stack

- `client/` — Vite, React, student EdStack chrome
- `server/` — FastAPI, EdStack billing
- `src/labs/` — preset lab catalog (PhET URLs + parameter sliders)
- `src/lab_explain.py`, `src/lab_report.py` — AI explanation + report export

## Local dev

```bash
uvicorn server.main:app --port 8027 --reload
cd client && npm run dev   # :5201
```

## Production

- **Host:** https://lab.appstax.ai
- **EDSTACK_APP_ID:** `virtual-science-lab`
- **Credits:** 1 per lab run (export free)
