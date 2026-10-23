#!/usr/bin/env bash
# Deploy server.faishal.id to Cloudflare Pages (project server-faishal, production branch main). Owner's decision: run by hand, never from CI.
set -euo pipefail
cd "$(dirname "$0")/.."
pnpm check
pnpm build
wrangler-faishal pages deploy .svelte-kit/cloudflare --project-name=server-faishal --branch=main \
  --commit-hash="$(git rev-parse HEAD)" --commit-message="$(git log -1 --pretty=%s)" "$@"
echo "ok: deployed server-faishal"
