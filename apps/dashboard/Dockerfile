FROM node:22-alpine AS builder
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
COPY packages/ui/src packages/ui/src
COPY apps/dashboard/src apps/dashboard/src
COPY apps/dashboard/index.html apps/dashboard/
COPY apps/dashboard/vite.config.ts apps/dashboard/

RUN pnpm --filter @flowforge/shared build
RUN pnpm --filter @flowforge/ui build

ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

RUN pnpm --filter @flowforge/dashboard build

FROM nginx:alpine
COPY --from=builder /repo/apps/dashboard/dist /usr/share/nginx/html
COPY apps/dashboard/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
