#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

if [[ ! -f package.json ]]; then
  echo "ERROR: Run this inside the cloned Baton repo folder."
  exit 1
fi

if [[ ! -d node_modules ]]; then
  echo "Dependencies missing — running setup first..."
  ./setup.sh
fi

echo "Starting Baton..."
npm run dev
