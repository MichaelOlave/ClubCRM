# Production Monitor Server

This document covers the Hostinger VPS that hosts the live ClubCRM monitoring stack and the
production Docker-based app environment.

Last verified: **2026-04-28**

---

## Server Identity

| Property       | Value                                                |
| -------------- | ---------------------------------------------------- |
| Hostname       | `srv881749.hstgr.cloud`                              |
| Public IP      | `31.97.142.155`                                      |
| Tailscale IP   | `100.99.164.88` (name: `srv881749`)                  |
| Tailscale user | `michael@`                                           |
| OS             | Debian GNU/Linux 12 (Bookworm)                       |
| CPU            | AMD EPYC 9354P, 4 vCPUs                              |
| RAM            | 15 GiB                                               |
| Disk           | 197 GiB SSD, 79 GiB used (42%)                       |
| Uptime         | 147 days (as of 2026-04-28)                          |
| SSH user       | `clubcrm` (key-based, also accessible via Tailscale) |

---

## Purpose

This server has two primary roles:

1. **ClubCRM monitoring stack** — runs `monitor-api` and `monitor-web` for the cluster visualizer
   demo, watching the live k3s cluster via a mounted kubeconfig.
2. **ClubCRM production Docker stack** — runs the full ClubCRM app (web, api, postgres, redis,
   mongodb, kafka) as a standalone Docker Compose deployment, separate from the k3s cluster.

It also hosts unrelated projects (commission API, n8n, Grafana/Loki) that share the same server.

---

## Repo Location

The ClubCRM repo is checked out at:

```
/opt/clubcrm
```

Compose files on this host:

| File                                                          | Purpose                                 |
| ------------------------------------------------------------- | --------------------------------------- |
| `/opt/clubcrm/infra/docker-compose.production.yml`            | ClubCRM app stack (infra-\* containers) |
| `/opt/clubcrm/infra/monitoring/docker-compose.monitoring.yml` | Monitor stack                           |

---

## Running Docker Containers

As of **2026-04-28**:

| Container name             | Image                                          | Status       | Exposed Ports          |
| -------------------------- | ---------------------------------------------- | ------------ | ---------------------- |
| `monitoring-monitor-api-1` | `clubcrm-monitor-api:deploy`                   | Up           | `0.0.0.0:8010->8010`   |
| `monitoring-monitor-app-1` | `clubcrm-monitor-web:deploy`                   | Up           | 3002 (internal only)   |
| `monitoring-monitor-web-1` | `nginx:1.27-alpine`                            | Up           | `0.0.0.0:3002->3002`   |
| `infra-web-1`              | `ghcr.io/michaelolave/clubcrm-web:bb94b940...` | Up (healthy) | `127.0.0.1:3001->3000` |
| `infra-api-1`              | `ghcr.io/michaelolave/clubcrm-api:bb94b940...` | Up (healthy) | `127.0.0.1:8001->8000` |
| `infra-kafka-1`            | `confluentinc/cp-kafka:7.8.0`                  | Up (healthy) | 9092 (internal)        |
| `infra-postgres-1`         | `postgres:17`                                  | Up (healthy) | 5432 (internal)        |
| `infra-redis-1`            | `redis:7`                                      | Up (healthy) | 6379 (internal)        |
| `infra-mongodb-1`          | `mongo:8`                                      | Up (healthy) | 27017 (internal)       |
| `commission-api-prod`      | `michaelolave/commission-api:patch`            | Up (healthy) | 80 (internal)          |
| `commission-nginx-prod`    | `nginx:alpine`                                 | Up (healthy) | `0.0.0.0:8082->80`     |
| `commission-loki`          | `grafana/loki:latest`                          | Up           | `0.0.0.0:3100->3100`   |
| `commission-watchtower`    | `nickfedor/watchtower:latest`                  | Up (healthy) | 8080 (internal)        |
| `commission-grafana`       | `grafana/grafana:latest`                       | Up           | `0.0.0.0:3000->3000`   |
| `commission-tunnel`        | `cloudflare/cloudflared:latest`                | Up           | —                      |
| `n8n-compose-n8n-1`        | `docker.n8n.io/n8nio/n8n`                      | Up           | `127.0.0.1:5678->5678` |

The deployed ClubCRM image tag is `bb94b940caed5a413e0563de137bb1866f3733b4` (matches what the k3s cluster runs).

---

## Docker Networks

| Network name                                   | Subnet        | Used by                             |
| ---------------------------------------------- | ------------- | ----------------------------------- |
| `commission-api-deployment_commission-network` | 172.19.0.0/16 | Monitor stack + commission services |
| `infra_default`                                | 10.0.1.0/24   | ClubCRM app stack                   |
| `n8n-compose_default`                          | 172.21.0.1/16 | n8n                                 |
| `bridge` (default Docker)                      | 172.17.0.1/16 | unused                              |

The monitoring stack (`monitor-api`, `monitor-app`, `monitor-web`) and the commission services
share `commission-api-deployment_commission-network` so `monitor-api` can reach its dependencies.

---

## Port Map (public-facing)

| Port | Protocol | Service                         | Notes                               |
| ---- | -------- | ------------------------------- | ----------------------------------- |
| 22   | TCP      | SSH                             | Key-based only                      |
| 80   | TCP      | nginx / Coolify proxy           | Routes public HTTP traffic          |
| 443  | TCP      | nginx / Coolify proxy (TLS)     | TLS termination for public domains  |
| 3000 | TCP      | Grafana                         | Commission project dashboards       |
| 3002 | TCP      | Monitor nginx same-origin proxy | ClubCRM cluster visualizer (public) |
| 3100 | TCP      | Grafana Loki                    | Log aggregation (commission)        |
| 8010 | TCP      | monitor-api                     | ClubCRM cluster monitor FastAPI     |
| 8082 | TCP      | commission-nginx                | Commission API frontend             |

Internal-only (bound to `127.0.0.1` or Docker network only):

| Port | Service                                |
| ---- | -------------------------------------- |
| 3001 | infra-web-1 (ClubCRM web, prod Docker) |
| 8001 | infra-api-1 (ClubCRM API, prod Docker) |
| 5678 | n8n                                    |

---

## Monitoring Stack Architecture

```
Browser
  │
  ▼
:3002  (monitor-web / nginx same-origin proxy)
  │
  ├── /                   →  monitor-app (Next.js) :3002
  ├── /monitor-api/       →  monitor-api (FastAPI) :8010
  └── /ws/stream          →  monitor-api WebSocket :8010
  └── /monitor-api/ws/stream → monitor-api WebSocket :8010
```

The nginx proxy configuration is at `infra/monitoring/nginx.monitor-proxy.conf`. All browser
traffic goes through port 3002 to avoid mixed-content and WebSocket protocol mismatches.

`monitor-api` connects to the live k3s cluster via a kubeconfig mounted from the host. It also
runs HTTP probes against `demo.clubcrm.org`.

---

## Deploying / Updating

### Update monitor stack images and restart

```bash
cd /opt/clubcrm
git pull
docker compose --env-file .env -f infra/monitoring/docker-compose.monitoring.yml build
docker compose --env-file .env -f infra/monitoring/docker-compose.monitoring.yml up -d
```

### Update the production ClubCRM app stack

The `infra-web-1` and `infra-api-1` containers use GHCR image tags. Pull and restart:

```bash
cd /opt/clubcrm
docker compose --env-file .env -f infra/docker-compose.production.yml pull
docker compose --env-file .env -f infra/docker-compose.production.yml up -d
```

A Watchtower container (`commission-watchtower`) monitors some containers for automatic updates.

---

## Verification

```bash
# Monitor API health
curl http://31.97.142.155:8010/health

# Monitor API snapshot (cluster state)
curl http://31.97.142.155:8010/api/snapshot

# Monitor dashboard (through nginx proxy)
curl http://31.97.142.155:3002

# ClubCRM prod API (Docker stack)
curl http://127.0.0.1:8001/health
```

---

## Tailscale

The server is enrolled in the `michael@` Tailscale network as `srv881749`. The k3s cluster nodes
communicate with this server directly over Tailscale (e.g. `monitor-api` pulls cluster state from
server1 at `100.122.118.85` using the kubeconfig).

The active Tailscale connections from this server (as of 2026-04-28):

```
srv881749 (100.99.164.88) → clubcrm-server-1 (100.122.118.85): active, direct
```
