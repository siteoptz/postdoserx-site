#!/usr/bin/env node

/**
 * obra/superpowers Planning Workflow Script
 * 
 * Enforces plan → test → implement → review workflow
 * Usage: npm run agent:plan [feature-name]
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PLANS_DIR = path.join(process.cwd(), 'docs', 'superpowers', 'plans');
const TEMPLATES_DIR = path.join(process.cwd(), 'docs', 'agent-stack', 'templates');

// Ensure plans directory exists
function ensurePlansDirectory() {
    if (!fs.existsSync(PLANS_DIR)) {
        fs.mkdirSync(PLANS_DIR, { recursive: true });
        console.log(`📁 Created plans directory: ${PLANS_DIR}`);
    }
}

// Generate plan filename
function generatePlanFilename(featureName) {
    const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const safeName = featureName.toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
    return `${date}-${safeName}.md`;
}

// Create new implementation plan
function createPlan(featureName) {
    ensurePlansDirectory();
    
    if (!featureName) {
        console.error('❌ Error: Feature name is required');
        console.log('Usage: npm run agent:plan <feature-name>');
        console.log('Example: npm run agent:plan "user authentication system"');
        process.exit(1);
    }
    
    const planFilename = generatePlanFilename(featureName);
    const planPath = path.join(PLANS_DIR, planFilename);
    
    // Check if plan already exists
    if (fs.existsSync(planPath)) {
        console.log(`⚠️  Plan already exists: ${planPath}`);
        console.log('   Use a different feature name or edit the existing plan');
        return;
    }
    
    // Read plan template
    const templatePath = path.join(TEMPLATES_DIR, 'plan.md');
    let templateContent = '';
    
    if (fs.existsSync(templatePath)) {
        templateContent = fs.readFileSync(templatePath, 'utf8');
    } else {
        // Fallback template if template file doesn't exist
        templateContent = createFallbackTemplate();
    }
    
    // Customize template with feature information
    const planContent = templateContent
        .replace(/\[feature-name\]/g, featureName)
        .replace(/\[Feature\/Task Description\]/g, `${featureName}`)
        .replace(/\*\*Brief description of what needs to be implemented\*\*/g, 
                `Implementation of ${featureName}`)
        .replace(/\[Date\]/g, new Date().toISOString().split('T')[0])
        .replace(/\[Name\]/g, process.env.USER || 'Developer')
        .replace(/\[Draft\/Approved\/In Progress\/Completed\]/g, 'Draft');
    
    // Write plan file
    fs.writeFileSync(planPath, planContent);
    
    console.log(`✅ Implementation plan created!`);
    console.log(`   File: ${planPath}`);
    console.log(`   Feature: ${featureName}`);
    console.log('');
    console.log('📋 Next steps:');
    console.log('   1. Edit the plan file to complete all sections');
    console.log('   2. Define test strategy before implementation');
    console.log('   3. Use npm run agent:self-review when ready');
    console.log('');
    console.log('⚠️  obra/superpowers enforcement:');
    console.log('   - Tests must be written before implementation code');
    console.log('   - All sections of the plan must be completed');
    console.log('   - Self-review is mandatory before code review');
    
    return planPath;
}

// Validate existing plan
function validatePlan(planPath) {
    if (!fs.existsSync(planPath)) {
        console.error(`❌ Plan file not found: ${planPath}`);
        return false;
    }
    
    const content = fs.readFileSync(planPath, 'utf8');
    const validationResults = [];
    
    // Check for required sections
    const requiredSections = [
        'Requirements Analysis',
        'Technical Approach',
        'Test Strategy',
        'Implementation Checklist',
        'Risk Assessment',
        'Acceptance Criteria'
    ];
    
    requiredSections.forEach(section => {
        if (!content.includes(section)) {
            validationResults.push(`❌ Missing section: ${section}`);
        } else {
            validationResults.push(`✅ Found section: ${section}`);
        }
    });
    
    // Check for placeholder content
    const placeholders = [
        '[feature-name]',
        '[Date]',
        '[Name]',
        'Brief description of what needs to be implemented',
        'X hours'
    ];
    
    const foundPlaceholders = placeholders.filter(placeholder => 
        content.includes(placeholder)
    );
    
    if (foundPlaceholders.length > 0) {
        validationResults.push(`⚠️  Found ${foundPlaceholders.length} unfilled placeholders`);
        foundPlaceholders.forEach(placeholder => {
            validationResults.push(`   - ${placeholder}`);
        });
    }
    
    // Check for test strategy
    const testSectionStart = content.indexOf('## Test Strategy');
    const testSectionEnd = content.indexOf('##', testSectionStart + 1);
    const testSection = testSectionEnd > testSectionStart 
        ? content.slice(testSectionStart, testSectionEnd)
        : content.slice(testSectionStart);
    
    if (testSection.length < 200) {
        validationResults.push(`⚠️  Test strategy section appears incomplete (${testSection.length} chars)`);
    } else {
        validationResults.push(`✅ Test strategy section appears complete`);
    }
    
    console.log('📊 Plan Validation Results:');
    console.log('=' .repeat(50));
    validationResults.forEach(result => console.log(result));
    
    const errors = validationResults.filter(r => r.startsWith('❌')).length;
    const warnings = validationResults.filter(r => r.startsWith('⚠️')).length;
    
    console.log('');
    console.log(`Summary: ${errors} errors, ${warnings} warnings`);
    
    if (errors > 0) {
        console.log('❌ Plan validation failed - complete missing sections');
        return false;
    } else if (warnings > 0) {
        console.log('⚠️  Plan has warnings - consider addressing before implementation');
        return true;
    } else {
        console.log('✅ Plan validation passed!');
        return true;
    }
}

// List existing plans
function listPlans() {
    ensurePlansDirectory();
    
    const planFiles = fs.readdirSync(PLANS_DIR)
        .filter(file => file.endsWith('.md'))
        .sort()
        .reverse(); // Most recent first
    
    if (planFiles.length === 0) {
        console.log('📭 No implementation plans found');
        console.log('   Create one with: npm run agent:plan "feature name"');
        return;
    }
    
    console.log(`📚 Found ${planFiles.length} implementation plans:`);
    console.log('');
    
    planFiles.forEach((file, index) => {
        const planPath = path.join(PLANS_DIR, file);
        const content = fs.readFileSync(planPath, 'utf8');
        
        // Extract feature name from filename
        const featureName = file
            .replace(/^\d{4}-\d{2}-\d{2}-/, '')
            .replace(/\.md$/, '')
            .replace(/-/g, ' ');
        
        // Extract status from content
        const statusMatch = content.match(/\*\*Status\*\*:\s*\[([^\]]+)\]/);
        const status = statusMatch ? statusMatch[1] : 'Unknown';
        
        console.log(`${index + 1}. ${featureName}`);
        console.log(`   File: ${file}`);
        console.log(`   Status: ${status}`);
        console.log('');
    });
}

// Fallback template if template file doesn't exist
function createFallbackTemplate() {
    return `# Implementation Plan: [feature-name]

## Feature/Task Description
Implementation of [feature-name]

## Requirements Analysis
- [ ] Functional requirements identified
- [ ] Non-functional requirements identified  
- [ ] Dependencies and constraints documented
- [ ] Success criteria defined

## Technical Approach

### Architecture Decisions
- **Framework/Library choices**: 
- **Design patterns**: 
- **Data flow**: 
- **Integration points**: 

### Implementation Strategy
1. **Phase 1**: 
2. **Phase 2**: 
3. **Phase 3**: 

## Test Strategy

### Test Types Required
- [ ] Unit tests
- [ ] Integration tests
- [ ] End-to-end tests
- [ ] Performance tests
- [ ] Security tests

### Test Cases
1. **Happy path**: 
2. **Error cases**: 
3. **Edge cases**: 
4. **Performance scenarios**: 

## Implementation Checklist

### Prerequisites
- [ ] Environment setup verified
- [ ] Dependencies installed
- [ ] Test framework configured
- [ ] Development branch created

### Development Steps
- [ ] Write tests first (TDD)
- [ ] Implement core functionality
- [ ] Handle error cases
- [ ] Add logging/monitoring
- [ ] Update documentation

### Quality Gates
- [ ] All tests passing
- [ ] Code review completed
- [ ] Performance benchmarks met
- [ ] Security review passed
- [ ] Documentation updated

## Risk Assessment

### Potential Risks
1. **Technical risks**: 
2. **Timeline risks**: 
3. **Integration risks**: 
4. **Security risks**: 

### Mitigation Strategies
1. **Risk 1 mitigation**: 
2. **Risk 2 mitigation**: 
3. **Risk 3 mitigation**: 
4. **Risk 4 mitigation**: 

## Acceptance Criteria

### Must Have
- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Criterion 3

### Should Have
- [ ] Criterion 1
- [ ] Criterion 2

### Could Have
- [ ] Criterion 1
- [ ] Criterion 2

---

**Created**: [Date]
**Author**: [Name]
**Status**: [Draft]`;
}

// Main execution
function main() {
    const command = process.argv[2];
    const featureName = process.argv.slice(3).join(' ');
    
    switch (command) {
        case 'create':
        case 'new':
            createPlan(featureName);
            break;
            
        case 'validate':
            if (!featureName) {
                console.error('❌ Plan file path required for validation');
                console.log('Usage: npm run agent:plan validate <path-to-plan>');
                process.exit(1);
            }
            validatePlan(featureName);
            break;
            
        case 'list':
        case 'ls':
            listPlans();
            break;
            
        default:
            if (command) {
                // Treat first argument as feature name
                createPlan([command, ...process.argv.slice(3)].join(' '));
            } else {
                console.log('🎯 obra/superpowers Planning Workflow');
                console.log('');
                console.log('Usage:');
                console.log('  npm run agent:plan <feature-name>     Create new plan');
                console.log('  npm run agent:plan list               List existing plans');
                console.log('  npm run agent:plan validate <file>    Validate plan');
                console.log('');
                console.log('Examples:');
                console.log('  npm run agent:plan "user authentication"');
                console.log('  npm run agent:plan "payment processing system"');
                console.log('  npm run agent:plan list');
            }
            break;
    }
}

// Only run if this file is executed directly
if (require.main === module) {
    main();
}

module.exports = {
    createPlan,
    validatePlan,
    listPlans
};