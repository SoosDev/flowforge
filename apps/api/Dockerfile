FROM node:22-alpine
WORKDIR /repo
RUN corepack enable

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY tsconfig.base.json ./

COPY packages/shared/package.json packages/shared/
COPY packages/ui/package.json packages/ui/
COPY packages/sdk/package.json packages/sdk/
COPY apps/api/package.json apps/api/
COPY apps/worker/package.json apps/worker/
COPY apps/dashboard/package.json apps/dashboard/

RUN pnpm install --frozen-lockfile --ignore-scripts

COPY packages/shared/src packages/shared/src
COPY apps/api/src apps/api/src

RUN pnpm --filter @flowforge/shared build
RUN pnpm --filter @flowforge/api build

COPY packages/shared/migrations packages/shared/migrations

WORKDIR /repo/apps/api
EXPOSE 3001
CMD ["node", "dist/index.js"]
