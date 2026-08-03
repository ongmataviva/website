#!/usr/bin/env bash
# Link ybyra-harness skills/commands/rules to .trae/ directory (Trae IDE)
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
HARNESS_ROOT="$(cd "$PROJECT_ROOT/../mine/ybyra-harness" && pwd)"

TRAPE_DIR="$PROJECT_ROOT/.trae"
CURSOR_SKILLS_SRC="$HARNESS_ROOT/pack/cursor/skills"
CURSOR_CMDS_SRC="$HARNESS_ROOT/pack/cursor/commands"
CURSOR_RULES_SRC="$HARNESS_ROOT/pack/cursor/rules"
KOOILAID_SRC="$HARNESS_ROOT/pack/koolaid"

mkdir -p "$TRAPE_DIR/commands"
mkdir -p "$TRAPE_DIR/skills"

symlink_dir() {
  local src="$1" dest="$2"
  rmdir "$dest" 2>/dev/null || true
  ln -sfn "$src" "$dest"
  echo "  linked: .trae/$(basename "$dest") -> $src"
}

symlink_file() {
  local src="$1" dest="$2"
  rm -f "$dest" 2>/dev/null || true
  ln -sfn "$src" "$dest"
  echo "  linked: .trae/$(basename "$dest")"
}

# Commands
for f in "$CURSOR_CMDS_SRC"/*.md; do
  [ -f "$f" ] || continue
  symlink_file "$f" "$TRAPE_DIR/commands/$(basename "$f")"
done

# Rules
for f in "$CURSOR_RULES_SRC"/*; do
  [ -f "$f" ] || continue
  symlink_file "$f" "$TRAPE_DIR/$(basename "$f")"
done

# Cursor skill directories
for d in "$CURSOR_SKILLS_SRC"/*/; do
  [ -d "$d" ] || continue
  if [ "$(basename "$d")" != "references" ]; then
    symlink_dir "$d" "$TRAPE_DIR/skills/$(basename "$d")"
  fi
done

# Koolaid skills (SKILL.md + references)
for d in "$KOOILAID_SRC"/*/; do
  [ -d "$d" ] || continue
  local_name="$(basename "$d")"
  symlink_dir "$d" "$TRAPE_DIR/skills/$local_name"
done

COUNT=$(find "$TRAPE_DIR" -type l | wc -l | tr -d ' ')
echo ""
echo "installed @ybyra/harness → .trae/ ($COUNT symlinks)"
