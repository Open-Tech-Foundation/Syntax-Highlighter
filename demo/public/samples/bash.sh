#!/usr/bin/env bash
# deploy
set -euo pipefail

if [[ -z "${1:-}" ]]; then
  echo "usage: $0 <env>"
  exit 1
fi

echo "deploying to $1..."
