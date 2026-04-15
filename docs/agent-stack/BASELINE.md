# Agent Stack Implementation Baseline

## System Environment
- **Node.js Version**: v22.17.1
- **npm Version**: 10.9.2
- **Branch**: chore/agent-stack-setup (created from main)
- **Date**: 2026-04-15

## Current package.json Scripts
```json
{
  "dev": "vercel dev",
  "build": "echo 'No build step required'",
  "deploy": "vercel --prod"
}
```

## Current Dependencies
```json
{
  "stripe": "^14.0.0",
  "jose": "^5.2.0",
  "@supabase/supabase-js": "^2.39.0",
  "bcryptjs": "^2.4.3"
}
```

## Top-Level Files (Before Implementation)
```
.DS_Store
.claude/
.cursorignore
.env.example
.git/
.gitignore
.vercel/
AUTHENTICATION_SETUP.md
PostDoseRX_7Day_GLP1_Meal_Plan_Content.md
Programmatic_SEO_plan.md
README.md
api/
assets/
contact.html
dashboard-auth.js
index.html
lib/
node_modules/
package-lock.json
package.json
postdoserx-site -> [symlink]
privacy.html
signup-modal.html
skills.md
success.html
terms.html
test-ghl.html
test-trial-conversion.js
vercel.json
```

## Key Code Areas Identified
- **Frontend pages**: *.html files (index.html, login.html, contact.html, etc.)
- **Shared assets**: assets/ directory
- **Backend APIs**: api/ directory with Vercel serverless functions
- **Vercel config**: vercel.json
- **Existing Claude config**: .claude/ directory exists

## Deployment Configuration
- **Platform**: Vercel
- **Config file**: vercel.json
- **Dev command**: `vercel dev`
- **Deploy command**: `vercel --prod`

## Notes
- Repository already has some Claude Code configuration in .claude/
- Static HTML/CSS/JS marketing site with serverless backend
- No existing CI workflows in .github/workflows
- Package manager: npm (package-lock.json present)
- Authentication system implemented using Supabase and Stripe