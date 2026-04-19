# Ingress and Service Routing

## Overview

ClubCRM uses Traefik as the ingress controller (installed by default with k3s).
Incoming HTTP requests to `clubcrm.local` are routed to the web and API services
running in the `clubcrm` namespace.

## Traffic Flow
Browser --> Traefik (port 80) --> Kubernetes Service --> Pod

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

| Node    | IP            | Role          |
|---------|---------------|---------------|
| server1 | 10.10.10.102  | control-plane |
| server2 | 10.10.10.103  | worker        |
| server3 | 10.10.10.104  | worker        |

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
      "enabled": true
    }
  },
  "runtime": {
    "service": "clubcrm-api",
    "namespace": "clubcrm",
    "platform": "kubernetes"
  }
}
```

## Demo Setup

**To reach `clubcrm.local` from a browser on the demo machine, add this line to `/etc/hosts`:** 
10.10.10.102  clubcrm.local

**On Windows the hosts file is at:**
C:\Windows\System32\drivers\etc\hosts

**On Mac/Linux:**
/etc/hosts

Then visit `http://clubcrm.local` in a browser. You should be redirected to
`http://clubcrm.local/login`.

## Troubleshooting

If routing is not working, check in this order:

1. Traefik is running: `kubectl get pods -n kube-system | grep traefik`
2. Ingress rules exist: `kubectl get ingress -n clubcrm`
3. Services exist: `kubectl get services -n clubcrm`
4. Pods are running: `kubectl get pods -n clubcrm`
5. Test with curl using the `Host` header as shown above