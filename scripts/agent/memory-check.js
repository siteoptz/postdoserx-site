#!/usr/bin/env node

/**
 * Claude-MEM Memory Verification Script
 * 
 * Tests memory persistence across Claude Code sessions
 * Usage: npm run agent:memory:check [write|read|status]
 */

const fs = require('fs');
const path = require('path');

const MEMORY_DIR = path.join(process.cwd(), '.claude-memory');
const SESSIONS_DIR = path.join(MEMORY_DIR, 'sessions');
const TEST_FILE = path.join(SESSIONS_DIR, 'memory-test.json');

// Ensure memory directory structure exists
function ensureMemoryStructure() {
    const dirs = [
        MEMORY_DIR,
        SESSIONS_DIR,
        path.join(MEMORY_DIR, 'project'),
        path.join(MEMORY_DIR, 'compressed')
    ];
    
    dirs.forEach(dir => {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
            console.log(`📁 Created memory directory: ${dir}`);
        }
    });
    
    // Create config if it doesn't exist
    const configPath = path.join(MEMORY_DIR, 'config.json');
    if (!fs.existsSync(configPath)) {
        const config = {
            version: "1.0.0",
            memoryType: "repo-local",
            compression: true,
            retention: {
                sessions: 30,
                summaries: 90
            },
            features: {
                "auto-capture": true,
                "context-injection": true,
                "citations": true
            },
            lastUpdated: new Date().toISOString()
        };
        
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
        console.log(`⚙️  Created memory configuration: ${configPath}`);
    }
}

// Write test memory entry
function writeMemory(message) {
    ensureMemoryStructure();
    
    const memoryEntry = {
        id: `mem_${Date.now()}`,
        timestamp: new Date().toISOString(),
        type: 'test',
        content: message || `Test memory entry created at ${new Date().toLocaleString()}`,
        session: process.env.CLAUDE_SESSION_ID || 'test-session',
        metadata: {
            cwd: process.cwd(),
            nodeVersion: process.version,
            platform: process.platform
        }
    };
    
    // Read existing memories
    let memories = [];
    if (fs.existsSync(TEST_FILE)) {
        try {
            memories = JSON.parse(fs.readFileSync(TEST_FILE, 'utf8'));
        } catch (err) {
            console.warn(`⚠️  Error reading existing memories: ${err.message}`);
            memories = [];
        }
    }
    
    // Add new memory
    memories.push(memoryEntry);
    
    // Keep only last 10 test memories
    memories = memories.slice(-10);
    
    // Write back to file
    fs.writeFileSync(TEST_FILE, JSON.stringify(memories, null, 2));
    
    console.log(`✅ Memory written successfully!`);
    console.log(`   ID: ${memoryEntry.id}`);
    console.log(`   Content: ${memoryEntry.content}`);
    console.log(`   File: ${TEST_FILE}`);
    
    return memoryEntry;
}

// Read memory entries
function readMemory() {
    if (!fs.existsSync(TEST_FILE)) {
        console.log(`❌ No memory file found at ${TEST_FILE}`);
        console.log(`   Try running: npm run agent:memory:check write "test message"`);
        return null;
    }
    
    try {
        const memories = JSON.parse(fs.readFileSync(TEST_FILE, 'utf8'));
        
        if (memories.length === 0) {
            console.log(`📭 No memories found in ${TEST_FILE}`);
            return memories;
        }
        
        console.log(`📚 Found ${memories.length} memory entries:`);
        console.log('');
        
        memories.forEach((memory, index) => {
            const timeSince = Math.round((Date.now() - new Date(memory.timestamp).getTime()) / 1000);
            console.log(`${index + 1}. [${memory.id}] (${timeSince}s ago)`);
            console.log(`   Content: ${memory.content}`);
            console.log(`   Session: ${memory.session}`);
            console.log('');
        });
        
        return memories;
        
    } catch (err) {
        console.error(`❌ Error reading memory file: ${err.message}`);
        return null;
    }
}

// Show memory system status
function showStatus() {
    ensureMemoryStructure();
    
    console.log('🧠 Claude-MEM Status Report');
    console.log('=' .repeat(40));
    console.log('');
    
    // Check directory structure
    console.log('📁 Directory Structure:');
    const dirs = [
        MEMORY_DIR,
        SESSIONS_DIR,
        path.join(MEMORY_DIR, 'project'),
        path.join(MEMORY_DIR, 'compressed')
    ];
    
    dirs.forEach(dir => {
        const exists = fs.existsSync(dir);
        const status = exists ? '✅' : '❌';
        console.log(`   ${status} ${dir}`);
    });
    console.log('');
    
    // Check configuration
    const configPath = path.join(MEMORY_DIR, 'config.json');
    if (fs.existsSync(configPath)) {
        try {
            const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            console.log('⚙️  Configuration:');
            console.log(`   Version: ${config.version}`);
            console.log(`   Type: ${config.memoryType}`);
            console.log(`   Compression: ${config.compression ? 'enabled' : 'disabled'}`);
            console.log(`   Auto-capture: ${config.features?.['auto-capture'] ? 'enabled' : 'disabled'}`);
            console.log('');
        } catch (err) {
            console.log(`❌ Error reading config: ${err.message}`);
        }
    } else {
        console.log(`❌ Configuration not found at ${configPath}`);
        console.log('');
    }
    
    // Check test memories
    if (fs.existsSync(TEST_FILE)) {
        try {
            const memories = JSON.parse(fs.readFileSync(TEST_FILE, 'utf8'));
            console.log(`💾 Test Memories: ${memories.length} entries`);
            if (memories.length > 0) {
                const latest = memories[memories.length - 1];
                const timeSince = Math.round((Date.now() - new Date(latest.timestamp).getTime()) / 1000);
                console.log(`   Latest: ${timeSince}s ago - ${latest.content}`);
            }
        } catch (err) {
            console.log(`❌ Error reading test memories: ${err.message}`);
        }
    } else {
        console.log(`💾 Test Memories: 0 entries`);
    }
    console.log('');
    
    // Installation status
    console.log('🔧 Installation Status:');
    console.log(`   ⚠️  Claude-MEM core: NOT INSTALLED`);
    console.log(`   ⚠️  Memory persistence: MOCK IMPLEMENTATION`);
    console.log(`   ⚠️  Context injection: NOT AVAILABLE`);
    console.log(`   ⚠️  Compression: NOT AVAILABLE`);
    console.log('');
    console.log('ℹ️  This is a placeholder implementation.');
    console.log('   Install claude-mem to enable full functionality.');
    console.log('   See docs/agent-stack/memory-bootstrap.md for details.');
}

// Main execution
function main() {
    const command = process.argv[2];
    const message = process.argv.slice(3).join(' ');
    
    switch (command) {
        case 'write':
            writeMemory(message);
            break;
            
        case 'read':
            readMemory();
            break;
            
        case 'status':
        default:
            showStatus();
            break;
    }
}

// Only run if this file is executed directly
if (require.main === module) {
    main();
}

module.exports = {
    writeMemory,
    readMemory,
    showStatus,
    ensureMemoryStructure
};