# Agent Stack Rollback Procedures

## Emergency Rollback (Complete)

If you need to completely remove the agent stack and return to the original state:

```bash
# 1. Switch back to main branch
git checkout main

# 2. Delete the implementation branch
git branch -D chore/agent-stack-setup

# 3. Remove any merged agent stack files (if branch was merged)
rm -rf docs/agent-stack/
rm -rf scripts/agent/
rm -rf .github/workflows/agent-quality.yml

# 4. Restore original package.json scripts (if modified)
# Edit package.json to remove agent:* scripts, keep only:
# - "dev": "vercel dev"
# - "build": "echo 'No build step required'"  
# - "deploy": "vercel --prod"

# 5. Remove any agent dependencies added to package.json
npm install  # Reinstall only original dependencies
```

## Phase-by-Phase Rollback

### Phase 10 - Verification Rollback
**If verification fails or causes issues:**
- No permanent changes made in this phase
- Simply stop using agent commands
- Review individual phase rollbacks if needed

### Phase 9 - Package.json Rollback  
**Remove agent scripts from package.json:**
```bash
# Edit package.json to remove all scripts starting with "agent:"
# Keep only original scripts: dev, build, deploy
npm install  # Refresh package-lock.json
```

### Phase 8 - CI and Hooks Rollback
**Remove CI workflows and hooks:**
```bash
# Remove CI workflow
rm -f .github/workflows/agent-quality.yml

# Remove pre-push hooks (if added)
rm -f .git/hooks/pre-push

# Remove git hooks directory if empty
rmdir .git/hooks 2>/dev/null || true
```

### Phase 7 - gStack Rollback
**Remove gStack orchestration:**
```bash
# Uninstall gStack (if installed via npm)
npm uninstall gstack

# Remove gStack configuration files
rm -f .gstack.json .gstack.yml gstack.config.js

# Remove gStack scripts from scripts/agent/
rm -f scripts/agent/orchestrate*
```

### Phase 6 - Frontend Design Rollback
**Remove frontend design enforcement:**
```bash
# Remove frontend design tools (specific to tool used)
npm uninstall [frontend-design-tool]

# Remove configuration files
rm -f docs/agent-stack/frontend-quality-checklist.md

# Remove frontend review scripts
rm -f scripts/agent/ui-review*
```

### Phase 5 - Security Guidance Rollback
**Remove security scanning:**
```bash
# Remove security tools (specific to tools installed)
npm uninstall [security-scanning-tools]

# Remove security configuration
rm -f docs/agent-stack/security-suppressions.md

# Remove security scripts
rm -f scripts/agent/security*

# Remove pre-push security hooks
sed -i '' '/security-check/d' .git/hooks/pre-push 2>/dev/null || true
```

### Phase 4 - Code Review Rollback
**Remove parallel code review system:**
```bash
# Remove review scripts
rm -f scripts/agent/review-correctness
rm -f scripts/agent/review-architecture  
rm -f scripts/agent/review-style-rules
rm -f scripts/agent/review-performance-reliability
rm -f scripts/agent/review-regression-history
rm -f scripts/agent/aggregate-report

# Remove review dependencies (if any were added)
npm uninstall [review-tool-dependencies]
```

### Phase 3 - obra/superpowers Rollback
**Remove behavior enforcement:**
```bash
# Remove obra/superpowers (if installed)
npm uninstall obra-superpowers

# Remove templates
rm -rf docs/agent-stack/templates/

# Remove obra configuration files  
rm -f .obra.json .obra.yml obra.config.js
```

### Phase 2 - Claude-MEM Rollback
**Remove Claude-MEM integration:**
```bash
# Remove Claude-MEM (if installed via npm)
npm uninstall claude-mem

# Remove memory configuration
rm -f docs/agent-stack/memory-bootstrap.md

# Remove memory storage (if repo-local)
rm -rf .claude-memory/
rm -rf .memory/

# Remove memory scripts
rm -f scripts/agent/memory*
```

### Phase 1 - Project Scaffolding Rollback
**Remove project structure:**
```bash
# Remove documentation directory
rm -rf docs/agent-stack/

# Remove scripts directory
rm -rf scripts/agent/
rmdir scripts/ 2>/dev/null || true  # Remove if empty

# Remove workflows directory (if empty)
rmdir .github/workflows/ 2>/dev/null || true
rmdir .github/ 2>/dev/null || true
```

### Phase 0 - Baseline Rollback
**Remove branch and return to main:**
```bash
# Switch to main branch
git checkout main

# Delete implementation branch
git branch -D chore/agent-stack-setup
```

## Partial Rollback Scenarios

### Keep Documentation Only
If you want to preserve documentation but remove functionality:
```bash
# Keep docs/agent-stack/ directory
# Remove everything else:
rm -rf scripts/agent/
rm -f .github/workflows/agent-quality.yml

# Reset package.json scripts to original state
# Remove agent dependencies from package.json
npm install
```

### Keep CI but Remove Local Tools
If CI is working but local tools are problematic:
```bash
# Keep .github/workflows/agent-quality.yml
# Remove local scripts:
rm -rf scripts/agent/

# Remove agent scripts from package.json (keep CI-only)
# Keep agent dependencies needed for CI
```

### Disable Without Removing
To temporarily disable without removing files:
```bash
# Comment out agent scripts in package.json
# Disable CI workflow by renaming:
mv .github/workflows/agent-quality.yml .github/workflows/agent-quality.yml.disabled

# Disable git hooks:
mv .git/hooks/pre-push .git/hooks/pre-push.disabled
```

## Verification After Rollback

After any rollback, verify the system works:

```bash
# Test basic functionality
npm run dev    # Should start Vercel dev server
npm run build  # Should complete without errors  
npm run deploy --dry-run  # Should prepare deployment

# Verify git status
git status     # Should show clean working directory

# Test deployment (optional)
vercel --prod --confirm  # Deploy to verify functionality
```

## Recovery from Failed Rollback

If rollback fails or causes issues:

1. **Reset to last known good state:**
   ```bash
   git checkout main
   git reset --hard HEAD
   git clean -fd
   ```

2. **Restore from backup (if available):**
   ```bash
   # If you have a backup of package.json
   cp package.json.backup package.json
   npm install
   ```

3. **Reinstall dependencies:**
   ```bash
   rm -rf node_modules/ package-lock.json
   npm install
   ```

## Support and Troubleshooting

If rollback procedures don't work:

1. Check git status: `git status`
2. Check git log: `git log --oneline -10`
3. Verify file permissions: `ls -la`
4. Check for remaining agent processes: `ps aux | grep agent`
5. Verify npm dependencies: `npm list --depth=0`

**Last Resort:**
Fresh clone of the repository from the main branch and reapply only essential customizations.