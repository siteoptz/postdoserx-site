# Security Suppressions

This file documents suppressed security findings with justifications. Each suppression should be reviewed periodically and removed when no longer necessary.

## Format

```
### [Finding ID or Pattern] - [Date]
**Finding:** Brief description of the security finding
**File:** Path to affected file
**Severity:** critical|high|medium|low
**Justification:** Explanation of why this is suppressed
**Review Date:** When this suppression should be reviewed again
**Approved By:** Name/role of person who approved suppression
```

## Active Suppressions

### Example HTTP URL in Documentation - 2026-04-15
**Finding:** HTTP URL found in README.md
**File:** README.md:45
**Severity:** low
**Justification:** This is a documentation example showing HTTP vs HTTPS comparison
**Review Date:** 2026-10-15
**Approved By:** Security Team

## Historical Suppressions

### [Resolved suppressions moved here with resolution date]

## Suppression Guidelines

### When to Suppress
- False positives that cannot be fixed in the scanner
- Intentional security decisions with documented justification
- Third-party code that cannot be modified
- Test/development code with contained risk

### Required Information
- Clear justification for why the finding is acceptable
- Risk assessment and mitigation measures
- Regular review schedule
- Approval from appropriate stakeholder

### Review Process
1. **Monthly Review**: All suppressions reviewed monthly
2. **Severity-Based Frequency**:
   - Critical: Weekly review
   - High: Bi-weekly review
   - Medium: Monthly review
   - Low: Quarterly review

### Approval Requirements
- **Critical/High**: Security team + Technical lead approval required
- **Medium**: Technical lead approval required
- **Low**: Developer team lead approval sufficient

## Notes

- Suppressions are not permanent - they should be removed when possible
- Regular security reviews should challenge all suppressions
- New suppressions require stronger justification than renewals
- Consider alternative solutions before suppressing findings