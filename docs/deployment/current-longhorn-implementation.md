# Current Longhorn Implementation Status

This document explains how Longhorn is currently represented in the ClubCRM repository, what is
actually running on the live cluster right now, and what is broken or drifted as of April 12, 2026.

It is intended to complement, not replace:

- `docs/deployment/k3s-kubero-longhorn.md`, which is the target runbook
- `docs/deployment/companion-monitoring-stack.md`, which explains how the off-cluster monitoring
  stack observes Kubernetes node, pod, and Longhorn state during the networking demo

## Scope

This status doc covers three things:

1. the intended repo-backed Longhorn implementation
2. the current live cluster state that was validated on April 7 and April 12, 2026
3. the broken, misleading, or incomplete parts of the current implementation

The live validation in this document came from non-interactive SSH checks against `vm1` on April 7,
plus direct `kubectl` and node-debug validation against the real `k3s` cluster on April 12.

## Executive Summary

The repository now includes the main Longhorn integration work needed for the networking-final path:

- a dedicated `clubcrm-longhorn` StorageClass for the ClubCRM data plane
- repo-managed PostgreSQL and Redis PVCs pointed at that storage class
- a dedicated smoke-test bundle under `infra/k8s/longhorn-smoke/`
- deployment docs that explain how to validate Longhorn before moving real workloads

What is still missing is not repository integration. It is a healthy enough cluster environment to
finish the attach and mount path.

What is live today is the OrbStack fallback shape:

- Longhorn is installed and its control-plane pods are running
- ClubCRM stateful PVCs are bound to `local-path`, not Longhorn
- the app is running successfully in the fallback cluster shape
- the visible Longhorn smoke-test path still faults during attach on the provided VM environment

The most important conclusion is simple:

- Longhorn is present in the environment
- Longhorn is observable in the monitoring story
- Longhorn is integrated in the repo, but not currently the storage backend that keeps ClubCRM alive

## Repo-Backed Design

### 1. Base `k3s` path

The base Kubernetes manifests under `infra/k8s/` define the intended production-style networking
demo path.

In that base path:

- `infra/k8s/clubcrm-longhorn-storageclass.yaml` creates a dedicated `clubcrm-longhorn`
  StorageClass with `numberOfReplicas: "2"`
- `infra/k8s/postgres-pvc.yaml` creates a `10Gi` `ReadWriteOnce` PVC on storage class
  `clubcrm-longhorn`
- `infra/k8s/redis-pvc.yaml` creates a `2Gi` `ReadWriteOnce` PVC on storage class
  `clubcrm-longhorn`
- `infra/k8s/postgres-statefulset.yaml` mounts the standalone `postgres-data` claim
- `infra/k8s/redis-statefulset.yaml` mounts the standalone `redis-data` claim
- the base `kustomization.yaml` wires those resources together with namespaces, services, ingress,
  and the Traefik `/api` strip middleware
- `infra/k8s/longhorn-smoke/` provides a repo-managed PVC plus pod for validating Longhorn volume
  attach behavior before moving real stateful workloads onto that storage path

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
- keep ClubCRM PVCs explicitly pointed at the repo-managed `clubcrm-longhorn` storage class
- use the OrbStack overlay only when the classroom platform cannot reliably demonstrate Longhorn

So the repo intent is still clear: Longhorn is supposed to be the primary storage path for the
networking-final cluster, and `local-path` is supposed to be the fallback path.

## Monitoring Integration

The current v1 companion visualizer renders Kubernetes topology plus an initial Longhorn storage
overlay. Its job is still intentionally narrow:

- watch Kubernetes node state
- watch pod placement and transitions
- render Longhorn volume and replica health when the CRDs are available
- keep the off-cluster demo view alive while the main cluster changes

Longhorn matters operationally to the networking runbook and now appears in the visualizer contract
as root-level `volumes` and `replicas`. The visualizer is still not the final source of truth for
Longhorn diagnosis; use the dedicated cluster checks in this runbook for that.

## Current Live Cluster State

The following combines the April 7, 2026 SSH validation and the April 12, 2026 smoke-test rerun on
the real `server1`/`server2`/`server3` cluster.

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

The repository now includes a dedicated smoke bundle under `infra/k8s/longhorn-smoke/`:

- namespace `clubcrm-longhorn-smoke`
- storage class `clubcrm-longhorn-smoke`
- PVC `smoke-data`
- pod `smoke-writer`

The April 12 validation on the real cluster showed:

- the smoke PVC provisions successfully and becomes `Bound`
- the smoke pod schedules onto `server3` when `server2` is cordoned
- the Longhorn volume is created successfully
- the attach path still fails before the pod can reach `Running`
- the volume repeatedly falls into `attaching` / `faulted` / `detached` cycles

Kubernetes reports repeated attach timeout events for the smoke pod, and Longhorn reports
`DetachedUnexpectedly` because the engine dies during attach.

The decisive host-side failure on `server3` is in iSCSI session creation, not in the repo manifests
or in Kubernetes PVC provisioning. During April 12 validation, `iscsid` on `server3` reached target
discovery successfully, then crashed during login/session setup with output equivalent to:

```text
connected local port ... to 10.42.2.67:3260
in kcreate_session
in __kipc_call
in kwritev
sendmsg: bug? ctrl_fd 4
```

So the current live problem is not just cosmetic monitoring noise. The smoke workload cannot mount
the Longhorn volume because the provided VM environment crashes in host-side iSCSI session
creation.

### Replica configuration drift

The live environment currently has conflicting replica expectations:

- the Longhorn setting `default-replica-count` is applied as `2`
- the `longhorn-two` storage class explicitly requests `2` replicas
- the `longhorn-demo` storage class explicitly requests `2` replicas
- the `longhorn` storage class still explicitly requests `3` replicas

That mattered because the repo's older base ClubCRM PVC manifests pointed to
`storageClassName: longhorn`. The repository now defines a dedicated `clubcrm-longhorn`
StorageClass with an explicit two-replica policy, but the live cluster still needs to apply and use
that resource before the storage story is truly aligned end to end.

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

The repo-backed smoke validation path is implemented and was re-run on the real cluster, but the
workload still cannot start.

Evidence:

- the repo smoke PVC becomes `Bound`
- the smoke pod schedules onto `server3`
- Longhorn volume robustness is `faulted`
- volume state cycles through `attaching` and `detached`
- `smoke-writer` stays `Pending`
- Kubernetes reports repeated `FailedAttachVolume`
- `server3` host-side `iscsid` crashes during session creation

Impact:

- the environment still does not have a known-good proof that Longhorn can back a real workload
  successfully
- even a small repo-managed validation workload is not mounting cleanly
- PostgreSQL and Redis should not be switched to Longhorn yet

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

### 5. The current monitoring stack can surface Longhorn data, but it is still not the final source of truth

The v1 companion monitoring stack now includes Longhorn collections in its snapshot data.

Impact:

- it can show the application impact of storage problems through pod state changes
- it also exposes Longhorn-specific root collections named `volumes` and `replicas`
- Longhorn diagnosis still requires the dedicated cluster checks in this runbook

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
- the repo now has a dedicated ClubCRM Longhorn storage class and a dedicated smoke-test bundle
- the repo has a clear base/fallback split instead of pretending the risky path is always stable
- the companion monitoring stack already has first-class Longhorn visibility in its data model and
  UI
- the live OrbStack fallback cluster is serving the app successfully
- the repo runbook already documents that OrbStack may require a `local-path` fallback

## Current Verdict

As of April 12, 2026, the Longhorn implementation should be described as:

- implemented in the repo strongly enough to validate
- operational as an installed cluster subsystem
- integrated into monitoring
- not currently the live storage backend for ClubCRM
- not currently proven healthy by the live Longhorn smoke workload because the provided VM
  environment fails during host-side iSCSI session creation

That is a much more accurate description than saying "Longhorn is done" or "ClubCRM is currently
running on Longhorn."

## Recommended Next Steps

If the goal is to keep the current fallback shape and simply document reality better:

- treat the OrbStack overlay as the current known-good deployment path
- update any demo notes that imply ClubCRM is already using Longhorn live
- update the monitoring fixture to match the fallback cluster shape

If the goal is to restore Longhorn as the real ClubCRM storage backend:

- apply the repo-managed `clubcrm-longhorn` storage class and use it as the single source of truth
- remove the extra default storage classes so default behavior is unambiguous
- decide whether `server1` should remain unschedulable for Longhorn placement
- fix the host-side iSCSI/session-creation failure on the provided cluster first
- validate `infra/k8s/longhorn-smoke/` cleanly before moving PostgreSQL and Redis back to Longhorn
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
KUBECONFIG=~/.kube/k3s.yaml kubectl get nodes -o wide
KUBECONFIG=~/.kube/k3s.yaml kubectl apply -k infra/k8s/longhorn-smoke
KUBECONFIG=~/.kube/k3s.yaml kubectl describe pod smoke-writer -n clubcrm-longhorn-smoke
KUBECONFIG=~/.kube/k3s.yaml kubectl describe volumes.longhorn.io <smoke-volume> -n longhorn-system
KUBECONFIG=~/.kube/k3s.yaml kubectl debug node/server3 --profile=sysadmin
```

Those checks should be re-run before any final presentation or production-facing claim, because the
live cluster state can change independently of the repository.
