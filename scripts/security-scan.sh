#!/usr/bin/env bash

set -euo pipefail

if ! command -v osv-scanner >/dev/null 2>&1; then
  echo "OSV-Scanner is required. Install the open-source scanner from https://google.github.io/osv-scanner/installation/" >&2
  exit 2
fi

pnpm audit --prod --audit-level=high
osv-scanner scan source --lockfile=pnpm-lock.yaml .
