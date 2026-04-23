#!/bin/sh
set -eu

# Template wrapper for the monitoring VM's restricted SSH user.
# The monitor API calls this script remotely instead of running arbitrary shell commands.
#
# Verified OrbStack CLI references:
# - "orb list"
# - "orb start <machine>"
# - "orb stop <machine>"
# - "orb restart <machine>"
# Source: https://docs.orbstack.dev/headless and https://docs.orbstack.dev/machines/commands
#
# This wrapper may need small parsing adjustments if OrbStack changes the human-readable output of
# "orb info" or "orb list" in a newer release.

MONITORED_ORBSTACK_MACHINES="${MONITORED_ORBSTACK_MACHINES:-}"
ORBSTACK_POLL_INTERVAL_SECONDS="${ORBSTACK_POLL_INTERVAL_SECONDS:-1}"
ORBSTACK_WAIT_TIMEOUT_SECONDS="${ORBSTACK_WAIT_TIMEOUT_SECONDS:-120}"
PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:${PATH:-}"
export PATH

find_orbstack_cli() {
  for candidate in \
    /opt/homebrew/bin/orb \
    /usr/local/bin/orb \
    /opt/homebrew/bin/orbctl \
    /usr/local/bin/orbctl \
    orb \
    orbctl
  do
    if command -v "$candidate" >/dev/null 2>&1; then
      command -v "$candidate"
      return
    fi

    if [ -x "$candidate" ]; then
      printf '%s\n' "$candidate"
      return
    fi
  done

  printf '%s\n' "OrbStack CLI is not installed." >&2
  exit 1
}

ORB_CLI="$(find_orbstack_cli)"

machine_status() {
  machine_name="$1"
  "$ORB_CLI" info "$machine_name" | awk -F': ' '/State|Status/ { print tolower($2); exit }'
}

wait_for_status() {
  machine_name="$1"
  expected_status="$2"

  python3 - "$machine_name" "$expected_status" "$ORBSTACK_WAIT_TIMEOUT_SECONDS" "$ORBSTACK_POLL_INTERVAL_SECONDS" "$ORB_CLI" <<'PY'
import subprocess
import sys
import time

machine_name, expected_status, timeout_seconds, poll_interval_seconds, orb_cli = sys.argv[1:]
deadline = time.monotonic() + float(timeout_seconds)
last_status = "unknown"

while time.monotonic() <= deadline:
    completed = subprocess.run(
        [orb_cli, "info", machine_name],
        capture_output=True,
        check=False,
        text=True,
    )
    output = (completed.stdout or "") + (completed.stderr or "")
    status = "unknown"
    for line in output.splitlines():
        if line.startswith("State:") or line.startswith("Status:"):
            status = line.split(":", 1)[1].strip().lower()
            break

    last_status = status
    if status == expected_status:
        print(status)
        sys.exit(0)

    time.sleep(float(poll_interval_seconds))

print(last_status)
sys.exit(1)
PY
}

machine_boot_time() {
  machine_name="$1"
  "$ORB_CLI" run -m "$machine_name" uptime -s 2>/dev/null | tr -d '\r'
}

wait_for_boot_change() {
  machine_name="$1"
  previous_boot_time="$2"

  python3 - "$machine_name" "$previous_boot_time" "$ORBSTACK_WAIT_TIMEOUT_SECONDS" "$ORBSTACK_POLL_INTERVAL_SECONDS" "$ORB_CLI" <<'PY'
import subprocess
import sys
import time

machine_name, previous_boot_time, timeout_seconds, poll_interval_seconds, orb_cli = sys.argv[1:]
deadline = time.monotonic() + float(timeout_seconds)
last_boot_time = previous_boot_time

while time.monotonic() <= deadline:
    completed = subprocess.run(
        [orb_cli, "run", "-m", machine_name, "uptime", "-s"],
        capture_output=True,
        check=False,
        text=True,
    )
    boot_time = (completed.stdout or "").strip()
    if completed.returncode == 0 and boot_time and boot_time != previous_boot_time:
        print(boot_time)
        sys.exit(0)

    if boot_time:
        last_boot_time = boot_time

    time.sleep(float(poll_interval_seconds))

print(last_boot_time)
sys.exit(1)
PY
}

list_machines() {
  if [ -n "$MONITORED_ORBSTACK_MACHINES" ]; then
    printf '%s\n' "$MONITORED_ORBSTACK_MACHINES" | tr ' ' '\n'
    return
  fi

  "$ORB_CLI" list | awk 'NF>0 { print $1 }'
}

to_json() {
  python3 - "$@" <<'PY'
import json
import sys

items = []
args = sys.argv[1:]
for index in range(0, len(args), 2):
    items.append({"name": args[index], "status": args[index + 1]})
print(json.dumps(items))
PY
}

case "${1:-}" in
  list)
    shift
    set --
    for machine in $(list_machines); do
      status="$(machine_status "$machine" || printf 'unknown')"
      set -- "$@" "$machine" "$status"
    done
    to_json "$@"
    ;;
  power)
    action="${2:-}"
    machine="${3:-}"
    if [ -z "$action" ] || [ -z "$machine" ]; then
      printf '%s\n' 'usage: clubcrm-monitor-orbstack power <start|stop|restart> <machine>' >&2
      exit 1
    fi
    case "$action" in
      start)
        "$ORB_CLI" start "$machine"
        status="running"
        ;;
      stop)
        "$ORB_CLI" stop "$machine"
        wait_for_status "$machine" "stopped" >/dev/null
        status="stopped"
        details="stop completed for $machine."
        ;;
      restart)
        previous_boot_time="$(machine_boot_time "$machine" || true)"
        "$ORB_CLI" run -m "$machine" sudo reboot
        wait_for_boot_change "$machine" "$previous_boot_time" >/dev/null
        wait_for_status "$machine" "running" >/dev/null
        status="running"
        details="restart completed for $machine."
        ;;
      *)
        printf '%s\n' "unsupported power action: $action" >&2
        exit 1
        ;;
    esac
    [ "${details:-}" ] || details="$action completed for $machine."
    python3 - "$machine" "$status" "$details" <<'PY'
import json
import sys

print(json.dumps({"name": sys.argv[1], "status": sys.argv[2], "details": sys.argv[3]}))
PY
    ;;
  *)
    printf '%s\n' 'usage: clubcrm-monitor-orbstack <list|power>' >&2
    exit 1
    ;;
esac
