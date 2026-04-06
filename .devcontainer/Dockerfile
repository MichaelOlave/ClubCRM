FROM node:22-bookworm-slim

ARG UV_VERSION=0.10.10

ENV DEBIAN_FRONTEND=noninteractive
ENV PNPM_HOME=/pnpm
ENV PNPM_STORE_DIR=/pnpm/store
ENV PYTHONDONTWRITEBYTECODE=1
ENV PATH=/root/.local/bin:/pnpm:$PATH

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        bash \
        curl \
        git \
        openssh-client \
        python3 \
        python3-venv \
        ca-certificates \
    && find /usr/lib -type f -name '*.pyc' -delete \
    && rm -rf /var/lib/apt/lists/*

RUN curl -LsSf https://astral.sh/uv/${UV_VERSION}/install.sh | sh

RUN corepack enable
