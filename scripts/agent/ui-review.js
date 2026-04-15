#!/usr/bin/env node

/**
 * Frontend Design Quality Review
 * 
 * Reviews frontend code for design consistency, accessibility, and production quality
 * Part of the agent stack frontend design enforcement system
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Brand design tokens for validation
const BRAND_COLORS = {
    primary: '#2563eb',
    secondary: '#7c3aed', 
    success: '#059669',
    warning: '#d97706',
    error: '#dc2626',
    neutral: '#6b7280'
};

// Common generic AI patterns to avoid
const GENERIC_PATTERNS = [
    // Generic gradients
    { pattern: /#007bff.*#6610f2/, name: 'Generic blue gradient', severity: 'medium' },
    { pattern: /linear-gradient\(45deg,\s*#[0-9a-fA-F]{6},\s*#[0-9a-fA-F]{6}\)/, name: 'Generic diagonal gradient', severity: 'low' },
    
    // Generic shadows
    { pattern: /box-shadow:\s*0\s+4px\s+6px\s+rgba\(0,\s*0,\s*0,\s*0\.1\)/, name: 'Generic card shadow', severity: 'low' },
    { pattern: /drop-shadow\(0\s+4px\s+6px\s+rgba\(0,\s*0,\s*0,\s*0\.1\)\)/, name: 'Generic drop shadow', severity: 'low' },
    
    // Generic transitions
    { pattern: /transition:\s*all\s+0\.3s\s+ease/, name: 'Generic transition timing', severity: 'low' },
    
    // Generic spacing (all 8px multiples)
    { pattern: /(margin|padding):\s*(8|16|24|32|40|48)px/, name: 'Generic 8px spacing system', severity: 'low' }
];

// Accessibility patterns to check
const ACCESSIBILITY_PATTERNS = [
    // Missing alt text
    { pattern: /<img[^>]*(?!.*alt=).*>/, name: 'Image missing alt text', severity: 'high', category: 'accessibility' },
    
    // Missing form labels
    { pattern: /<input[^>]*(?!.*aria-label)(?!.*aria-labelledby)(?![^>]*id="[^"]*").*>/, name: 'Input missing label', severity: 'high', category: 'accessibility' },
    
    // Missing focus states
    { pattern: /:hover\s*{[^}]*}(?!\s*:focus)/, name: 'Hover without focus state', severity: 'medium', category: 'accessibility' },
    
    // Poor color contrast (basic detection)
    { pattern: /color:\s*#[fF]{3,6}.*background.*#[0-3]{3,6}/, name: 'Potential poor contrast', severity: 'medium', category: 'accessibility' }
];

// Performance anti-patterns
const PERFORMANCE_PATTERNS = [
    // Large inline styles
    { pattern: /style="[^"]{200,}"/, name: 'Large inline style block', severity: 'medium', category: 'performance' },
    
    // Missing lazy loading
    { pattern: /<img[^>]*(?!.*loading=).*>/, name: 'Image without lazy loading', severity: 'low', category: 'performance' },
    
    // Blocking scripts
    { pattern: /<script[^>]*src=[^>]*(?!.*async)(?!.*defer).*>/, name: 'Blocking script tag', severity: 'medium', category: 'performance' }
];

// Main frontend design analysis function
function runFrontendDesignAnalysis() {
    console.log('🎨 Starting Frontend Design Quality Review...\n');
    
    const findings = [];
    const summary = {
        designIssues: 0,
        accessibilityIssues: 0,
        performanceIssues: 0,
        genericPatterns: 0,
        criticalIssues: 0,
        highIssues: 0,
        mediumIssues: 0,
        lowIssues: 0
    };
    
    // 1. HTML analysis
    console.log('📄 Analyzing HTML structure and semantics...');
    const htmlFindings = analyzeHTML();
    findings.push(...htmlFindings);
    
    // 2. CSS analysis  
    console.log('🎨 Analyzing CSS design patterns...');
    const cssFindings = analyzeCSS();
    findings.push(...cssFindings);
    
    // 3. Accessibility analysis
    console.log('♿ Analyzing accessibility compliance...');
    const a11yFindings = analyzeAccessibility();
    findings.push(...a11yFindings);
    
    // 4. Design consistency analysis
    console.log('🎯 Analyzing design token consistency...');
    const designFindings = analyzeDesignConsistency();
    findings.push(...designFindings);
    
    // 5. Mobile responsiveness
    console.log('📱 Analyzing mobile responsiveness...');
    const mobileFindings = analyzeMobileDesign();
    findings.push(...mobileFindings);
    
    // Categorize findings
    findings.forEach(finding => {
        summary[`${finding.severity}Issues`]++;
        
        switch (finding.category) {
            case 'accessibility':
                summary.accessibilityIssues++;
                break;
            case 'performance':
                summary.performanceIssues++;
                break;
            case 'design':
                summary.designIssues++;
                break;
            case 'generic':
                summary.genericPatterns++;
                break;
        }
    });
    
    return {
        timestamp: new Date().toISOString(),
        summary,
        findings,
        recommendations: generateDesignRecommendations(summary, findings)
    };
}

// Analyze HTML structure and semantics
function analyzeHTML() {
    const findings = [];
    
    try {
        const htmlFiles = execSync(
            'find . -name "*.html" -not -path "./node_modules/*"',
            { encoding: 'utf8' }
        ).split('\n').filter(f => f.trim());
        
        for (const file of htmlFiles) {
            if (!fs.existsSync(file)) continue;
            
            const content = fs.readFileSync(file, 'utf8');
            const lines = content.split('\n');
            
            // Check semantic HTML usage
            const semanticTags = ['header', 'nav', 'main', 'section', 'article', 'aside', 'footer'];
            const hasSemanticTags = semanticTags.some(tag => content.includes(`<${tag}`));
            const divCount = (content.match(/<div/g) || []).length;
            
            if (!hasSemanticTags && divCount > 5) {
                findings.push({
                    type: 'html',
                    severity: 'medium',
                    category: 'design',
                    file: file,
                    line: 'structure',
                    finding: `High div usage (${divCount}) without semantic HTML5 elements`,
                    recommendation: 'Use semantic HTML5 elements (header, nav, main, section, article, footer) for better structure and accessibility',
                    evidence: `${divCount} div elements, 0 semantic elements`
                });
            }
            
            // Check heading hierarchy
            const headings = content.match(/<h[1-6][^>]*>/gi) || [];
            if (headings.length > 0) {
                const hasH1 = content.includes('<h1');
                const hasH2 = content.includes('<h2');
                
                if (hasH2 && !hasH1) {
                    findings.push({
                        type: 'html',
                        severity: 'medium',
                        category: 'accessibility',
                        file: file,
                        line: 'heading structure',
                        finding: 'h2 elements without h1 (breaks heading hierarchy)',
                        recommendation: 'Ensure proper heading hierarchy starting with h1',
                        evidence: 'h2 found without h1'
                    });
                }
            }
            
            // Check for accessibility attributes
            ACCESSIBILITY_PATTERNS.forEach(pattern => {
                const matches = content.match(new RegExp(pattern.pattern, 'gi'));
                if (matches) {
                    matches.forEach(match => {
                        const lineNumber = findLineNumber(lines, match);
                        findings.push({
                            type: 'html',
                            severity: pattern.severity,
                            category: pattern.category,
                            file: file,
                            line: lineNumber,
                            finding: pattern.name,
                            recommendation: getAccessibilityRecommendation(pattern.name),
                            evidence: match.substring(0, 100) + '...'
                        });
                    });
                }
            });
            
            // Check for meta tags and basic SEO
            if (!content.includes('<meta name="viewport"')) {
                findings.push({
                    type: 'html',
                    severity: 'high',
                    category: 'design',
                    file: file,
                    line: 'head',
                    finding: 'Missing responsive viewport meta tag',
                    recommendation: 'Add <meta name="viewport" content="width=device-width, initial-scale=1"> for mobile responsiveness',
                    evidence: 'No viewport meta tag found'
                });
            }
        }
        
    } catch (error) {
        console.warn(`Warning: HTML analysis failed: ${error.message}`);
    }
    
    return findings;
}

// Analyze CSS design patterns
function analyzeCSS() {
    const findings = [];
    
    try {
        const cssFiles = execSync(
            'find . -name "*.css" -not -path "./node_modules/*"',
            { encoding: 'utf8' }
        ).split('\n').filter(f => f.trim());
        
        // Also check for inline styles in HTML
        const htmlFiles = execSync(
            'find . -name "*.html" -not -path "./node_modules/*"',
            { encoding: 'utf8' }
        ).split('\n').filter(f => f.trim());
        
        const allFiles = [...cssFiles, ...htmlFiles];
        
        for (const file of allFiles) {
            if (!fs.existsSync(file)) continue;
            
            const content = fs.readFileSync(file, 'utf8');
            const lines = content.split('\n');
            
            // Check for generic AI patterns
            GENERIC_PATTERNS.forEach(pattern => {
                const matches = content.match(new RegExp(pattern.pattern, 'gi'));
                if (matches) {
                    matches.forEach(match => {
                        const lineNumber = findLineNumber(lines, match);
                        findings.push({
                            type: 'css',
                            severity: pattern.severity,
                            category: 'generic',
                            file: file,
                            line: lineNumber,
                            finding: pattern.name,
                            recommendation: 'Replace with brand-specific styling that reflects your unique design system',
                            evidence: match
                        });
                    });
                }
            });
            
            // Check for performance anti-patterns
            PERFORMANCE_PATTERNS.forEach(pattern => {
                const matches = content.match(new RegExp(pattern.pattern, 'gi'));
                if (matches) {
                    matches.forEach(match => {
                        const lineNumber = findLineNumber(lines, match);
                        findings.push({
                            type: 'css',
                            severity: pattern.severity,
                            category: pattern.category,
                            file: file,
                            line: lineNumber,
                            finding: pattern.name,
                            recommendation: getPerformanceRecommendation(pattern.name),
                            evidence: match.substring(0, 100) + '...'
                        });
                    });
                }
            });
            
            // CSS-specific analysis for CSS files only
            if (file.endsWith('.css')) {
                // Check for overly specific selectors
                const complexSelectors = content.match(/[^{}]*\s+[^{}]*\s+[^{}]*\s*{/g) || [];
                if (complexSelectors.length > 10) {
                    findings.push({
                        type: 'css',
                        severity: 'low',
                        category: 'performance',
                        file: file,
                        line: 'selectors',
                        finding: `${complexSelectors.length} complex CSS selectors found`,
                        recommendation: 'Use more specific class names to reduce selector complexity',
                        evidence: `${complexSelectors.length} complex selectors`
                    });
                }
                
                // Check for !important usage
                const importantCount = (content.match(/!important/gi) || []).length;
                if (importantCount > 5) {
                    findings.push({
                        type: 'css',
                        severity: 'medium',
                        category: 'design',
                        file: file,
                        line: 'multiple locations',
                        finding: `Excessive use of !important (${importantCount} instances)`,
                        recommendation: 'Refactor CSS to reduce !important usage by improving specificity',
                        evidence: `${importantCount} !important declarations`
                    });
                }
            }
        }
        
    } catch (error) {
        console.warn(`Warning: CSS analysis failed: ${error.message}`);
    }
    
    return findings;
}

// Analyze accessibility compliance
function analyzeAccessibility() {
    const findings = [];
    
    try {
        const htmlFiles = execSync(
            'find . -name "*.html" -not -path "./node_modules/*"',
            { encoding: 'utf8' }
        ).split('\n').filter(f => f.trim());
        
        for (const file of htmlFiles) {
            if (!fs.existsSync(file)) continue;
            
            const content = fs.readFileSync(file, 'utf8');
            
            // Check for missing lang attribute
            if (!content.includes('lang=')) {
                findings.push({
                    type: 'accessibility',
                    severity: 'medium',
                    category: 'accessibility',
                    file: file,
                    line: 'html tag',
                    finding: 'Missing lang attribute in html tag',
                    recommendation: 'Add lang="en" (or appropriate language) to html tag for screen readers',
                    evidence: 'No lang attribute found'
                });
            }
            
            // Check form accessibility
            const forms = content.match(/<form[^>]*>/gi) || [];
            if (forms.length > 0) {
                // Check for form labels
                const inputs = content.match(/<input[^>]*>/gi) || [];
                const labels = content.match(/<label[^>]*>/gi) || [];
                
                if (inputs.length > labels.length) {
                    findings.push({
                        type: 'accessibility',
                        severity: 'high',
                        category: 'accessibility',
                        file: file,
                        line: 'form elements',
                        finding: `${inputs.length} inputs but only ${labels.length} labels`,
                        recommendation: 'Ensure all form inputs have associated labels or aria-label attributes',
                        evidence: `${inputs.length - labels.length} unlabeled inputs`
                    });
                }
                
                // Check for fieldsets in complex forms
                const fieldsets = content.match(/<fieldset[^>]*>/gi) || [];
                if (inputs.length > 5 && fieldsets.length === 0) {
                    findings.push({
                        type: 'accessibility',
                        severity: 'low',
                        category: 'accessibility',
                        file: file,
                        line: 'form structure',
                        finding: 'Complex form without fieldset grouping',
                        recommendation: 'Use fieldset and legend elements to group related form fields',
                        evidence: `${inputs.length} inputs without fieldset grouping`
                    });
                }
            }
            
            // Check button accessibility
            const buttons = content.match(/<button[^>]*>.*?<\/button>/gis) || [];
            buttons.forEach((button, index) => {
                if (!button.match(/aria-label|title/) && button.match(/<button[^>]*>[\s\r\n]*</) ) {
                    findings.push({
                        type: 'accessibility',
                        severity: 'medium',
                        category: 'accessibility',
                        file: file,
                        line: 'button elements',
                        finding: 'Button with no accessible text content',
                        recommendation: 'Add aria-label or visible text content for screen readers',
                        evidence: 'Button with only icon or no text'
                    });
                }
            });
        }
        
    } catch (error) {
        console.warn(`Warning: Accessibility analysis failed: ${error.message}`);
    }
    
    return findings;
}

// Analyze design token consistency
function analyzeDesignConsistency() {
    const findings = [];
    
    try {
        const styleFiles = execSync(
            'find . \\( -name "*.css" -o -name "*.html" \\) -not -path "./node_modules/*"',
            { encoding: 'utf8' }
        ).split('\n').filter(f => f.trim());
        
        for (const file of styleFiles) {
            if (!fs.existsSync(file)) continue;
            
            const content = fs.readFileSync(file, 'utf8');
            
            // Extract color values
            const colorMatches = content.match(/#[0-9a-fA-F]{3,6}/g) || [];
            const uniqueColors = [...new Set(colorMatches)];
            
            // Check for too many unique colors (might indicate inconsistent design system)
            if (uniqueColors.length > 15) {
                findings.push({
                    type: 'design-consistency',
                    severity: 'medium',
                    category: 'design',
                    file: file,
                    line: 'color usage',
                    finding: `Large color palette (${uniqueColors.length} unique colors)`,
                    recommendation: 'Consolidate color usage to match brand design tokens',
                    evidence: `${uniqueColors.length} different hex colors found`
                });
            }
            
            // Check if brand colors are being used
            const brandColorsUsed = Object.values(BRAND_COLORS).filter(color => 
                content.toLowerCase().includes(color.toLowerCase())
            ).length;
            
            if (colorMatches.length > 5 && brandColorsUsed === 0) {
                findings.push({
                    type: 'design-consistency',
                    severity: 'medium',
                    category: 'design',
                    file: file,
                    line: 'brand colors',
                    finding: 'No brand colors detected in file with colors',
                    recommendation: 'Use established brand color tokens for consistency',
                    evidence: `${colorMatches.length} colors used, 0 brand colors`
                });
            }
            
            // Check for font consistency
            const fontFamilies = content.match(/font-family:\s*[^;]+/gi) || [];
            const uniqueFonts = [...new Set(fontFamilies)];
            
            if (uniqueFonts.length > 3) {
                findings.push({
                    type: 'design-consistency',
                    severity: 'low',
                    category: 'design',
                    file: file,
                    line: 'typography',
                    finding: `Multiple font families (${uniqueFonts.length}) used`,
                    recommendation: 'Limit to 2-3 font families maximum for consistency',
                    evidence: `${uniqueFonts.length} different font families`
                });
            }
        }
        
    } catch (error) {
        console.warn(`Warning: Design consistency analysis failed: ${error.message}`);
    }
    
    return findings;
}

// Analyze mobile responsiveness
function analyzeMobileDesign() {
    const findings = [];
    
    try {
        const styleFiles = execSync(
            'find . \\( -name "*.css" -o -name "*.html" \\) -not -path "./node_modules/*"',
            { encoding: 'utf8' }
        ).split('\n').filter(f => f.trim());
        
        for (const file of styleFiles) {
            if (!fs.existsSync(file)) continue;
            
            const content = fs.readFileSync(file, 'utf8');
            
            // Check for mobile-first approach
            const mediaQueries = content.match(/@media[^{]+{/gi) || [];
            const mobileFirstQueries = mediaQueries.filter(mq => 
                mq.includes('min-width')
            ).length;
            const desktopFirstQueries = mediaQueries.filter(mq => 
                mq.includes('max-width')
            ).length;
            
            if (mediaQueries.length > 0 && mobileFirstQueries < desktopFirstQueries) {
                findings.push({
                    type: 'mobile-design',
                    severity: 'low',
                    category: 'design',
                    file: file,
                    line: 'media queries',
                    finding: 'Desktop-first responsive design detected',
                    recommendation: 'Consider mobile-first approach using min-width media queries',
                    evidence: `${desktopFirstQueries} max-width vs ${mobileFirstQueries} min-width queries`
                });
            }
            
            // Check for touch-friendly sizing
            if (content.includes('button') || content.includes('btn')) {
                const hasMinHeight = content.includes('min-height') || content.includes('height');
                if (!hasMinHeight) {
                    findings.push({
                        type: 'mobile-design',
                        severity: 'medium',
                        category: 'accessibility',
                        file: file,
                        line: 'interactive elements',
                        finding: 'Interactive elements may not meet touch target size requirements',
                        recommendation: 'Ensure buttons and clickable elements are at least 44px in height/width on mobile',
                        evidence: 'Interactive elements without explicit sizing'
                    });
                }
            }
            
            // Check for horizontal scrolling issues
            const hasFixedWidth = content.match(/width:\s*[0-9]+px/gi) || [];
            if (hasFixedWidth.length > 3 && mediaQueries.length === 0) {
                findings.push({
                    type: 'mobile-design',
                    severity: 'medium',
                    category: 'design',
                    file: file,
                    line: 'fixed widths',
                    finding: `${hasFixedWidth.length} fixed width declarations without responsive breakpoints`,
                    recommendation: 'Use flexible units (%, rem, vw) or add responsive breakpoints for fixed widths',
                    evidence: `${hasFixedWidth.length} fixed pixel widths`
                });
            }
        }
        
    } catch (error) {
        console.warn(`Warning: Mobile design analysis failed: ${error.message}`);
    }
    
    return findings;
}

// Helper functions
function findLineNumber(lines, match) {
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes(match.substring(0, 50))) {
            return i + 1;
        }
    }
    return 'unknown';
}

function getAccessibilityRecommendation(patternName) {
    const recommendations = {
        'Image missing alt text': 'Add descriptive alt attributes to all images for screen readers',
        'Input missing label': 'Add proper labels or aria-label attributes to form inputs',
        'Hover without focus state': 'Add :focus styles whenever you have :hover styles for keyboard accessibility',
        'Potential poor contrast': 'Ensure color contrast meets WCAG AA standards (4.5:1 ratio minimum)'
    };
    
    return recommendations[patternName] || 'Review accessibility guidelines and fix this issue';
}

function getPerformanceRecommendation(patternName) {
    const recommendations = {
        'Large inline style block': 'Move large inline styles to external CSS files for better caching',
        'Image without lazy loading': 'Add loading="lazy" to images below the fold for better performance',
        'Blocking script tag': 'Add async or defer attributes to non-critical scripts'
    };
    
    return recommendations[patternName] || 'Optimize for better performance';
}

function generateDesignRecommendations(summary, findings) {
    const recommendations = [];
    
    if (summary.criticalIssues > 0 || summary.highIssues > 0) {
        recommendations.push({
            priority: 'critical',
            title: '🚨 CRITICAL DESIGN ISSUES',
            description: `${summary.criticalIssues + summary.highIssues} critical/high priority design issues found`,
            actions: [
                'Fix accessibility issues immediately',
                'Ensure all interactive elements are properly labeled',
                'Test with keyboard navigation',
                'Verify color contrast meets WCAG standards',
                'Add missing responsive design elements'
            ]
        });
    }
    
    if (summary.accessibilityIssues > 0) {
        recommendations.push({
            priority: 'high',
            title: '♿ ACCESSIBILITY COMPLIANCE',
            description: `${summary.accessibilityIssues} accessibility issues need attention`,
            actions: [
                'Add proper semantic HTML structure',
                'Ensure all forms have proper labels',
                'Add focus states to interactive elements',
                'Test with screen readers',
                'Verify keyboard navigation works'
            ]
        });
    }
    
    if (summary.genericPatterns > 0) {
        recommendations.push({
            priority: 'medium',
            title: '🎨 BRAND CONSISTENCY',
            description: `${summary.genericPatterns} generic AI patterns detected`,
            actions: [
                'Replace generic gradients with brand-specific colors',
                'Update shadows to match design system',
                'Customize transitions and animations',
                'Use brand color tokens consistently',
                'Replace generic CTAs with specific, actionable text'
            ]
        });
    }
    
    if (summary.performanceIssues > 0) {
        recommendations.push({
            priority: 'medium',
            title: '⚡ PERFORMANCE OPTIMIZATION',
            description: `${summary.performanceIssues} performance issues identified`,
            actions: [
                'Optimize images with proper sizing and lazy loading',
                'Move inline styles to external CSS files',
                'Add async/defer to non-critical scripts',
                'Implement critical CSS patterns',
                'Optimize for mobile loading speed'
            ]
        });
    }
    
    // Best practices
    recommendations.push({
        priority: 'low',
        title: '✨ DESIGN EXCELLENCE',
        description: 'Continue improving design quality and user experience',
        actions: [
            'Implement comprehensive design system',
            'Add micro-interactions and feedback states',
            'Ensure mobile-first responsive design',
            'Regular user testing and feedback collection',
            'Maintain consistent visual hierarchy'
        ]
    });
    
    return recommendations;
}

// Generate UI review report
function generateUIReport(analysis) {
    console.log('\n🎨 FRONTEND DESIGN QUALITY REPORT');
    console.log('=' .repeat(60));
    console.log(`Generated: ${new Date(analysis.timestamp).toLocaleString()}`);
    console.log('');
    
    // Summary
    console.log('📊 DESIGN QUALITY SUMMARY');
    console.log('-' .repeat(30));
    console.log(`Total Issues: ${analysis.findings.length}`);
    console.log(`🚨 Critical: ${analysis.summary.criticalIssues}`);
    console.log(`⚠️  High: ${analysis.summary.highIssues}`);
    console.log(`💡 Medium: ${analysis.summary.mediumIssues}`);
    console.log(`ℹ️  Low: ${analysis.summary.lowIssues}`);
    console.log('');
    console.log(`♿ Accessibility: ${analysis.summary.accessibilityIssues}`);
    console.log(`🎨 Design Issues: ${analysis.summary.designIssues}`);
    console.log(`🤖 Generic Patterns: ${analysis.summary.genericPatterns}`);
    console.log(`⚡ Performance: ${analysis.summary.performanceIssues}`);
    console.log('');
    
    // High priority issues
    const highPriority = analysis.findings.filter(f => 
        f.severity === 'critical' || f.severity === 'high'
    );
    
    if (highPriority.length > 0) {
        console.log('🚨 HIGH PRIORITY ISSUES');
        console.log('-' .repeat(30));
        
        highPriority.slice(0, 8).forEach((finding, index) => {
            const icon = finding.severity === 'critical' ? '🚨' : '⚠️';
            console.log(`${icon} ${index + 1}. ${finding.finding}`);
            console.log(`   File: ${finding.file}:${finding.line}`);
            console.log(`   Type: ${finding.category}`);
            console.log(`   Fix: ${finding.recommendation}`);
            console.log('');
        });
        
        if (highPriority.length > 8) {
            console.log(`   ... and ${highPriority.length - 8} more high priority issues\n`);
        }
    }
    
    // Recommendations
    console.log('🎯 DESIGN RECOMMENDATIONS');
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
    console.log('🎨 DESIGN QUALITY STATUS');
    console.log('-' .repeat(30));
    
    if (analysis.summary.criticalIssues > 0) {
        console.log('❌ DESIGN BLOCKED - Critical issues must be resolved');
        console.log('   User experience is compromised');
    } else if (analysis.summary.highIssues > 0) {
        console.log('⚠️ DESIGN WARNING - High priority issues found');
        console.log('   Address accessibility and UX issues');
    } else if (analysis.findings.length > 0) {
        console.log('💡 DESIGN IMPROVEMENTS - Minor issues found');
        console.log('   Polish design during regular development');
    } else {
        console.log('✅ DESIGN APPROVED - Excellent design quality');
        console.log('   Ready for production deployment');
    }
    
    return analysis;
}

// Main execution
function main() {
    const command = process.argv[2];
    
    try {
        const analysis = runFrontendDesignAnalysis();
        
        switch (command) {
            case '--json':
                console.log(JSON.stringify(analysis, null, 2));
                break;
                
            case '--summary':
                console.log(`Design Issues: ${analysis.findings.length}`);
                console.log(`Critical: ${analysis.summary.criticalIssues}, High: ${analysis.summary.highIssues}`);
                console.log(`Accessibility: ${analysis.summary.accessibilityIssues}, Generic Patterns: ${analysis.summary.genericPatterns}`);
                break;
                
            default:
                generateUIReport(analysis);
                
                // Exit with error code if critical issues found
                if (analysis.summary.criticalIssues > 0) {
                    console.log('\n🚫 Exiting with error code due to critical design issues');
                    process.exit(1);
                } else if (analysis.summary.highIssues > 0) {
                    console.log('\n⚠️ Warning: High priority design issues found');
                    process.exit(0); // Don't block on high issues in warn-only mode
                } else {
                    console.log('\n✅ Design quality review passed!');
                    process.exit(0);
                }
        }
        
    } catch (error) {
        console.error(`❌ Frontend design analysis failed: ${error.message}`);
        process.exit(1);
    }
}

// Only run if this file is executed directly
if (require.main === module) {
    main();
}

module.exports = {
    runFrontendDesignAnalysis,
    generateUIReport
};