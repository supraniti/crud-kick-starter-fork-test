FROM node:22-slim

WORKDIR /app

COPY modules/test-modules-pages/public-app-api/package.json ./modules/test-modules-pages/public-app-api/package.json
COPY modules/test-modules-pages/public-app-api/src ./modules/test-modules-pages/public-app-api/src
COPY modules/test-modules-pages/server ./modules/test-modules-pages/server
COPY modules/test-modules-pages/shared ./modules/test-modules-pages/shared
COPY modules/test-modules-layouts/shared ./modules/test-modules-layouts/shared
COPY modules/test-modules-translations/server ./modules/test-modules-translations/server
COPY modules/test-modules-translations/shared ./modules/test-modules-translations/shared
COPY server/runtime/module-data ./server/runtime/module-data

ENV NODE_ENV=production
ENV PORT=8080

EXPOSE 8080

WORKDIR /app/modules/test-modules-pages/public-app-api

CMD ["node", "src/index.mjs"]
