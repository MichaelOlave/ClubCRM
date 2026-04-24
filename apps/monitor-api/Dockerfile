FROM python:3.11-slim

ARG UV_VERSION=0.10.10

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PATH=/root/.local/bin:$PATH

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        curl \
        ca-certificates \
    && rm -rf /var/lib/apt/lists/*

RUN curl -LsSf https://astral.sh/uv/${UV_VERSION}/install.sh | sh

COPY apps/monitor-api/requirements.txt ./requirements.txt

RUN uv pip install --system -r requirements.txt

COPY apps/monitor-api/src ./src
COPY infra/monitoring/fixtures ./infra/monitoring/fixtures

EXPOSE 8010

CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8010"]
