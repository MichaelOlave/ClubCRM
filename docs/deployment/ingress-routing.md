# Ingress and Service Routing

## Overview

ClubCRM uses Traefik as the ingress controller (installed by default with k3s).
Incoming HTTP requests to `clubcrm.local` are routed to the web and API services
running in the `clubcrm` namespace.

## Traffic Flow

### Public internet (demo.clubcrm.org)

```
Browser --> Cloudflare Edge --> cloudflared pod (QUIC tunnel)
        --> nginx sidecar (port 3001) --> Traefik ClusterIP (port 80)
        --> Kubernetes Service --> Pod
```

Two `cloudflared` replicas run on separate nodes with `requiredDuringSchedulingIgnoredDuringExecution`
podAntiAffinity. A `preStop: sleep 5` lifecycle hook ensures QUIC connections close cleanly before
the pod is evicted — without it, Cloudflare takes up to 30 minutes to detect the missing connector
and route to the surviving replica, causing a 502 for the entire drain window.

### Local / LAN (clubcrm.local)

```
Browser --> Traefik LoadBalancer (port 80, all three nodes) --> Kubernetes Service --> Pod
```

Traefik runs as **2 replicas** on separate nodes via `HelmChartConfig`. A `PodDisruptionBudget
(minAvailable: 1)` prevents both replicas from being evicted simultaneously.

### Web

- Hostname: `clubcrm.local`
- Ingress class: `traefik`
- Service: `clubcrm-web` (ClusterIP, port 3000)
- Pods: 2 replicas
- Expected response: `307` redirect to `/login`

### API

- Hostname: `clubcrm.local`
- Path prefix: `/api`
- Service: `clubcrm-api` (ClusterIP, port 8000)
- Pods: 2 replicas
- Expected response: `200 ok`

## Cluster Node IPs

All three nodes in the current cluster are control-plane nodes.

| Node    | IP           | Role          |
| ------- | ------------ | ------------- |
| server1 | 10.10.10.102 | control-plane |
| server2 | 10.10.10.103 | control-plane |
| server3 | 10.10.10.104 | control-plane |

## Verifying Routing

From any node in the cluster:

```bash
# Test web ingress
curl -s -o /dev/null -w "%{http_code}" -H "Host: clubcrm.local" http://10.10.10.102

# Test API routing
curl -s -H "Host: clubcrm.local" http://10.10.10.102/api/health
```

Expected output for API health:

```json
{
  "status": "ok",
  "checks": {
    "redis": {
      "status": "ok",
      "enabled": true,
      "details": {
        "version": "7.x"
      }
    }
  },
  "runtime": {
    "service": "clubcrm-api",
    "instance_id": "clubcrm-api-...",
    "pod_name": "clubcrm-api-...",
    "namespace": "clubcrm",
    "node_name": "server1",
    "platform": "kubernetes"
  }
}
```

## Demo Setup

**To reach `clubcrm.local` from a browser on the demo machine, add this line to `/etc/hosts`:**
10.10.10.102 clubcrm.local

**On Windows the hosts file is at:**
C:\Windows\System32\drivers\etc\hosts

**On Mac/Linux:**
/etc/hosts

Then visit `http://clubcrm.local` in a browser. You should be redirected to
`http://clubcrm.local/login`.

## Troubleshooting

If routing is not working, check in this order:

1. Traefik is running (expect 2 pods on separate nodes):
   `kubectl get pods -n kube-system -l app.kubernetes.io/name=traefik -o wide`
2. cloudflared is running (expect 2 pods on separate nodes):
   `kubectl get pods -n clubcrm -l app=cloudflared -o wide`
3. Ingress rules exist: `kubectl get ingress -n clubcrm`
4. Services exist: `kubectl get services -n clubcrm`
5. Pods are running: `kubectl get pods -n clubcrm`
6. Test with curl using the `Host` header as shown above

**502 on demo.clubcrm.org after a drain:** See the Cloudflare QUIC routing bug note in
[k3s-kubero-longhorn.md](k3s-kubero-longhorn.md#troubleshooting-notes). Quick fix:
`kubectl rollout restart deployment/cloudflared-tunnel -n clubcrm`
