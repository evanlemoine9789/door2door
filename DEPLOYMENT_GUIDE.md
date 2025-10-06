# 🚀 Door2Door Deployment Guide

## **Simplified Git Workflow**

We've streamlined the deployment process to be **safe**, **clean**, **robust**, and **effective**.

### **Branch Structure**
- **`main`** - Production branch (live app)
- **`dev`** - Development/staging branch (testing)

### **Quick Deployment Commands**

#### **Deploy to Development (Testing)**
```bash
./deploy-to-dev.sh "Your commit message"
```
- Saves your work to dev environment
- Safe for testing new features
- No risk to production

#### **Deploy to Production (Live)**
```bash
./deploy-to-production.sh "Your commit message"
```
- Deploys to live production app
- Creates automatic backup before deployment
- Requires confirmation for safety

#### **Rollback if Something Breaks**
```bash
./rollback.sh backup-20241201-143022
```
- Instantly restore to any previous state
- Creates emergency backup before rollback
- Safe recovery from production issues

---

## **Typical Workflow**

### **1. Local Development**
```bash
# Make your changes locally
# Test everything works
git add .
git commit -m "Your changes"
```

### **2. Deploy to Dev (Recommended)**
```bash
./deploy-to-dev.sh "Added new feature"
```
- Test in dev environment first
- Catch any issues before production

### **3. Deploy to Production (When Ready)**
```bash
./deploy-to-production.sh "Deploy new feature to production"
```
- Only when you're confident it works
- Creates backup automatically
- Confirms with you before deploying

### **4. Emergency Rollback (If Needed)**
```bash
# See recent backups
git tag --sort=-version:refname | head -10

# Rollback to specific backup
./rollback.sh backup-20241201-143022
```

---

## **Safety Features**

### **Automatic Backups**
- Every production deployment creates a timestamped backup tag
- Emergency rollback creates additional emergency backup
- Never lose your working state

### **Confirmation Prompts**
- Production deployments require explicit confirmation
- Shows exactly what you're deploying
- Prevents accidental deployments

### **Branch Protection**
- Scripts enforce working from `main` branch
- Prevents deployment from wrong branches
- Ensures clean deployment state

### **Easy Recovery**
- One-command rollback to any previous state
- Multiple backup options available
- Clear recovery instructions

---

## **Best Practices**

### **Before Production Deployment**
1. ✅ Test locally first
2. ✅ Deploy to dev and test there
3. ✅ Verify all features work
4. ✅ Check for any errors in console
5. ✅ Only then deploy to production

### **Emergency Procedures**
1. **Something broke in production?**
   - Run `./rollback.sh <backup-tag>` immediately
   - This will restore to last known good state
   - Fix issues locally, then re-deploy

2. **Need to check what changed?**
   - `git log --oneline -10` - see recent commits
   - `git tag --sort=-version:refname | head -10` - see backups

### **Commit Messages**
Use clear, descriptive messages:
- ✅ "Fix map page layout: remove redundant title and prevent scrolling"
- ✅ "Add route optimization feature with email integration"
- ❌ "fix stuff"
- ❌ "updates"

---

## **Quick Reference**

| Command | Purpose | Safety Level |
|---------|---------|--------------|
| `./deploy-to-dev.sh "message"` | Deploy to dev/testing | ✅ Safe |
| `./deploy-to-production.sh "message"` | Deploy to production | ⚠️ Live users |
| `./rollback.sh <backup>` | Rollback production | 🆘 Emergency |

---

## **Need Help?**

- **Deployment stuck?** Check you're on `main` branch: `git branch`
- **Can't find backup?** List all backups: `git tag --sort=-version:refname`
- **Want to see changes?** Check recent commits: `git log --oneline -10`

This workflow eliminates the complex multi-branch merging and makes deployments fast, safe, and reliable! 🎉
