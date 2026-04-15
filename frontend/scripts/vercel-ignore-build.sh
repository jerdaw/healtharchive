#!/bin/bash
# Exit 1 = Build, Exit 0 = Skip

# Only build main branch (skip all preview deployments)
if [[ "$VERCEL_GIT_COMMIT_REF" != "main" ]]; then
  echo "Not main branch - skipping preview deployment"
  exit 0
fi

# Main branch: check if important files changed
CHANGED=$(git diff --name-only HEAD~1 2>/dev/null || echo "first-commit")

# If any important files changed, build
if echo "$CHANGED" | grep -qE '^(app|src|pages|components|lib|public|styles|package\.json|next\.config|tsconfig\.json)|first-commit'; then
  echo "Main branch with app changes - building"
  exit 1
fi

# Only docs/tests changed on main - skip build
echo "Main branch with only docs/tests changed - skipping"
exit 0
