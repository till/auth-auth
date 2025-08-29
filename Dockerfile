FROM node:22-trixie-slim AS base

RUN DEBIAN_FRONTEND=noninteractive \
  apt update \
  && apt upgrade

FROM base AS builder

WORKDIR /build

COPY . ./

RUN npm ci --omit=dev

FROM base AS runner
WORKDIR /app

ARG TARGETARCH
ARG HONO_UID=10111
ARG LITESTREAM_VERSION=v0.3.13

RUN addgroup --system --gid ${HONO_UID} nodejs
RUN adduser --system --uid ${HONO_UID} hono

ADD https://github.com/benbjohnson/litestream/releases/download/${LITESTREAM_VERSION}/litestream-${LITESTREAM_VERSION}-linux-${TARGETARCH}.deb /tmp
RUN DEBIAN_FRONTEND=noninteractive \
  apt install /tmp/litestream-${LITESTREAM_VERSION}-linux-${TARGETARCH}.deb

COPY --from=builder --chown=hono:nodejs /build /app

USER ${HONO_UID}:${HONO_UID}
EXPOSE 3000

ENTRYPOINT ["npm", "run"]
CMD ["start"]
