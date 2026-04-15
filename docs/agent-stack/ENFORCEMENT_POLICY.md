# Agent Enforcement Policy

This policy defines when agent checks are advisory vs blocking for `postdoserx-site`.

## Scope

Applies to:
- Pull request CI checks
- Local pre-push checks
- Production release readiness gates

Does not block:
- Local `npm run dev`
- Docs-only trivial changes (unless they alter security/runbooks)

## Repository Risk Profile

Because this repo contains:
- Auth/session logic in `api/auth/*`
- Subscription/billing logic in `api/*stripe*`, `api/*subscription*`
- Login and post-checkout flows in `login.html` and `success.html`

The enforcement bar is stricter for those paths.

## Gate Families

### 1) Security Guidance

**Blocking in CI**
- Secrets detection: block on any verified secret.
- Vulnerability scan: block on `critical`.
- Dependency policy: block on malicious package indicators.

**Advisory in CI**
- Vulnerabilities `high|medium|low` (initially advisory).
- Best-practice hardening recommendations.

**Blocking in pre-push**
- Verified secrets only.
- `critical` vulnerabilities if scanner supports fast local mode.

**Owner**
- Security owner or engineering lead.

**Suppression**
- File: `docs/agent-stack/security-suppressions.md`
- Required fields:
  - id
  - rule/tool
  - scope/path
  - justification
  - expiry date
  - approver

---

### 2) Code Review (5 lanes)

Lanes:
1. correctness/bugs
2. architecture/design
3. style/rules
4. performance/reliability
5. regression/history

**Blocking in CI**
- Correctness lane: block on `high|critical`.
- Architecture lane: block on `critical` only.
- Regression lane: block on `critical` only.

**Advisory in CI**
- Style/rules lane: all severities advisory.
- Performance lane: advisory until baseline established, then block on `critical` only.

**Owner**
- Tech lead.

**Suppression**
- File: `docs/agent-stack/review-suppressions.md`
- Same required fields as security suppressions.

---

### 3) Frontend Design Quality

**Blocking in CI**
- Critical accessibility failures:
  - keyboard trap
  - missing focus for actionable controls
  - severe contrast failure on primary user journey elements
- Broken semantic structure that prevents core flow completion.

**Advisory in CI**
- Visual polish and subjective design preferences.
- Non-critical spacing/typography/style recommendations.

**Protected paths**
- `index.html`
- `login.html`
- `success.html`
- `assets/styles.css`
- `assets/scripts.js`

**Owner**
- Frontend/design owner.

**Suppression**
- File: `docs/agent-stack/ui-suppressions.md`

---

### 4) Superpowers Process Compliance

Required PR artifacts for non-trivial code changes:
- Plan artifact
- Self-review artifact
- Test/check evidence artifact

**Blocking in CI**
- Missing required artifacts when changed files include:
  - any `api/**/*.js`
  - `login.html`, `success.html`
  - shared auth/session logic
- PR change size exceeds threshold and no artifacts attached.

**Advisory in CI**
- Docs-only changes
- Tiny edits below trivial threshold

**Trivial threshold**
- <= 10 changed lines and no protected/auth/payment files touched.

**Owner**
- Engineering manager / code owner.

---

### 5) gStack Release Governance

**Blocking**
- Production release job requires release-manager approval artifact.
- No auto-deploy to production without explicit signoff.

**Non-blocking**
- Feature branch CI
- Preview/staging deploys
- Local development

**Owner**
- Release manager.

## Enforcement Matrix

| Gate | Local Pre-push | PR CI | Prod Release |
|---|---|---|---|
| Security | Block secrets + critical (fast mode) | Block secrets + critical | Required |
| Review: Correctness | Advisory | Block high/critical | Required |
| Review: Architecture | Advisory | Block critical | Required |
| Review: Regression | Advisory | Block critical | Required |
| Review: Style | Advisory | Advisory | Advisory |
| Review: Performance | Advisory | Advisory (later critical block) | Required for critical |
| UI Quality | Advisory | Block critical a11y/semantic | Required for core pages |
| Superpowers Artifacts | Advisory | Block when required | Required |
| gStack Signoff | N/A | Advisory | Block if missing |

## Rollout Stages

### Stage A (Initial strict mode)
Enable blocking:
- Security secrets + critical
- Correctness high/critical
- UI critical a11y
Everything else advisory.

### Stage B (After 3 clean PRs)
Add blocking:
- Architecture critical
- Regression critical
- Superpowers artifacts on protected paths

### Stage C (After 5 additional clean PRs)
Consider:
- Performance critical blocking
- Select high severity security categories as blocking
- Expanded UI blocking for key conversion flows

## Protected Paths

Any change in these paths upgrades scrutiny:
- `api/**/*.js`
- `login.html`
- `success.html`
- `dashboard-auth.js`
- billing/subscription/auth related files

## Failure Message Requirements

Every blocking failure must include:
- gate family
- severity
- file/path
- short reason
- remediation hint
- suppression path/process (if allowed)

## Rollback Rules

If false-positive rate is unacceptable:
1. Revert only the affected gate to advisory.
2. Keep other gate families unchanged.
3. Log rollback in `docs/agent-stack/CHANGELOG.md`.
4. Add follow-up issue with owner and target date.

## SLA for Suppressions

- Temporary suppressions expire in <= 30 days.
- Expired suppressions fail CI.
- Permanent suppressions require explicit security/tech lead approval.

## Audit Cadence

- Weekly: suppression review
- Bi-weekly: threshold tuning
- Monthly: full policy review

## Policy Ownership

Primary owner: Engineering lead  
Delegates: Security owner, Frontend owner, Release manager

Changes to this policy require:
- PR review by engineering lead
- Changelog entry in `docs/agent-stack/CHANGELOG.md`