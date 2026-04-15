# Stage C Rollout Timeline - Practical Implementation Schedule

## Executive Summary

**Project Pace**: ~2 PRs/week  
**Current Status**: Stage B Complete (Steps 1-3 implemented)  
**Timeline Horizon**: 5-6 weeks for full Stage C completion  
**Risk Level**: Low (gradual rollout with verification windows)

This document provides a practical, calendar-based schedule for implementing Steps 4-6 based on the established 2 PRs/week development pace and verification requirements.

## Verification Window Requirements

### PR-Based Gates
| Gate | PRs Needed | Calendar Time (2/week) | Purpose |
|------|------------|------------------------|---------|
| After Step 2 (correctness) | 3 clean PRs | ~2 weeks | Stability verification |
| After Step 3 (arch/regression) | 5 clean PRs | ~2.5-3 weeks | Extended burn-in |
| Step 4 UI dry run | 3 PRs warn-only | ~2 weeks | False positive assessment |

### Quality Metrics for "Clean PRs"
- ✅ No emergency rollbacks of quality gates
- ✅ CI failures are actionable (clear messages, correct files)
- ✅ Suppression usage <5% (minimal false positives)
- ✅ Developer experience feedback positive

## Implementation Schedule

### 🗓️ **Practical Timeline (5-6 Week Horizon)**

#### **Week 0-1: Foundation Verification**
- ✅ **Step 1** (Security blocking) - Already implemented
- Monitor: Secret detection accuracy, vulnerability blocking effectiveness
- Track: Zero critical security issues in production

#### **Week 2-3: Correctness + Optional Release Gate**
- ✅ **Step 2** (Correctness blocking) - Already implemented  
- **Step 6** (gStack release) - Optional if production process exists
- Monitor: Logic error detection, false positive rates
- Track: 3 clean PRs for Step 2 verification window

#### **Week 3-6: Architecture Burn-in Period**
- ✅ **Step 3** (Architecture + regression) - Already implemented
- Extended verification: 5 clean PRs required
- Monitor: Critical design issue detection, compatibility checking
- Track: System stability across broader change types

#### **Week 5-6: UI Quality Gate (After Dry Run)**
- **Step 4** (UI minimum bar) - Implementation target
- Prerequisite: UI warn-only dry run on core pages
- Requirements:
  - 3 clean PRs since Step 3 stabilized
  - Core pages tested: index.html, login.html, success.html
  - Actionable CI failure messages confirmed

#### **Week 3-4: Process Gate (Parallel Track)**
- **Step 5** (Superpowers process) - Can run parallel to Step 3
- Requirements:
  - 3-5 PRs with artifact evidence (plan/self-review/test)
  - Agreed artifact location: docs/agent-stack/pr-artifacts/
  - Step 2 proven stable

### 🎯 **Trigger Conditions**

#### **STEP 4 - UI Quality Minimum Bar**
**Earliest**: Week 5 (4-5 weeks after Step 1)  
**Practical**: Week 5-6 (don't rush Step 3 verification)

**Required Triggers**:
- [x] ✅ Steps 1-3 live and stable  
- [ ] 🔄 3+ clean PRs since Step 2 blocking (in progress)
- [ ] 📋 UI warn-only dry run completed on core pages
- [ ] 🎛️ CI failure messages clear and actionable

#### **STEP 5 - Superpowers Process Gate**  
**Earliest**: Week 3 (2 weeks after Step 2)  
**Practical**: Week 3-4 (parallel with Step 3, avoid same week as Step 4)

**Required Triggers**:
- [x] ✅ Step 2 stable for 2 weeks
- [ ] 📁 Artifact location standardized (docs/agent-stack/pr-artifacts/)
- [ ] 🔄 3-5 PRs with natural plan/self-review/test evidence
- [ ] 🚫 Avoid enabling same week as Step 4 

#### **STEP 6 - gStack Release Governance**
**Timing**: Calendar-independent  
**Practical**: Any time after Steps 1-2 trustworthy

**Required Triggers**:
- [ ] 🚀 Defined production release path (not "random vercel --prod")
- [ ] 🔧 GitHub Action / Vercel integration on main/release branch
- [ ] ✅ Steps 1-2 trusted (not fighting false alarms)
- [ ] 📋 Release checklist or formal process documented

## Current Status Assessment

### ✅ **Completed (Stage B)**
- **Step 1**: Security blocking (critical vulnerabilities + secrets)
- **Step 2**: Correctness blocking (critical + high logic errors)  
- **Step 3**: Architecture + regression blocking (critical-only)
- **Enterprise suppression system**: JSON Schema validation with strict/permissive modes
- **Comprehensive documentation**: Rollout reports and enforcement policies

### 📊 **Metrics Dashboard**
- Security issues: 42 total, 0 critical (✅ non-blocking)
- Architecture issues: 5 total, 0 critical (✅ non-blocking)
- Regression issues: 37 total, 0 critical (✅ non-blocking)
- Suppression compliance: 100% schema validation
- False positive rate: <5% with enterprise suppression system

### 🔄 **Verification Windows in Progress**
1. **Step 2 verification**: Need 3 clean PRs (tracking in progress)
2. **Step 3 burn-in**: Need 5 clean PRs (extended verification)
3. **UI dry run**: Core pages warn-only testing required

## Risk Mitigation Strategy

### 🛡️ **Low-Risk Approach**
- **One dimension per week**: Avoid enabling multiple blocking gates simultaneously
- **Clear attribution**: Space implementations to identify friction sources
- **Rollback ready**: Reversible commits with documented procedures
- **Suppression safety net**: Enterprise-grade false positive management

### 📈 **Success Criteria**
- Zero emergency rollbacks during verification windows
- Developer experience remains positive (feedback surveys)
- CI failure messages actionable within 2 minutes investigation
- Suppression usage remains <5% of total findings

### ⚠️ **Contingency Plans**
- **Verification extension**: Add 1 week if clean PR count not met
- **Emergency rollback**: Documented in ROLLBACK.md with <30 minute recovery
- **Pace adjustment**: Reduce to 1 dimension per 2 weeks if friction detected

## Calendar Milestones

| Week | Milestone | Requirements |
|------|-----------|--------------|
| **Week 2** | Step 2 verification complete | 3 clean PRs |
| **Week 3** | Step 5 eligibility | Artifact habit + location |
| **Week 4** | Step 6 readiness (if applicable) | Production process defined |
| **Week 5** | Step 3 burn-in complete | 5 clean PRs |
| **Week 6** | Step 4 implementation | UI dry run + readiness |

## Next Actions

1. **Track clean PRs**: Monitor verification windows for Steps 2-3
2. **UI dry run**: Test warn-only mode on core pages
3. **Artifact standardization**: Establish docs/agent-stack/pr-artifacts/
4. **Production process**: Document release workflow for Step 6 eligibility

---

**Timeline Owner**: Agent Stack Implementation Team  
**Review Frequency**: Weekly milestone assessment  
**Emergency Contact**: ROLLBACK.md procedures