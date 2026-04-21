#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

if ! command -v node >/dev/null 2>&1; then
  echo "[FishMark] Node.js is required but was not found in PATH."
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "[FishMark] npm is required but was not found in PATH."
  exit 1
fi

if [[ "$(uname)" != "Darwin" ]]; then
  echo "[FishMark] release-macos.sh must be run on macOS."
  exit 1
fi

echo "[FishMark] macOS release is not implemented yet."
echo "[FishMark] This entrypoint is reserved for the future release:mac flow."
exit 1
