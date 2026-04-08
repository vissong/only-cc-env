#!/usr/bin/env bash
set -e

# Usage: ./scripts/release.sh [patch|minor|major]
# Default: patch

BUMP="${1:-patch}"

if [[ "$BUMP" != "patch" && "$BUMP" != "minor" && "$BUMP" != "major" ]]; then
  echo "Usage: $0 [patch|minor|major]"
  exit 1
fi

# Ensure working directory is clean
if [[ -n "$(git status --porcelain)" ]]; then
  echo "Error: Working directory is not clean. Commit or stash changes first."
  exit 1
fi

# Ensure on main branch
BRANCH="$(git branch --show-current)"
if [[ "$BRANCH" != "main" ]]; then
  echo "Error: Not on main branch (current: $BRANCH)."
  exit 1
fi

# Ensure npm is logged in
if ! npm whoami --registry https://registry.npmjs.org &>/dev/null; then
  echo "Error: Not logged in to npm. Run 'npm login --registry https://registry.npmjs.org' first."
  exit 1
fi

# Run tests
echo "Running tests..."
npm test

# Bump version
NEW_VERSION="$(npm version "$BUMP" --no-git-tag-version)"
echo "Version bumped to $NEW_VERSION"

# Commit and tag
git add package.json package-lock.json
git commit -m "release: $NEW_VERSION"
git tag "$NEW_VERSION"

# Push
git push origin main --tags

# Publish
echo ""
echo "Publishing to npm..."
npm publish --registry https://registry.npmjs.org

echo ""
echo "Done! $NEW_VERSION published."
