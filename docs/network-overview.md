# ClubCRM Network Overview

> Written for someone who understands basic networking (IP addresses, ports, DNS, TCP/IP) but has not worked with this cluster before.

---

## Big Picture

The ClubCRM stack runs on three physical servers in a private data center. Those servers form a single Kubernetes cluster. Traffic can reach the cluster two ways: from the internet via a Cloudflare Tunnel, or from a developer machine via Tailscale VPN. Nothing except the Cloudflare tunnel has a public IP.

```
Internet User                   Developer / Ops
     │                               │
     ▼                               ▼
Cloudflare Edge              Tailscale VPN (100.x.x.x)
     │                               │
     └──────────────┬────────────────┘
                    │
           ┌────────▼────────┐
           │  Kubernetes      │
           │  (3 nodes)       │
           │  10.10.10.0/24   │
           └─────────────────┘
```

---

## Layer 1 — Physical Servers

Three Ubuntu 24.04 servers sit on the same LAN segment. Their LAN IPs are static.

| Name    | LAN IP       | Tailscale IP   | Role in K8s          |
| ------- | ------------ | -------------- | -------------------- |
| server1 | 10.10.10.102 | 100.122.118.85 | control-plane + etcd |
| server2 | 10.10.10.103 | 100.67.65.5    | control-plane + etcd |
| server3 | 10.10.10.104 | 100.99.187.90  | control-plane + etcd |

Default gateway (the router) is **10.10.10.1**. All internet-bound traffic from the servers leaves through this router. The servers have no public IPs.

---

## Layer 2 — Management: Tailscale VPN

Tailscale is a VPN that gives every enrolled device a stable `100.x.x.x` address reachable from anywhere, without opening any inbound firewall ports. Each server runs a Tailscale daemon which creates a `tailscale0` virtual interface.

- SSH into the cluster: `ssh champuser@100.122.118.85` (server1, using credentials in `.env.ssh`)
- Tailscale traffic is encrypted end-to-end (WireGuard underneath)
- The servers do **not** accept SSH from the public internet — only from devices on the same Tailscale network

---

## Layer 3 — The Kubernetes Cluster (K3s)

K3s is a lightweight Kubernetes distribution. All three servers are control-plane nodes (no separate worker nodes), sharing cluster state via the built-in etcd database.

### Pod Networking (Flannel)

Every pod gets an IP from the `10.42.0.0/16` range. Each node owns a `/24` slice:

| Node    | Pod subnet   |
| ------- | ------------ |
| server1 | 10.42.0.0/24 |
| server2 | 10.42.1.0/24 |
| server3 | 10.42.2.0/24 |

On each node, a virtual bridge (`cni0`) connects all local pods. Pods on _different_ nodes reach each other through `flannel.1`, a VXLAN overlay tunnel — the pod traffic is wrapped in UDP packets that travel over the LAN (10.10.10.0/24).

### Service Networking

Kubernetes Services get a virtual IP from `10.43.0.0/16`. These IPs don't belong to any real interface — kube-proxy (or its K3s equivalent) uses iptables rules to intercept traffic destined for a service IP and redirect it to one of the backing pods. DNS inside the cluster resolves service names like `traefik.kube-system.svc.cluster.local` to these IPs.

### Namespaces

Namespaces are logical groupings — they don't change networking but do scope DNS names and access controls.

| Namespace         | What lives there                           |
| ----------------- | ------------------------------------------ |
| `clubcrm`         | Web app, API, Cloudflare tunnel pod        |
| `clubcrm-data`    | Databases and message broker               |
| `kube-system`     | Traefik (ingress), CoreDNS, metrics-server |
| `kubero`          | Kubero deployment management UI            |
| `longhorn-system` | Longhorn distributed block storage         |

---

## Layer 4 — How Traffic Enters the Cluster

### Traefik (the front door)

Traefik is the **ingress controller** — it's the single process that accepts HTTP/HTTPS requests and routes them to the right application pod.

Traefik runs as a `LoadBalancer` service. K3s handles this without a cloud provider by running a small `svclb-traefik` pod on **every node**. Those pods bind to ports 80 and 443 on the host's LAN IP, so traffic arriving at any of the three server LAN IPs on those ports is forwarded to Traefik.

```
Any server LAN IP :80 / :443
        │
  svclb-traefik (daemonset, one per node)
        │
  Traefik pod (10.43.235.240 — service IP)
        │
  Routes by hostname + path
```

Traefik uses **Ingress** rules to decide where to send a request. The routing table:

| Hostname        | Path prefix | Backend service    | Notes                                   |
| --------------- | ----------- | ------------------ | --------------------------------------- |
| `clubcrm.local` | `/api`      | `clubcrm-api:8000` | Strips `/api` prefix before forwarding  |
| `clubcrm.local` | `/`         | `clubcrm-web:3000` | Sticky session cookie (`clubcrm_route`) |
| `kubero.local`  | `/`         | `kubero:2000`      | Deployment management UI                |

**Sticky sessions** mean a given browser is pinned to the same `clubcrm-web` replica for the life of its session (12-hour cookie). This is important because the web app is stateful per-session.

The **strip-api-prefix middleware** rewrites `/api/users` → `/users` before the request reaches the API pod. The API process never sees the `/api` prefix.

---

## Layer 5 — Public Internet Access (Cloudflare Tunnel)

The cluster has no public IP. Instead, a **Cloudflare Tunnel** creates a persistent outbound connection from inside the cluster to Cloudflare's global edge network. When an internet user hits `demo.clubcrm.org`, Cloudflare's edge receives the request and sends it _back through that tunnel_ — no inbound firewall ports required.

The tunnel pod (`cloudflared-tunnel`) runs in the `clubcrm` namespace. It contains two containers:

```
┌─────────────────────────── cloudflared-tunnel pod ───────────────────────────┐
│                                                                               │
│  [cloudflared container]   ←── persistent QUIC/HTTP2 connection ──→  Cloudflare Edge  ←── demo.clubcrm.org
│         │                                                                     │
│         │ sends request to:                                                   │
│         ▼                                                                     │
│  traefik.kube-system.svc.cluster.local:80                                    │
│  (with Host header set to clubcrm.local)                                     │
│                                                                               │
│  [tunnel-proxy / nginx]  — listens on :3001 — (used as fallback proxy)       │
└───────────────────────────────────────────────────────────────────────────────┘
```

Once the request hits Traefik with `Host: clubcrm.local`, it's treated exactly the same as a local request — routed to web or API pods by path.

**Why set `Host: clubcrm.local`?** Traefik's routing rules match on the hostname. The public domain (`demo.clubcrm.org`) isn't in Traefik's routing table — `clubcrm.local` is. The tunnel rewrites the header so Traefik knows what to do with the request.

---

## Application Pods

### Web and API

Both the web frontend and API backend run as **2 replicas each**, spread across server2 and server3:

| Pod                     | Node    | Pod IP     |
| ----------------------- | ------- | ---------- |
| clubcrm-api (replica 1) | server3 | 10.42.2.32 |
| clubcrm-api (replica 2) | server2 | 10.42.1.30 |
| clubcrm-web (replica 1) | server3 | 10.42.2.33 |
| clubcrm-web (replica 2) | server2 | 10.42.1.29 |

Kubernetes Services (`clubcrm-api` and `clubcrm-web`) load-balance across both replicas automatically. The sticky-session cookie on the web service overrides this for browser sessions.

### Data Services

All data services are **StatefulSets** — they have a stable network identity and persistent storage.

| Service  | Namespace    | Protocol | Port  | Node    | Type       |
| -------- | ------------ | -------- | ----- | ------- | ---------- |
| postgres | clubcrm-data | TCP      | 5432  | server1 | Headless\* |
| redis    | clubcrm-data | TCP      | 6379  | server1 | Headless\* |
| mongodb  | clubcrm-data | TCP      | 27017 | server3 | Headless\* |
| kafka    | clubcrm-data | TCP      | 9092  | server3 | Headless\* |

\*Headless (`clusterIP: None`) means there is no virtual service IP. DNS resolves directly to the pod IP. This is appropriate for StatefulSets where callers need to connect to a specific instance. A connection string like `mongodb.clubcrm-data.svc.cluster.local:27017` resolves directly to the mongodb pod.

Kafka also uses port **9093** internally for its KRaft controller-to-controller communication (the quorum protocol that replaces ZooKeeper).

Data services are **not reachable from outside the cluster** — they have no Ingress rules and no NodePort exposure.

---

## Storage — Longhorn

Longhorn provides distributed block storage across all three nodes. When a StatefulSet pod needs a persistent volume (e.g., MongoDB's `/data/db`), Longhorn creates a virtual block device that can be replicated across nodes. If a node fails, the volume can be attached to a pod on a surviving node.

Longhorn has its own internal HTTP services (`longhorn-backend`, `longhorn-frontend`) used by the Longhorn manager and UI — these are ClusterIP only and not exposed externally.

---

## Full Request Path — Example: Browser visits `demo.clubcrm.org/api/members`

```
1. Browser DNS lookup: demo.clubcrm.org
   → Cloudflare returns its own edge IP (Cloudflare proxy)

2. Browser connects to Cloudflare edge over HTTPS

3. Cloudflare routes the request through the outbound tunnel to the cloudflared pod

4. cloudflared rewrites Host header: demo.clubcrm.org → clubcrm.local
   Forwards to: http://traefik.kube-system.svc.cluster.local:80

5. CoreDNS resolves traefik.kube-system.svc.cluster.local → 10.43.235.240
   iptables redirects 10.43.235.240:80 to the Traefik pod

6. Traefik sees: Host=clubcrm.local, Path=/api/members
   Matches Ingress rule: /api → clubcrm-api:8000
   Applies strip-api middleware: /api/members → /members
   Forwards to one of the clubcrm-api pods (e.g., 10.42.2.32:8000)

7. clubcrm-api processes the request, queries MongoDB:
   DNS: mongodb.clubcrm-data.svc.cluster.local → 10.42.2.35
   Connects to MongoDB on port 27017

8. Response travels back up the same chain to the browser
```

---

## IP Address Summary

| Range         | Purpose                                      |
| ------------- | -------------------------------------------- |
| 10.10.10.0/24 | Server LAN — physical node addresses         |
| 10.42.0.0/16  | Pod network (Flannel) — one /24 per node     |
| 10.43.0.0/16  | Kubernetes service virtual IPs               |
| 100.x.x.x     | Tailscale VPN — management access            |
| 172.17.0.0/16 | Docker bridge (legacy, not used by K3s pods) |

---

## Port Summary — Inbound to the Cluster

| Port (on LAN IPs) | Protocol | Purpose                                                  |
| ----------------- | -------- | -------------------------------------------------------- |
| 22                | TCP      | SSH (only reachable via Tailscale in practice)           |
| 80                | TCP      | HTTP — handled by Traefik via svclb-traefik daemonset    |
| 443               | TCP      | HTTPS — handled by Traefik via svclb-traefik daemonset   |
| 31078             | TCP      | NodePort for Traefik HTTP (same as 80, alternate path)   |
| 31425             | TCP      | NodePort for Traefik HTTPS (same as 443, alternate path) |

No data service ports (5432, 6379, 27017, 9092) are exposed outside the cluster.
