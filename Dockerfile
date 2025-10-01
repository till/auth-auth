FROM node:22-trixie-slim AS base

ARG HONO_UID=10111
RUN addgroup --system --gid ${HONO_UID} nodejs
RUN adduser --system --uid ${HONO_UID} --home /app hono

ARG DEBIAN_FRONTEND=noninteractive
RUN apt update && apt upgrade -y && apt clean

ARG TARGETARCH

ARG LITESTREAM_VERSION=v0.3.13

ADD https://github.com/benbjohnson/litestream/releases/download/${LITESTREAM_VERSION}/litestream-${LITESTREAM_VERSION}-linux-${TARGETARCH}.deb /tmp
RUN DEBIAN_FRONTEND=noninteractive \
  apt install /tmp/litestream-${LITESTREAM_VERSION}-linux-${TARGETARCH}.deb \
  && rm /tmp/litestream-${LITESTREAM_VERSION}-linux-${TARGETARCH}.deb \
  && rm /etc/litestream.yml \
  && litestream version

# copy structure in place
COPY .docker/rootfs/ /

FROM base AS builder

WORKDIR /build

COPY . ./

RUN npm ci --omit=dev && \
  rm -rf .docker/ .dockerignore

FROM base AS runner
WORKDIR /app

COPY --from=builder --chown=hono:nodejs /build .

USER ${HONO_UID}:${HONO_UID}
EXPOSE 3000

ENTRYPOINT ["/usr/bin/entrypoint.sh"]
