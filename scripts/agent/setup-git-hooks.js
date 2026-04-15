#!/usr/bin/env node

/**
 * Git Hooks Setup for Agent Stack
 * 
 * Sets up pre-push hook with security enforcement
 */

const fs = require('fs');
const path = require('path');

const HOOKS_DIR = path.join(process.cwd(), '.git', 'hooks');
const PRE_PUSH_PATH = path.join(HOOKS_DIR, 'pre-push');

// Pre-push hook content with security enforcement
const PRE_PUSH_HOOK = `#!/bin/bash
# Agent Stack Pre-Push Hook
# Security enforcement for critical issues and secrets

echo "🔒 Agent Stack Security Gate (pre-push)"
echo "======================================="

# Check if we're in a git repository
if [ ! -d ".git" ]; then
    echo "❌ Not in a git repository - skipping security check"
    exit 0
fi

# Check if security scanner exists
if [ ! -f "scripts/agent/security-scan.js" ]; then
    echo "⚠️  Security scanner not found - skipping check"
    echo "   Run: npm install to ensure agent stack is set up"
    exit 0
fi

# Check if node is available
if ! command -v node &> /dev/null; then
    echo "⚠️  Node.js not found - skipping security check"
    echo "   Install Node.js to enable security enforcement"
    exit 0
fi

# Check if npm dependencies are installed
if [ ! -d "node_modules" ]; then
    echo "⚠️  Dependencies not installed - skipping security check"
    echo "   Run: npm install"
    exit 0
fi

echo ""
echo "🔍 Running security enforcement check..."
echo "  Scope: Critical vulnerabilities and confirmed secrets only"
echo "  Mode: BLOCKING (Step 1 enforcement)"
echo ""

# Run security scan in enforcement mode
node scripts/agent/security-scan.js --enforce-critical --baseline docs/agent-stack/security-baseline.json

EXIT_CODE=$?

echo ""
if [ $EXIT_CODE -eq 2 ]; then
    echo "🚫 PRE-PUSH BLOCKED: Critical security issues detected"
    echo ""
    echo "📋 Resolution steps:"
    echo "   1. Review security findings above"
    echo "   2. Fix critical vulnerabilities and remove secrets"
    echo "   3. Or add justified suppressions to docs/agent-stack/security-suppressions.md"
    echo "   4. Re-run: npm run agent:security --enforce-critical"
    echo "   5. Try push again when clean"
    echo ""
    echo "🔧 To bypass this check (NOT RECOMMENDED):"
    echo "   git push --no-verify"
    echo ""
    exit 1
elif [ $EXIT_CODE -eq 1 ]; then
    echo "⚠️  Security warnings found (non-blocking)"
    echo "   Address high/medium/low priority issues during development"
    echo "   Push will proceed..."
    echo ""
    exit 0
else
    echo "✅ Security check passed - push proceeding"
    echo ""
    exit 0
fi
`;

function setupGitHooks() {
    console.log('🔧 Setting up Git hooks for agent stack...\n');
    
    // Check if .git directory exists
    if (!fs.existsSync(path.join(process.cwd(), '.git'))) {
        console.log('❌ Not in a git repository - cannot set up hooks');
        process.exit(1);
    }
    
    // Ensure hooks directory exists
    if (!fs.existsSync(HOOKS_DIR)) {
        fs.mkdirSync(HOOKS_DIR, { recursive: true });
        console.log(`📁 Created hooks directory: ${HOOKS_DIR}`);
    }
    
    // Check if pre-push hook already exists
    if (fs.existsSync(PRE_PUSH_PATH)) {
        const existing = fs.readFileSync(PRE_PUSH_PATH, 'utf8');
        
        if (existing.includes('Agent Stack')) {
            console.log('ℹ️  Agent Stack pre-push hook already installed');
            console.log(`   Location: ${PRE_PUSH_PATH}`);
            return;
        } else {
            // Backup existing hook
            const backupPath = PRE_PUSH_PATH + '.backup.' + Date.now();
            fs.writeFileSync(backupPath, existing);
            console.log(`💾 Backed up existing pre-push hook to: ${backupPath}`);
        }
    }
    
    // Write new pre-push hook
    fs.writeFileSync(PRE_PUSH_PATH, PRE_PUSH_HOOK);
    
    // Make executable
    try {
        fs.chmodSync(PRE_PUSH_PATH, '755');
    } catch (error) {
        console.warn(`⚠️  Could not make hook executable: ${error.message}`);
        console.log('   You may need to run: chmod +x .git/hooks/pre-push');
    }
    
    console.log('✅ Agent Stack pre-push hook installed');
    console.log(`   Location: ${PRE_PUSH_PATH}`);
    console.log('');
    console.log('🔒 Security enforcement now active on git push:');
    console.log('   - BLOCKING: Critical vulnerabilities and secrets');
    console.log('   - WARNING: High/medium/low priority issues');
    console.log('');
    console.log('🔧 To test the hook:');
    console.log('   npm run agent:security --enforce-critical');
    console.log('');
    console.log('⚠️  To disable the hook:');
    console.log('   rm .git/hooks/pre-push');
    console.log('   Or use: git push --no-verify (not recommended)');
}

function removeGitHooks() {
    console.log('🗑️  Removing Git hooks for agent stack...\n');
    
    if (fs.existsSync(PRE_PUSH_PATH)) {
        const content = fs.readFileSync(PRE_PUSH_PATH, 'utf8');
        
        if (content.includes('Agent Stack')) {
            fs.unlinkSync(PRE_PUSH_PATH);
            console.log('✅ Agent Stack pre-push hook removed');
            
            // Restore backup if it exists
            const backups = fs.readdirSync(HOOKS_DIR)
                .filter(f => f.startsWith('pre-push.backup.'))
                .sort()
                .reverse();
            
            if (backups.length > 0) {
                const latestBackup = path.join(HOOKS_DIR, backups[0]);
                fs.copyFileSync(latestBackup, PRE_PUSH_PATH);
                fs.chmodSync(PRE_PUSH_PATH, '755');
                console.log(`📦 Restored previous hook from backup: ${backups[0]}`);
            }
        } else {
            console.log('ℹ️  No Agent Stack pre-push hook found');
        }
    } else {
        console.log('ℹ️  No pre-push hook exists');
    }
}

function showStatus() {
    console.log('📋 Git Hooks Status\n');
    
    if (fs.existsSync(PRE_PUSH_PATH)) {
        const content = fs.readFileSync(PRE_PUSH_PATH, 'utf8');
        
        if (content.includes('Agent Stack')) {
            console.log('✅ Agent Stack pre-push hook: INSTALLED');
            console.log('   Security enforcement: ACTIVE');
            console.log('   Scope: Critical vulnerabilities and secrets');
        } else {
            console.log('⚠️  Pre-push hook exists but not Agent Stack');
            console.log('   Another hook is installed');
        }
    } else {
        console.log('❌ No pre-push hook installed');
        console.log('   Security enforcement: INACTIVE');
    }
    
    console.log('');
    console.log('🔧 Available commands:');
    console.log('   node scripts/agent/setup-git-hooks.js install');
    console.log('   node scripts/agent/setup-git-hooks.js remove');
    console.log('   node scripts/agent/setup-git-hooks.js status');
}

// Main execution
function main() {
    const command = process.argv[2];
    
    switch (command) {
        case 'install':
            setupGitHooks();
            break;
            
        case 'remove':
            removeGitHooks();
            break;
            
        case 'status':
            showStatus();
            break;
            
        default:
            console.log('🔧 Git Hooks Setup for Agent Stack');
            console.log('');
            console.log('Usage:');
            console.log('  node scripts/agent/setup-git-hooks.js install   # Install pre-push security hook');
            console.log('  node scripts/agent/setup-git-hooks.js remove    # Remove Agent Stack hooks');
            console.log('  node scripts/agent/setup-git-hooks.js status    # Show hook status');
            console.log('');
            console.log('The pre-push hook will:');
            console.log('  - Block pushes with critical security issues');
            console.log('  - Allow pushes with warnings (high/medium/low)');
            console.log('  - Support baseline filtering and suppressions');
            break;
    }
}

if (require.main === module) {
    main();
}

module.exports = {
    setupGitHooks,
    removeGitHooks,
    showStatus
};