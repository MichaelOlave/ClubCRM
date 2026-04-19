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
        status="stopped"
        ;;
      restart)
        "$ORB_CLI" restart "$machine"
        status="running"
        ;;
      *)
        printf '%s\n' "unsupported power action: $action" >&2
        exit 1
        ;;
    esac
    python3 - "$machine" "$status" "$action requested for $machine." <<'PY'
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
