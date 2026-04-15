# Frontend Design Quality Suppressions

Use this file to track temporary UI/UX quality suppressions with explicit ownership and expiry.

## Rules
- Every suppression must include all required fields.
- `expiry` must be within 30 days unless explicitly approved as permanent.
- Expired suppressions must fail CI.
- Scope must be as narrow as possible (single file/element when possible).

## Suppressions

<!--
Template (copy/paste per item):

## UI-<id> - <short title>
- status: active | expired | removed
- tool: <scanner/tool name>
- rule_id: <rule identifier>
- severity: critical | high | medium | low
- scope: <file/path/selector>
- introduced_on: YYYY-MM-DD
- expiry: YYYY-MM-DD
- owner: <name or team>
- approver: <name>
- justification: <why temporary suppression is required>
- remediation_plan: <what will be done to remove suppression>
- issue_link: <ticket/url>
- last_reviewed: YYYY-MM-DD
-->

## UI-0001 - Example placeholder (remove when real entries exist)
- status: removed
- tool: ui-review
- rule_id: EXAMPLE_RULE
- severity: low
- scope: index.html
- introduced_on: 2026-04-15
- expiry: 2026-04-30
- owner: frontend-team
- approver: design-lead
- justification: Placeholder only.
- remediation_plan: Remove before strict mode.
- issue_link: N/A
- last_reviewed: 2026-04-15

## Guidelines

### When to Suppress
- Legacy design patterns that cannot be immediately updated
- Intentional design decisions that conflict with automated checks
- Third-party components that cannot be modified
- Temporary states during design system migration

### Required Information
- Clear justification for design exception
- Risk assessment for accessibility and UX impact
- Regular review schedule
- Approval from design owner

### Review Process
1. **Bi-weekly Review**: All UI suppressions reviewed bi-weekly
2. **Severity-Based Frequency**:
   - Critical: Daily review (should be extremely rare)
   - High: Weekly review
   - Medium: Bi-weekly review
   - Low: Monthly review

### Approval Requirements
- **Critical/High**: Design lead + Frontend lead approval required
- **Medium**: Design lead approval required
- **Low**: Senior frontend developer approval sufficient

## Expiry Enforcement

The UI reviewer will automatically check suppression expiry dates and fail CI if:
- Current date > expiry date
- Required review date has passed
- Suppression lacks required fields

## Notes

- UI suppressions should be rare and time-boxed
- Focus on accessibility issues which should almost never be suppressed
- Design preferences can be suppressed more liberally than functional issues
- Consider design system updates before suppressing patterns