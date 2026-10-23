# Landim Advisory — imagem para rodar em servidor próprio (Coolify, Docker ou qualquer VPS).
# Build:   docker build -t landim-advisory .
# Rodar:   docker run -d -p 3000:3000 --env-file .env --restart unless-stopped landim-advisory
FROM node:24-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --no-audit --no-fund || npm install --no-audit --no-fund

# Motor de leitura de fotos (OCR Tesseract, roda no navegador do cliente): arquivos servidos pelo próprio site.
# Se a instalação falhar, a imagem é gerada mesmo assim e o navegador usa a CDN.
FROM node:24-alpine AS ocr
WORKDIR /ocr
RUN mkdir -p out/lang; \
  if npm install --no-audit --no-fund --no-save tesseract.js@6 @tesseract.js-data/por > /tmp/ocr.log 2>&1; then \
    cp node_modules/tesseract.js/dist/tesseract.min.js node_modules/tesseract.js/dist/worker.min.js out/ 2>/dev/null; \
    cp node_modules/tesseract.js-core/tesseract-core*.js out/ 2>/dev/null; cp node_modules/tesseract.js-core/tesseract-core*.wasm out/ 2>/dev/null; \
    L=$(find node_modules/@tesseract.js-data/por -name por.traineddata.gz | grep best_int | head -1); [ -n "$L" ] || L=$(find node_modules/@tesseract.js-data/por -name por.traineddata.gz | head -1); \
    [ -n "$L" ] && cp "$L" out/lang/; \
  else echo "OCR local indisponível; o navegador vai usar a CDN"; tail -5 /tmp/ocr.log; fi; \
  ls -la out out/lang; true

FROM node:24-alpine AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
# versão dos scripts do painel (o Coolify informa o commit em SOURCE_COMMIT)
ARG SOURCE_COMMIT=""
ENV SOURCE_COMMIT=$SOURCE_COMMIT
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:24-alpine AS app
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
RUN addgroup -S app && adduser -S app -G app
COPY --from=build /app/public ./public
COPY --from=ocr /ocr/out ./public/vendor/ocr
COPY --from=build --chown=app:app /app/.next/standalone ./
COPY --from=build --chown=app:app /app/.next/static ./.next/static
USER app
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 CMD wget -qO- http://127.0.0.1:3000/api/saude >/dev/null || exit 1
CMD ["node", "server.js"]
