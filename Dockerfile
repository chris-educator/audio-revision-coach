FROM node:20-bookworm-slim AS frontend-build
WORKDIR /app/client

ENV NPM_CONFIG_PRODUCTION=false

COPY client/package.json client/package-lock.json* ./
RUN npm install

COPY client/ ./
RUN npm run build

FROM python:3.12-slim
WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY server/ server/
COPY src/ src/
COPY tests/ tests/
COPY pytest.ini .
COPY --from=frontend-build /app/client/dist client/dist

EXPOSE 8029
CMD ["sh", "-c", "uvicorn server.main:app --host 0.0.0.0 --port ${PORT:-8029}"]
