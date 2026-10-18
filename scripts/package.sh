#!/usr/bin/env bash
# Builds dist/undo-redo-for-youtube-<version>.zip containing ONLY what the
# extension needs at runtime (no dev harness, docs or source logo; the licences ARE included).
# This is the zip you upload to the Chrome Web Store / Edge Add-ons.
set -euo pipefail
cd "$(dirname "$0")/.."

version=$(sed -n 's/.*"version": *"\([^"]*\)".*/\1/p' manifest.json | head -1)
out="dist/undo-redo-for-youtube-${version}.zip"

mkdir -p dist
rm -f "$out"
zip -r -q "$out" manifest.json styles.css popup.html popup.css popup.js src icons/icon*.png LICENSE THIRD_PARTY_NOTICES.md
echo "Built $out"
unzip -l "$out" | tail -n +4
