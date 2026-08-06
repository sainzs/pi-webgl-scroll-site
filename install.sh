#!/usr/bin/env bash
# install.sh - install the webgl-scroll-site skill for one or more agent hosts.
#
# Usage:
#   ./install.sh pi           -> ~/.pi/agent/skills/webgl-scroll-site
#   ./install.sh prime        -> ~/.prime/agent/skills/webgl-scroll-site
#   ./install.sh claude       -> ~/.claude/skills/webgl-scroll-site
#   ./install.sh opencode     -> ~/.config/opencode/skills/webgl-scroll-site
#                                (opencode may additionally need an
#                                 "instructions" entry in opencode.json
#                                 pointing at the SKILL.md; verify per setup)
#   ./install.sh local <dir>  -> <dir>/.pi/skills/webgl-scroll-site
#                                (project-local; prints required AGENTS.md snippet)
#   ./install.sh all          -> pi + prime + claude
#   ./install.sh -h | --help
#
# Idempotent: each install replaces the destination directory in full
# (rsync-style: delete + copy), so stale files never linger.
set -euo pipefail

SRC="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NAME="webgl-scroll-site"
PAYLOAD=(SKILL.md references assets scripts)

usage() {
  sed -n '2,20p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'
}

install_to() {
  local base="$1" dest
  dest="$base/$NAME"
  for item in "${PAYLOAD[@]}"; do
    if [ ! -e "$SRC/$item" ]; then
      echo "error: missing payload '$SRC/$item'" >&2
      exit 1
    fi
  done
  mkdir -p "$base"
  rm -rf "$dest"
  mkdir -p "$dest"
  cp -R "${PAYLOAD[@]/#/$SRC/}" "$dest/"
  chmod +x "$dest"/scripts/*.sh "$dest"/scripts/*.py 2>/dev/null || true
  local count
  count=$(find "$dest" -type f | wc -l | tr -d ' ')
  echo "  installed -> $dest ($count files)"
}

print_local_snippet() {
  local dir="$1"
  cat <<EOF

Project-local installs are only discovered if the project's AGENTS.md points
at them. Add this to $dir/AGENTS.md:

## Skills (load on demand)

- \`webgl-scroll-site\` - building scroll-driven three.js websites.
  Lives at \`.pi/skills/webgl-scroll-site/SKILL.md\`.
EOF
}

target="${1:-}"

case "$target" in
  -h|--help|"")
    usage
    [ -n "$target" ] && exit 0 || exit 2
    ;;
  pi)       install_to "$HOME/.pi/agent/skills" ;;
  prime)    install_to "$HOME/.prime/agent/skills" ;;
  claude)   install_to "$HOME/.claude/skills" ;;
  opencode)
    # Note: opencode may also require an instructions/skills entry in
    # ~/.config/opencode/opencode.json referencing this SKILL.md.
    install_to "$HOME/.config/opencode/skills"
    ;;
  local)
    dir="${2:-}"
    if [ -z "$dir" ]; then
      echo "error: 'local' requires a target directory: ./install.sh local <dir>" >&2
      exit 2
    fi
    install_to "$dir/.pi/skills"
    print_local_snippet "$dir"
    ;;
  all)
    install_to "$HOME/.pi/agent/skills"
    install_to "$HOME/.prime/agent/skills"
    install_to "$HOME/.claude/skills"
    ;;
  *)
    echo "unknown target: $target (expected pi|prime|claude|opencode|local <dir>|all)" >&2
    exit 2
    ;;
esac

echo "Done."
