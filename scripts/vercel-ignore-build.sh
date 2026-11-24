#!/usr/bin/env bash
# Skip Vercel builds for the persistent Portfolio Admin draft branch.
# Production (main) and all other preview branches continue to build.
set -eu
BRANCH="${VERCEL_GIT_COMMIT_REF:-}"
case "$BRANCH" in
  admin/draft|admin/draft-*)
    echo "Skipping Vercel build for saved admin draft branch: $BRANCH"
    exit 0
    ;;
  *)
    echo "Building branch: ${BRANCH:-unknown}"
    exit 1
    ;;
esac
