#!/usr/bin/env bash
# ==============================================================================
# deploy - Ayni (web CUA library), as a static site on the VPS
# ==============================================================================
# Quick usage (./deploy.sh --help prints the same):
#   ./deploy.sh              quick checks + copy to the VPS. Skips the slow tests.
#   ./deploy.sh --all-tests  the same, plus tests/run.mjs and sample/test.mjs.
#   ./deploy.sh -n           dry run: only list what would change on the VPS.
#   ./deploy.sh -h | -? | --help   this list.
# ==============================================================================
# Ayni has no server and no build step, so there is one thing to push:
#
#   the library + gallery   this folder  -> ~/web_sites/ayni/ on the VPS
#                           (https://<origin>/ayni/gallery/)
#
# Nayive's server serves every folder of ~/web_sites/ as a plain site and opens
# it on each request, so nothing is restarted, and a new site needs no setup.
#
# Not shipped: tests/, tools/, sample/, docs/, the top-level *.md, this script,
# deploy.local.sh and hidden files. Files removed here ARE deleted from the site
# (--delete-delay), except those excluded: rsync never deletes what it excludes.
#
# This does not refresh Nayive's own copy of Ayni (client/apps/shared/ayni/).
#
# REMOTE_USER, REMOTE_HOST and REMOTE_PORT are private and this repo is public,
# so they live in deploy.local.sh, which git ignores. Copy deploy.local.sh.example
# to make it.
#
# It ships the WORKING TREE, untracked files included: it warns first when the
# tree holds changes git does not have.
# ==============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# REMOTE_USER, REMOTE_HOST, REMOTE_PORT - private, never in the repo.
LOCAL_CFG="$SCRIPT_DIR/deploy.local.sh"
[ -f "$LOCAL_CFG" ] || { echo "ERROR: $LOCAL_CFG not found - copy deploy.local.sh.example and fill it in." >&2; exit 1; }
# shellcheck source=/dev/null
. "$LOCAL_CFG"
: "${REMOTE_USER:?set it in deploy.local.sh}" "${REMOTE_HOST:?set it in deploy.local.sh}" "${REMOTE_PORT:?set it in deploy.local.sh}"
REMOTE_SITES="/home/${REMOTE_USER}/web_sites" # Nayive's sites_dir
REMOTE_DIR="$REMOTE_SITES/ayni"

SSH_OPTS=(-p "$REMOTE_PORT" -o StrictHostKeyChecking=accept-new)
RSYNC_RSH="ssh -p $REMOTE_PORT -o StrictHostKeyChecking=accept-new"

usage() {
    cat <<'USAGE'
Usage: ./deploy.sh [options]

Checks Ayni here and copies it to the VPS as a static site.

Options (can be combined):
  (none)          Quick checks + copy. Skips the slow tests.
  --all-tests     Also run tests/run.mjs and sample/test.mjs (slow: ~4 minutes).
  -n, --dry-run   Only list what would change on the VPS; copy nothing.
  -h, -?, --help  Show this list.
USAGE
}

DRY_RUN=0
ALL_TESTS=0
for arg in "$@"; do
    case "$arg" in
        -n|--dry-run)  DRY_RUN=1 ;;
        --all-tests)   ALL_TESTS=1 ;;
        -h|-\?|--help) usage; exit 0 ;;
        *)             echo "Unknown option: $arg" >&2; usage >&2; exit 2 ;;
    esac
done

# In a dry run rsync gets -n: it lists the changes and writes nothing.
DRY=()
[ "$DRY_RUN" = 1 ] && DRY=(-n)

command -v rsync >/dev/null 2>&1 || { echo "ERROR: 'rsync' not found (needed to deploy)." >&2; exit 1; }

# The Go toolchain: the official tarball in ~/sdk first, then whatever is on PATH.
if [ -x "$HOME/sdk/go1.27.1/bin/go" ]; then
    export PATH="$HOME/sdk/go1.27.1/bin:$PATH"
fi
command -v go >/dev/null 2>&1 || { echo "ERROR: 'go' not found (install Go 1.27.1+ in ~/sdk, not from apt)." >&2; exit 1; }

echo "==> Deploying  $SCRIPT_DIR/  ->  $REMOTE_USER@$REMOTE_HOST:$REMOTE_DIR/"
[ "$DRY_RUN" = 1 ] && echo "==> DRY RUN: nothing will be copied to the VPS"

# What ships is the working tree: say so when it differs from git, or the site
# can end up showing code no commit can rebuild. A warning, not a stop.
if command -v git >/dev/null 2>&1 &&
   DIRTY="$(git -C "$SCRIPT_DIR" status --porcelain 2>/dev/null)" && [ -n "$DIRTY" ]; then
    echo "==> WARNING: the tree has changes git does not have (not committed):" >&2
    DIRTY_N="$(printf '%s\n' "$DIRTY" | wc -l)"
    printf '%s\n' "$DIRTY" | sed -n '1,20s/^/      /p' >&2
    if [ "$DIRTY_N" -gt 20 ]; then echo "      ... ($DIRTY_N in all)" >&2; fi
fi

# ------------------------------------------------------------------------------
# PRE-BUILD - everything that must pass before a copy (the slow tests only with
# --all-tests). Each entry is run from $SCRIPT_DIR; a non-zero exit aborts.
# ------------------------------------------------------------------------------
PREBUILD_STEPS=(
    "go -C tools run ./check-i18n -root .."  # every dictionary must agree with es.json
    "node tests/run.mjs"                     # the whole library, in a headless Chromium
    "node sample/test.mjs"                   # the sample app runs on Ayni alone
)

STEPS_OK=0
TESTS="SKIPPED (./deploy.sh --all-tests runs them)"
for step in "${PREBUILD_STEPS[@]}"; do
    if [ "$ALL_TESTS" = 0 ] && [[ "$step" == node\ * ]]; then
        echo "==> pre-build: SKIPPED $step (use --all-tests)"
        continue
    fi
    echo "==> pre-build: $step"
    ( cd "$SCRIPT_DIR" && eval "$step" ) || { echo "ERROR: pre-build step failed: $step" >&2; exit 1; }
    STEPS_OK=$((STEPS_OK + 1))
done
[ "$ALL_TESTS" = 1 ] && TESTS="ALL GREEN"

WORK_DIR="$(mktemp -d)"
trap 'rm -rf "$WORK_DIR"' EXIT

# Fail fast with a helpful hint if SSH auth / the sites folder isn't ready.
ssh "${SSH_OPTS[@]}" "$REMOTE_USER@$REMOTE_HOST" "test -d '$REMOTE_SITES'" \
    || { echo "ERROR: $REMOTE_SITES not found, or SSH auth failed" >&2
         echo "       If the key isn't installed yet: ssh-copy-id -p $REMOTE_PORT $REMOTE_USER@$REMOTE_HOST" >&2
         exit 1; }

# ------------------------------------------------------------------------------
# Copy - this folder -> $REMOTE_DIR/  (recursive, a mirror)
# -rltz: recurse, keep symlinks + mtimes, compress; no owner/group/perms.
# --delete-delay: a file gone from here is deleted there too, after the transfer,
# so an open page never meets a gap.
# --delay-updates: the changed files are renamed into place together, at the end.
# ------------------------------------------------------------------------------
echo "==> Deploying the site  ->  $REMOTE_USER@$REMOTE_HOST:$REMOTE_DIR/"
if { [ "$DRY_RUN" = 0 ] && ! ssh "${SSH_OPTS[@]}" "$REMOTE_USER@$REMOTE_HOST" "mkdir -p '$REMOTE_DIR'"; } ||
   ! rsync "${DRY[@]}" -rltz --itemize-changes --delete-delay --delay-updates \
      --exclude='.*' --exclude='*~' --exclude='*.swp' --exclude='*.log' \
      --exclude='/tests' --exclude='/tools' --exclude='/sample' --exclude='/docs' \
      --exclude='/*.md' --exclude='/LICENSE' \
      --exclude='/deploy.sh' --exclude='/deploy.local.sh' --exclude='/deploy.local.sh.example' \
      -e "$RSYNC_RSH" \
      "$SCRIPT_DIR/" "$REMOTE_USER@$REMOTE_HOST:$REMOTE_DIR/" | tee "$WORK_DIR/site.log"; then
    echo "ERROR: rsync to $REMOTE_USER@$REMOTE_HOST:$REMOTE_DIR/ failed." >&2
    exit 1
fi

# ------------------------------------------------------------------------------
# SUMMARY - what was done and which version is now on the VPS.
# ------------------------------------------------------------------------------
VERB="Copied"
[ "$DRY_RUN" = 1 ] && VERB="Would copy"
SENT=$(grep -c '^<f' "$WORK_DIR/site.log" || true)
GONE=$(grep -c '^\*deleting' "$WORK_DIR/site.log" || true)
echo
echo "================================ SUMMARY ================================"
[ "$DRY_RUN" = 1 ] && echo "  DRY RUN - nothing was changed on the VPS."
echo "  Ayni        $(git -C "$SCRIPT_DIR" describe --tags --always --dirty 2>/dev/null || echo '?')"
echo "  Site        $VERB: ${SENT:-0} file(s) sent, ${GONE:-0} deleted"
echo "              at /ayni/gallery/ on Nayive's address"
echo "  Checks      $STEPS_OK pre-build step(s) passed; tests: $TESTS"
if [ -n "${DIRTY_N:-}" ]; then
    if [ "$DRY_RUN" = 1 ]; then echo "  WARNING     $DIRTY_N uncommitted change(s) would be shipped"
    else                        echo "  WARNING     $DIRTY_N uncommitted change(s) were shipped"; fi
fi
echo "  Took        $((SECONDS / 60)) min $((SECONDS % 60)) s"
echo "========================================================================="
