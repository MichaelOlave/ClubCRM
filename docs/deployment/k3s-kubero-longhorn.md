# k3s + Kubero + Longhorn Runbook

This document is the repo-backed runbook for the ClubCRM networking final.

For the off-cluster observer and control plane that sits beside this cluster, see
[Companion Monitoring Stack Guide](companion-monitoring-stack.md) and
[Monitoring Stack Deployment](monitoring-stack.md).

It assumes:

- `Server1` is the single `k3s` server
- `Server2` and `Server3` are `k3s` agents
- the companion monitoring stack stays off-cluster on its own monitoring host
- `Kubero` deploys only `clubcrm-web` and `clubcrm-api`
- PostgreSQL and Redis stay repo-managed Kubernetes resources with Longhorn-backed PVCs

Current live mapping as of April 18, 2026:

- `Server1` -> `100.122.118.85` -> `k3s` control plane
- `Server2` -> `100.67.65.5` -> `k3s` worker
- `Server3` -> `100.99.187.90` -> `k3s` worker
- `DemoControlPlaneServer` -> `192.168.139.213` -> monitoring host and dashboard VM

## Topology And Ownership

The intended split is:

- app runtime and networking demo on the 3-node `k3s` cluster
- cluster storage through Longhorn
- app ingress through Traefik and ServiceLB
- app workload management through Kubero for the main path
- monitoring and failover visibility through the off-cluster companion stack

This keeps the responsibilities explicit:

- the repo manages shared data-plane resources and ingress contracts
- Kubero manages the stateless ClubCRM app pair in the primary path
- the OrbStack demo overlay exists as a classroom fallback when Longhorn or Kubero behavior is not
  reliable enough on the local hypervisor

## Namespace And Resource Map

| Namespace      | Managed by                       | Main resources                                                  | Purpose                                    |
| -------------- | -------------------------------- | --------------------------------------------------------------- | ------------------------------------------ |
| `clubcrm`      | Kubero or the OrbStack overlay   | `clubcrm-web`, `clubcrm-api`, Traefik middleware, ingress rules | app-facing workloads and routing           |
| `clubcrm-data` | repo manifests                   | PostgreSQL StatefulSet, Redis StatefulSet, PVCs, Services       | stateful services for the networking final |
| `kubero`       | Kubero install plus repo ingress | Kubero service and ingress                                      | operator-facing deployment UI              |

Important routing and storage details:

- `clubcrm.local/` routes to `clubcrm-web:3000`
- `clubcrm.local/api` routes to `clubcrm-api:8000` through a Traefik middleware that strips
  `/api`
- `kubero.local/` routes to the Kubero service on port `2000`
- PostgreSQL uses a `10Gi` `ReadWriteOnce` PVC on `clubcrm-longhorn`
- Redis uses a `2Gi` `ReadWriteOnce` PVC on `clubcrm-longhorn`
- `infra/k8s/clubcrm-longhorn-storageclass.yaml` pins ClubCRM's Longhorn replica policy to `2`

## Repo Assets

- `infra/k8s/` contains the base repo-managed Kubernetes manifests
- `infra/k8s/examples/clubcrm-app-env.example.yaml` contains the environment values Kubero should
  inject into app workloads
- `infra/k8s/overlays/orbstack-demo/` provides the practical OrbStack fallback for classroom demos
- `docs/deployment/monitoring-stack.md` explains how to point the companion monitoring stack at the
  live cluster

Apply the base repo-managed manifests with:

```bash
kubectl apply -k infra/k8s
```

For the current OrbStack classroom environment, use the overlay instead:

```bash
kubectl apply -k infra/k8s/overlays/orbstack-demo
```

Important dependency: the base `infra/k8s` manifests do not create `clubcrm-web` or `clubcrm-api`
Deployments or Services. They only create ingress rules that expect those app Services to exist.
In the primary path, Kubero provides those app workloads and matching Services. In the classroom
fallback path, the `orbstack-demo` overlay provides them.

## 1. Prepare The Three VMs

Set stable hostnames and confirm each VM has a stable private IP.

For the current live environment, the target hostnames and addresses are:

```text
100.122.118.85 Server1 server1
100.67.65.5 Server2 server2
100.99.187.90 Server3 server3
```

Install the required packages on all three VMs:

```bash
sudo apt-get update
sudo apt-get install -y open-iscsi nfs-common curl
sudo systemctl enable --now iscsid
```

Install the monitoring guest agent on all three VMs:

```bash
python3 -m venv /opt/clubcrm/infra/monitoring/vm-agent/.venv
/opt/clubcrm/infra/monitoring/vm-agent/.venv/bin/pip install --upgrade pip
/opt/clubcrm/infra/monitoring/vm-agent/.venv/bin/pip install -r infra/monitoring/vm-agent/requirements.txt
sudo cp infra/monitoring/vm-agent/monitor-vm-agent.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now monitor-vm-agent
```

Recreate the expected admin users before the cluster rollout:

- `champuser` for initial access
- `michaelolave`
- `lily`

`lily` should have:

- her public key in `/home/lily/.ssh/authorized_keys`
- membership in `sudo`
- passwordless sudo through `/etc/sudoers.d/90-lily-nopasswd`

Example sudoers entry:

```text
lily ALL=(ALL) NOPASSWD:ALL
```

Open the ports needed for:

- `6443/tcp` for the `k3s` API on `Server1`
- Flannel VXLAN traffic between nodes
- ingress traffic on `80/tcp`
- Longhorn replica traffic between nodes

## 2. Bootstrap k3s

Install the server on `Server1`:

```bash
curl -sfL https://get.k3s.io | sh -
sudo cat /var/lib/rancher/k3s/server/node-token
```

Join `Server2` and `Server3` as agents using the token from `Server1`:

```bash
curl -sfL https://get.k3s.io | K3S_URL=https://Server1:6443 K3S_TOKEN=<node-token> sh -
```

Verify the cluster:

```bash
sudo k3s kubectl get nodes
```

Keep the packaged Traefik ingress controller and ServiceLB enabled for this final.

## 3. Install Longhorn

Install Longhorn into `longhorn-system` with the official manifest or Helm chart, then verify the
preflight check from a machine that has `longhornctl` installed:

```bash
longhornctl check preflight
kubectl -n longhorn-system get pods
kubectl get storageclass
```

Set Longhorn's default replica count to `2` before creating the ClubCRM PVCs. The exact command can
vary by Longhorn version, so use the current Longhorn settings surface for `default-replica-count`
after install.

Keep `local-path` available for bootstrap tasks, but leave the ClubCRM resources explicitly wired
to the `clubcrm-longhorn` storage class in `infra/k8s/`.

Expected result before moving on:

- Longhorn pods are healthy in `longhorn-system`
- the base `longhorn` storage class exists
- the repo-managed `clubcrm-longhorn` storage class has been applied
- ClubCRM PVCs are still unapplied or still pending until the repo manifests are applied later

Before trusting PostgreSQL or Redis to that storage path, apply the repo smoke test:

```bash
kubectl apply -k infra/k8s/longhorn-smoke
kubectl get pvc,pod -n clubcrm-longhorn-smoke
kubectl -n longhorn-system get volumes.longhorn.io
```

Continue only after the smoke pod reaches `Running` and the smoke PVC is `Bound`.

Current validation status as of April 12, 2026:

- the repo-managed smoke PVC provisions successfully on the real `k3s` cluster
- the smoke pod schedules onto the intended healthy node path when `server2` is cordoned
- the current classroom cluster still fails at Longhorn volume attach, not at Kubernetes PVC
  provisioning
- the observed blocker is host-side iSCSI session creation on the provided VM environment
- PostgreSQL and Redis should stay on the fallback path until the smoke workload reaches `Running`
  and survives recreation cleanly

On the OrbStack classroom machines used for this repo, Longhorn installs cleanly but PVC-backed
workloads can still fail to attach because the node `iscsid` daemon crashes under load. If that
happens, treat it as a hypervisor limitation rather than an app manifest issue: keep Longhorn
installed for cluster and storage visibility, but use a non-OrbStack VM platform for the final
Longhorn persistence demo. The checked-in `infra/k8s/overlays/orbstack-demo/` overlay exists so
the classroom OrbStack cluster can still run the app and data services on `local-path` while
keeping Longhorn installed for visibility and discussion.

## 4. Install Kubero

Install Kubero onto the existing `k3s` cluster with its official chart or manifest flow.

After install:

- confirm the Kubero namespace and services are healthy
- keep Kubero responsible only for the `clubcrm-web` and `clubcrm-api` app workloads
- leave PostgreSQL and Redis under repo-managed manifests

`infra/k8s/kubero-ingress.yaml` exposes Kubero on `http://kubero.local`. If the installed Kubero
service name or service port differs from `kubero:2000`, update that ingress file before applying
it.

Because Kubero installation details can vary by release, treat this repo's contract as:

- Kubero must create routable `clubcrm-web` and `clubcrm-api` Services in namespace `clubcrm`
- the service names must match the base ingress expectations
- if Kubero uses different service names or ports, adjust the ingress files before the demo

Current live deployment note:

- Kubero itself is installed in namespace `kubero`
- `kubero.local` routes to the Kubero service on port `2000`
- Kubero needed a writable PVC; in the current live cluster that PVC is backed by Longhorn
- the live ClubCRM app pair is currently served by `clubcrm-api` and `clubcrm-web` Deployments in
  namespace `clubcrm`, with replicas spread across `Server2` and `Server3`

Current Kubero access:

- URL: `http://kubero.local`
- direct ingress IP path for testing: `http://100.122.118.85` with `Host: kubero.local`
- bootstrap admin username: `admin`
- rotate the bootstrap admin password after install

## 5. Publish ClubCRM Images

Build and push the existing repo Dockerfiles to GHCR with stable tags:

```bash
docker build -f apps/web/Dockerfile -t ghcr.io/<owner>/clubcrm-web:networking-final .
docker build -f apps/api/Dockerfile -t ghcr.io/<owner>/clubcrm-api:networking-final .
docker push ghcr.io/<owner>/clubcrm-web:networking-final
docker push ghcr.io/<owner>/clubcrm-api:networking-final
```

Use those tags in Kubero when creating the `clubcrm-web` and `clubcrm-api` applications.

Set the `clubcrm-web` replica count to `2` for the networking demo so the live diagnostics iframe
can show traffic moving from the active web pod to the replacement pod during a recycle.

If you are using the OrbStack overlay instead of Kubero-managed app workloads, build the same tags
locally and import them onto the schedulable `k3s` nodes:

```bash
docker build -f apps/api/Dockerfile -t clubcrm-api:deploy .
docker build -f apps/web/Dockerfile -t clubcrm-web:deploy .
docker save clubcrm-api:deploy | gzip -1 | ssh <node> 'gunzip | sudo k3s ctr images import -'
docker save clubcrm-web:deploy | gzip -1 | ssh <node> 'gunzip | sudo k3s ctr images import -'
```

## 6. Apply Repo-Managed Data And Ingress Resources

Apply the repo-managed resources:

```bash
kubectl apply -k infra/k8s
```

Or, on the OrbStack classroom machines:

```bash
kubectl apply -k infra/k8s/overlays/orbstack-demo
```

This creates:

- `clubcrm`, `clubcrm-data`, and `kubero` namespaces
- the repo-managed `clubcrm-longhorn` storage class with a two-replica policy
- Longhorn-backed PostgreSQL and Redis PVCs in `clubcrm-data`
- Postgres and Redis StatefulSets and Services
- Traefik middleware for stripping `/api`
- separate ingress routes for `clubcrm.local` and `kubero.local`

The OrbStack overlay additionally creates:

- repo-managed `clubcrm-api` Deployment and Service in `clubcrm`
- repo-managed `clubcrm-web` Deployment and Service in `clubcrm`, scaled to `2` replicas for the
  failover demo
- `local-path` PVCs for Postgres and Redis so the app can run on the classroom VMs

If you apply only the base manifests without first creating app workloads through Kubero, the
ingress rules will exist but `clubcrm.local` will not route successfully because the expected app
Services are missing.

Verify:

```bash
kubectl get pvc -A
kubectl get ingress -A
kubectl get pods -n clubcrm-data
```

## 7. Configure Kubero Apps

Create two Kubero applications:

- `clubcrm-web`
- `clubcrm-api`

Use `infra/k8s/examples/clubcrm-app-env.example.yaml` as the source of truth for app env values.

Important values:

- web `API_BASE_URL=http://clubcrm-api.clubcrm.svc.cluster.local:8000`
- web `WEB_API_PUBLIC_BASE_URL=http://clubcrm.local/api`
- api `DATABASE_URL=postgresql://clubcrm:...@postgres.clubcrm-data.svc.cluster.local:5432/clubcrm`
- api `REDIS_URL=redis://redis.clubcrm-data.svc.cluster.local:6379/0`
- api `IS_AUTH_BYPASS=true`
- api `AUTH_LOGIN_SUCCESS_URL=http://clubcrm.local/dashboard`
- api `AUTH_LOGOUT_REDIRECT_URL=http://clubcrm.local/login`
- api `AUTH_COOKIE_SECURE=false`

Do not wire MongoDB or Kafka into the live final unless you intentionally expand the scope.

Primary-path expectation:

- Kubero creates the `clubcrm-web` and `clubcrm-api` workloads and their matching Services in
  namespace `clubcrm`
- the base repo ingresses route traffic to those Services
- PostgreSQL and Redis remain repo-managed in `clubcrm-data`

If you are running the OrbStack overlay, this step becomes optional because the repo manages the
`clubcrm-web` and `clubcrm-api` Deployments directly. Kubero can stay installed and reachable on
`http://kubero.local` for the final, while the overlay provides the app runtime that works on the
classroom VMs.

## 8. Point The Companion Monitoring Stack At The Cluster

On the monitoring host:

- install `kubectl` with access to the live `k3s` cluster
- set `MONITOR_SYNTHETIC_TARGET_URL=http://clubcrm.local/system/health`
- keep the existing VM power path pointing at OrbStack
- keep the guest agents on `Server1`, `Server2`, and `Server3`

For the current live environment:

- the monitoring host is `DemoControlPlaneServer` at `192.168.139.213`
- the dashboard UI is served on `http://192.168.139.213:3001`
- the direct `monitor-web` container is reachable on `http://192.168.139.213:3002`
- `monitor-api` is reachable from the cluster nodes at `http://100.95.238.93:8010`
- the VM agents use `Server1`, `Server2`, and `Server3` as their `MONITOR_AGENT_VM_ID` values

The monitoring dashboard will then show:

- VM telemetry and power state
- Kubernetes nodes and pods
- storage classes
- PVC status
- Longhorn volume health
- an embedded ClubCRM public failover iframe that reports the active web pod

## 9. Add Host Entries For The Demo

On the presenter machine and the monitoring host, map the shared ingress hosts to `Server1`:

```text
100.122.118.85 clubcrm.local kubero.local
100.122.118.85 Server1 server1
100.67.65.5 Server2 server2
100.99.187.90 Server3 server3
```

## 10. Final Verification Checklist

Run these checks before the demo:

```bash
kubectl get nodes
kubectl get pods -A
kubectl get pvc -A
kubectl -n longhorn-system get volumes.longhorn.io
kubectl get storageclass clubcrm-longhorn
curl http://clubcrm.local/api/health
curl http://clubcrm.local/system/health
```

Demo goals:

- all three nodes show as `Ready`
- Postgres and Redis PVCs are `Bound`
- the app works through `http://clubcrm.local`
- the embedded `/demo/failover` page reports the active web pod and switches to the
  replacement pod after a recycle
- a Postgres pod restart does not lose data
- the companion dashboard shows VM, pod, PVC, and Longhorn status throughout the demo

## Troubleshooting Notes

- `clubcrm.local` resolves but does not serve the app:
  Check whether `clubcrm-web` and `clubcrm-api` Services actually exist in namespace `clubcrm`.
  Base `infra/k8s` assumes Kubero already created them.

- `clubcrm.local/api` returns the wrong path or a 404:
  Check the Traefik strip-prefix middleware and the `clubcrm-api` ingress/service wiring.

- PVCs stay `Pending` or pods cannot attach volumes on OrbStack:
  Keep Longhorn installed for visibility, but switch to the `orbstack-demo` overlay and `local-path`
  for the classroom environment.

- Smoke PVCs bind but Longhorn volumes still fail to attach on the real cluster:
  Treat that as a node-environment problem first. The April 12, 2026 validation on the provided
  `server1`/`server2`/`server3` environment showed successful PVC provisioning but repeated attach
  failure on `server3` because host-side iSCSI session creation crashed during login. Do not move
  PostgreSQL or Redis onto Longhorn until that host issue is fixed and the smoke workload reaches
  `Running`.

- Kubero is up but not reachable on `kubero.local`:
  Confirm the installed Kubero service name and service port still match `infra/k8s/kubero-ingress.yaml`.

- Monitoring shows VM data but no cluster data:
  Check the monitoring host kubeconfig or set `MONITOR_K8S_SNAPSHOT_FILE` for a fallback view.

- The monitoring dashboard reaches the old cluster instead of the replacement servers:
  Update `/etc/hosts` on the presenter machine and `DemoControlPlaneServer` so `clubcrm.local` and
  `kubero.local` point to `100.122.118.85` instead of the retired `192.168.139.x` nodes.
