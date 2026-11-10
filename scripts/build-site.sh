#!/usr/bin/env bash
#
# Builds the website into website/dist on a fresh Linux or macOS host:
# installs esdev from the latest release (or ESDEV_VERSION), builds the library
# the site depends on, installs the site's packages, and runs its build.
# Written for Cloudflare Workers Builds:
#
#   Root directory      website
#   Build command       bash ../scripts/build-site.sh
#   Deploy command      npx wrangler deploy
#   Variables           SKIP_DEPENDENCY_INSTALL=1   (this script installs)
#                       GITHUB_TOKEN=<read-only>    (optional; see the esdev installer)
#
#   ESDEV_VERSION=0.26.0  build with that esdev release instead of the newest
set -euo pipefail

repo_root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
site="$repo_root/website"
library="$repo_root/packages/syntax-highlighter"

# "Last updated" dates and the sitemap's <lastmod> come from each page's last
# commit. A shallow clone has one commit, which would date every page to it.
if [ "$(git -C "$repo_root" rev-parse --is-shallow-repository 2>/dev/null)" = true ]; then
  git -C "$repo_root" fetch --unshallow --quiet ||
    echo "warning: could not fetch full history; pages will show the latest commit's date" >&2
fi

# esdev alone builds the library and the site; the repository's own dev
# dependencies are not needed here.
curl -fsSL https://esrun.opentechf.org/install.sh | bash -s -- --only=esdev
export PATH="${ES_RUNTIME_INSTALL:-${ESRUN_INSTALL:-$HOME/.es-runtime}}/bin:$PATH"
esdev --version

# The site installs the library from this checkout
# (`file:../packages/syntax-highlighter`), which copies its built dist/ — so
# build it first, from the commit being deployed.
(cd "$library" && esdev build --lib src)

# The site pins pnpm in its package.json; install that version when the host
# has none.
if ! command -v pnpm >/dev/null 2>&1; then
  pnpm_spec="$(node -p 'require(process.argv[1]).packageManager' "$site/package.json")"
  npm install --global --silent "$pnpm_spec"
fi

pnpm --dir "$site" install --frozen-lockfile
pnpm --dir "$site" run build
