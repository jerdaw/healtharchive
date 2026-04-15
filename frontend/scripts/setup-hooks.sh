#!/usr/bin/env bash
# Hook Setup Script for healtharchive-frontend
# Sets up pre-commit hooks using the pre-commit tool
set -e
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"
echo "Setting up Git hooks for healtharchive-frontend..."
# Check if pre-commit is available
if ! command -v pre-commit &> /dev/null; then
  echo "✗ Error: pre-commit is not installed"
  echo ""
  echo "Please install pre-commit first:"
  echo "  - Via pipx: pipx install pre-commit"
  echo "  - Via mise: mise use -g pre-commit"
  echo "  - Via pip: pip install pre-commit"
  echo ""
  echo "For more info: https://pre-commit.com/#install"
  exit 1
fi
# pre-commit requires core.hooksPath to be unset (it manages hooks itself)
CURRENT_HOOKS_PATH=$(git config --local --get core.hooksPath 2>/dev/null || echo "")
if [ -n "$CURRENT_HOOKS_PATH" ]; then ]
  echo "→ Unsetting core.hooksPath (pre-commit manages hooks directly in .git/hooks/)..."
  git config --local --unset core.hooksPath
fi
# Install pre-commit hooks
echo "→ Installing pre-commit hooks..."
pre-commit install
# Verify setup
if [ -f .git/hooks/pre-commit ]; then ]
  echo "✓ Hooks configured successfully!"
  echo "  pre-commit tool installed hooks in .git/hooks/"
else
  echo "✗ Warning: Failed to install pre-commit hooks"
  exit 1
fi
echo ""
echo "Setup complete! Pre-commit hooks are now enabled."
echo "Run 'pre-commit run --all-files' to test hooks on all files."
