# Portable master brief (any repository)

Copy the block below into a new Claude task or chat when bootstrapping this agent stack on **another project**. The agent should run preflight first, then implement additively.

---

## START BRIEF

```text
You are implementing a standardized multi-agent engineering workflow in a repository.

## 0) Inputs you must collect first (preflight)

Before changing files, output a short “Repo profile” table:

| Field | Value |
|------|--------|
| Repo name / purpose | (1 sentence) |
| Primary languages | |
| Frontend stack | (static HTML, React, Next, etc.) |
| Backend / APIs | (none, serverless, Node, etc.) |
| Package manager | npm / pnpm / yarn / none |
| Test runner | (none / vitest / jest / playwright / etc.) |
| Linter/formatter | (none / eslint / prettier / etc.) |
| CI system | (GitHub Actions / GitLab / none) |
| Deploy target | (Vercel / Netlify / container / etc.) |
| Protected paths | (auth, payments, PII—list globs) |

Discovery commands (run what exists; skip missing):
- List root: ls
- Package manifest: cat package.json (if present)
- Lockfiles: ls package-lock.json pnpm-lock.yaml yarn.lock
- CI: ls .github/workflows || true

If anything is ambiguous (monorepo layout, multiple apps), stop and ask.

## 1) Capabilities to install/configure

Implement all of the following, or if a tool is not applicable, document the exact blocker:

1) obra/superpowers — plan → tests/checks → implement → self-review discipline
2) frontend-design — production UI quality presets (not generic AI look)
3) code-review — five parallel review lanes + aggregated report
4) security-guidance — repo-wide vuln + secret scanning with warn-then-enforce path
5) Claude-MEM — cross-session project memory
6) gStack — multi-role orchestration (CEO/EM/QA/release/etc.) without auto-deploy to prod

## 2) Repository layout to create (additive)

Create this structure (adjust only if the repo already has equivalents—merge, don’t duplicate):

docs/agent-stack/
  README.md
  CHANGELOG.md
  ROLLBACK.md
  BASELINE.md
  ENFORCEMENT_POLICY.md
  memory-bootstrap.md
  templates/
    plan.md
    self-review.md
  security-suppressions.md
  review-suppressions.md
  ui-suppressions.md
  suppression.schema.json

scripts/agent/
  parse-suppressions-md.js   (md → json; supports --strict=false local / strict CI)
  validate-suppressions.js   (ajv validate generated json + expiry rules)

.claude/  (or the correct config directory for the chosen Claude tooling)
.github/workflows/
  agent-security.yml
  agent-quality.yml

Optional:
docs/agent-stack/pr-artifacts/   (or define a single PR template location)

## 3) Policy files you must author

Author ENFORCEMENT_POLICY.md using this default stance:
- Start warn-only everywhere
- Enforce in stages: security/secrets first, correctness second, architecture/regression critical-only third, UI critical a11y fourth, process artifacts fifth, release governance last

Include an enforcement matrix table (local / PR / prod).

Author suppression files (markdown) matching the parser contract:
- Headings: ## SEC-####, ## REV-####, ## UI-####
- Bullet keys only, consistent naming
- Expiry required for active suppressions

Author suppression.schema.json (JSON Schema draft-07) with required fields:
id, type, status, severity, rule_id, scope, introduced_on, expiry, owner, rationale, issue_link, last_reviewed
Plus conditional required fields:
- security: tool
- review: lane
- ui: category, impacted_flows
- critical severity: approver

## 4) npm scripts (or equivalent) — names are standard

If package.json exists, add:

"agent:memory:check"
"agent:plan"
"agent:self-review"
"agent:review"
"agent:review:ci"
"agent:security"
"agent:security:ci"
"agent:ui-review"
"agent:orchestrate"
"agent:suppressions:parse"        (permissive: --strict=false)
"agent:suppressions:parse:strict"
"agent:suppressions:validate"     (strict parse + validate-suppressions.js)

If no package.json:
- Provide Makefile or Taskfile equivalents, or document manual commands.

Dependencies for suppression validation:
- devDependencies: ajv, ajv-formats

## 5) Five parallel review lanes (required behavior)

Implement scripts/agent review runners (exact mechanism can be shell + agent prompts, or your stack’s CLI—choose the simplest stable approach):

Lanes:
A) correctness/bugs
B) architecture/design
C) style/rules
D) performance/reliability
E) regression/history/context

Requirements:
- agent:review runs all lanes concurrently
- agent:review:ci is non-interactive and emits:
  - per-lane summary
  - aggregated markdown/json
  - exit code policy matching ENFORCEMENT_POLICY.md (start warn-only)

## 6) Security scanning (required behavior)

Implement:
- local: agent:security
- CI: agent:security:ci

Requirements:
- secret scanning must be included
- dependency/vuln scanning if applicable to the ecosystem
- baseline/suppression support via markdown → json pipeline
- Stage 1 CI: continue-on-error or non-blocking except where policy says block

## 7) Frontend-design integration (adapt to stack)

If static HTML/CSS/JS:
- enforce tokens, contrast, focus, semantics on primary pages
If component framework:
- enforce component boundaries, accessibility, and design tokens

Deliverable:
- agent:ui-review command + checklist doc

## 8) Superpowers process gate

Add templates and a CI check (initially warn-only) verifying PR artifacts exist when:
- protected paths change OR
- change is non-trivial (define threshold in ENFORCEMENT_POLICY.md)

Artifacts required:
- plan
- self-review
- tests/check evidence

## 9) gStack release governance

Configure orchestration so:
- feature development is unblocked
- production release requires explicit release-manager readiness artifact
- never auto-promote to prod without human approval trail

## 10) CI workflows

Create GitHub Actions (or adapt to host):
- agent-security.yml runs agent:security:ci + agent:suppressions:validate
- agent-quality.yml runs agent:review:ci + agent:ui-review (if available) + optional process gate

Start with warn-only; include comments showing how to flip to blocking per ENFORCEMENT_POLICY.md.

## 11) Rollout requirements

You MUST implement in this order:
1) memory + baseline + branch
2) security scanning warn-only + suppression pipeline
3) review aggregation warn-only
4) UI review warn-only
5) strict mode in stages per ENFORCEMENT_POLICY.md (do not flip all at once)

## 12) Verification checklist (must run and report results)

Report pass/fail for:
- npm install (if applicable)
- npm run agent:suppressions:validate
- npm run agent:memory:check
- npm run agent:review:ci (warn-only ok)
- npm run agent:security:ci (warn-only ok)
- npm run agent:ui-review (warn-only ok)
- confirm existing dev/build/deploy entrypoints still work

## 13) Deliverables at end

Provide:
- list of files added/changed
- commands added
- what is blocking vs advisory
- known gaps / tool install blockers
- rollback steps in ROLLBACK.md

Constraints:
- Minimal unrelated refactors
- Do not remove existing scripts; only extend
- If a tool URL/package is uncertain, stop and ask

END OF TASK.
```

## END BRIEF

---

## Reuse checklist

1. Paste **START BRIEF** → **END BRIEF** (the fenced `text` block contents) into the target repo’s agent session.
2. Let the agent complete preflight and the repo profile table before edits.
3. Keep enforcement rules in `ENFORCEMENT_POLICY.md`; workflows and exit codes should reference that file only.
4. For non-Node repos, keep the same `docs/agent-stack/` layout; implement `scripts/agent/*` in shell or Python, or invoke validators via `npx` in CI only.

## Related docs in this repo

- [README.md](./README.md) — commands and local usage
- [ENFORCEMENT_POLICY.md](./ENFORCEMENT_POLICY.md) — blocking vs advisory rules
- [ROLLBACK.md](./ROLLBACK.md) — reverting phases
