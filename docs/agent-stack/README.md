# Agent Stack Documentation

## Overview

This repository implements a comprehensive multi-agent workflow system with 6 core capabilities:

1. **obra/superpowers** - Behavior enforcement for plan → test → implement → review workflow
2. **frontend-design** - Design quality and accessibility enforcement for HTML/CSS/JS
3. **code-review** - 5-lane parallel review system (correctness, architecture, style, performance, regression)
4. **security-guidance** - Vulnerability scanning and secret detection
5. **Claude-MEM** - Persistent memory for context across agent sessions
6. **gStack** - Orchestration layer for feature lifecycle management

## Agent Capabilities

### obra/superpowers
Enforces disciplined coding workflow:
1. **Plan** - Create implementation plan before coding
2. **Tests/Checks** - Write tests and checks first
3. **Implementation** - Code implementation following plan
4. **Self-Review** - Comprehensive self-review before submission

**Commands:**
- `npm run agent:plan` - Generate implementation plan
- `npm run agent:self-review` - Run self-review checklist

### frontend-design
Ensures production-quality frontend code:
- Design token consistency with existing brand colors
- Accessibility checks (contrast, semantics, focus states)
- Component quality validation (avoid generic AI look)

**Commands:**
- `npm run agent:ui-review` - Run frontend design quality checks

### code-review (5 Parallel Reviewers)
Comprehensive parallel code review across 5 dimensions:
1. **Correctness** - Logic, edge cases, error handling
2. **Architecture** - Design patterns, modularity, maintainability
3. **Style Rules** - Code style, conventions, documentation
4. **Performance/Reliability** - Optimization, scalability, resilience
5. **Regression History** - Breaking changes, compatibility

**Commands:**
- `npm run agent:review` - Run all 5 reviewers in parallel + aggregate report
- `npm run agent:review:ci` - Non-interactive mode for CI

**Output Format:**
- severity: critical/high/medium/low
- file path
- finding
- recommendation

### security-guidance
Vulnerability and secret scanning:
- Codebase vulnerability detection
- Secret scanning (API keys, tokens, credentials)
- Pre-push hooks (warn-only mode initially)
- Suppression mechanism with justification

**Commands:**
- `npm run agent:security` - Run security scans
- `npm run agent:security:ci` - Non-interactive mode for CI

**Suppression:** `docs/agent-stack/security-suppressions.md`

### Claude-MEM
Persistent memory across agent sessions:
- Repo-local memory storage
- Context preservation between runs
- Memory bootstrap documentation

**Commands:**
- `npm run agent:memory:check` - Verify memory retrieval works

**Configuration:** `docs/agent-stack/memory-bootstrap.md`

### gStack
Orchestration layer mapping skills to lifecycle checkpoints:
- CEO/product framing
- Engineering manager check
- Code review coordination
- QA readiness assessment
- Release manager signoff

**Commands:**
- `npm run agent:orchestrate` - Feature branch → PR-readiness flow

⚠️ **Note:** gStack does NOT auto-deploy; manual approval required.

## Daily Commands

### Development Workflow
```bash
# Start new feature
npm run agent:plan

# Before implementation
npm run agent:memory:check

# During development
npm run agent:ui-review        # For frontend changes
npm run agent:security         # Security check

# Before commit
npm run agent:self-review
npm run agent:review

# Feature completion
npm run agent:orchestrate
```

### CI/CD Integration
```bash
# Automated checks (warn-only mode)
npm run agent:review:ci
npm run agent:security:ci
npm run agent:ui-review        # If non-interactive supported
```

## Rollout Mode

Currently in **WARN-ONLY MODE** - all checks report findings but do not block:

### Current State
- ✅ CI workflows run but continue on error
- ✅ Pre-push hooks warn but allow push
- ✅ All findings logged for review
- ✅ Suppression mechanisms available

### Migration to Enforcement
To switch to blocking mode, update:
1. CI workflows: Remove `continue-on-error: true`
2. Pre-push hooks: Change from warn to error exit codes
3. Review TODO comments in `.github/workflows/` files

## Troubleshooting

### Common Issues

**Agent commands not found:**
```bash
npm install  # Ensure all dependencies installed
```

**Memory retrieval fails:**
```bash
npm run agent:memory:check  # Verify memory system
```

**Security false positives:**
- Add suppressions to `docs/agent-stack/security-suppressions.md`
- Include justification for each suppression

**CI failures:**
- Check `.github/workflows/agent-quality.yml`
- Review agent logs in workflow output
- Verify all agent scripts are executable

### Getting Help

1. Check individual capability documentation in this directory
2. Review `CHANGELOG.md` for recent changes
3. Use `ROLLBACK.md` for reverting changes if needed
4. Check GitHub Issues for known problems

## Implementation Status

✅ **Phase 1: Core Infrastructure** (COMPLETED)
- 5-lane parallel code review system
- Security guidance with vulnerability scanning
- Claude-MEM persistent memory integration
- obra/superpowers behavior enforcement
- Frontend design quality enforcement
- gStack orchestration layer

✅ **Phase 2: Enforcement Rollout** (STAGE B COMPLETE)
- STEP 1: ✅ Security hard block (critical only)
- STEP 2: ✅ Correctness review lane blocking
- STEP 3: ✅ Architecture + regression lane critical-only blocking
- STEP 4: ⏳ UI quality minimum bar (frontend-design)
- STEP 5: ⏳ Superpowers process gate
- STEP 6: ⏳ gStack release governance

**Current Policy Stage**: Stage B (per ENFORCEMENT_POLICY.md)
- ✅ Security: secrets + critical blocking
- ✅ Correctness: high/critical blocking  
- ✅ Architecture: critical blocking
- ✅ Regression: critical blocking
- ⚠️ Style/Performance: advisory only
- ⏳ UI Quality: pending STEP 4
- ⏳ Superpowers: pending STEP 5

## Files and Structure

```
docs/agent-stack/
├── README.md                    # This file
├── ENFORCEMENT_POLICY.md        # Agent enforcement policy and rules
├── suppression.schema.json      # JSON schema for suppression validation
├── BASELINE.md                  # Pre-implementation state
├── CHANGELOG.md                 # Implementation changes
├── ROLLBACK.md                  # Rollback instructions
├── memory-bootstrap.md          # Claude-MEM configuration
├── security-suppressions.md    # Security scan suppressions
├── review-suppressions.md       # Code review suppressions
├── ui-suppressions.md           # UI/UX quality suppressions
├── frontend-quality-checklist.md # UI/UX standards
└── templates/
    ├── plan.md                  # Planning template
    └── self-review.md           # Self-review checklist

scripts/agent/
├── review-correctness           # Correctness reviewer
├── review-architecture          # Architecture reviewer
├── review-style-rules           # Style reviewer
├── review-performance-reliability # Performance reviewer
├── review-regression-history    # Regression reviewer
├── aggregate-report             # Report aggregator
├── security-scan.js             # Security vulnerability scanner
├── ui-review.js                 # Frontend design quality reviewer
├── validate-suppressions.js     # Suppression schema validator
├── memory-check.js              # Claude-MEM memory system
├── plan.js                      # Implementation planning
├── self-review.js               # Self-review checklist
└── orchestrate.js               # gStack orchestration

.github/workflows/
└── agent-quality.yml           # CI automation
```

## Compatibility

- **Platform**: Vercel (static site + serverless functions)
- **Node.js**: >=18.0.0 (current: v22.17.1)
- **Package Manager**: npm
- **Existing Scripts**: Preserved (`dev`, `build`, `deploy`)

## Next Steps

1. Install specific agent tools (see PHASE documentation)
2. Configure tool-specific settings
3. Test each capability individually
4. Gradually enable enforcement mode
5. Monitor and tune based on usage patterns