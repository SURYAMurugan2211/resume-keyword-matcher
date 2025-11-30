# GitHub Deployment Guide

## Prerequisites

1. **Install Git**
   - Download from: https://git-scm.com/download/win
   - Run installer with default settings
   - Restart your terminal/command prompt

2. **Create GitHub Account** (if you don't have one)
   - Go to: https://github.com
   - Sign up with your email

## Step-by-Step Deployment

### 1. Initialize Git Repository

Open Command Prompt or PowerShell in your project folder and run:

```bash
git init
```

### 2. Add All Files

```bash
git add .
```

### 3. Create Initial Commit

```bash
git commit -m "Initial commit: Resume Keyword Matcher with PDF upload and weighted scoring"
```

### 4. Create GitHub Repository

1. Go to https://github.com/new
2. Repository name: `resume-keyword-matcher`
3. Description: `AI-powered resume keyword matcher with weighted scoring and PDF upload`
4. Choose **Public**
5. **DO NOT** initialize with README (we already have one)
6. Click **Create repository**

### 5. Connect to GitHub

```bash
git remote add origin https://github.com/SURYAMurugan2211/resume-keyword-matcher.git
git branch -M main
```

### 6. Push to GitHub

```bash
git push -u origin main
```

If prompted for credentials:
- Username: `SURYAMurugan2211`
- Password: Use a **Personal Access Token** (not your GitHub password)

#### How to Create Personal Access Token:
1. Go to: https://github.com/settings/tokens
2. Click **Generate new token** → **Generate new token (classic)**
3. Name: `resume-keyword-matcher-deploy`
4. Expiration: `90 days` (or your preference)
5. Select scopes: Check **repo** (all sub-options)
6. Click **Generate token**
7. **COPY THE TOKEN** (you won't see it again!)
8. Use this token as your password when pushing

### 7. Enable GitHub Pages

1. Go to your repository: https://github.com/SURYAMurugan2211/resume-keyword-matcher
2. Click **Settings** tab
3. Click **Pages** in the left sidebar
4. Under **Source**, select:
   - Branch: `main`
   - Folder: `/ (root)`
5. Click **Save**
6. Wait 1-2 minutes

### 8. Access Your Live Site

Your site will be available at:
```
https://suryamurugan2211.github.io/resume-keyword-matcher/
```

## Quick Commands Reference

```bash
# Check status
git status

# Add new changes
git add .

# Commit changes
git commit -m "Your commit message"

# Push to GitHub
git push

# Pull latest changes
git pull

# View remote URL
git remote -v
```

## Troubleshooting

### Issue: Git not recognized
**Solution**: Install Git from https://git-scm.com/download/win and restart terminal

### Issue: Permission denied
**Solution**: Use Personal Access Token instead of password

### Issue: Repository already exists
**Solution**: 
```bash
git remote remove origin
git remote add origin https://github.com/SURYAMurugan2211/resume-keyword-matcher.git
```

### Issue: GitHub Pages not working
**Solution**: 
- Wait 2-3 minutes after enabling
- Check Settings → Pages for deployment status
- Ensure `index.html` is in root directory

## Files to Deploy

✅ **Include these files:**
- `index.html`
- `styles.css`
- `script.js`
- `README.md`
- `CHANGELOG.md`
- `blog-post.md`

⚠️ **Optional (can exclude):**
- `DEPLOY.md`
- `PROJECT_CLEANUP_ANALYSIS.md`
- `CLEANUP_COMPLETE.md`
- `GITHUB_DEPLOYMENT_GUIDE.md`
- `.vscode/` folder
- `.kiro/` folder

## After Deployment

1. **Test your live site**
   - Visit: https://suryamurugan2211.github.io/resume-keyword-matcher/
   - Test PDF upload
   - Test keyword analysis
   - Check on mobile devices

2. **Update your profiles**
   - Add project to GitHub profile README
   - Share on LinkedIn
   - Add to your portfolio

3. **Share your project**
   ```
   🚀 Just built a Resume Keyword Matcher with AI!
   
   ✨ Features:
   - PDF upload with drag & drop
   - Weighted scoring system
   - Smart keyword matching
   - 100% client-side processing
   
   Try it: https://suryamurugan2211.github.io/resume-keyword-matcher/
   
   #WebDevelopment #JavaScript #OpenSource #CareerTools
   ```

## Next Steps

1. ⭐ Star your own repository
2. 📝 Add topics to your repo: `resume`, `ats`, `keyword-matcher`, `pdf`, `javascript`
3. 🔗 Add website URL to repository description
4. 📱 Share on social media
5. 💼 Add to your LinkedIn profile

---

**Need Help?**
- GitHub Docs: https://docs.github.com
- Git Basics: https://git-scm.com/book/en/v2/Getting-Started-Git-Basics

**Your Repository**: https://github.com/SURYAMurugan2211/resume-keyword-matcher
