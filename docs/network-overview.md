# ClubCRM Network Overview

> Written for someone who understands basic networking (IP addresses, ports, DNS, TCP/IP) but has not worked with this cluster before.
> Last verified against the live cluster: **2026-04-28**.

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

Three Ubuntu 24.04 servers (QEMU virtual machines) sit on the same LAN segment. Their LAN IPs are static.

| Name    | LAN IP       | Tailscale IP   | Role in K8s          | vCPU | RAM   | Disk |
| ------- | ------------ | -------------- | -------------------- | ---- | ----- | ---- |
| server1 | 10.10.10.102 | 100.122.118.85 | control-plane + etcd | 2    | 7.6Gi | 50G  |
| server2 | 10.10.10.103 | 100.67.65.5    | control-plane + etcd | 2    | 7.6Gi | 50G  |
| server3 | 10.10.10.104 | 100.99.187.90  | control-plane + etcd | 2    | 7.6Gi | 50G  |

Default gateway (the router) is **10.10.10.1**. All internet-bound traffic from the servers leaves through this router. The servers have no public IPs.

Each server runs:

- Ubuntu 24.04.4 LTS
- K3s v1.34.6+k3s1 (container runtime: containerd 2.2.2)
- Tailscale (WireGuard VPN daemon)
- open-iscsi (required by Longhorn for block storage)

Server1 additionally runs Docker CE (used for local image builds/imports).

---

## Layer 2 — Management: Tailscale VPN

Tailscale is a VPN that gives every enrolled device a stable `100.x.x.x` address reachable from anywhere, without opening any inbound firewall ports. Each server runs a Tailscale daemon which creates a `tailscale0` virtual interface.

- SSH into the cluster: `ssh champuser@100.122.118.85` (server1, using credentials in `.env.ssh`)
- Tailscale traffic is encrypted end-to-end (WireGuard underneath)
- The servers do **not** accept SSH from the public internet — only from devices on the same Tailscale network

### Tailscale Network Members

| Device                   | Tailscale IP   | Owner   | Platform | Status (as of 2026-04-28) |
| ------------------------ | -------------- | ------- | -------- | ------------------------- |
| clubcrm-server-1         | 100.122.118.85 | michael | Linux    | online                    |
| clubcrm-server-2         | 100.67.65.5    | michael | Linux    | online                    |
| clubcrm-server-3         | 100.99.187.90  | michael | Linux    | online                    |
| srv881749 (prod monitor) | 100.99.164.88  | michael | Linux    | online                    |
| michaels-macbook-max     | 100.95.238.93  | michael | macOS    | online                    |
| helioslily               | 100.71.246.29  | lily    | Windows  | offline                   |
| github-runnervmeorf1-1   | 100.88.95.105  | michael | Linux    | offline (CI runner)       |
| iphone-15-pro            | 100.70.124.44  | michael | iOS      | online                    |

---

## Layer 3 — The Kubernetes Cluster (K3s)

K3s is a lightweight Kubernetes distribution. All three servers are control-plane nodes (no separate worker nodes), sharing cluster state via the built-in etcd database.

**Software versions (live as of 2026-04-28):**

| Component  | Version      |
| ---------- | ------------ |
| K3s        | v1.34.6+k3s1 |
| containerd | 2.2.2-bd1.34 |
| Traefik    | 3.6.10       |
| Longhorn   | v1.11.1      |
| CoreDNS    | 1.14.2       |
| Kubero     | latest       |

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

| Namespace                | What lives there                                  |
| ------------------------ | ------------------------------------------------- |
| `clubcrm`                | Web app, API, Cloudflare tunnel pods              |
| `clubcrm-data`           | Databases and message broker                      |
| `clubcrm-longhorn-smoke` | Longhorn smoke-test PVC (validation workload)     |
| `kube-system`            | Traefik (ingress), CoreDNS, metrics-server, svclb |
| `kubero`                 | Kubero deployment management UI                   |
| `kubero-operator-system` | Kubero operator controller manager                |
| `longhorn-system`        | Longhorn distributed block storage                |
| `lh-test`                | Longhorn ad-hoc test PVC                          |

---

## Layer 4 — How Traffic Enters the Cluster

### Traefik (the front door)

Traefik is the **ingress controller** — it's the single process that accepts HTTP/HTTPS requests and routes them to the right application pod.

Traefik runs as a `LoadBalancer` service (ClusterIP `10.43.235.240`). K3s handles this without a cloud provider by running a small `svclb-traefik` pod on **every node**. Those pods bind to ports 80 and 443 on the host's LAN IP, so traffic arriving at any of the three server LAN IPs on those ports is forwarded to Traefik. The Traefik pod itself runs on server1.

```
Any server LAN IP :80 / :443
        │
  svclb-traefik (daemonset, one per node)
        │
  Traefik pod (10.43.235.240 — service IP) on server1
        │
  Routes by hostname + path
```

Traefik uses **Ingress** rules to decide where to send a request. The routing table:

| Hostname        | Path prefix | Backend service    | Notes                                                         |
| --------------- | ----------- | ------------------ | ------------------------------------------------------------- |
| `clubcrm.local` | `/api`      | `clubcrm-api:8000` | `strip-api-prefix` middleware strips `/api` before forwarding |
| `clubcrm.local` | `/`         | `clubcrm-web:3000` | Sticky session cookie (`clubcrm_route`)                       |
| `kubero.local`  | `/`         | `kubero:2000`      | Deployment management UI                                      |

**Sticky sessions** mean a given browser is pinned to the same `clubcrm-web` replica for the life of its session (12-hour cookie).

The **strip-api-prefix middleware** rewrites `/api/users` → `/users` before the request reaches the API pod. The API process never sees the `/api` prefix.

---

## Layer 5 — Public Internet Access (Cloudflare Tunnel)

The cluster has no public IP. Instead, a **Cloudflare Tunnel** creates a persistent outbound connection from inside the cluster to Cloudflare's global edge network. When an internet user hits `demo.clubcrm.org`, Cloudflare's edge receives the request and sends it _back through that tunnel_ — no inbound firewall ports required.

The repo-managed tunnel deployment currently targets **1 replica** in the `clubcrm` namespace and
pins it away from `server1` so the storage-heavy node is not also the tunnel entrypoint. The live
April 28 snapshot still showed two running replicas during an earlier rollout, so treat the table
below as historical live evidence rather than the current manifest intent.

Each tunnel pod contains two containers:

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
│  [tunnel-proxy / nginx]  — same-origin proxy for the monitoring dashboard    │
└───────────────────────────────────────────────────────────────────────────────┘
```

Once the request hits Traefik with `Host: clubcrm.local`, it's treated exactly the same as a local request — routed to web or API pods by path.

**Why set `Host: clubcrm.local`?** Traefik's routing rules match on the hostname. The public domain (`demo.clubcrm.org`) isn't in Traefik's routing table — `clubcrm.local` is. The tunnel rewrites the header so Traefik knows what to do with the request.

---

## Application Pods — Current Placement (2026-04-28)

### Web and API

Both the web frontend and API backend run as **2 replicas each**, currently scheduled on server2:

| Pod                     | Node    | Pod IP     |
| ----------------------- | ------- | ---------- |
| clubcrm-api (replica 1) | server2 | 10.42.1.30 |
| clubcrm-api (replica 2) | server2 | 10.42.1.33 |
| clubcrm-web (replica 1) | server2 | 10.42.1.29 |
| clubcrm-web (replica 2) | server2 | 10.42.1.31 |

> Note: Both replicas of each app currently land on server2. For the failover demo to show pod movement between nodes, replicas should be spread via pod anti-affinity. The OrbStack overlay enforces this; the live cluster may need a manual drain/cordon to force redistribution.

Kubernetes Services (`clubcrm-api` ClusterIP `10.43.123.228`, `clubcrm-web` ClusterIP `10.43.242.78`) load-balance across both replicas automatically.

### Cloudflare Tunnel (April 28 live snapshot)

| Pod                            | Node    | Pod IP     |
| ------------------------------ | ------- | ---------- |
| cloudflared-tunnel (replica 1) | server1 | 10.42.0.27 |
| cloudflared-tunnel (replica 2) | server2 | 10.42.1.36 |

### Data Services

All data services are **StatefulSets** with Longhorn-backed persistent volumes. The April 28 live
snapshot below showed PostgreSQL, Redis, and MongoDB on `server1`, but the checked-in manifests now
reserve `server1` away from repo-managed data workloads and hard-pin PostgreSQL, MongoDB, Redis,
and Kafka to `server2` and `server3`.

| Service  | Namespace    | Protocol | Port  | Node    | Pod IP     | Service Type | PVC Size |
| -------- | ------------ | -------- | ----- | ------- | ---------- | ------------ | -------- |
| postgres | clubcrm-data | TCP      | 5432  | server1 | 10.42.0.19 | Headless     | 10Gi     |
| redis    | clubcrm-data | TCP      | 6379  | server1 | 10.42.0.25 | Headless     | 2Gi      |
| mongodb  | clubcrm-data | TCP      | 27017 | server1 | 10.42.0.26 | Headless     | 10Gi     |
| kafka    | clubcrm-data | TCP      | 9092  | server2 | 10.42.1.34 | Headless     | 10Gi     |

Headless (`clusterIP: None`) means there is no virtual service IP. DNS resolves directly to the pod IP. A connection string like `mongodb.clubcrm-data.svc.cluster.local:27017` resolves directly to the mongodb pod.

Kafka also uses port **9093** internally for KRaft controller-to-controller communication (replaces ZooKeeper).

Data services are **not reachable from outside the cluster** — they have no Ingress rules and no NodePort exposure.

### System Pods (kube-system)

| Pod                    | Node    | Pod IP    | Purpose                        |
| ---------------------- | ------- | --------- | ------------------------------ |
| traefik                | server1 | 10.42.0.5 | Ingress controller             |
| coredns                | server1 | 10.42.0.6 | Cluster DNS                    |
| metrics-server         | server1 | 10.42.0.7 | Resource metrics (kubectl top) |
| local-path-provisioner | server1 | 10.42.0.8 | Default local-path storage     |
| svclb-traefik          | server1 | 10.42.0.4 | ServiceLB pod (binds :80/:443) |
| svclb-traefik          | server2 | 10.42.1.4 | ServiceLB pod (binds :80/:443) |
| svclb-traefik          | server3 | 10.42.2.3 | ServiceLB pod (binds :80/:443) |

---

## Storage — Longhorn

Longhorn v1.11.1 provides distributed block storage across all three nodes. When a StatefulSet pod needs a persistent volume, Longhorn creates a virtual block device replicated across nodes. If a node fails, the volume can be re-attached on a surviving node.

### Storage Classes

| Storage Class            | Provisioner           | Reclaim | Binding Mode | Volume Expansion | Purpose                               |
| ------------------------ | --------------------- | ------- | ------------ | ---------------- | ------------------------------------- |
| `longhorn` (default)     | driver.longhorn.io    | Delete  | Immediate    | yes              | General Longhorn volumes (3 replicas) |
| `clubcrm-longhorn`       | driver.longhorn.io    | Delete  | Immediate    | yes              | ClubCRM data volumes (2 replicas)     |
| `clubcrm-longhorn-smoke` | driver.longhorn.io    | Delete  | Immediate    | yes              | Smoke test validation volumes         |
| `longhorn-static`        | driver.longhorn.io    | Delete  | Immediate    | yes              | Longhorn pre-provisioned volumes      |
| `local-path` (default)   | rancher.io/local-path | Delete  | WaitForFirst | no               | Bootstrap and OrbStack fallback       |

### Live PVC State (2026-04-28)

| PVC           | Namespace              | Storage Class          | Size | Status | Volume State | Robustness |
| ------------- | ---------------------- | ---------------------- | ---- | ------ | ------------ | ---------- |
| postgres-data | clubcrm-data           | clubcrm-longhorn       | 10Gi | Bound  | attached     | healthy    |
| redis-data    | clubcrm-data           | clubcrm-longhorn       | 2Gi  | Bound  | attached     | healthy    |
| mongodb-data  | clubcrm-data           | clubcrm-longhorn       | 10Gi | Bound  | attached     | healthy    |
| kafka-data    | clubcrm-data           | clubcrm-longhorn       | 10Gi | Bound  | attached     | healthy    |
| kubero-data   | kubero                 | longhorn               | 1Gi  | Bound  | attached     | healthy    |
| smoke-data    | clubcrm-longhorn-smoke | clubcrm-longhorn-smoke | 1Gi  | Bound  | detached     | —          |
| smoke-pvc     | lh-test                | longhorn               | 1Gi  | Bound  | detached     | —          |

### Longhorn Replica Placement (2026-04-28)

Each `clubcrm-longhorn` volume has 2 replicas spread across nodes:

| Volume        | Replica 1 Node                                                           | Replica 2 Node |
| ------------- | ------------------------------------------------------------------------ | -------------- |
| postgres-data | server1                                                                  | server2        |
| redis-data    | server1                                                                  | server2        |
| mongodb-data  | server1                                                                  | server3        |
| kafka-data    | server2                                                                  | server3        |
| kubero-data   | server1 + server2 + server3 (3 replicas — uses default `longhorn` class) |

Longhorn manager pods run on all three nodes (DaemonSet). All three Longhorn nodes show `Ready=True`, `AllowScheduling=true`.

### Physical Disk Mounts (Longhorn volumes appear as block devices)

On each node, Longhorn volumes are attached as raw block devices and mounted through the kubelet CSI path. As of 2026-04-28:

| Node    | Device | Size | Mounted PVC                         |
| ------- | ------ | ---- | ----------------------------------- |
| server1 | sdb    | 1G   | kubero-data                         |
| server1 | sdc    | 10G  | postgres-data                       |
| server1 | sdd    | 2G   | redis-data                          |
| server1 | sde    | 10G  | mongodb-data                        |
| server2 | sdb    | 10G  | kafka-data                          |
| server3 | —      | —    | no volumes attached (replicas only) |

---

## Resource Utilization (2026-04-28)

| Node    | CPU (cores) | CPU % | Memory Used | Memory % |
| ------- | ----------- | ----- | ----------- | -------- |
| server1 | 679m        | 33%   | 3161Mi      | 40%      |
| server2 | 452m        | 22%   | 2589Mi      | 33%      |
| server3 | 184m        | 9%    | 1619Mi      | 20%      |

Server3 is lightly loaded — it holds Longhorn replicas and the engine/CSI DaemonSet pods but runs no application or data pods.

### Pod Resource Usage (clubcrm)

| Pod                            | CPU | Memory |
| ------------------------------ | --- | ------ |
| cloudflared-tunnel (replica 1) | 5m  | 20Mi   |
| cloudflared-tunnel (replica 2) | 5m  | 17Mi   |
| clubcrm-api (replica 1)        | 8m  | 115Mi  |
| clubcrm-api (replica 2)        | 9m  | 94Mi   |
| clubcrm-web (replica 1)        | 4m  | 125Mi  |
| clubcrm-web (replica 2)        | 3m  | 71Mi   |

### Pod Resource Usage (clubcrm-data)

| Pod        | CPU  | Memory |
| ---------- | ---- | ------ |
| kafka-0    | 277m | 461Mi  |
| mongodb-0  | 18m  | 82Mi   |
| postgres-0 | 14m  | 42Mi   |
| redis-0    | 12m  | 19Mi   |

Kafka is the dominant consumer at 277m CPU and 461Mi memory.

---

## Full Request Path — Example: Browser visits `demo.clubcrm.org/api/members`

```
1. Browser DNS lookup: demo.clubcrm.org
   → Cloudflare returns its own edge IP (Cloudflare proxy)

2. Browser connects to Cloudflare edge over HTTPS

3. Cloudflare routes the request through the outbound tunnel to one of the cloudflared pods

4. cloudflared rewrites Host header: demo.clubcrm.org → clubcrm.local
   Forwards to: http://traefik.kube-system.svc.cluster.local:80

5. CoreDNS resolves traefik.kube-system.svc.cluster.local → 10.43.235.240
   iptables redirects 10.43.235.240:80 to the Traefik pod on server1

6. Traefik sees: Host=clubcrm.local, Path=/api/members
   Matches Ingress rule: /api → clubcrm-api:8000
   Applies strip-api middleware: /api/members → /members
   Forwards to one of the clubcrm-api pods (e.g., 10.42.1.30:8000)

7. clubcrm-api processes the request, queries MongoDB:
   DNS: mongodb.clubcrm-data.svc.cluster.local → 10.42.0.26
   Connects to MongoDB on port 27017

8. Response travels back up the same chain to the browser
```

---

## IP Address Summary

| Range         | Purpose                                    |
| ------------- | ------------------------------------------ |
| 10.10.10.0/24 | Server LAN — physical node addresses       |
| 10.42.0.0/16  | Pod network (Flannel) — one /24 per node   |
| 10.43.0.0/16  | Kubernetes service virtual IPs             |
| 100.x.x.x     | Tailscale VPN — management access          |
| 172.17.0.0/16 | Docker bridge on server1 (not used by K3s) |

---

## Port Summary — Inbound to the Cluster

| Port (on LAN IPs) | Protocol | Purpose                                                  |
| ----------------- | -------- | -------------------------------------------------------- |
| 22                | TCP      | SSH (only reachable via Tailscale in practice)           |
| 80                | TCP      | HTTP — handled by Traefik via svclb-traefik daemonset    |
| 443               | TCP      | HTTPS — handled by Traefik via svclb-traefik daemonset   |
| 31078             | TCP      | NodePort for Traefik HTTP (alternate path, same as 80)   |
| 31425             | TCP      | NodePort for Traefik HTTPS (alternate path, same as 443) |

No data service ports (5432, 6379, 27017, 9092) are exposed outside the cluster.

## Service ClusterIP Summary

| Service        | Namespace    | ClusterIP       | Port(s)        |
| -------------- | ------------ | --------------- | -------------- |
| traefik        | kube-system  | 10.43.235.240   | 80, 443        |
| kube-dns       | kube-system  | 10.43.0.10      | 53/UDP, 53/TCP |
| metrics-server | kube-system  | 10.43.143.94    | 443            |
| kubernetes     | default      | 10.43.0.1       | 443            |
| clubcrm-api    | clubcrm      | 10.43.123.228   | 8000           |
| clubcrm-web    | clubcrm      | 10.43.242.78    | 3000           |
| kubero         | kubero       | 10.43.207.142   | 2000           |
| postgres       | clubcrm-data | None (headless) | 5432           |
| redis          | clubcrm-data | None (headless) | 6379           |
| mongodb        | clubcrm-data | None (headless) | 27017          |
| kafka          | clubcrm-data | None (headless) | 9092, 9093     |
