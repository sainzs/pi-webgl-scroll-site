#!/usr/bin/env bash
# Scaffold a new WebGL scroll site from the skill's proven spine.
# Usage: bash scaffold.sh <target-dir>
set -euo pipefail
TARGET="${1:?usage: scaffold.sh <target-dir>}"
SKILL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

mkdir -p "$TARGET"/src/{core,scene,ui} "$TARGET"/shots "$TARGET"/ref
cp "$SKILL_DIR"/assets/spine/{state.js,scroll.js,director.js,post.js} "$TARGET"/src/core/
cp "$SKILL_DIR"/assets/spine/{main.js,styles.css}                     "$TARGET"/src/
cp "$SKILL_DIR"/assets/spine/{index.html,package.json,vite.config.js} "$TARGET"/
cp "$SKILL_DIR"/assets/CONTRACT.template.md                           "$TARGET"/CONTRACT.md
cp "$SKILL_DIR"/scripts/{capture.py,check_frames.py}                  "$TARGET"/

cd "$TARGET"
npm install
python3 -m venv .venv && .venv/bin/pip -q install playwright pillow && .venv/bin/playwright install chromium

echo
echo "Scaffolded $TARGET"
echo "  1. Edit CONTRACT.md   (palette, chapters, art direction)"
echo "  2. Edit src/core/state.js CHAPTERS and src/core/director.js STAGES/SHOTS"
echo "  3. Write one module per chapter in src/scene/"
echo "  4. npm run build && npm run preview &"
echo "     .venv/bin/python capture.py http://localhost:4173/ shots 14"
echo "     .venv/bin/python check_frames.py shots"
