⏺ Daily Command List for PostDoseRX Agent Stack

  🚀 Morning Quality Check (5 minutes)

  # 1. Quick system health check
  npm run agent:memory:check

  # 2. Security scan (critical issues only)
  npm run agent:security:ci

  # 3. Suppression system validation
  npm run agent:suppressions:validate

  🔍 Pre-Commit Workflow (Before any code changes)

  # 1. Full 5-lane code review
  npm run agent:review:ci

  # 2. UI quality check (if touching frontend)
  npm run agent:ui-review

  # 3. Generate self-review for significant changes
  npm run agent:self-review

  📋 Feature Development Workflow

  Starting New Feature

  # 1. Plan the feature
  npm run agent:plan "feature-name"

  # 2. Orchestrate development workflow
  npm run agent:orchestrate "feature-name"

  Before Committing

  # 1. Run all quality checks
  npm run agent:review:ci
  npm run agent:security:ci
  npm run agent:ui-review

  # 2. Validate suppressions if you added any
  npm run agent:suppressions:validate

  🎯 Weekly Deep Dive (Fridays)

  # 1. Individual lane analysis
  npm run agent:review:correctness
  npm run agent:review:architecture
  npm run agent:review:style
  npm run agent:review:performance
  npm run agent:review:regression

  # 2. Full system check
  npm run agent:memory:check
  npm run agent:suppressions:validate

  📊 CI/CD Status Check (As needed)

  # Check current enforcement status
  git log --oneline -5 | grep -E "(STEP|agent)"

  # Verify existing workflows still work
  npm run dev  # Should still work
  npm run build # Should still work

  🚨 Emergency/Troubleshooting

  When Something Breaks

  # 1. Quick triage
  npm run agent:security:ci
  npm run agent:suppressions:validate

  # 2. Check for blocking issues
  npm run agent:review:ci | grep -E "🚫|critical|high"

  # 3. Emergency rollback info
  cat docs/agent-stack/ROLLBACK.md

  False Positive Management

  # Parse suppressions (permissive mode for development)
  npm run agent:suppressions:parse

  # Validate with strict mode (production-ready)
  npm run agent:suppressions:validate

  ⏱️ Time Budget

  | Command                             | Time        | When                      |
  |-------------------------------------|-------------|---------------------------|
  | npm run agent:security:ci           | 30 seconds  | Every morning             |
  | npm run agent:review:ci             | 1-2 minutes | Before commits            |
  | npm run agent:ui-review             | 1 minute    | Frontend changes          |
  | npm run agent:suppressions:validate | 5 seconds   | After suppression changes |
  | Full suite                          | 3-5 minutes | Weekly review             |

  🔧 Copy-Paste Daily Routine

  Morning Startup (30 seconds)

  npm run agent:security:ci && npm run agent:suppressions:validate

  Pre-Commit (2-3 minutes)

  npm run agent:review:ci && npm run agent:ui-review && echo "✅ Quality checks passed"

  Weekly Health Check (5 minutes)

  npm run agent:memory:check && npm run agent:review:ci && npm run agent:security:ci && npm run agent:ui-review && echo "✅ 
  Full system health check complete"

  📋 Integration with Git Workflow

  Git Hooks (Automatic)

  # These run automatically via .github/workflows/
  # - agent-security.yml (on push)  
  # - agent-quality.yml (on PR)

  Manual Integration

  # Add to your .git/hooks/pre-commit (optional)
  #!/bin/bash
  npm run agent:security:ci
  npm run agent:suppressions:validate

  🎯 Focus Areas by Day

  - Monday: Security scan + plan upcoming features
  - Tuesday-Thursday: Pre-commit workflow for active development
  - Friday: Weekly deep dive + cleanup
  - Anytime: Emergency troubleshooting commands

  This gives you comprehensive quality coverage while fitting into a natural development rhythm. The agents will catch issues early and help maintain the auth integration stability while you implement improvements.

Other commands:
  “Show me current advisory gates vs blocking gates.”
“Show me top 5 findings on auth/subscription integration only.”
“Generate week-1 remediation PR plan.”