#!/bin/bash

# Deploy to Development Script
# Usage: ./deploy-to-dev.sh "Your commit message"

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}🚀 Deploying to Development Environment...${NC}"

# Check if commit message is provided
if [ -z "$1" ]; then
    echo -e "${RED}❌ Error: Please provide a commit message${NC}"
    echo "Usage: ./deploy-to-dev.sh \"Your commit message\""
    exit 1
fi

COMMIT_MSG="$1"

# Check if we're on main branch
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "main" ]; then
    echo -e "${RED}❌ Error: You must be on the 'main' branch to deploy${NC}"
    echo -e "${YELLOW}Current branch: $CURRENT_BRANCH${NC}"
    echo "Run: git checkout main"
    exit 1
fi

# Check for uncommitted changes
if ! git diff-index --quiet HEAD --; then
    echo -e "${YELLOW}📝 Staging and committing changes...${NC}"
    git add .
    git commit -m "$COMMIT_MSG"
else
    echo -e "${GREEN}✅ No changes to commit${NC}"
fi

# Push to dev branch (force push to ensure clean sync)
echo -e "${YELLOW}📤 Pushing to dev branch...${NC}"
git push origin main:dev --force

echo -e "${GREEN}✅ Successfully deployed to development environment!${NC}"
echo -e "${YELLOW}🌐 Your changes are now live in the dev environment${NC}"
