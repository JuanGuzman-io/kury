FROM node:22-alpine

WORKDIR /workspace

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY api/package.json api/package.json
COPY web/package.json web/package.json
COPY packages/contracts/package.json packages/contracts/package.json
RUN pnpm install --frozen-lockfile --ignore-scripts

COPY . .
RUN pnpm --filter @kuri/contracts build

EXPOSE 3000

CMD ["pnpm", "--filter", "web", "exec", "next", "dev", "--hostname", "0.0.0.0"]
