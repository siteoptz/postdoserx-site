# Security Suppressions

Use this file to track temporary security suppressions with explicit ownership and expiry.

## Rules
- Every suppression must include all required fields.
- `expiry` must be within 30 days unless explicitly approved as permanent.
- Expired suppressions must fail CI.
- Scope must be as narrow as possible (single file/rule when possible).

## Suppressions

<!--
Template (copy/paste per item):

## SEC-<id> - <short title>
- status: active | expired | removed
- tool: <scanner/tool name>
- rule_id: <rule identifier>
- severity: critical | high | medium | low
- scope: <file/path/glob>
- introduced_on: YYYY-MM-DD
- expiry: YYYY-MM-DD
- owner: <name or team>
- approver: <name>
- justification: <why temporary suppression is required>
- remediation_plan: <what will be done to remove suppression>
- issue_link: <ticket/url>
- last_reviewed: YYYY-MM-DD
-->

## SEC-0001 - Example placeholder (remove when real entries exist)
- type: security
- status: removed
- tool: example-scanner
- rule_id: EXAMPLE_RULE
- severity: low
- scope: api/example.js
- introduced_on: 2026-04-15
- expiry: 2026-04-30
- owner: engineering
- approver: tech-lead
- rationale: Placeholder only.
- remediation_plan: Remove before strict mode.
- issue_link: N/A
- last_reviewed: 2026-04-15

## Guidelines

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

## Expiry Enforcement

The security scanner will automatically check suppression expiry dates and fail CI if:
- Current date > expiry date
- Required review date has passed
- Suppression lacks required fields

## Notes

- Suppressions are not permanent - they should be removed when possible
- Regular security reviews should challenge all suppressions
- New suppressions require stronger justification than renewals
- Consider alternative solutions before suppressing findings