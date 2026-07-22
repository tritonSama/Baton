#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

echo ""
echo "=== Baton setup (from GitHub clone) ==="
echo ""

if ! command -v node >/dev/null 2>&1; then
  echo "ERROR: Node.js is not installed."
  echo "Install Node 20+ from https://nodejs.org/ then run ./setup.sh again."
  exit 1
fi

NODE_MAJOR="$(node -p "process.versions.node.split('.')[0]")"
if [[ "$NODE_MAJOR" -lt 20 ]]; then
  echo "ERROR: Need Node 20+. You have $(node -v)"
  exit 1
fi

echo "Found Node $(node -v)"

if [[ ! -f package.json ]]; then
  echo "ERROR: package.json missing. Clone https://github.com/tritonSama/Baton.git and run from that folder."
  exit 1
fi

echo ""
echo "Installing dependencies..."
npm install

echo ""
echo "Running tests..."
if ! npm test; then
  echo "WARNING: Some tests failed. You can still try: ./start-baton.sh"
else
  echo "Tests passed."
fi

echo ""
echo "Setup complete."
echo "Next: ./start-baton.sh   or   npm run dev"
echo ""
