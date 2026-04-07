# Current Longhorn Implementation Status

This document explains how Longhorn is currently represented in the ClubCRM repository, what is
actually running on the live cluster right now, and what is broken or drifted as of April 7, 2026.

It is intended to complement, not replace:

- `docs/deployment/k3s-kubero-longhorn.md`, which is the target runbook
- `docs/deployment/companion-monitoring-stack.md`, which explains how Longhorn state is surfaced in
  the companion monitoring stack

## Scope

This status doc covers three things:

1. the intended repo-backed Longhorn implementation
2. the current live cluster state that was validated over SSH on April 7, 2026
3. the broken, misleading, or incomplete parts of the current implementation

The live validation in this document came from non-interactive SSH checks against `vm1`, which is
currently the `k3s` server node for the networking environment.

## Executive Summary

The repository still treats Longhorn as the intended persistence layer for the networking-final
cluster path, but the live cluster is not currently using Longhorn for ClubCRM's PostgreSQL or
Redis data.

What is live today is the OrbStack fallback shape:

- Longhorn is installed and its control-plane pods are running
- ClubCRM stateful PVCs are bound to `local-path`, not Longhorn
- the app is running successfully in the fallback cluster shape
- the visible Longhorn smoke-test volume is `faulted` and cannot attach to its pod

The most important conclusion is simple:

- Longhorn is present in the environment
- Longhorn is observable in the monitoring story
- Longhorn is not currently the storage backend that keeps ClubCRM alive

## Repo-Backed Design

### 1. Base `k3s` path

The base Kubernetes manifests under `infra/k8s/` define the intended production-style networking
demo path.

In that base path:

- `infra/k8s/postgres-pvc.yaml` creates a `10Gi` `ReadWriteOnce` PVC on storage class `longhorn`
- `infra/k8s/redis-pvc.yaml` creates a `2Gi` `ReadWriteOnce` PVC on storage class `longhorn`
- `infra/k8s/postgres-statefulset.yaml` mounts the standalone `postgres-data` claim
- `infra/k8s/redis-statefulset.yaml` mounts the standalone `redis-data` claim
- the base `kustomization.yaml` wires those resources together with namespaces, services, ingress,
  and the Traefik `/api` strip middleware

Important constraint:

- the base manifests do not create the `clubcrm-web` or `clubcrm-api` workloads
- they assume those app services come from Kubero
- the Longhorn-backed stateful services are repo-managed even when the stateless app pair is not

### 2. OrbStack fallback path

The overlay under `infra/k8s/overlays/orbstack-demo/` is the checked-in fallback for classroom or
OrbStack environments where the full Longhorn path is not reliable enough.

That overlay makes two major changes:

- it switches PostgreSQL and Redis PVCs from `longhorn` to `local-path`
- it creates repo-managed `clubcrm-api` and `clubcrm-web` Deployments and Services directly

That means the overlay is not just a storage tweak. It is a different operating mode:

- the base path is "Kubero-managed apps plus Longhorn-backed data"
- the overlay path is "repo-managed apps plus `local-path` data"

### 3. Runbook expectations

The target runbook in `docs/deployment/k3s-kubero-longhorn.md` describes the intended Longhorn
story like this:

- install Longhorn into `longhorn-system`
- set Longhorn's effective replica behavior to `2`
- keep ClubCRM PVCs explicitly pointed at the `longhorn` storage class
- use the OrbStack overlay only when the classroom platform cannot reliably demonstrate Longhorn

So the repo intent is still clear: Longhorn is supposed to be the primary storage path for the
networking-final cluster, and `local-path` is supposed to be the fallback path.

## Monitoring Integration

Longhorn is also implemented as part of the companion monitoring stack.

### `monitor-api`

`apps/monitor-api/src/modules/monitoring/infrastructure/kubernetes.py` polls:

- nodes
- pods
- storage classes
- PVCs
- `volumes.longhorn.io` from namespace `longhorn-system`

It serializes that data into the shared monitoring snapshot as:

- `storage_classes`
- `pvcs`
- `longhorn_volumes`

### `monitor-web`

`apps/monitor-web/src/features/monitoring/components/StoragePanel.tsx` renders:

- storage classes
- persistent volume claims
- Longhorn volume status, robustness, node, and size

So Longhorn is not only a cluster-side dependency in this repo. It is also part of the demo
observability story.

## Current Live Cluster State

The following reflects what was observed over SSH on April 7, 2026.

### Cluster shape

The live `k3s` cluster currently reports:

- `server1` as the control-plane node
- `server2` and `server3` as worker nodes
- all three nodes `Ready`
- `server1` marked `Ready,SchedulingDisabled`

Longhorn itself is installed and its core pods are up in `longhorn-system`.

### Storage classes currently present

The live cluster currently has these storage classes:

- `local-path`
- `longhorn`
- `longhorn-demo`
- `longhorn-static`
- `longhorn-two`

More importantly, the cluster currently shows multiple defaults at the same time:

- `local-path (default)`
- `longhorn (default)`
- `longhorn-two (default)`

That is configuration drift and creates ambiguity for any PVC that does not explicitly set a
storage class.

### What ClubCRM is actually using

The live ClubCRM stateful claims are:

- `clubcrm-data/postgres-data`
- `clubcrm-data/redis-data`

Both are currently:

- `Bound`
- provisioned by `local-path`
- backed by local node storage on `server2`

That means the live ClubCRM data plane is running on the fallback storage path, not on Longhorn.

### What the app shape implies

The live cluster also has:

- `clubcrm-api` Deployment with `2/2` replicas
- `clubcrm-web` Deployment with `2/2` replicas
- matching `clubcrm-api` and `clubcrm-web` Services
- the expected `clubcrm.local` ingress routes
- Kubero installed separately in namespace `kubero`

Combined with the `local-path` PVCs, this live shape matches the repository's
`orbstack-demo` fallback model much more closely than the intended "Kubero-managed apps plus
Longhorn-backed data" model.

### Longhorn smoke-test state

The only live Longhorn-backed PVC observed during validation was:

- `lh-test/smoke-pvc`

That PVC is backed by a Longhorn volume on storage class `longhorn-two`, but the current state is
not healthy:

- the Longhorn volume is `detached`
- its robustness is `faulted`
- the related `smoke-pod` is stuck `Pending`
- the pod repeatedly reports `FailedAttachVolume`

The attach failure currently says:

- the volume "is not ready for workloads"

The backing PV for that smoke volume also carries this annotation:

- `longhorn.io/volume-scheduling-error: replica scheduling failed`

So the current live problem is not just cosmetic monitoring noise. The smoke workload cannot mount
the Longhorn volume.

### Replica configuration drift

The live environment currently has conflicting replica expectations:

- the Longhorn setting `default-replica-count` is applied as `2`
- the `longhorn-two` storage class explicitly requests `2` replicas
- the `longhorn-demo` storage class explicitly requests `2` replicas
- the `longhorn` storage class still explicitly requests `3` replicas

That matters because the repo's base ClubCRM PVC manifests point to `storageClassName: longhorn`.
So even though the runbook says the cluster should behave like a two-replica Longhorn setup, the
actual storage class named `longhorn` in the live environment still encodes a three-replica
request.

### `iscsid` status

The historical runbook note says OrbStack can break Longhorn by crashing `iscsid` during PVC
attach/load scenarios.

During this April 7, 2026 validation:

- `iscsid` was active on `vm1`
- `iscsid` was active on `vm2`
- `iscsid` was active on `vm3`

That does not prove OrbStack can never trigger the old failure mode, but it does mean the current
observed failure is not best explained by an `iscsid` crash at the time of this check.

## What Is Broken

This section separates the concrete broken items from "not ideal but intentional" fallback choices.

### 1. ClubCRM is not currently using Longhorn for its real data

This is the biggest gap between design and reality.

The repo's primary networking path says:

- PostgreSQL should use Longhorn
- Redis should use Longhorn

The live cluster currently does this instead:

- PostgreSQL uses `local-path`
- Redis uses `local-path`

Impact:

- the main ClubCRM demo is not currently validating Longhorn-backed persistence
- a pod restart or reschedule of the live ClubCRM data workloads is not demonstrating the storage
  architecture described in the base runbook
- the cluster is currently proving the fallback, not the intended final storage design

### 2. The current Longhorn smoke path is failing

The live Longhorn test claim exists, but the workload using it cannot start.

Evidence:

- Longhorn volume robustness is `faulted`
- volume state is `detached`
- `smoke-pod` is `Pending`
- Kubernetes reports repeated `FailedAttachVolume`
- the PV annotation explicitly says `replica scheduling failed`

Impact:

- the environment does not currently have a known-good proof that Longhorn can back a real
  workload successfully
- even a small test workload is not mounting cleanly

### 3. The repo runbook and live storage-class behavior have drifted

The runbook expectation is effectively "two-replica Longhorn for ClubCRM." The live storage-class
reality is more fragmented:

- `longhorn` still requests `3` replicas
- `longhorn-two` requests `2`
- multiple storage classes are flagged as default

Impact:

- the class named in the repo manifests is not aligned with the replica policy described in the
  runbook
- cluster behavior is harder to reason about during troubleshooting
- future PVCs may not land on the storage backend a teammate expects

### 4. The monitoring fixture no longer matches the manifests or the live cluster

`infra/monitoring/fixtures/k8s-snapshot.json` currently models:

- PVC names `postgres-data-postgres-0` and `redis-data-redis-0`
- requested sizes `20Gi` and `5Gi`
- Longhorn-backed ClubCRM volumes

The current repo manifests actually define:

- standalone claims named `postgres-data` and `redis-data`
- requested sizes `10Gi` and `2Gi`

The live cluster currently uses:

- those standalone claim names
- `local-path`, not Longhorn, for ClubCRM data

Impact:

- snapshot-file rehearsals can show a storage story that does not match the real deployment
- screenshots or demos based on the fixture may overstate Longhorn readiness

### 5. The monitoring adapter can silently hide Longhorn-specific failures

`apps/monitor-api/src/modules/monitoring/infrastructure/kubernetes.py` only marks Kubernetes as
disconnected when the node or pod fetch fails.

If this happens:

- `kubectl get nodes` works
- `kubectl get pods` works
- `kubectl get volumes.longhorn.io` fails

the monitoring snapshot still comes back as:

- `connected: true`
- `source: kubectl`
- `longhorn_volumes: []`

Impact:

- the dashboard can make Longhorn problems look like "no volumes exist" instead of "Longhorn data
  could not be collected"
- operators lose an important troubleshooting signal during the demo

### 6. The primary and fallback paths are both implemented, but only the fallback is clearly proven

This is not a bug in isolation, but it is a broken expectation if the team believes the full
Longhorn path is already validated.

What is proven today:

- the OrbStack fallback path runs
- ClubCRM is reachable through ingress
- repo-managed app Deployments and `local-path` PVCs work

What is not proven today:

- base ClubCRM stateful services can run on the `longhorn` storage class in this environment
- the main ClubCRM data path survives disruption while truly backed by Longhorn

## What Is Working

Even with the gaps above, several parts of the implementation are working and should be called out
clearly.

- Longhorn is installed and running in `longhorn-system`
- the repo has a clear base/fallback split instead of pretending the risky path is always stable
- the companion monitoring stack already has first-class Longhorn visibility in its data model and
  UI
- the live OrbStack fallback cluster is serving the app successfully
- the repo runbook already documents that OrbStack may require a `local-path` fallback

## Current Verdict

As of April 7, 2026, the Longhorn implementation should be described as:

- partially implemented in the repo
- operational as an installed cluster subsystem
- integrated into monitoring
- not currently the live storage backend for ClubCRM
- not currently proven healthy by the live Longhorn smoke workload

That is a much more accurate description than saying "Longhorn is done" or "ClubCRM is currently
running on Longhorn."

## Recommended Next Steps

If the goal is to keep the current fallback shape and simply document reality better:

- treat the OrbStack overlay as the current known-good deployment path
- update any demo notes that imply ClubCRM is already using Longhorn live
- update the monitoring fixture to match the fallback cluster shape

If the goal is to restore Longhorn as the real ClubCRM storage backend:

- choose one Longhorn storage class and make its replica policy the single source of truth
- remove the extra default storage classes so default behavior is unambiguous
- decide whether `server1` should remain unschedulable for Longhorn placement
- validate a clean Longhorn smoke workload before moving PostgreSQL and Redis back to Longhorn
- only after the smoke path is healthy, switch the ClubCRM PVCs off the fallback overlay path

If the goal is to improve observability regardless of storage choice:

- make `monitor-api` surface a Longhorn collection error separately from generic Kubernetes
  connectivity
- align `infra/monitoring/fixtures/k8s-snapshot.json` with either the base manifests or the live
  fallback deployment, but not an outdated hybrid of both

## Validation Commands Used

The live status in this document was derived from checks equivalent to:

```bash
ssh vm1 'sudo k3s kubectl get nodes'
ssh vm1 'sudo k3s kubectl -n longhorn-system get pods'
ssh vm1 'sudo k3s kubectl get storageclass'
ssh vm1 'sudo k3s kubectl get pvc -A -o wide'
ssh vm1 'sudo k3s kubectl -n longhorn-system get volumes.longhorn.io'
ssh vm1 'sudo k3s kubectl -n lh-test describe pod smoke-pod'
ssh vm1 'sudo k3s kubectl -n longhorn-system get settings.longhorn.io default-replica-count -o yaml'
```

Those checks should be re-run before any final presentation or production-facing claim, because the
live cluster state can change independently of the repository.
