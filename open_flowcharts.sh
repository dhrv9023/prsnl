#!/usr/bin/env bash
# ==============================================================================
# Kareerist Architecture Flowcharts One-Click Launcher
# Opens docs/architecture/architecture_viewer.html in default web browser
# ==============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VIEWER_PATH="${SCRIPT_DIR}/docs/architecture/architecture_viewer.html"

if [ ! -f "${VIEWER_PATH}" ]; then
  echo "Error: Architecture viewer not found at ${VIEWER_PATH}"
  exit 1
fi

echo "🚀 Opening Kareerist Architecture Canvas in your default browser..."
xdg-open "${VIEWER_PATH}" 2>/dev/null || open "${VIEWER_PATH}" 2>/dev/null || sensible-browser "${VIEWER_PATH}" 2>/dev/null &
