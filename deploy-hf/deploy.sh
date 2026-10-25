#!/bin/bash
# One-click deployment script to Hugging Face Spaces
set -e

SPACE_URL="$1"

if [ -z "$SPACE_URL" ]; then
  echo "Usage: ./deploy.sh <HUGGINGFACE_SPACE_GIT_URL>"
  echo "Example: ./deploy.sh https://huggingface.co/spaces/YOUR_USERNAME/livetry-demo"
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "=========================================================="
echo "  Deploying LiveTry to Hugging Face Space: $SPACE_URL"
echo "=========================================================="

# Ensure git is initialized in deploy-hf
if [ ! -d ".git" ]; then
  git init
  git checkout -b main || git checkout -b master
fi

git add .
git commit -m "Deploy LiveTry WebRTC VTON to Hugging Face" || echo "No changes to commit"

# Set remote origin
git remote remove origin 2>/dev/null || true
git remote add origin "$SPACE_URL"

echo ""
echo "Pushing code to Hugging Face..."
echo "Note: If prompted for password, enter your Hugging Face Access Token"
echo "(Generate token at: https://huggingface.co/settings/tokens)"
echo ""

git push -u origin HEAD --force

echo ""
echo "✓ Successfully pushed to Hugging Face Space!"
echo "Your app is now building and will be live in ~60 seconds."
