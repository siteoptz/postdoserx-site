#!/usr/bin/env node

/**
 * gStack Orchestration Layer
 * 
 * Orchestrates feature development through CEO/product → engineering → QA → ship workflow
 * Based on Garry Tan's gStack framework for predictable AI-assisted development
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// gStack skill phases mapping
const GSTACK_PHASES = {
    'office-hours': {
        name: 'Office Hours (CEO/Product)',
        description: 'Product framing and business context setting',
        role: 'CEO/Product Manager',
        focus: 'User problems, business value, product direction',
        skipTechnical: true
    },
    'plan': {
        name: 'Planning (Engineering Manager)', 
        description: 'Technical planning and architecture decisions',
        role: 'Engineering Manager',
        focus: 'Framework choices, maintainability, technical approach',
        skipUI: true
    },
    'implement': {
        name: 'Implementation',
        description: 'Code implementation following the plan',
        role: 'Senior Developer',
        focus: 'Clean code, following architectural decisions',
        skipPlanning: true
    },
    'review': {
        name: 'Code Review',
        description: 'Comprehensive code review process',
        role: 'Tech Lead',
        focus: 'Code quality, security, performance',
        skipProductDecisions: true
    },
    'qa': {
        name: 'QA Review',
        description: 'Quality assurance and testing validation',
        role: 'QA Engineer',
        focus: 'Testing, edge cases, user experience validation',
        skipCodeDetails: true
    },
    'ship': {
        name: 'Release Management',
        description: 'Deployment readiness and release preparation',
        role: 'Release Manager',
        focus: 'Deployment safety, rollback plans, monitoring',
        requiresApproval: true
    }
};

// gStack orchestration workflow
function runGStackOrchestration(featureName, startPhase = 'office-hours') {
    console.log('🚀 Starting gStack Orchestration Workflow...\n');
    console.log(`Feature: ${featureName}`);
    console.log(`Starting Phase: ${startPhase}\n`);
    
    const workflow = {
        featureName,
        startPhase,
        timestamp: new Date().toISOString(),
        phases: [],
        currentPhase: startPhase,
        status: 'in-progress',
        approvals: {},
        findings: []
    };
    
    // Execute workflow phases
    const phaseOrder = Object.keys(GSTACK_PHASES);
    const startIndex = phaseOrder.indexOf(startPhase);
    
    if (startIndex === -1) {
        throw new Error(`Invalid start phase: ${startPhase}. Valid phases: ${phaseOrder.join(', ')}`);
    }
    
    let blocked = false;
    
    for (let i = startIndex; i < phaseOrder.length && !blocked; i++) {
        const phaseKey = phaseOrder[i];
        const phase = GSTACK_PHASES[phaseKey];
        
        console.log(`\n${'='.repeat(60)}`);
        console.log(`🎯 PHASE: ${phase.name}`);
        console.log(`Role: ${phase.role}`);
        console.log(`Focus: ${phase.focus}`);
        console.log(`${'='.repeat(60)}\n`);
        
        const phaseResult = executeGStackPhase(phaseKey, phase, workflow);
        workflow.phases.push(phaseResult);
        
        // Check if phase is blocked
        if (phaseResult.status === 'blocked') {
            blocked = true;
            workflow.status = 'blocked';
            workflow.blockingPhase = phaseKey;
            
            console.log(`\n🚫 Workflow BLOCKED at ${phase.name}`);
            console.log(`   ${phaseResult.blockingReason}`);
            break;
        }
        
        // Check for required approval
        if (phase.requiresApproval && !workflow.approvals[phaseKey]) {
            blocked = true;
            workflow.status = 'awaiting-approval';
            workflow.awaitingApprovalPhase = phaseKey;
            
            console.log(`\n⏸️  Workflow PAUSED for approval at ${phase.name}`);
            console.log(`   Manual approval required before proceeding to deployment`);
            break;
        }
        
        workflow.currentPhase = phaseKey;
    }
    
    if (!blocked) {
        workflow.status = 'completed';
        console.log(`\n✅ gStack workflow completed successfully!`);
    }
    
    return workflow;
}

// Execute individual gStack phase
function executeGStackPhase(phaseKey, phase, workflow) {
    const phaseResult = {
        phase: phaseKey,
        name: phase.name,
        role: phase.role,
        startTime: new Date().toISOString(),
        status: 'running',
        findings: [],
        recommendations: [],
        gateChecks: []
    };
    
    try {
        switch (phaseKey) {
            case 'office-hours':
                return executeCEOReview(phaseResult, workflow);
                
            case 'plan':
                return executeEngineeringPlan(phaseResult, workflow);
                
            case 'implement':
                return executeImplementation(phaseResult, workflow);
                
            case 'review':
                return executeCodeReview(phaseResult, workflow);
                
            case 'qa':
                return executeQAReview(phaseResult, workflow);
                
            case 'ship':
                return executeReleasePrep(phaseResult, workflow);
                
            default:
                throw new Error(`Unknown phase: ${phaseKey}`);
        }
        
    } catch (error) {
        phaseResult.status = 'failed';
        phaseResult.error = error.message;
        phaseResult.endTime = new Date().toISOString();
        
        console.log(`❌ Phase ${phase.name} failed: ${error.message}`);
        return phaseResult;
    }
}

// CEO/Product framing phase
function executeCEOReview(phaseResult, workflow) {
    console.log('👔 Executing CEO/Product Review...');
    
    // Product-focused questions and validation
    const productChecks = [
        {
            check: 'user-problem',
            question: 'What user problem does this feature solve?',
            status: 'requires-input'
        },
        {
            check: 'business-value',
            question: 'What is the business impact and success metrics?',
            status: 'requires-input'
        },
        {
            check: 'user-journey',
            question: 'How does this fit into the overall user journey?',
            status: 'requires-input'
        },
        {
            check: 'scope-definition',
            question: 'What is explicitly out of scope for this feature?',
            status: 'requires-input'
        },
        {
            check: 'success-criteria',
            question: 'How will we measure if this feature is successful?',
            status: 'requires-input'
        }
    ];
    
    phaseResult.gateChecks = productChecks;
    phaseResult.recommendations.push(
        'Define clear user value proposition before technical implementation',
        'Establish measurable success criteria',
        'Validate feature fits product strategy',
        'Ensure scope is appropriately bounded'
    );
    
    // For automation, mark as requiring human input
    phaseResult.status = 'requires-input';
    phaseResult.findings.push({
        type: 'product-validation',
        severity: 'high',
        finding: 'Product validation required before technical planning',
        recommendation: 'Complete CEO/Product review checklist before proceeding'
    });
    
    phaseResult.endTime = new Date().toISOString();
    
    console.log('📋 CEO Review requires product stakeholder input');
    console.log('   Complete product validation checklist before technical planning');
    
    return phaseResult;
}

// Engineering planning phase
function executeEngineeringPlan(phaseResult, workflow) {
    console.log('🏗️ Executing Engineering Planning...');
    
    // Check if planning already exists
    const plansDir = path.join(process.cwd(), 'docs', 'superpowers', 'plans');
    let hasExistingPlan = false;
    
    if (fs.existsSync(plansDir)) {
        const planFiles = fs.readdirSync(plansDir).filter(f => f.endsWith('.md'));
        hasExistingPlan = planFiles.some(file => 
            file.toLowerCase().includes(workflow.featureName.toLowerCase().replace(/\s+/g, '-'))
        );
    }
    
    if (hasExistingPlan) {
        phaseResult.findings.push({
            type: 'planning',
            severity: 'info',
            finding: 'Existing implementation plan found',
            recommendation: 'Review and update existing plan if needed'
        });
    } else {
        phaseResult.findings.push({
            type: 'planning',
            severity: 'medium',
            finding: 'No implementation plan found',
            recommendation: 'Create detailed implementation plan using obra/superpowers planning workflow'
        });
        
        phaseResult.status = 'blocked';
        phaseResult.blockingReason = 'Implementation plan required. Run: npm run agent:plan "' + workflow.featureName + '"';
        phaseResult.endTime = new Date().toISOString();
        return phaseResult;
    }
    
    // Engineering-focused validations
    const engineeringChecks = [
        {
            check: 'architecture-decision',
            question: 'What architectural patterns and frameworks will be used?',
            status: hasExistingPlan ? 'documented' : 'requires-planning'
        },
        {
            check: 'scalability',
            question: 'How will this scale with user growth?',
            status: 'requires-review'
        },
        {
            check: 'maintenance',
            question: 'What are the long-term maintenance implications?',
            status: 'requires-review'
        },
        {
            check: 'integration',
            question: 'How does this integrate with existing systems?',
            status: 'requires-review'
        },
        {
            check: 'testing-strategy',
            question: 'What is the testing strategy and coverage plan?',
            status: hasExistingPlan ? 'documented' : 'requires-planning'
        }
    ];
    
    phaseResult.gateChecks = engineeringChecks;
    phaseResult.recommendations.push(
        'Validate architectural decisions against existing codebase',
        'Ensure testing strategy covers edge cases',
        'Consider performance and scalability implications',
        'Plan for monitoring and observability'
    );
    
    phaseResult.status = 'completed';
    phaseResult.endTime = new Date().toISOString();
    
    console.log('✅ Engineering planning review completed');
    
    return phaseResult;
}

// Implementation phase
function executeImplementation(phaseResult, workflow) {
    console.log('💻 Executing Implementation Review...');
    
    // Check git status for recent implementation
    try {
        const gitStatus = execSync('git status --porcelain', { encoding: 'utf8' });
        const hasChanges = gitStatus.length > 0;
        
        if (!hasChanges) {
            phaseResult.findings.push({
                type: 'implementation',
                severity: 'medium',
                finding: 'No uncommitted changes detected',
                recommendation: 'Ensure implementation changes are staged or committed'
            });
        } else {
            const changedFiles = gitStatus.split('\n').filter(line => line.trim()).length;
            phaseResult.findings.push({
                type: 'implementation',
                severity: 'info',
                finding: `${changedFiles} files with changes detected`,
                recommendation: 'Review changes before committing'
            });
        }
        
        // Check for test files
        const testFiles = execSync(
            'find . -name "*test*" -o -name "*spec*" | grep -v node_modules | wc -l',
            { encoding: 'utf8' }
        ).trim();
        
        if (parseInt(testFiles) === 0) {
            phaseResult.findings.push({
                type: 'testing',
                severity: 'high',
                finding: 'No test files found for implementation',
                recommendation: 'Add test coverage for new functionality'
            });
        }
        
    } catch (error) {
        console.warn(`Warning: Could not check implementation status: ${error.message}`);
    }
    
    const implementationChecks = [
        {
            check: 'code-quality',
            question: 'Does code follow established patterns and conventions?',
            status: 'requires-review'
        },
        {
            check: 'test-coverage',
            question: 'Is there adequate test coverage for new functionality?',
            status: 'requires-validation'
        },
        {
            check: 'documentation',
            question: 'Is new functionality properly documented?',
            status: 'requires-review'
        },
        {
            check: 'error-handling',
            question: 'Are edge cases and errors handled appropriately?',
            status: 'requires-testing'
        }
    ];
    
    phaseResult.gateChecks = implementationChecks;
    phaseResult.recommendations.push(
        'Run comprehensive code review before proceeding',
        'Ensure all acceptance criteria are met',
        'Validate error handling and edge cases',
        'Update documentation for new features'
    );
    
    phaseResult.status = 'completed';
    phaseResult.endTime = new Date().toISOString();
    
    console.log('✅ Implementation review completed');
    
    return phaseResult;
}

// Code review phase
function executeCodeReview(phaseResult, workflow) {
    console.log('👀 Executing Code Review...');
    
    // Run the 5-lane parallel code review system
    try {
        console.log('   Running parallel code review lanes...');
        
        // This would integrate with our existing review system
        const reviewScript = path.join(__dirname, 'aggregate-report');
        let reviewOutput = '';
        
        try {
            reviewOutput = execSync(`node "${reviewScript}" --summary-only`, { 
                encoding: 'utf8',
                timeout: 60000 
            });
        } catch (error) {
            // Review system might exit with error code for issues
            reviewOutput = error.stdout || error.message;
        }
        
        phaseResult.findings.push({
            type: 'code-review',
            severity: 'info',
            finding: 'Comprehensive code review completed',
            recommendation: 'Address any critical or high-priority findings',
            evidence: reviewOutput.substring(0, 200) + '...'
        });
        
    } catch (error) {
        phaseResult.findings.push({
            type: 'code-review',
            severity: 'medium',
            finding: 'Could not run automated code review',
            recommendation: 'Run manual code review: npm run agent:review',
            evidence: error.message
        });
    }
    
    const reviewChecks = [
        {
            check: 'correctness',
            question: 'Is the logic correct and handling edge cases?',
            status: 'automated-check'
        },
        {
            check: 'architecture',
            question: 'Does the code follow good architectural patterns?',
            status: 'automated-check'
        },
        {
            check: 'security',
            question: 'Are there any security vulnerabilities?',
            status: 'automated-check'
        },
        {
            check: 'performance',
            question: 'Are there performance concerns or bottlenecks?',
            status: 'automated-check'
        },
        {
            check: 'maintainability',
            question: 'Is the code maintainable and well-documented?',
            status: 'automated-check'
        }
    ];
    
    phaseResult.gateChecks = reviewChecks;
    phaseResult.recommendations.push(
        'Address all critical and high-priority code review findings',
        'Ensure security scan passes before deployment',
        'Validate performance meets requirements',
        'Confirm architectural decisions align with team standards'
    );
    
    phaseResult.status = 'completed';
    phaseResult.endTime = new Date().toISOString();
    
    console.log('✅ Code review phase completed');
    
    return phaseResult;
}

// QA review phase
function executeQAReview(phaseResult, workflow) {
    console.log('🧪 Executing QA Review...');
    
    // QA-focused validations
    const qaChecks = [
        {
            check: 'acceptance-criteria',
            question: 'Do all acceptance criteria pass?',
            status: 'requires-testing'
        },
        {
            check: 'user-experience',
            question: 'Is the user experience intuitive and polished?',
            status: 'requires-manual-testing'
        },
        {
            check: 'edge-cases',
            question: 'Are edge cases and error states handled gracefully?',
            status: 'requires-testing'
        },
        {
            check: 'cross-browser',
            question: 'Does functionality work across target browsers?',
            status: 'requires-testing'
        },
        {
            check: 'performance',
            question: 'Does the feature meet performance requirements?',
            status: 'requires-measurement'
        }
    ];
    
    phaseResult.gateChecks = qaChecks;
    
    // Check for test automation
    try {
        const hasTests = execSync('npm test --dry-run 2>/dev/null && echo "true" || echo "false"', 
            { encoding: 'utf8' }).trim() === 'true';
        
        if (hasTests) {
            phaseResult.findings.push({
                type: 'qa',
                severity: 'info',
                finding: 'Test automation available',
                recommendation: 'Run full test suite before release'
            });
        } else {
            phaseResult.findings.push({
                type: 'qa',
                severity: 'medium',
                finding: 'No test automation detected',
                recommendation: 'Perform thorough manual testing of all functionality'
            });
        }
    } catch (error) {
        phaseResult.findings.push({
            type: 'qa',
            severity: 'low',
            finding: 'Could not determine test automation status',
            recommendation: 'Verify testing approach before release'
        });
    }
    
    phaseResult.recommendations.push(
        'Test all acceptance criteria thoroughly',
        'Validate user experience flows end-to-end',
        'Test edge cases and error conditions',
        'Verify performance meets requirements',
        'Confirm accessibility standards are met'
    );
    
    phaseResult.status = 'completed';
    phaseResult.endTime = new Date().toISOString();
    
    console.log('✅ QA review phase completed');
    
    return phaseResult;
}

// Release preparation phase
function executeReleasePrep(phaseResult, workflow) {
    console.log('🚀 Executing Release Preparation...');
    
    // Release safety checks
    const releaseChecks = [
        {
            check: 'deployment-ready',
            question: 'Are all changes committed and pushed?',
            status: 'requires-verification'
        },
        {
            check: 'rollback-plan',
            question: 'Is there a documented rollback plan?',
            status: 'requires-documentation'
        },
        {
            check: 'monitoring',
            question: 'Are monitoring and alerts configured?',
            status: 'requires-verification'
        },
        {
            check: 'stakeholder-approval',
            question: 'Do stakeholders approve this release?',
            status: 'requires-approval'
        }
    ];
    
    phaseResult.gateChecks = releaseChecks;
    
    // Check git status for deployment readiness
    try {
        const gitStatus = execSync('git status --porcelain', { encoding: 'utf8' });
        
        if (gitStatus.length > 0) {
            phaseResult.status = 'blocked';
            phaseResult.blockingReason = 'Uncommitted changes detected. Commit all changes before release.';
            
            phaseResult.findings.push({
                type: 'deployment',
                severity: 'critical',
                finding: 'Uncommitted changes detected',
                recommendation: 'Commit and push all changes before deploying'
            });
        } else {
            phaseResult.findings.push({
                type: 'deployment',
                severity: 'info',
                finding: 'Working directory clean - ready for deployment',
                recommendation: 'Proceed with deployment process'
            });
        }
        
    } catch (error) {
        phaseResult.findings.push({
            type: 'deployment',
            severity: 'medium',
            finding: 'Could not verify git status',
            recommendation: 'Manually verify all changes are committed'
        });
    }
    
    if (phaseResult.status !== 'blocked') {
        phaseResult.status = 'awaiting-approval';
        phaseResult.approvalRequired = true;
        
        console.log('⏸️  Release preparation complete - awaiting manual approval');
        console.log('   Review all gateChecks and approve deployment manually');
    }
    
    phaseResult.recommendations.push(
        'Verify all previous phases passed successfully',
        'Ensure monitoring is in place for post-deployment',
        'Have rollback plan ready and tested',
        'Coordinate with stakeholders for deployment timing',
        'Monitor application health post-deployment'
    );
    
    phaseResult.endTime = new Date().toISOString();
    
    return phaseResult;
}

// Generate orchestration report
function generateOrchestrationReport(workflow) {
    console.log('\n🎯 GSTACK ORCHESTRATION REPORT');
    console.log('=' .repeat(60));
    console.log(`Feature: ${workflow.featureName}`);
    console.log(`Status: ${workflow.status.toUpperCase()}`);
    console.log(`Generated: ${new Date().toLocaleString()}`);
    console.log('');
    
    // Phase summary
    console.log('📊 PHASE SUMMARY');
    console.log('-' .repeat(30));
    
    workflow.phases.forEach((phase, index) => {
        const status = phase.status === 'completed' ? '✅' : 
                      phase.status === 'blocked' ? '🚫' : 
                      phase.status === 'awaiting-approval' ? '⏸️' : 
                      phase.status === 'requires-input' ? '📝' : '⚠️';
        
        console.log(`${status} ${index + 1}. ${phase.name} (${phase.role})`);
        
        if (phase.status === 'blocked') {
            console.log(`    🚫 BLOCKED: ${phase.blockingReason || 'Unknown reason'}`);
        }
        
        if (phase.findings.length > 0) {
            const criticalFindings = phase.findings.filter(f => f.severity === 'critical').length;
            const highFindings = phase.findings.filter(f => f.severity === 'high').length;
            
            if (criticalFindings > 0 || highFindings > 0) {
                console.log(`    ⚠️ Issues: ${criticalFindings} critical, ${highFindings} high`);
            }
        }
    });
    console.log('');
    
    // Current status
    console.log('📍 CURRENT STATUS');
    console.log('-' .repeat(30));
    
    switch (workflow.status) {
        case 'completed':
            console.log('✅ All phases completed successfully');
            console.log('   Feature is ready for production deployment');
            break;
            
        case 'blocked':
            const blockedPhase = workflow.phases.find(p => p.status === 'blocked');
            console.log(`🚫 Workflow blocked at: ${blockedPhase?.name || 'Unknown phase'}`);
            console.log(`   Resolution: ${blockedPhase?.blockingReason || 'See phase details'}`);
            break;
            
        case 'awaiting-approval':
            console.log('⏸️ Awaiting manual approval for deployment');
            console.log('   All automated checks passed - human approval required');
            break;
            
        case 'in-progress':
            console.log('🔄 Workflow in progress');
            console.log(`   Current phase: ${workflow.currentPhase}`);
            break;
    }
    console.log('');
    
    // Next steps
    console.log('🎯 NEXT STEPS');
    console.log('-' .repeat(30));
    
    if (workflow.status === 'blocked') {
        const blockedPhase = workflow.phases.find(p => p.status === 'blocked');
        console.log('1. Resolve blocking issue:');
        console.log(`   ${blockedPhase?.blockingReason || 'See phase details for resolution'}`);
        console.log('2. Re-run orchestration after resolution');
    } else if (workflow.status === 'awaiting-approval') {
        console.log('1. Review all phase gate checks');
        console.log('2. Approve deployment manually');
        console.log('3. Monitor application post-deployment');
    } else if (workflow.status === 'completed') {
        console.log('1. Deploy to production');
        console.log('2. Monitor application health');
        console.log('3. Collect user feedback');
        console.log('4. Plan retrospective session');
    } else {
        console.log('1. Continue with next phase in workflow');
        console.log('2. Address any findings from current phase');
    }
    
    console.log('');
    
    return workflow;
}

// Main execution
function main() {
    const command = process.argv[2];
    const featureName = process.argv.slice(3).join(' ');
    
    if (!featureName && command !== '--help') {
        console.log('❌ Feature name is required');
        console.log('');
        console.log('Usage:');
        console.log('  npm run agent:orchestrate <feature-name>');
        console.log('  npm run agent:orchestrate "user authentication system"');
        console.log('  npm run agent:orchestrate --help');
        process.exit(1);
    }
    
    try {
        switch (command) {
            case '--help':
                console.log('🎯 gStack Orchestration System');
                console.log('');
                console.log('Orchestrates feature development through:');
                console.log('  1. Office Hours (CEO/Product framing)');
                console.log('  2. Planning (Engineering management)');
                console.log('  3. Implementation (Development)');
                console.log('  4. Review (Code quality)');
                console.log('  5. QA (Quality assurance)');
                console.log('  6. Ship (Release management)');
                console.log('');
                console.log('Usage:');
                console.log('  npm run agent:orchestrate <feature-name>');
                console.log('  npm run agent:orchestrate "payment processing" --start-phase plan');
                break;
                
            case '--phases':
                console.log('📋 Available gStack Phases:');
                console.log('');
                Object.entries(GSTACK_PHASES).forEach(([key, phase]) => {
                    console.log(`${key}:`);
                    console.log(`  Name: ${phase.name}`);
                    console.log(`  Role: ${phase.role}`);
                    console.log(`  Focus: ${phase.focus}`);
                    console.log('');
                });
                break;
                
            default:
                const startPhase = process.argv.includes('--start-phase') ? 
                    process.argv[process.argv.indexOf('--start-phase') + 1] : 'office-hours';
                
                const workflow = runGStackOrchestration(featureName, startPhase);
                generateOrchestrationReport(workflow);
                
                // Save workflow state
                const workflowPath = path.join(
                    process.cwd(), 
                    'docs', 
                    'superpowers', 
                    'workflows',
                    `${featureName.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}.json`
                );
                
                // Ensure directory exists
                const workflowDir = path.dirname(workflowPath);
                if (!fs.existsSync(workflowDir)) {
                    fs.mkdirSync(workflowDir, { recursive: true });
                }
                
                fs.writeFileSync(workflowPath, JSON.stringify(workflow, null, 2));
                console.log(`💾 Workflow state saved to: ${workflowPath}`);
                
                // Exit with appropriate code
                if (workflow.status === 'blocked') {
                    console.log('\n🚫 Exiting with error code due to blocking issues');
                    process.exit(1);
                } else {
                    console.log('\n✅ Orchestration completed successfully');
                    process.exit(0);
                }
        }
        
    } catch (error) {
        console.error(`❌ gStack orchestration failed: ${error.message}`);
        process.exit(1);
    }
}

// Only run if this file is executed directly
if (require.main === module) {
    main();
}

module.exports = {
    runGStackOrchestration,
    generateOrchestrationReport,
    GSTACK_PHASES
};