#!/bin/bash

# Deploy to Production Script
# Usage: ./deploy-to-production.sh "Your commit message"

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 DEPLOYING TO PRODUCTION...${NC}"

# Check if commit message is provided
if [ -z "$1" ]; then
    echo -e "${RED}❌ Error: Please provide a commit message${NC}"
    echo "Usage: ./deploy-to-production.sh \"Your commit message\""
    exit 1
fi

COMMIT_MSG="$1"

# Check if we're on main branch
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "main" ]; then
    echo -e "${RED}❌ Error: You must be on the 'main' branch to deploy to production${NC}"
    echo -e "${YELLOW}Current branch: $CURRENT_BRANCH${NC}"
    echo "Run: git checkout main"
    exit 1
fi

# Safety check - confirm deployment
echo -e "${YELLOW}⚠️  You are about to deploy to PRODUCTION!${NC}"
echo -e "${YELLOW}This will affect live users immediately.${NC}"
echo -e "${BLUE}Commit message: \"$COMMIT_MSG\"${NC}"
echo ""
read -p "Are you sure you want to continue? (type 'yes' to confirm): " confirm

if [ "$confirm" != "yes" ]; then
    echo -e "${RED}❌ Deployment cancelled${NC}"
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

# Create backup tag before deploying
BACKUP_TAG="backup-$(date +%Y%m%d-%H%M%S)"
echo -e "${YELLOW}🏷️  Creating backup tag: $BACKUP_TAG${NC}"
git tag "$BACKUP_TAG"

# Push to production
echo -e "${YELLOW}📤 Deploying to production...${NC}"
git push origin main
git push origin "$BACKUP_TAG"

echo -e "${GREEN}✅ Successfully deployed to PRODUCTION!${NC}"
echo -e "${GREEN}🏷️  Backup tag created: $BACKUP_TAG${NC}"
echo -e "${BLUE}🌐 Your changes are now live in production${NC}"
echo ""
echo -e "${YELLOW}💡 To rollback if needed:${NC}"
echo -e "${YELLOW}   git revert HEAD${NC}"
echo -e "${YELLOW}   git push origin main${NC}"
echo -e "${YELLOW}   OR restore from backup: git reset --hard $BACKUP_TAG${NC}"
