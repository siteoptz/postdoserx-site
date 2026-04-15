# Code Review Suppressions

This file documents suppressed code review findings with justifications. Each suppression should be reviewed periodically and removed when no longer necessary.

## Format

```
### [Review Lane] - [Finding Pattern] - [Date]
**Finding:** Brief description of the review finding
**File:** Path to affected file or pattern
**Lane:** architecture|regression|style|performance|correctness
**Severity:** critical|high|medium|low
**Justification:** Explanation of why this is suppressed
**Review Date:** When this suppression should be reviewed again
**Approved By:** Name/role of person who approved suppression
```

## Active Suppressions

### Example Architecture - Legacy Pattern - 2026-04-15
**Finding:** High number of local imports
**File:** scripts/agent/*.js
**Lane:** architecture
**Severity:** medium
**Justification:** Agent scripts are designed as standalone tools with focused functionality
**Review Date:** 2026-10-15
**Approved By:** Technical Lead

## Historical Suppressions

### [Resolved suppressions moved here with resolution date]

## Suppression Guidelines

### When to Suppress
- False positives that cannot be fixed in the scanner
- Intentional architectural decisions with documented justification
- Legacy code that cannot be refactored in current scope
- Third-party code or generated code that cannot be modified
- Test code with acceptable technical debt

### Required Information
- Clear justification for why the finding is acceptable
- Risk assessment and mitigation measures if applicable
- Regular review schedule based on severity
- Approval from appropriate stakeholder

### Review Process
1. **Monthly Review**: All suppressions reviewed monthly
2. **Severity-Based Frequency**:
   - Critical: Weekly review
   - High: Bi-weekly review
   - Medium: Monthly review
   - Low: Quarterly review

### Approval Requirements
- **Critical/High**: Technical Lead + Architect approval required
- **Medium**: Technical Lead approval required  
- **Low**: Senior Developer approval sufficient

## Enforcement Rules

### Critical Issues
- **Architecture**: System design flaws, security anti-patterns, major coupling issues
- **Regression**: Breaking API changes, major compatibility issues, data loss risks

### High Issues  
- **Architecture**: Poor separation of concerns, significant maintainability issues
- **Regression**: Minor breaking changes, deprecation without migration path

### Medium/Low Issues
- **Architecture**: Style preferences, subjective design choices
- **Regression**: Documentation updates, non-breaking enhancements

## Suppression Syntax

To suppress a finding, add an entry following this pattern:

```markdown
### Architecture - [Brief Description] - [YYYY-MM-DD]
**Finding:** [Exact text from review finding]
**File:** [File path or pattern]
**Lane:** architecture
**Severity:** [critical|high|medium|low]
**Justification:** [Detailed explanation]
**Review Date:** [Next review date]
**Approved By:** [Name and role]
```

## Notes

- Suppressions are not permanent - they should be removed when possible
- Regular architecture reviews should challenge all suppressions
- New suppressions require stronger justification than renewals
- Consider refactoring alternatives before suppressing architectural issues
- Document any workarounds or mitigation strategies