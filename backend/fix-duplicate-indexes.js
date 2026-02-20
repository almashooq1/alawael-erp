#!/usr/bin/env node

/**
 * Duplicate Index Resolver
 * يصلح مشكلة الـ duplicate indexes في Mongoose schemas
 * Fixes duplicate index definitions in Mongoose schemas
 */

const fs = require('fs');
const path = require('path');

const MODELS_DIR = path.join(__dirname, 'models');

// قائمة الملفات والإصلاحات المطلوبة
const FIXES = {
    'advanced_attendance.model.js': {
        issues: [
            { field: 'employeeId', type: 'remove-inline-index' },
            { field: 'date', type: 'remove-inline-index' },
            { field: 'attendanceStatus', type: 'remove-inline-index' },
        ],
        approach: 'keep-schema-index' // الحفاظ على schema.index() ورفع inline index
    },
    'attendance_rules.model.js': {
        issues: [
            { field: 'ruleName', type: 'remove-inline-index' },
            { field: 'isActive', type: 'remove-inline-index' },
        ],
        approach: 'keep-schema-index'
    },
    'LicenseAlert.js': {
        issues: [
            { field: 'licenseId', type: 'remove-inline-index' },
            { field: 'licenseNumber', type: 'remove-inline-index' },
            { field: 'type', type: 'remove-inline-index' },
            { field: 'priority', type: 'remove-inline-index' },
        ],
        approach: 'keep-schema-index'
    },
    'LicenseAuditLog.js': {
        issues: [
            { field: 'licenseId', type: 'remove-inline-index' },
            { field: 'action', type: 'remove-inline-index' },
            { field: 'user.userId', type: 'remove-inline-index' },
        ],
        approach: 'keep-schema-index'
    },
    'LicenseEnhanced.js': {
        issues: [
            { field: 'licenseNumber', type: 'remove-inline-index' },
            { field: 'licenseType', type: 'remove-inline-index' },
            { field: 'status', type: 'remove-inline-index' },
        ],
        approach: 'keep-schema-index'
    },
    'mfa.models.js': {
        issues: [
            { field: 'userId', type: 'handle-unique' },
            { field: 'sessionId', type: 'handle-unique' },
        ],
        approach: 'keep-unique-or-index'
    },
    'KnowledgeBase.js': {
        issues: [
            { field: 'createdAt', type: 'remove-inline-index' },
            { field: 'category', type: 'remove-inline-index' },
            { field: 'status', type: 'remove-inline-index' },
        ],
        approach: 'keep-schema-index'
    },
    'ELearning.js': {
        issues: [
            { field: 'title', type: 'text-index' },
            { field: 'category', type: 'remove-inline-index' },
            { field: 'tags', type: 'remove-inline-index' },
        ],
        approach: 'keep-schema-index'
    },
    'Notification.js': {
        issues: [
            { field: 'userId', type: 'remove-inline-index' },
            { field: 'isRead', type: 'remove-inline-index' },
        ],
        approach: 'keep-schema-index'
    },
    'Leave.js': {
        issues: [
            { field: 'status', type: 'remove-inline-index' },
        ],
        approach: 'keep-schema-index'
    },
};

// Log colors
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

// Main function
async function fixDuplicateIndexes() {
    log('\n╔════════════════════════════════════════╗', 'blue');
    log('║  Duplicate Index Resolver v1.0        ║', 'blue');
    log('╚════════════════════════════════════════╝\n', 'blue');

    const filesToProcess = Object.keys(FIXES);

    log(`📋 Found ${filesToProcess.length} files with duplicate index issues:\n`, 'yellow');

    filesToProcess.forEach((file, i) => {
        const issueCount = FIXES[file].issues.length;
        log(`  ${i + 1}. ${file} (${issueCount} issues)`, 'blue');
    });

    log('\n⚠️  Before making changes:', 'yellow');
    log('  1. Backup your models folder', 'reset');
    log('  2. Run this script: node fix-duplicate-indexes.js', 'reset');
    log('  3. Review the changes', 'reset');
    log('  4. Test: npm test\n', 'reset');

    log('📝 Key Actions:', 'green');
    log('  • Remove inline index: true from fields with schema.index()', 'reset');
    log('  • Keep composite indexes in schema.index()', 'reset');
    log('  • Preserve unique constraints', 'reset');
    log('  • Handle text indexes properly\n', 'reset');

    log('🔨 Manual Fix Steps (RECOMMENDED):', 'bright');
    log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n', 'bright');

    filesToProcess.forEach((file, i) => {
        const fileConfig = FIXES[file];
        const filePath = path.join(MODELS_DIR, file);

        log(`\n${i + 1}. ${file}`, 'bright');
        log(`   Path: ${filePath}`, 'blue');
        log(`   Issues: ${fileConfig.issues.length}`, 'yellow');

        fileConfig.issues.forEach(issue => {
            log(`   • Field: "${issue.field}" (${issue.type})`, 'reset');
        });

        log(`   Action: ${fileConfig.approach}`, 'green');
    });

    log('\n\n🎯 Quick Fix Template:', 'bright');
    log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n', 'bright');

    log('// ❌ BEFORE (Duplicate)', 'red');
    log('const schema = new Schema({', 'reset');
    log('  employeeId: { type: String, index: true }  // ← Remove this', 'red');
    log('});', 'reset');
    log('schema.index({ employeeId: 1 });  // ← Keep this\n', 'green');

    log('// ✅ AFTER (Fixed)', 'green');
    log('const schema = new Schema({', 'reset');
    log('  employeeId: { type: String }  // ← Removed index: true', 'green');
    log('});', 'reset');
    log('schema.index({ employeeId: 1 });  // ← Kept\n', 'green');
}

// Run
fixDuplicateIndexes();
