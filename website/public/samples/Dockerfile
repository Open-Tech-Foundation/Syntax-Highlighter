# Showcase: Dockerfile — multi-stage build with ARGs, labels, and healthchecks.
# syntax=docker/dockerfile:1

ARG NODE_VERSION=22
ARG PNPM_VERSION=11.21.0
ARG APP_DIR=/srv/app

# ---------- Base image with system dependencies ----------
FROM node:${NODE_VERSION}-slim AS base
LABEL org.opencontainers.image.title="highlight-demo"
LABEL org.opencontainers.image.version="0.4.0"
LABEL org.opencontainers.image.licenses="MIT"
LABEL maintainer="team@example.com"

ENV PNPM_HOME="/pnpm" \
    PATH="/pnpm:${PATH}" \
    NODE_ENV="production" \
    FORCE_COLOR="true"

RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates curl tini \
    && rm -rf /var/lib/apt/lists/* \
    && corepack enable \
    && corepack prepare pnpm@${PNPM_VERSION} --activate

WORKDIR ${APP_DIR}

# ---------- Dependency layer (cached unless lockfile changes) ----------
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/syntax-highlighter/package.json ./packages/syntax-highlighter/
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile --prod=false

# ---------- Build the library ----------
FROM deps AS build
COPY . .
RUN pnpm exec tsr typecheck \
    && pnpm exec tsr lint \
    && pnpm exec tsr build \
    && pnpm prune --prod

# ---------- Production runtime ----------
FROM base AS runtime
COPY --from=build --chown=node:node ${APP_DIR}/packages ./packages
COPY --from=build --chown=node:node ${APP_DIR}/demo/dist ./demo/dist

USER node
EXPOSE 5173/tcp
VOLUME ["/data"]

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -fsS http://127.0.0.1:5173/health || exit 1

ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["node", "packages/syntax-highlighter/dist/cli.js", "--serve", "--port", "5173"]

# ---------- Test stage (not shipped) ----------
FROM build AS test
ENV NODE_ENV="test"
RUN pnpm exec tsr test \
    && pnpm exec tsr test:e2e || echo "e2e needs a browser; skipping"

# ---------- Lint stage for CI reuse ----------
# docker build --target lint .
FROM deps AS lint
COPY . .
RUN pnpm exec tsr typecheck \
    && pnpm exec tsr lint \
    && pnpm exec tsr fmt:check

# ---------- Security scan (example, needs a scanner image) ----------
# COPY --from=aquasec/trivy:latest /usr/local/bin/trivy /usr/local/bin/trivy
# RUN trivy filesystem --severity HIGH,CRITICAL --exit-code 1 /srv/app

# ---------- Debug shell ----------
FROM runtime AS debug
USER root
RUN apt-get update && apt-get install -y --no-install-recommends vim less strace \
    && rm -rf /var/lib/apt/lists/*
USER node
SHELL ["/bin/bash", "-c"]

# Build examples:
#   docker build -t highlight-demo:local .
#   docker build --target test -t highlight-demo:test .
#   docker run --rm -p 5173:5173 -v "$(pwd)/data:/data" highlight-demo:local
#   docker run --rm highlight-demo:local --help
#
# Multi-arch with buildx:
#   docker buildx build --platform linux/amd64,linux/arm64 -t registry/highlight-demo:0.4.0 --push .
#
# Inspect a stage without running it:
#   docker build --target deps -t highlight-deps .
#   docker run --rm -it highlight-deps bash -lc "pnpm list"
#
# Secrets and SSH (never baked into layers):
#   RUN --mount=type=secret,id=npmrc,target=/root/.npmrc pnpm install
#   RUN --mount=type=ssh git ls-remote git@github.com:example/private.git
#   docker build --secret id=npmrc,src=$HOME/.npmrc --ssh default .
