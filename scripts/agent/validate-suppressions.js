#!/usr/bin/env node

/**
 * Suppression Schema Validator
 * 
 * Validates suppression entries against JSON schema
 */

const fs = require('fs');
const path = require('path');

// Simple JSON Schema validator (basic implementation)
function validateSuppression(suppression, schema) {
    const errors = [];
    
    // Check required fields
    for (const field of schema.required || []) {
        if (!suppression[field] || suppression[field].trim() === '') {
            errors.push(`Missing required field: ${field}`);
        }
    }
    
    // Check field types and constraints
    for (const [key, value] of Object.entries(suppression)) {
        const fieldSchema = schema.properties[key];
        if (!fieldSchema) {
            if (!schema.additionalProperties) {
                errors.push(`Unexpected field: ${key}`);
            }
            continue;
        }
        
        // Type checking
        if (fieldSchema.type === 'string' && typeof value !== 'string') {
            errors.push(`Field ${key} must be a string`);
            continue;
        }
        
        // String constraints
        if (fieldSchema.type === 'string') {
            if (fieldSchema.minLength && value.length < fieldSchema.minLength) {
                errors.push(`Field ${key} must be at least ${fieldSchema.minLength} characters`);
            }
            
            if (fieldSchema.pattern && !new RegExp(fieldSchema.pattern).test(value)) {
                errors.push(`Field ${key} does not match required pattern: ${fieldSchema.pattern}`);
            }
            
            if (fieldSchema.enum && !fieldSchema.enum.includes(value)) {
                errors.push(`Field ${key} must be one of: ${fieldSchema.enum.join(', ')}`);
            }
            
            if (fieldSchema.format === 'date' && isNaN(Date.parse(value))) {
                errors.push(`Field ${key} must be a valid date`);
            }
        }
    }
    
    // Check conditional requirements (allOf)
    if (schema.allOf) {
        for (const condition of schema.allOf) {
            if (condition.if && condition.then) {
                const ifCondition = condition.if;
                let conditionMet = true;
                
                // Simple condition checking
                if (ifCondition.properties) {
                    for (const [prop, propCondition] of Object.entries(ifCondition.properties)) {
                        if (propCondition.const && suppression[prop] !== propCondition.const) {
                            conditionMet = false;
                            break;
                        }
                    }
                }
                
                if (conditionMet && condition.then.required) {
                    for (const field of condition.then.required) {
                        if (!suppression[field] || suppression[field].trim() === '') {
                            errors.push(`Field ${field} is required when ${JSON.stringify(ifCondition)}`);
                        }
                    }
                }
            }
        }
    }
    
    return errors;
}

// Load and validate all suppressions
function validateSuppressionFile(filePath, schema) {
    if (!fs.existsSync(filePath)) {
        return { valid: true, errors: [], suppressions: [] };
    }
    
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        const suppressions = [];
        const allErrors = [];
        
        // Parse structured suppressions using a simpler approach
        const suppressionBlocks = [];
        const lines = content.split('\n');
        let currentBlock = null;
        
        for (const line of lines) {
            const headerMatch = line.match(/^## ((SEC|REV|UI)-\d+)/);
            if (headerMatch) {
                if (currentBlock) {
                    suppressionBlocks.push(currentBlock);
                }
                currentBlock = {
                    id: headerMatch[1],
                    header: line,
                    lines: []
                };
            } else if (currentBlock) {
                // Stop collecting lines when we hit another ## header (non-suppression)
                if (line.startsWith('## ')) {
                    suppressionBlocks.push(currentBlock);
                    currentBlock = null;
                } else {
                    currentBlock.lines.push(line);
                }
            }
        }
        
        if (currentBlock) {
            suppressionBlocks.push(currentBlock);
        }
        
        suppressionBlocks.forEach(block => {
            const suppression_id = block.id;
            
            // Debug output
            if (process.env.DEBUG_SUPPRESSIONS) {
                console.log(`DEBUG: Block ID:`, suppression_id);
                console.log(`DEBUG: Block lines:`, block.lines.slice(0, 10));
            }
            
            // Parse key-value lines
            const fields = { id: suppression_id };
            block.lines.forEach(line => {
                const kvMatch = line.match(/^- ([^:]+): (.+)$/);
                if (kvMatch) {
                    const [, key, value] = kvMatch;
                    fields[key.trim()] = value.trim();
                }
            });
            
            // Debug output
            if (process.env.DEBUG_SUPPRESSIONS) {
                console.log(`DEBUG: Parsed fields for ${suppression_id}:`, fields);
            }
            
            // Map field names to schema
            const mappedFields = {
                id: fields.id,
                type: fields.type || inferTypeFromId(suppression_id),
                status: fields.status,
                severity: fields.severity,
                rule_id: fields.rule_id,
                scope: fields.scope,
                introduced_on: fields.introduced_on,
                expiry: fields.expiry,
                owner: fields.owner,
                approver: fields.approver,
                rationale: fields.justification || fields.rationale, // Support both names
                issue_link: fields.issue_link,
                last_reviewed: fields.last_reviewed,
                tool: fields.tool,
                lane: fields.lane,
                category: fields.category,
                impacted_flows: fields.impacted_flows,
                mitigation: fields.mitigation,
                remediation_plan: fields.remediation_plan,
                removal_plan: fields.removal_plan,
                safe_guardrails: fields.safe_guardrails,
                user_risk: fields.user_risk,
                verification_after_fix: fields.verification_after_fix
            };
            
            // Remove undefined fields
            Object.keys(mappedFields).forEach(key => {
                if (mappedFields[key] === undefined) {
                    delete mappedFields[key];
                }
            });
            
            suppressions.push(mappedFields);
            
            // Validate against schema
            const errors = validateSuppression(mappedFields, schema);
            if (errors.length > 0) {
                allErrors.push({
                    id: suppression_id,
                    errors: errors
                });
            }
        });
        
        return {
            valid: allErrors.length === 0,
            errors: allErrors,
            suppressions: suppressions
        };
    } catch (error) {
        return {
            valid: false,
            errors: [{ id: 'PARSE_ERROR', errors: [error.message] }],
            suppressions: []
        };
    }
}

function inferTypeFromId(id) {
    if (id.startsWith('SEC-')) return 'security';
    if (id.startsWith('REV-')) return 'review';
    if (id.startsWith('UI-')) return 'ui';
    return 'unknown';
}

// CLI usage
function main() {
    const args = process.argv.slice(2);
    const command = args[0];
    
    // Load schema
    const schemaPath = path.join(process.cwd(), 'docs/agent-stack/suppression.schema.json');
    if (!fs.existsSync(schemaPath)) {
        console.error('❌ Schema not found:', schemaPath);
        process.exit(1);
    }
    
    const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
    
    switch (command) {
        case 'validate-all':
            validateAllSuppressions(schema);
            break;
            
        case 'validate':
            const file = args[1];
            if (!file) {
                console.error('Usage: node validate-suppressions.js validate <file>');
                process.exit(1);
            }
            validateSingleFile(file, schema);
            break;
            
        default:
            console.log('Suppression Schema Validator');
            console.log('Usage:');
            console.log('  node validate-suppressions.js validate-all');
            console.log('  node validate-suppressions.js validate <file>');
            break;
    }
}

function validateAllSuppressions(schema) {
    console.log('🔍 Validating all suppression files...\n');
    
    const files = [
        'docs/agent-stack/security-suppressions.md',
        'docs/agent-stack/review-suppressions.md',
        'docs/agent-stack/ui-suppressions.md'
    ];
    
    let totalErrors = 0;
    
    files.forEach(file => {
        const result = validateSuppressionFile(file, schema);
        
        console.log(`📋 ${file}:`);
        if (result.valid) {
            console.log(`✅ Valid (${result.suppressions.length} suppressions)`);
        } else {
            console.log(`❌ Invalid (${result.errors.length} issues)`);
            result.errors.forEach(error => {
                console.log(`   ${error.id}:`);
                error.errors.forEach(err => {
                    console.log(`     • ${err}`);
                });
            });
            totalErrors += result.errors.length;
        }
        console.log('');
    });
    
    if (totalErrors > 0) {
        console.log(`❌ Validation failed: ${totalErrors} total issues found`);
        process.exit(1);
    } else {
        console.log('✅ All suppressions valid');
    }
}

function validateSingleFile(file, schema) {
    const result = validateSuppressionFile(file, schema);
    
    if (result.valid) {
        console.log(`✅ ${file} is valid (${result.suppressions.length} suppressions)`);
    } else {
        console.log(`❌ ${file} has validation errors:`);
        result.errors.forEach(error => {
            console.log(`   ${error.id}:`);
            error.errors.forEach(err => {
                console.log(`     • ${err}`);
            });
        });
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

module.exports = {
    validateSuppression,
    validateSuppressionFile,
    inferTypeFromId
};