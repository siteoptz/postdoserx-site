# Claude-MEM Configuration and Bootstrap

## Overview

Claude-MEM provides persistent memory for Claude Code across sessions, automatically capturing coding activities and injecting relevant context into future sessions.

## Installation Status

⚠️ **Configuration Required**: Claude-MEM installation requires specific GitHub repository URL confirmation.

### Installation Options Identified:
1. **NPM Package**: `claude-mem` (needs verification)
2. **GitHub Repository**: `github.com/thedotmack/claude-mem`
3. **Plugin Installation**: Via Claude Code plugin marketplace

### Current Configuration

Since the exact GitHub URL needs confirmation, the initial setup creates the foundation for Claude-MEM integration:

## Memory Configuration Structure

### Local Memory Storage
```
.claude-memory/
├── sessions/           # Session-specific memories
├── project/           # Project-wide context
├── compressed/        # AI-compressed summaries
└── config.json       # Memory configuration
```

### Configuration Files
- `docs/agent-stack/memory-bootstrap.md` - This file
- `.claude-memory/config.json` - Memory system configuration
- `scripts/agent/memory-check` - Memory verification script

## Memory Bootstrap Process

### 1. Initial Memory Setup
```bash
# Create memory storage directory
mkdir -p .claude-memory/{sessions,project,compressed}

# Initialize memory config
cat > .claude-memory/config.json << EOF
{
  "version": "1.0.0",
  "memoryType": "repo-local",
  "compression": true,
  "retention": {
    "sessions": 30,
    "summaries": 90
  },
  "features": {
    "auto-capture": true,
    "context-injection": true,
    "citations": true
  }
}
EOF
```

### 2. Test Memory Functionality
```bash
# Test memory write
npm run agent:memory:check write "Test memory entry $(date)"

# Test memory read (in separate session)
npm run agent:memory:check read
```

### 3. Verify Memory Persistence
- Memory should persist across Claude Code sessions
- Context should be automatically injected in new sessions
- Compressed summaries should be accessible with citations

## Memory Usage Patterns

### During Development
- **Automatic Capture**: All coding activities automatically captured
- **Context Injection**: Relevant past context injected into current session
- **Citation System**: Reference past observations with memory IDs

### Memory Categories
1. **Session Memory**: Current session activities and decisions
2. **Project Memory**: Long-term project context and patterns
3. **Compressed Memory**: AI-summarized historical context
4. **Citation Memory**: Referenced memories with unique IDs

## NPM Scripts Configuration

### Memory Management Scripts
```json
{
  "agent:memory:check": "node scripts/agent/memory-check.js",
  "agent:memory:write": "node scripts/agent/memory-write.js",
  "agent:memory:read": "node scripts/agent/memory-read.js",
  "agent:memory:compress": "node scripts/agent/memory-compress.js"
}
```

## Memory Integration Points

### With Other Agent Capabilities
- **obra/superpowers**: Remember planning patterns and decisions
- **code-review**: Track review feedback and improvements
- **security-guidance**: Remember security issues and resolutions
- **frontend-design**: Maintain design decisions and patterns
- **gStack**: Preserve orchestration state and workflows

### With Development Workflow
- **Git Integration**: Link memories to commits and branches
- **Vercel Deployment**: Remember deployment configurations and issues
- **Package Management**: Track dependency decisions and changes

## Troubleshooting

### Common Issues

**Memory not persisting:**
```bash
# Check memory directory permissions
ls -la .claude-memory/
chmod -R 755 .claude-memory/
```

**Context not injecting:**
```bash
# Verify memory configuration
cat .claude-memory/config.json
npm run agent:memory:check status
```

**Compression failing:**
```bash
# Check compressed memory storage
ls -la .claude-memory/compressed/
npm run agent:memory:compress --debug
```

### Memory Verification Steps

1. **Write Test Memory**:
   ```bash
   npm run agent:memory:check write "Implementation baseline recorded"
   ```

2. **Read Memory in New Session**:
   ```bash
   # Exit and restart Claude Code session
   npm run agent:memory:check read
   ```

3. **Verify Compression**:
   ```bash
   npm run agent:memory:compress
   ls .claude-memory/compressed/
   ```

## Installation TODO

### Pending Actions
- [ ] **Confirm exact GitHub URL** for claude-mem repository
- [ ] **Install claude-mem** via npm or git clone
- [ ] **Configure memory storage** location and settings
- [ ] **Test memory persistence** across sessions
- [ ] **Implement memory verification** script
- [ ] **Integrate with existing .claude/ config**

### Installation Commands (Pending URL Confirmation)
```bash
# Option 1: NPM installation
npm install claude-mem

# Option 2: Git clone installation  
git clone [EXACT-GITHUB-URL] .claude-memory/claude-mem
cd .claude-memory/claude-mem
npm install
npm run build

# Option 3: Plugin installation
# Install via Claude Code plugin marketplace
```

## Success Criteria

### Memory System Verification
- ✅ Memory write in one session
- ✅ Memory read in subsequent session  
- ✅ Context automatically injected
- ✅ Compressed summaries generated
- ✅ Citation system working

### Integration Verification
- ✅ Compatible with existing .claude/ configuration
- ✅ Works with Vercel dev/deployment workflow
- ✅ No interference with git operations
- ✅ Proper npm script integration

## Next Steps

1. **Get exact GitHub URL** for claude-mem repository
2. **Complete installation** using confirmed URL
3. **Test memory functionality** end-to-end
4. **Document results** in CHANGELOG.md
5. **Move to Phase 3** (obra/superpowers setup)

---

**Status**: ⚠️ BLOCKED - Awaiting GitHub URL confirmation  
**Blocker**: Need exact claude-mem repository URL for installation  
**Resolution**: Request user to provide exact GitHub URL before proceeding