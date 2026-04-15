#!/usr/bin/env node

/**
 * Security Guidance Scanner
 * 
 * Comprehensive security scanning including vulnerability detection and secret scanning
 * Part of the agent stack security guidance system
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Known secret patterns for manual detection
const SECRET_PATTERNS = [
    // API Keys
    { name: 'AWS Access Key', pattern: /AKIA[0-9A-Z]{16}/, severity: 'critical' },
    { name: 'Stripe API Key', pattern: /sk_(test|live)_[0-9a-zA-Z]{24,}/, severity: 'critical' },
    { name: 'Google API Key', pattern: /AIza[0-9A-Za-z\\-_]{35}/, severity: 'critical' },
    { name: 'GitHub Token', pattern: /ghp_[a-zA-Z0-9]{36}/, severity: 'critical' },
    
    // Database URLs
    { name: 'MongoDB URI', pattern: /mongodb:\/\/[^\s]+/, severity: 'high' },
    { name: 'PostgreSQL URI', pattern: /postgresql:\/\/[^\s]+/, severity: 'high' },
    { name: 'MySQL URI', pattern: /mysql:\/\/[^\s]+/, severity: 'high' },
    
    // Generic patterns
    { name: 'Private Key', pattern: /-----BEGIN (RSA |DSA |EC )?PRIVATE KEY-----/, severity: 'critical' },
    { name: 'JWT Token', pattern: /eyJ[a-zA-Z0-9_=]+\.[a-zA-Z0-9_=]+\.[a-zA-Z0-9_\-\+\/=]+/, severity: 'high' },
    { name: 'Password in URL', pattern: /:\/\/[^\/]*:[^@\/]+@[^\/]+/, severity: 'high' },
    
    // Common environment variables
    { name: 'API Key Variable', pattern: /[A-Z_]*API[A-Z_]*KEY['"]\s*[:=]\s*['"][^'"]+['"]/, severity: 'medium' },
    { name: 'Secret Variable', pattern: /[A-Z_]*SECRET['"]\s*[:=]\s*['"][^'"]+['"]/, severity: 'medium' },
    { name: 'Token Variable', pattern: /[A-Z_]*TOKEN['"]\s*[:=]\s*['"][^'"]+['"]/, severity: 'medium' }
];

// Vulnerability patterns for common security issues
const VULNERABILITY_PATTERNS = [
    // Injection vulnerabilities
    { name: 'SQL Injection Risk', pattern: /query\s*\(\s*['"`][^'"`]*\$\{.*\}/, severity: 'critical', description: 'Potential SQL injection via string interpolation' },
    { name: 'Command Injection Risk', pattern: /exec\s*\(\s*['"`][^'"`]*\$\{.*\}/, severity: 'critical', description: 'Potential command injection via string interpolation' },
    
    // XSS vulnerabilities  
    { name: 'XSS Risk', pattern: /innerHTML\s*=\s*[^;]+\+/, severity: 'high', description: 'Potential XSS via innerHTML concatenation' },
    { name: 'Eval Usage', pattern: /eval\s*\(/, severity: 'high', description: 'Use of eval() can lead to code injection' },
    
    // Insecure practices
    { name: 'MD5 Usage', pattern: /md5\s*\(/, severity: 'medium', description: 'MD5 is cryptographically insecure' },
    { name: 'SHA1 Usage', pattern: /sha1\s*\(/, severity: 'medium', description: 'SHA1 is cryptographically insecure' },
    { name: 'HTTP URLs', pattern: /http:\/\/(?!localhost|127\.0\.0\.1)/, severity: 'low', description: 'Use HTTPS instead of HTTP for external URLs' },
    
    // Node.js specific
    { name: 'Unvalidated Redirect', pattern: /res\.redirect\([^)]*req\./, severity: 'medium', description: 'Potential open redirect vulnerability' },
    { name: 'Path Traversal Risk', pattern: /fs\.(readFile|writeFile).*req\./, severity: 'high', description: 'Potential path traversal vulnerability' }
];

// Main security analysis function
function runSecurityAnalysis() {
    console.log('🔒 Starting Security Guidance Analysis...\n');
    
    const findings = [];
    const summary = {
        secretsFound: 0,
        vulnerabilitiesFound: 0,
        criticalIssues: 0,
        highIssues: 0,
        mediumIssues: 0,
        lowIssues: 0
    };
    
    // 1. Secret scanning
    console.log('🔍 Scanning for secrets and credentials...');
    const secretFindings = scanForSecrets();
    findings.push(...secretFindings);
    summary.secretsFound = secretFindings.length;
    
    // 2. Vulnerability scanning
    console.log('🛡️  Scanning for security vulnerabilities...');
    const vulnFindings = scanForVulnerabilities();
    findings.push(...vulnFindings);
    summary.vulnerabilitiesFound = vulnFindings.length;
    
    // 3. Dependency analysis
    console.log('📦 Analyzing dependencies for known vulnerabilities...');
    const depFindings = analyzeDependencyVulnerabilities();
    findings.push(...depFindings);
    
    // 4. Configuration analysis
    console.log('⚙️  Analyzing configuration security...');
    const configFindings = analyzeConfigurationSecurity();
    findings.push(...configFindings);
    
    // Count by severity
    findings.forEach(finding => {
        summary[`${finding.severity}Issues`]++;
    });
    
    return {
        timestamp: new Date().toISOString(),
        summary,
        findings,
        recommendations: generateSecurityRecommendations(summary, findings)
    };
}

// Scan for secrets and credentials
function scanForSecrets() {
    const findings = [];
    
    try {
        // Get all relevant files
        const filesToScan = execSync(
            'find . -type f \\( -name "*.js" -o -name "*.json" -o -name "*.env*" -o -name "*.yml" -o -name "*.yaml" \\) -not -path "./node_modules/*" -not -path "./.git/*"',
            { encoding: 'utf8' }
        ).split('\n').filter(f => f.trim());
        
        for (const file of filesToScan) {
            if (!fs.existsSync(file)) continue;
            
            const content = fs.readFileSync(file, 'utf8');
            const lines = content.split('\n');
            
            // Check against secret patterns
            SECRET_PATTERNS.forEach(pattern => {
                const matches = content.match(new RegExp(pattern.pattern, 'g'));
                if (matches) {
                    matches.forEach(match => {
                        const lineNumber = findLineNumber(lines, match);
                        findings.push({
                            type: 'secret',
                            severity: pattern.severity,
                            file: file,
                            line: lineNumber,
                            finding: `${pattern.name} detected`,
                            evidence: match.substring(0, 20) + '...',
                            recommendation: `Remove ${pattern.name} and use environment variables instead`,
                            category: 'secrets'
                        });
                    });
                }
            });
            
            // Additional checks for environment files
            if (file.includes('.env') && !file.includes('.example')) {
                findings.push({
                    type: 'secret',
                    severity: 'medium',
                    file: file,
                    line: 'entire file',
                    finding: 'Environment file detected in repository',
                    evidence: 'Environment file present',
                    recommendation: 'Environment files should not be committed to version control',
                    category: 'secrets'
                });
            }
        }
        
    } catch (error) {
        console.warn(`Warning: Secret scanning failed: ${error.message}`);
    }
    
    return findings;
}

// Scan for security vulnerabilities
function scanForVulnerabilities() {
    const findings = [];
    
    try {
        const jsFiles = execSync(
            'find . -name "*.js" -not -path "./node_modules/*" -not -path "./.git/*"',
            { encoding: 'utf8' }
        ).split('\n').filter(f => f.trim());
        
        for (const file of jsFiles) {
            if (!fs.existsSync(file)) continue;
            
            const content = fs.readFileSync(file, 'utf8');
            const lines = content.split('\n');
            
            // Check against vulnerability patterns
            VULNERABILITY_PATTERNS.forEach(pattern => {
                const matches = content.match(new RegExp(pattern.pattern, 'g'));
                if (matches) {
                    matches.forEach(match => {
                        const lineNumber = findLineNumber(lines, match);
                        findings.push({
                            type: 'vulnerability',
                            severity: pattern.severity,
                            file: file,
                            line: lineNumber,
                            finding: pattern.name,
                            evidence: match.substring(0, 50) + '...',
                            recommendation: pattern.description,
                            category: 'vulnerabilities'
                        });
                    });
                }
            });
            
            // Check for specific Node.js security issues
            lines.forEach((line, index) => {
                // Check for dangerous functions
                if (line.includes('process.env') && line.includes('||') && !line.includes('//')) {
                    findings.push({
                        type: 'vulnerability',
                        severity: 'low',
                        file: file,
                        line: index + 1,
                        finding: 'Environment variable fallback pattern',
                        evidence: line.trim(),
                        recommendation: 'Ensure environment variable fallbacks don\'t expose sensitive defaults',
                        category: 'configuration'
                    });
                }
                
                // Check for console.log with potentially sensitive data
                if (line.includes('console.log') && (line.includes('req.') || line.includes('password') || line.includes('token'))) {
                    findings.push({
                        type: 'vulnerability',
                        severity: 'medium',
                        file: file,
                        line: index + 1,
                        finding: 'Potential sensitive data logging',
                        evidence: line.trim(),
                        recommendation: 'Avoid logging sensitive data like passwords, tokens, or request objects',
                        category: 'data-exposure'
                    });
                }
            });
        }
        
    } catch (error) {
        console.warn(`Warning: Vulnerability scanning failed: ${error.message}`);
    }
    
    return findings;
}

// Analyze dependencies for vulnerabilities
function analyzeDependencyVulnerabilities() {
    const findings = [];
    
    try {
        // Check if npm audit is available
        const auditResult = execSync('npm audit --json', { 
            encoding: 'utf8', 
            stdio: 'pipe',
            timeout: 30000 
        });
        
        const auditData = JSON.parse(auditResult);
        
        if (auditData.metadata && auditData.metadata.vulnerabilities) {
            const vulns = auditData.metadata.vulnerabilities;
            
            if (vulns.total > 0) {
                findings.push({
                    type: 'dependency',
                    severity: vulns.critical > 0 ? 'critical' : vulns.high > 0 ? 'high' : 'medium',
                    file: 'package.json',
                    line: 'dependencies',
                    finding: `${vulns.total} dependency vulnerabilities found`,
                    evidence: `Critical: ${vulns.critical}, High: ${vulns.high}, Medium: ${vulns.moderate}, Low: ${vulns.low}`,
                    recommendation: 'Run npm audit fix to resolve dependency vulnerabilities',
                    category: 'dependencies'
                });
            }
        }
        
        // Check for known vulnerable packages
        if (fs.existsSync('./package.json')) {
            const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
            const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
            
            // List of commonly vulnerable packages
            const vulnerablePackages = [
                'moment', 'request', 'lodash', 'underscore'
            ];
            
            vulnerablePackages.forEach(pkg => {
                if (deps[pkg]) {
                    findings.push({
                        type: 'dependency',
                        severity: 'low',
                        file: 'package.json',
                        line: `dependencies.${pkg}`,
                        finding: `Using potentially vulnerable package: ${pkg}`,
                        evidence: `${pkg}@${deps[pkg]}`,
                        recommendation: `Consider migrating away from ${pkg} to more secure alternatives`,
                        category: 'dependencies'
                    });
                }
            });
        }
        
    } catch (error) {
        // npm audit might fail if no vulnerabilities or other issues
        if (error.stdout && error.stdout.includes('"vulnerabilities"')) {
            try {
                const auditData = JSON.parse(error.stdout);
                if (auditData.metadata && auditData.metadata.vulnerabilities && auditData.metadata.vulnerabilities.total === 0) {
                    // No vulnerabilities found - this is good
                    return findings;
                }
            } catch (parseError) {
                // Ignore parsing errors
            }
        }
        
        findings.push({
            type: 'dependency',
            severity: 'low',
            file: 'npm-audit',
            line: 'N/A',
            finding: 'Could not run npm audit',
            evidence: error.message.substring(0, 100),
            recommendation: 'Ensure npm audit can run to check for dependency vulnerabilities',
            category: 'dependencies'
        });
    }
    
    return findings;
}

// Analyze configuration security
function analyzeConfigurationSecurity() {
    const findings = [];
    
    // Check Vercel configuration
    if (fs.existsSync('./vercel.json')) {
        const vercelConfig = JSON.parse(fs.readFileSync('./vercel.json', 'utf8'));
        
        // Check for security headers
        const hasSecurityHeaders = vercelConfig.headers && 
            vercelConfig.headers.some(header => 
                header.headers && Object.keys(header.headers).some(h => 
                    h.toLowerCase().includes('security') || 
                    h.toLowerCase().includes('protection')
                )
            );
        
        if (!hasSecurityHeaders) {
            findings.push({
                type: 'configuration',
                severity: 'medium',
                file: 'vercel.json',
                line: 'headers',
                finding: 'Missing security headers configuration',
                evidence: 'No security headers found in vercel.json',
                recommendation: 'Add security headers like X-Frame-Options, X-Content-Type-Options, etc.',
                category: 'configuration'
            });
        }
    }
    
    // Check for .gitignore
    if (fs.existsSync('./.gitignore')) {
        const gitignore = fs.readFileSync('./.gitignore', 'utf8');
        
        const importantIgnores = ['.env', 'node_modules', '*.log'];
        const missingIgnores = importantIgnores.filter(ignore => 
            !gitignore.includes(ignore)
        );
        
        if (missingIgnores.length > 0) {
            findings.push({
                type: 'configuration',
                severity: 'medium',
                file: '.gitignore',
                line: 'missing entries',
                finding: `Missing important .gitignore entries: ${missingIgnores.join(', ')}`,
                evidence: 'Sensitive files may be accidentally committed',
                recommendation: 'Add missing entries to .gitignore to prevent committing sensitive files',
                category: 'configuration'
            });
        }
    }
    
    return findings;
}

// Helper function to find line number of a match
function findLineNumber(lines, match) {
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes(match)) {
            return i + 1;
        }
    }
    return 'unknown';
}

// Generate security recommendations
function generateSecurityRecommendations(summary, findings) {
    const recommendations = [];
    
    if (summary.criticalIssues > 0) {
        recommendations.push({
            priority: 'critical',
            title: '🚨 CRITICAL SECURITY ISSUES',
            description: `${summary.criticalIssues} critical security issues found that require immediate attention`,
            actions: [
                'Stop deployment immediately',
                'Fix all critical security issues',
                'Review access logs for potential breaches',
                'Rotate any exposed credentials',
                'Re-run security scan after fixes'
            ]
        });
    }
    
    if (summary.secretsFound > 0) {
        recommendations.push({
            priority: 'high',
            title: '🔐 SECRETS MANAGEMENT',
            description: `${summary.secretsFound} potential secrets or credentials found`,
            actions: [
                'Remove secrets from code immediately',
                'Use environment variables for sensitive data',
                'Implement proper secrets management',
                'Rotate any exposed credentials',
                'Add .env to .gitignore if not already present'
            ]
        });
    }
    
    if (summary.vulnerabilitiesFound > 0) {
        recommendations.push({
            priority: 'high',
            title: '🛡️ VULNERABILITY REMEDIATION',
            description: `${summary.vulnerabilitiesFound} security vulnerabilities identified`,
            actions: [
                'Fix high and critical vulnerabilities first',
                'Update dependencies with known vulnerabilities',
                'Implement input validation and sanitization',
                'Add security testing to CI/CD pipeline',
                'Consider implementing CSP headers'
            ]
        });
    }
    
    // Best practices recommendations
    recommendations.push({
        priority: 'medium',
        title: '🔒 SECURITY BEST PRACTICES',
        description: 'Implement security best practices for ongoing protection',
        actions: [
            'Enable GitHub secret scanning if available',
            'Set up automated dependency vulnerability scanning',
            'Implement proper error handling (avoid exposing stack traces)',
            'Add rate limiting to API endpoints',
            'Regular security audits and penetration testing'
        ]
    });
    
    return recommendations;
}

// Generate security report
function generateSecurityReport(analysis) {
    console.log('\n🔒 SECURITY ANALYSIS REPORT');
    console.log('=' .repeat(60));
    console.log(`Generated: ${new Date(analysis.timestamp).toLocaleString()}`);
    console.log('');
    
    // Summary
    console.log('📊 SECURITY SUMMARY');
    console.log('-' .repeat(30));
    console.log(`Total Issues: ${analysis.findings.length}`);
    console.log(`🚨 Critical: ${analysis.summary.criticalIssues}`);
    console.log(`⚠️  High: ${analysis.summary.highIssues}`);
    console.log(`💡 Medium: ${analysis.summary.mediumIssues}`);
    console.log(`ℹ️  Low: ${analysis.summary.lowIssues}`);
    console.log('');
    console.log(`🔐 Secrets Found: ${analysis.summary.secretsFound}`);
    console.log(`🛡️  Vulnerabilities: ${analysis.summary.vulnerabilitiesFound}`);
    console.log('');
    
    // Critical and high issues
    const criticalAndHigh = analysis.findings.filter(f => 
        f.severity === 'critical' || f.severity === 'high'
    );
    
    if (criticalAndHigh.length > 0) {
        console.log('🚨 CRITICAL & HIGH PRIORITY ISSUES');
        console.log('-' .repeat(30));
        
        criticalAndHigh.slice(0, 10).forEach((finding, index) => {
            const icon = finding.severity === 'critical' ? '🚨' : '⚠️';
            console.log(`${icon} ${index + 1}. ${finding.finding}`);
            console.log(`   File: ${finding.file}:${finding.line}`);
            console.log(`   Type: ${finding.type} (${finding.category})`);
            console.log(`   Evidence: ${finding.evidence}`);
            console.log(`   Fix: ${finding.recommendation}`);
            console.log('');
        });
        
        if (criticalAndHigh.length > 10) {
            console.log(`   ... and ${criticalAndHigh.length - 10} more critical/high issues\n`);
        }
    }
    
    // Recommendations
    console.log('🎯 SECURITY RECOMMENDATIONS');
    console.log('-' .repeat(30));
    
    analysis.recommendations.forEach(rec => {
        console.log(`${rec.title}`);
        console.log(`${rec.description}`);
        console.log('Actions:');
        rec.actions.forEach(action => {
            console.log(`  • ${action}`);
        });
        console.log('');
    });
    
    // Overall status
    console.log('🔒 SECURITY STATUS');
    console.log('-' .repeat(30));
    
    if (analysis.summary.criticalIssues > 0) {
        console.log('❌ SECURITY BLOCKED - Critical issues must be resolved');
        console.log('   Deployment should be halted until critical issues are fixed');
    } else if (analysis.summary.highIssues > 0) {
        console.log('⚠️ SECURITY WARNING - High priority issues found');
        console.log('   Review and fix high priority issues before deployment');
    } else if (analysis.findings.length > 0) {
        console.log('💡 SECURITY IMPROVEMENTS - Minor issues found');
        console.log('   Address issues during regular development cycle');
    } else {
        console.log('✅ SECURITY CLEARED - No security issues found');
        console.log('   Code meets security standards');
    }
    
    return analysis;
}

// Load baseline for filtering legacy issues
function loadBaseline(baselinePath) {
    if (!baselinePath || !fs.existsSync(baselinePath)) {
        return { findings: [] };
    }
    
    try {
        return JSON.parse(fs.readFileSync(baselinePath, 'utf8'));
    } catch (error) {
        console.warn(`Warning: Could not load baseline from ${baselinePath}: ${error.message}`);
        return { findings: [] };
    }
}

// Filter findings against baseline (to reduce legacy noise)
function filterAgainstBaseline(findings, baseline) {
    if (!baseline || !baseline.findings) {
        return findings;
    }
    
    return findings.filter(finding => {
        // Check if this finding exists in baseline
        const existsInBaseline = baseline.findings.some(baselineFinding => 
            baselineFinding.file === finding.file &&
            baselineFinding.finding === finding.finding &&
            baselineFinding.evidence === finding.evidence
        );
        
        // Only include if it's new (not in baseline) or if it's critical/secret
        return !existsInBaseline || 
               finding.severity === 'critical' || 
               finding.category === 'secrets';
    });
}

// Load suppressions
function loadSuppressions() {
    const suppressionPath = path.join(process.cwd(), 'docs', 'agent-stack', 'security-suppressions.md');
    
    if (!fs.existsSync(suppressionPath)) {
        return [];
    }
    
    try {
        const content = fs.readFileSync(suppressionPath, 'utf8');
        const suppressions = [];
        
        // Parse suppression entries (simplified)
        const entries = content.split('###').slice(1); // Skip header
        
        entries.forEach(entry => {
            const lines = entry.split('\n');
            const title = lines[0].trim();
            const finding = lines.find(l => l.startsWith('**Finding:**'))?.replace('**Finding:**', '').trim();
            const file = lines.find(l => l.startsWith('**File:**'))?.replace('**File:**', '').trim();
            
            if (finding && file) {
                suppressions.push({ title, finding, file });
            }
        });
        
        return suppressions;
    } catch (error) {
        console.warn(`Warning: Could not load suppressions: ${error.message}`);
        return [];
    }
}

// Apply suppressions to findings
function applySuppression(findings) {
    const suppressions = loadSuppressions();
    
    if (suppressions.length === 0) {
        return findings;
    }
    
    return findings.filter(finding => {
        const isSuppressed = suppressions.some(suppression => 
            finding.finding.includes(suppression.finding) && 
            finding.file.includes(suppression.file)
        );
        
        if (isSuppressed) {
            console.log(`ℹ️  Suppressed: ${finding.finding} in ${finding.file}`);
            return false;
        }
        
        return true;
    });
}

// Main execution
function main() {
    const args = process.argv.slice(2);
    const command = args[0];
    
    // Parse arguments
    const isEnforcementMode = args.includes('--enforce-critical');
    const baselinePath = args.includes('--baseline') ? 
        args[args.indexOf('--baseline') + 1] : null;
    const isBaselineGeneration = command === '--baseline';
    
    try {
        const analysis = runSecurityAnalysis();
        
        // Generate baseline if requested
        if (isBaselineGeneration) {
            console.log(JSON.stringify({
                timestamp: analysis.timestamp,
                findings: analysis.findings,
                summary: analysis.summary
            }, null, 2));
            return;
        }
        
        // Apply baseline filtering and suppressions
        let filteredFindings = analysis.findings;
        
        if (baselinePath) {
            const baseline = loadBaseline(baselinePath);
            filteredFindings = filterAgainstBaseline(filteredFindings, baseline);
            console.log(`📋 Filtered ${analysis.findings.length - filteredFindings.length} baseline findings`);
        }
        
        filteredFindings = applySuppression(filteredFindings);
        
        // Update analysis with filtered findings
        const filteredAnalysis = {
            ...analysis,
            findings: filteredFindings,
            summary: {
                ...analysis.summary,
                criticalIssues: filteredFindings.filter(f => f.severity === 'critical').length,
                highIssues: filteredFindings.filter(f => f.severity === 'high').length,
                mediumIssues: filteredFindings.filter(f => f.severity === 'medium').length,
                lowIssues: filteredFindings.filter(f => f.severity === 'low').length,
                secretsFound: filteredFindings.filter(f => f.category === 'secrets').length,
                vulnerabilitiesFound: filteredFindings.filter(f => f.category === 'vulnerabilities').length
            }
        };
        
        switch (command) {
            case '--json':
                console.log(JSON.stringify(filteredAnalysis, null, 2));
                break;
                
            case '--summary':
                console.log(`Security Issues: ${filteredAnalysis.findings.length}`);
                console.log(`Critical: ${filteredAnalysis.summary.criticalIssues}, High: ${filteredAnalysis.summary.highIssues}`);
                if (filteredAnalysis.summary.criticalIssues > 0) process.exit(1);
                break;
                
            default:
                generateSecurityReport(filteredAnalysis);
                
                // Enforcement mode logic
                if (isEnforcementMode) {
                    const criticalSecrets = filteredFindings.filter(f => 
                        f.severity === 'critical' && f.category === 'secrets'
                    ).length;
                    
                    const criticalVulns = filteredFindings.filter(f => 
                        f.severity === 'critical' && f.category !== 'secrets'
                    ).length;
                    
                    if (criticalSecrets > 0 || criticalVulns > 0) {
                        console.log('\n🚫 SECURITY ENFORCEMENT: Critical issues detected');
                        console.log(`   Critical secrets: ${criticalSecrets}`);
                        console.log(`   Critical vulnerabilities: ${criticalVulns}`);
                        console.log('\n   These must be resolved before merge');
                        process.exit(2); // Exit code 2 = enforcement block
                    } else if (filteredAnalysis.summary.highIssues > 0) {
                        console.log('\n⚠️ Security warnings found (non-blocking in Step 1)');
                        console.log(`   High priority issues: ${filteredAnalysis.summary.highIssues}`);
                        console.log('   Address these during regular development');
                        process.exit(1); // Exit code 1 = warnings
                    } else {
                        console.log('\n✅ Security enforcement passed!');
                        process.exit(0); // Exit code 0 = success
                    }
                } else {
                    // Legacy warn-only mode
                    if (filteredAnalysis.summary.criticalIssues > 0) {
                        console.log('\n🚫 Exiting with error code due to critical security issues');
                        process.exit(1);
                    } else if (filteredAnalysis.summary.highIssues > 0) {
                        console.log('\n⚠️ Warning: High priority security issues found');
                        process.exit(0);
                    } else {
                        console.log('\n✅ Security analysis passed!');
                        process.exit(0);
                    }
                }
        }
        
    } catch (error) {
        console.error(`❌ Security analysis failed: ${error.message}`);
        process.exit(1);
    }
}

// Only run if this file is executed directly
if (require.main === module) {
    main();
}

module.exports = {
    runSecurityAnalysis,
    generateSecurityReport
};