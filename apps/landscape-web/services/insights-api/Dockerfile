FROM node:22-alpine AS dependencies

WORKDIR /service
COPY apps/landscape-web/services/insights-api/package.json apps/landscape-web/services/insights-api/package-lock.json ./
RUN npm ci

FROM dependencies AS build

COPY apps/landscape-web/services/insights-api/tsconfig.json ./
COPY apps/landscape-web/services/insights-api/src ./src
COPY apps/landscape-web/lib /lib
RUN npm run build

FROM node:22-alpine AS runtime

ENV NODE_ENV=production
ENV HOST=0.0.0.0
WORKDIR /service

COPY apps/landscape-web/services/insights-api/package.json apps/landscape-web/services/insights-api/package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=build /service/dist ./dist
COPY data/agentic-ai-projects.csv ./data/agentic-ai-projects.csv

USER node
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8080/healthz >/dev/null || exit 1

CMD ["node", "dist/index.js"]
