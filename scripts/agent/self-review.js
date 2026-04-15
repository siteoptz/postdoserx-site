#!/usr/bin/env node

/**
 * obra/superpowers Self-Review Workflow Script
 * 
 * Enforces comprehensive self-review before code submission
 * Usage: npm run agent:self-review
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const TEMPLATES_DIR = path.join(process.cwd(), 'docs', 'agent-stack', 'templates');
const REVIEWS_DIR = path.join(process.cwd(), 'docs', 'superpowers', 'reviews');

// Ensure reviews directory exists
function ensureReviewsDirectory() {
    if (!fs.existsSync(REVIEWS_DIR)) {
        fs.mkdirSync(REVIEWS_DIR, { recursive: true });
        console.log(`📁 Created reviews directory: ${REVIEWS_DIR}`);
    }
}

// Get current git branch and commit info
function getGitInfo() {
    try {
        const branch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim();
        const commit = execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
        const status = execSync('git status --porcelain', { encoding: 'utf8' });
        
        return {
            branch,
            commit,
            hasChanges: status.length > 0,
            changedFiles: status.split('\n').filter(line => line.trim()).length
        };
    } catch (error) {
        return {
            branch: 'unknown',
            commit: 'unknown',
            hasChanges: false,
            changedFiles: 0
        };
    }
}

// Analyze codebase for review metrics
function analyzeCodebase() {
    const analysis = {
        totalFiles: 0,
        jsFiles: 0,
        htmlFiles: 0,
        cssFiles: 0,
        testFiles: 0,
        configFiles: 0
    };
    
    try {
        // Count different file types
        const allFiles = execSync('find . -type f -name "*.js" -o -name "*.html" -o -name "*.css" -o -name "*.json" -o -name "*.md" | grep -v node_modules | grep -v .git', 
            { encoding: 'utf8' }).split('\n').filter(f => f.trim());
        
        analysis.totalFiles = allFiles.length;
        
        allFiles.forEach(file => {
            if (file.endsWith('.js')) {
                if (file.includes('test') || file.includes('spec')) {
                    analysis.testFiles++;
                } else {
                    analysis.jsFiles++;
                }
            } else if (file.endsWith('.html')) {
                analysis.htmlFiles++;
            } else if (file.endsWith('.css')) {
                analysis.cssFiles++;
            } else if (file.endsWith('.json') || file.endsWith('.md')) {
                analysis.configFiles++;
            }
        });
        
    } catch (error) {
        console.warn('⚠️  Could not analyze codebase:', error.message);
    }
    
    return analysis;
}

// Check for common code quality issues
function runQualityChecks() {
    const checks = [];
    
    try {
        // Check for linting errors (if available)
        try {
            execSync('npm run lint', { stdio: 'pipe' });
            checks.push('✅ Linting: No errors found');
        } catch (error) {
            if (error.stdout && error.stdout.includes('not found')) {
                checks.push('⚠️  Linting: No lint script configured');
            } else {
                checks.push('❌ Linting: Errors found - run npm run lint to see details');
            }
        }
        
        // Check for TypeScript errors (if applicable)
        try {
            execSync('npx tsc --noEmit', { stdio: 'pipe' });
            checks.push('✅ TypeScript: No type errors');
        } catch (error) {
            if (error.message.includes('not found')) {
                checks.push('ℹ️  TypeScript: Not configured');
            } else {
                checks.push('❌ TypeScript: Type errors found');
            }
        }
        
        // Check for test execution
        try {
            const testResult = execSync('npm test', { stdio: 'pipe', encoding: 'utf8' });
            if (testResult.includes('passing')) {
                checks.push('✅ Tests: All tests passing');
            } else {
                checks.push('⚠️  Tests: Check test results');
            }
        } catch (error) {
            if (error.message.includes('not found')) {
                checks.push('⚠️  Tests: No test script configured');
            } else {
                checks.push('❌ Tests: Test failures detected');
            }
        }
        
        // Check git status
        const gitInfo = getGitInfo();
        if (gitInfo.hasChanges) {
            checks.push(`⚠️  Git: ${gitInfo.changedFiles} files with uncommitted changes`);
        } else {
            checks.push('✅ Git: Working directory clean');
        }
        
        // Check for TODO/FIXME comments
        try {
            const todoResult = execSync('grep -r "TODO\\|FIXME" --include="*.js" --include="*.html" --include="*.css" . | grep -v node_modules | wc -l', 
                { encoding: 'utf8' }).trim();
            const todoCount = parseInt(todoResult) || 0;
            
            if (todoCount === 0) {
                checks.push('✅ Code: No TODO/FIXME comments found');
            } else {
                checks.push(`⚠️  Code: ${todoCount} TODO/FIXME comments found`);
            }
        } catch (error) {
            checks.push('ℹ️  Code: Could not check for TODO comments');
        }
        
    } catch (error) {
        checks.push('❌ Quality checks failed to run');
    }
    
    return checks;
}

// Generate self-review report
function generateSelfReview(interactive = true) {
    ensureReviewsDirectory();
    
    const gitInfo = getGitInfo();
    const analysis = analyzeCodebase();
    const qualityChecks = runQualityChecks();
    
    const timestamp = new Date().toISOString();
    const safeBranchName = gitInfo.branch.replace(/[^a-zA-Z0-9-]/g, '-');
    const reviewFilename = `self-review-${safeBranchName}-${Date.now()}.md`;
    const reviewPath = path.join(REVIEWS_DIR, reviewFilename);
    
    // Read self-review template
    const templatePath = path.join(TEMPLATES_DIR, 'self-review.md');
    let templateContent = '';
    
    if (fs.existsSync(templatePath)) {
        templateContent = fs.readFileSync(templatePath, 'utf8');
    } else {
        console.warn('⚠️  Self-review template not found, using basic template');
        templateContent = createBasicSelfReviewTemplate();
    }
    
    // Generate review content with current analysis
    const reviewContent = `# Self-Review Report

**Generated**: ${timestamp}
**Branch**: ${gitInfo.branch}
**Commit**: ${gitInfo.commit}
**Developer**: ${process.env.USER || 'Unknown'}

## Automated Quality Checks

${qualityChecks.map(check => `- ${check}`).join('\n')}

## Codebase Analysis

- **Total Files**: ${analysis.totalFiles}
- **JavaScript Files**: ${analysis.jsFiles}
- **HTML Files**: ${analysis.htmlFiles}
- **CSS Files**: ${analysis.cssFiles}
- **Test Files**: ${analysis.testFiles}
- **Config Files**: ${analysis.configFiles}

## Git Status

- **Branch**: ${gitInfo.branch}
- **Uncommitted Changes**: ${gitInfo.hasChanges ? `Yes (${gitInfo.changedFiles} files)` : 'No'}
- **Ready for Review**: ${gitInfo.hasChanges ? '❌ Commit changes first' : '✅ Yes'}

---

${templateContent}
`;
    
    // Write review file
    fs.writeFileSync(reviewPath, reviewContent);
    
    console.log('📋 Self-Review Report Generated');
    console.log('=' .repeat(50));
    console.log(`File: ${reviewPath}`);
    console.log('');
    
    // Display automated checks
    console.log('🔍 Automated Quality Checks:');
    qualityChecks.forEach(check => console.log(`   ${check}`));
    console.log('');
    
    // Display codebase metrics
    console.log('📊 Codebase Metrics:');
    console.log(`   Total Files: ${analysis.totalFiles}`);
    console.log(`   JavaScript: ${analysis.jsFiles}`);
    console.log(`   HTML: ${analysis.htmlFiles}`);
    console.log(`   CSS: ${analysis.cssFiles}`);
    console.log(`   Tests: ${analysis.testFiles}`);
    console.log('');
    
    // Display git status
    console.log('📝 Git Status:');
    console.log(`   Branch: ${gitInfo.branch}`);
    console.log(`   Uncommitted Changes: ${gitInfo.hasChanges ? `${gitInfo.changedFiles} files` : 'None'}`);
    console.log('');
    
    // Enforcement checks
    const criticalIssues = qualityChecks.filter(check => check.startsWith('❌')).length;
    const warnings = qualityChecks.filter(check => check.startsWith('⚠️')).length;
    
    console.log('⚖️  obra/superpowers Enforcement:');
    
    if (criticalIssues > 0) {
        console.log(`   ❌ ${criticalIssues} critical issues must be resolved before proceeding`);
        console.log('   🚫 Code review BLOCKED until issues are fixed');
    } else if (warnings > 0) {
        console.log(`   ⚠️  ${warnings} warnings found - consider addressing before review`);
        console.log('   ✅ Code review allowed with warnings');
    } else {
        console.log('   ✅ All automated checks passed');
        console.log('   ✅ Ready for code review');
    }
    
    if (gitInfo.hasChanges) {
        console.log('   ⚠️  Commit all changes before requesting review');
    }
    
    console.log('');
    console.log('📋 Manual Review Required:');
    console.log('   1. Complete the self-review checklist in the generated file');
    console.log('   2. Ensure all sections are thoroughly reviewed');
    console.log('   3. Address any identified issues');
    console.log('   4. Update the review status when complete');
    
    return {
        reviewPath,
        criticalIssues,
        warnings,
        readyForReview: criticalIssues === 0 && !gitInfo.hasChanges
    };
}

// Create basic self-review template fallback
function createBasicSelfReviewTemplate() {
    return `
## Manual Self-Review Checklist

### Code Quality
- [ ] Code follows project conventions
- [ ] Functions are focused and well-named
- [ ] No code duplication
- [ ] Error handling is appropriate
- [ ] Security best practices followed

### Testing
- [ ] All new functionality has tests
- [ ] Tests cover edge cases and error conditions
- [ ] All tests are passing
- [ ] Test coverage is adequate

### Documentation
- [ ] Code is properly commented
- [ ] README updated if needed
- [ ] API changes documented
- [ ] Breaking changes noted

### Integration
- [ ] No breaking changes to existing functionality
- [ ] External dependencies are justified
- [ ] Configuration changes documented
- [ ] Deployment considerations addressed

### Review Summary
**What was implemented:**


**Key decisions made:**


**Known limitations:**


**Follow-up items:**


### Approval
- [ ] Ready for peer review
- [ ] All issues addressed
- [ ] Self-review complete

**Reviewer**: ${process.env.USER || 'Developer'}
**Date**: ${new Date().toISOString().split('T')[0]}
`;
}

// List existing reviews
function listReviews() {
    ensureReviewsDirectory();
    
    const reviewFiles = fs.readdirSync(REVIEWS_DIR)
        .filter(file => file.startsWith('self-review-') && file.endsWith('.md'))
        .sort()
        .reverse(); // Most recent first
    
    if (reviewFiles.length === 0) {
        console.log('📭 No self-reviews found');
        console.log('   Generate one with: npm run agent:self-review');
        return;
    }
    
    console.log(`📚 Found ${reviewFiles.length} self-reviews:`);
    console.log('');
    
    reviewFiles.slice(0, 10).forEach((file, index) => {
        const reviewPath = path.join(REVIEWS_DIR, file);
        const stats = fs.statSync(reviewPath);
        
        // Extract branch from filename
        const branchMatch = file.match(/self-review-(.+)-\d+\.md/);
        const branch = branchMatch ? branchMatch[1] : 'unknown';
        
        console.log(`${index + 1}. ${file}`);
        console.log(`   Branch: ${branch}`);
        console.log(`   Created: ${stats.mtime.toLocaleDateString()}`);
        console.log('');
    });
    
    if (reviewFiles.length > 10) {
        console.log(`   ... and ${reviewFiles.length - 10} more`);
    }
}

// Main execution
function main() {
    const command = process.argv[2];
    
    switch (command) {
        case 'list':
        case 'ls':
            listReviews();
            break;
            
        case 'generate':
        case 'create':
        default:
            const result = generateSelfReview();
            
            if (!result.readyForReview) {
                console.log('');
                console.log('🚫 Self-review generated but issues must be resolved before proceeding');
                process.exit(1);
            }
            break;
    }
}

// Only run if this file is executed directly
if (require.main === module) {
    main();
}

module.exports = {
    generateSelfReview,
    listReviews,
    analyzeCodebase,
    runQualityChecks
};