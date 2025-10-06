#!/bin/bash

# Rollback Script
# Usage: ./rollback.sh [commit-hash-or-tag]

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${RED}🔄 ROLLBACK SCRIPT${NC}"

# Check if we're on main branch
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "main" ]; then
    echo -e "${RED}❌ Error: You must be on the 'main' branch to rollback${NC}"
    echo -e "${YELLOW}Current branch: $CURRENT_BRANCH${NC}"
    echo "Run: git checkout main"
    exit 1
fi

# Show recent commits and tags
echo -e "${YELLOW}📋 Recent commits:${NC}"
git log --oneline -10

echo ""
echo -e "${YELLOW}🏷️  Recent backup tags:${NC}"
git tag --sort=-version:refname | head -10

echo ""

if [ -z "$1" ]; then
    echo -e "${RED}❌ Error: Please provide a commit hash or backup tag to rollback to${NC}"
    echo "Usage: ./rollback.sh <commit-hash-or-backup-tag>"
    echo ""
    echo -e "${YELLOW}Examples:${NC}"
    echo "  ./rollback.sh backup-20241201-143022  # Rollback to backup tag"
    echo "  ./rollback.sh 9e5c0b9                 # Rollback to specific commit"
    exit 1
fi

ROLLBACK_TARGET="$1"

# Verify the target exists
if ! git rev-parse --verify "$ROLLBACK_TARGET" >/dev/null 2>&1; then
    echo -e "${RED}❌ Error: Invalid commit hash or tag: $ROLLBACK_TARGET${NC}"
    exit 1
fi

# Show what we're rolling back to
echo -e "${YELLOW}🎯 Rolling back to: $ROLLBACK_TARGET${NC}"
git show --oneline --no-patch "$ROLLBACK_TARGET"

echo ""
echo -e "${RED}⚠️  WARNING: This will reset production to the selected point!${NC}"
read -p "Are you sure you want to rollback? (type 'yes' to confirm): " confirm

if [ "$confirm" != "yes" ]; then
    echo -e "${YELLOW}❌ Rollback cancelled${NC}"
    exit 1
fi

# Create emergency backup before rollback
EMERGENCY_BACKUP="emergency-backup-$(date +%Y%m%d-%H%M%S)"
echo -e "${YELLOW}🏷️  Creating emergency backup: $EMERGENCY_BACKUP${NC}"
git tag "$EMERGENCY_BACKUP"

# Perform rollback
echo -e "${YELLOW}🔄 Rolling back to $ROLLBACK_TARGET...${NC}"
git reset --hard "$ROLLBACK_TARGET"

# Push the rollback
echo -e "${YELLOW}📤 Pushing rollback to production...${NC}"
git push origin main --force
git push origin "$EMERGENCY_BACKUP"

echo -e "${GREEN}✅ Successfully rolled back to $ROLLBACK_TARGET!${NC}"
echo -e "${GREEN}🏷️  Emergency backup created: $EMERGENCY_BACKUP${NC}"
echo -e "${BLUE}🌐 Production has been restored${NC}"
