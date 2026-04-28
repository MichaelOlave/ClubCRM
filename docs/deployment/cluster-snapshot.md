# Live Cluster Snapshot

A point-in-time record of the exact cluster state obtained by deep SSH scan.
**Last updated: 2026-04-28 (post HA hardening — equal-node scheduling, cloudflared preStop, Traefik 2-replica).**

Use this document when you need to quickly understand what is running where — for troubleshooting,
demo prep, or when the monitoring dashboard is unavailable. Values change as pods are rescheduled;
treat this as a reference baseline, not a guarantee of current state.

---

## Cluster Identity

| Property           | Value                      |
| ------------------ | -------------------------- |
| K3s version        | v1.34.6+k3s1               |
| Kubernetes version | v1.34.6                    |
| Container runtime  | containerd 2.2.2-bd1.34    |
| etcd               | embedded (all three nodes) |
| Cluster age        | 9 days                     |

---

## Nodes

```
NAME      STATUS   ROLES                AGE   VERSION        INTERNAL-IP    CONTAINER-RUNTIME
server1   Ready    control-plane,etcd   9d    v1.34.6+k3s1   10.10.10.102   containerd://2.2.2-bd1.34
server2   Ready    control-plane,etcd   9d    v1.34.6+k3s1   10.10.10.103   containerd://2.2.2-bd1.34
server3   Ready    control-plane,etcd   9d    v1.34.6+k3s1   10.10.10.104   containerd://2.2.2-bd1.34
```

### Node Hardware

| Node    | vCPU | RAM   | Root Disk | Kernel    | Uptime  |
| ------- | ---- | ----- | --------- | --------- | ------- |
| server1 | 2    | 7.6Gi | 50G (47%) | 6.17.0-20 | 17 days |
| server2 | 2    | 7.6Gi | 50G (48%) | 6.17.0-22 | 6 days  |
| server3 | 2    | 7.6Gi | 50G (52%) | 6.17.0-22 | 4 days  |

All nodes: QEMU Virtual CPU v2.5+, Ubuntu 24.04.4 LTS, 4Gi swap.

---

## Node Resource Usage

```
NAME      CPU(cores)   CPU(%)   MEMORY(bytes)   MEMORY(%)
server1   679m         33%      3161Mi          40%
server2   452m         22%      2589Mi          33%
server3   184m         9%       1619Mi          20%
```

---

## All Pods

### Namespace: clubcrm

```
NAME                                  READY   NODE      POD-IP
cloudflared-tunnel-66564fb947-2m5xc   2/2     server2   10.42.1.59
cloudflared-tunnel-66564fb947-7d24k   2/2     server3   10.42.2.75
clubcrm-api-7485d55f86-7wb6p          1/1     server1   10.42.0.51
clubcrm-api-7485d55f86-lnr5p          1/1     server2   10.42.1.62
clubcrm-web-6f97b774f-58jtl           1/1     server1   10.42.0.50
clubcrm-web-6f97b774f-6ppql           1/1     server3   10.42.2.78
```

Image for both api and web: `ghcr.io/michaelolave/clubcrm-{api,web}:bb94b940caed5a413e0563de137bb1866f3733b4`

**Scheduling rules (post HA hardening):**

- `cloudflared-tunnel`: `requiredDuringSchedulingIgnoredDuringExecution` podAntiAffinity — one replica per node. `preStop: sleep 5` ensures QUIC connections close before SIGTERM so Cloudflare routes immediately to the surviving replica.
- `clubcrm-api`: `requiredDuringSchedulingIgnoredDuringExecution` podAntiAffinity — one replica per node. No `nodeAffinity`; all three nodes are eligible.
- `clubcrm-web`: `requiredDuringSchedulingIgnoredDuringExecution` podAntiAffinity + `topologySpreadConstraints (ScheduleAnyway)` — one replica per node. No `nodeAffinity`; all three nodes are eligible.

Pod resource usage:

| Pod                        | CPU | Memory |
| -------------------------- | --- | ------ |
| cloudflared-tunnel (2m5xc) | 5m  | 20Mi   |
| cloudflared-tunnel (7d24k) | 5m  | 20Mi   |
| clubcrm-api (7wb6p)        | 8m  | 115Mi  |
| clubcrm-api (lnr5p)        | 9m  | 94Mi   |
| clubcrm-web (58jtl)        | 4m  | 125Mi  |
| clubcrm-web (6ppql)        | 3m  | 71Mi   |

### Namespace: clubcrm-data

```
NAME         READY   NODE      POD-IP
kafka-0      1/1     server2   10.42.1.34
mongodb-0    1/1     server1   10.42.0.26
postgres-0   1/1     server1   10.42.0.19
redis-0      1/1     server1   10.42.0.25
```

Images: `confluentinc/cp-kafka:7.8.0`, `mongo:4.4`, `postgres:17`, `redis:7`

Pod resource usage:

| Pod        | CPU  | Memory |
| ---------- | ---- | ------ |
| kafka-0    | 277m | 461Mi  |
| mongodb-0  | 18m  | 82Mi   |
| postgres-0 | 14m  | 42Mi   |
| redis-0    | 12m  | 19Mi   |

### Namespace: kube-system

```
NAME                                        READY   NODE      POD-IP
coredns-588677688b-l7m9f                    1/1     server3   10.42.2.59
coredns-588677688b-mvb42                    1/1     server2   10.42.1.45
local-path-provisioner-8686667995-h6ttk     1/1     server1   10.42.0.8
metrics-server-c8774f4f4-f8c9n              1/1     server1   10.42.0.7
svclb-traefik-*                             2/2     all nodes DaemonSet
traefik-75856df8f5-cl9r6                    1/1     server2   10.42.1.42
traefik-75856df8f5-qkj4t                    1/1     server3   10.42.2.52
helm-install-traefik-crd-*                  Completed
helm-install-traefik-*                      Completed
```

**Traefik** is now configured to run as **2 replicas** via `HelmChartConfig` (`infra/k8s/overlays/orbstack-demo/traefik-helm-chart-config.yaml`). A `PodDisruptionBudget (minAvailable: 1)` prevents both replicas from being evicted simultaneously during a node drain.

**CoreDNS** is scaled to **2 replicas** with `requiredDuringSchedulingIgnoredDuringExecution` podAntiAffinity to eliminate it as a single point of failure.

### Namespace: kubero

```
NAME                              READY   NODE      POD-IP
kubero-76798d55c-q67md            1/1     server1   10.42.0.17
```

### Namespace: kubero-operator-system

```
NAME                                                  READY   NODE
kubero-operator-controller-manager-7d99d5d75d-877tg   1/1     server2
```

### Namespace: longhorn-system (key pods)

```
NAME                                 READY   NODE      POD-IP
csi-attacher (3 replicas)            1/1     server1+2 distributed
csi-provisioner (3 replicas)         1/1     server1+2 distributed
csi-resizer (3 replicas)             1/1     server1+2 distributed
csi-snapshotter (3 replicas)         1/1     server1+2 distributed
engine-image-ei-75a03ec3-*           1/1     all nodes DaemonSet
instance-manager-* (3)               1/1     all nodes one per node
longhorn-csi-plugin-* (3)            3/3     all nodes DaemonSet
longhorn-driver-deployer             1/1     server2
longhorn-manager-* (3)               2/2     all nodes DaemonSet
longhorn-ui (2 replicas)             1/1     server1+2
```

---

## Services

### clubcrm

| Service     | Type      | ClusterIP     | Port(s) |
| ----------- | --------- | ------------- | ------- |
| clubcrm-api | ClusterIP | 10.43.123.228 | 8000    |
| clubcrm-web | ClusterIP | 10.43.242.78  | 3000    |

Active endpoints:

- `clubcrm-api` → `10.42.1.30:8000`, `10.42.1.33:8000`
- `clubcrm-web` → `10.42.1.29:3000`, `10.42.1.31:3000`

### clubcrm-data (all headless)

| Service  | ClusterIP | Port(s)    | Endpoints            |
| -------- | --------- | ---------- | -------------------- |
| postgres | None      | 5432       | 10.42.0.19:5432      |
| redis    | None      | 6379       | 10.42.0.25:6379      |
| mongodb  | None      | 27017      | 10.42.0.26:27017     |
| kafka    | None      | 9092, 9093 | 10.42.1.34:9092/9093 |

### kube-system

| Service        | Type         | ClusterIP     | External IPs                             | Port(s)             |
| -------------- | ------------ | ------------- | ---------------------------------------- | ------------------- |
| traefik        | LoadBalancer | 10.43.235.240 | 10.10.10.102, 10.10.10.103, 10.10.10.104 | 80:31078, 443:31425 |
| kube-dns       | ClusterIP    | 10.43.0.10    | —                                        | 53/UDP, 53/TCP      |
| metrics-server | ClusterIP    | 10.43.143.94  | —                                        | 443                 |

### kubero

| Service | Type      | ClusterIP     | Port |
| ------- | --------- | ------------- | ---- |
| kubero  | ClusterIP | 10.43.207.142 | 2000 |

---

## Ingresses

```
NAMESPACE   NAME           HOSTS           ADDRESS (LAN)
clubcrm     clubcrm-api    clubcrm.local   10.10.10.102,10.10.10.103,10.10.10.104
clubcrm     clubcrm-web    clubcrm.local   10.10.10.102,10.10.10.103,10.10.10.104
kubero      kubero         kubero.local    10.10.10.102,10.10.10.103,10.10.10.104
kubero      kubero-local   kubero.local    10.10.10.102,10.10.10.103,10.10.10.104
```

Traefik middleware:

```
NAMESPACE   NAME               AGE
clubcrm     strip-api-prefix   9d
```

---

## Persistent Volumes

```
NAME (PVC)                             CAPACITY   CLAIM                               SC                    STATUS
pvc-0eb8ea36 (postgres-data)           10Gi       clubcrm-data/postgres-data          clubcrm-longhorn      Bound
pvc-b4468353 (redis-data)              2Gi        clubcrm-data/redis-data             clubcrm-longhorn      Bound
pvc-08a289b5 (mongodb-data)            10Gi       clubcrm-data/mongodb-data           clubcrm-longhorn      Bound
pvc-a6c249ab (kafka-data)              10Gi       clubcrm-data/kafka-data             clubcrm-longhorn      Bound
pvc-1af1a0b3 (kubero-data)             1Gi        kubero/kubero-data                  longhorn              Bound
pvc-3f34e165 (smoke-data)              1Gi        clubcrm-longhorn-smoke/smoke-data   clubcrm-longhorn-smoke Bound (detached)
pvc-1a85ce70 (lh-test smoke-pvc)       1Gi        lh-test/smoke-pvc                   longhorn              Bound (detached)
```

Total Longhorn data managed: **43 GiB** across 7 volumes (4 active data volumes + 1 kubero + 2 smoke/test).

---

## Longhorn Volumes

```
NAME                              STATE      ROBUSTNESS   SIZE     NODE      AGE
pvc-08a289b5 (mongodb-data)       attached   healthy      10Gi     server1   24h
pvc-0eb8ea36 (postgres-data)      attached   healthy      10Gi     server1   9d
pvc-1a85ce70 (lh-test)            detached   unknown      1Gi      —         8d
pvc-1af1a0b3 (kubero-data)        attached   healthy      1Gi      server1   9d
pvc-3f34e165 (smoke-data)         detached   unknown      1Gi      —         9d
pvc-a6c249ab (kafka-data)         attached   healthy      10Gi     server2   24h
pvc-b4468353 (redis-data)         attached   healthy      2Gi      server1   9d
```

Longhorn nodes:

```
NAME      READY   ALLOWSCHEDULING   SCHEDULABLE
server1   True    true              True
server2   True    true              True
server3   True    true              True
```

---

## Longhorn Replica Placement

| Volume        | Replica 1       | Replica 2       | Replica 3       |
| ------------- | --------------- | --------------- | --------------- |
| postgres-data | server1 running | server2 running | —               |
| redis-data    | server1 running | server2 running | —               |
| mongodb-data  | server1 running | server3 running | —               |
| kafka-data    | server2 running | server3 running | —               |
| kubero-data   | server1 running | server2 running | server3 running |

---

## Storage Classes

| Name                     | Provisioner           | Binding Mode | Expansion | Reclaim |
| ------------------------ | --------------------- | ------------ | --------- | ------- |
| `longhorn` (default)     | driver.longhorn.io    | Immediate    | true      | Delete  |
| `clubcrm-longhorn`       | driver.longhorn.io    | Immediate    | true      | Delete  |
| `clubcrm-longhorn-smoke` | driver.longhorn.io    | Immediate    | true      | Delete  |
| `longhorn-static`        | driver.longhorn.io    | Immediate    | true      | Delete  |
| `local-path` (default)   | rancher.io/local-path | WaitForFirst | false     | Delete  |

---

## Physical Disk Layout per Node

### server1 (10.10.10.102)

```
sda   50G  (OS)
  sda1  1M   (BIOS boot)
  sda2  50G  → /
sdb   1G   → kubero/kubero-data (Longhorn)
sdc   10G  → clubcrm-data/postgres-data (Longhorn)
sdd   2G   → clubcrm-data/redis-data (Longhorn)
sde   10G  → clubcrm-data/mongodb-data (Longhorn)
```

### server2 (10.10.10.103)

```
sda   50G  (OS)
  sda1  1M   (BIOS boot)
  sda2  50G  → /
sdb   10G  → clubcrm-data/kafka-data (Longhorn)
```

### server3 (10.10.10.104)

```
sda   50G  (OS)
  sda1  1M   (BIOS boot)
  sda2  50G  → /
(no volumes currently attached — holds replicas via Longhorn instance-manager)
```

---

## CoreDNS Configuration

CoreDNS serves the `cluster.local` domain and forwards all external queries to the node resolver (`/etc/resolv.conf`).

```
.:53 {
    kubernetes cluster.local in-addr.arpa ip6.arpa {
      pods insecure
      fallthrough in-addr.arpa ip6.arpa
    }
    cache 30
    forward . /etc/resolv.conf
}
```

---

## Network Interface Summary (per node)

### server1

| Interface  | Address           | Purpose                         |
| ---------- | ----------------- | ------------------------------- |
| ens18      | 10.10.10.102/24   | LAN / primary node traffic      |
| tailscale0 | 100.122.118.85/32 | Management VPN                  |
| flannel.1  | 10.42.0.0/32      | VXLAN overlay (inter-node pods) |
| cni0       | 10.42.0.1/24      | Pod bridge (local pods)         |
| docker0    | 172.17.0.1/16     | Docker bridge (not used by K3s) |

### server2

| Interface  | Address         | Purpose                         |
| ---------- | --------------- | ------------------------------- |
| ens18      | 10.10.10.103/24 | LAN / primary node traffic      |
| tailscale0 | 100.67.65.5/32  | Management VPN                  |
| flannel.1  | 10.42.1.0/32    | VXLAN overlay (inter-node pods) |
| cni0       | 10.42.1.1/24    | Pod bridge (local pods)         |

### server3

| Interface  | Address          | Purpose                         |
| ---------- | ---------------- | ------------------------------- |
| ens18      | 10.10.10.104/24  | LAN / primary node traffic      |
| tailscale0 | 100.99.187.90/32 | Management VPN                  |
| flannel.1  | 10.42.2.0/32     | VXLAN overlay (inter-node pods) |
| cni0       | 10.42.2.1/24     | Pod bridge (local pods)         |

---

## Systemd Services per Node

### server1

| Service            | Status |
| ------------------ | ------ |
| k3s.service        | active |
| tailscaled.service | active |
| containerd.service | active |
| docker.service     | active |
| iscsid.service     | active |

### server2 & server3

| Service            | Status |
| ------------------ | ------ |
| k3s.service        | active |
| tailscaled.service | active |
| iscsid.service     | active |

(No Docker CE on server2/server3 — they use containerd directly via K3s.)

---

## HA Hardening Applied (2026-04-28)

The following changes were made during the April 28 session to make all three nodes fully equal
and to eliminate 502 errors during node drains:

| Component        | Change                                                                                                                                                                                      |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `cloudflared`    | Added `preStop: sleep 5` lifecycle hook — QUIC connections close cleanly before SIGTERM so Cloudflare routes immediately to the surviving replica instead of returning 502 for up to 30 min |
| `cloudflared`    | Changed to `requiredDuringScheduling` podAntiAffinity — replicas guaranteed on different nodes                                                                                              |
| `clubcrm-api`    | Removed `nodeAffinity` (was incorrectly restricting to server2+server3 only)                                                                                                                |
| `clubcrm-api`    | Changed to `requiredDuringScheduling` podAntiAffinity — guaranteed node spread                                                                                                              |
| `clubcrm-web`    | Removed `nodeAffinity` (was incorrectly restricting to server2+server3 only)                                                                                                                |
| `clubcrm-web`    | Changed `topologySpreadConstraints.whenUnsatisfiable` from `DoNotSchedule` → `ScheduleAnyway`                                                                                               |
| Traefik          | Scaled from 1 → 2 replicas via `HelmChartConfig`; added `PodDisruptionBudget (minAvailable: 1)` and podAntiAffinity                                                                         |
| CoreDNS          | Scaled from 1 → 2 replicas with podAntiAffinity                                                                                                                                             |
| All StatefulSets | Removed `nodeAffinity` from postgres, mongodb, redis, kafka — all nodes are eligible                                                                                                        |

**Result:** Any single node can be drained without a 502 error or loss of HTTP availability.

## Recent Cluster Events (2026-04-28)

**cloudflared-tunnel** was rolled several times during the HA hardening session. Current replica
set `cloudflared-tunnel-66564fb947` is healthy with 2/2 replicas on server2 and server3.

**clubcrm-api** was patched to restore `envFrom` references (configmap + secrets) that had been
accidentally stripped by a previous `--type=merge` kubectl patch. All API pods are healthy.

**kafka-0 and mongodb-0** were restarted ~50 minutes before the initial snapshot (both previously
attached to a different node, triggering a brief `FailedAttachVolume` warning that resolved once
the pod was rescheduled to the node owning the Longhorn volume attachment). Both are healthy.
