#!/usr/bin/env node
/**
 * Mongoose Index Audit Script
 * تقرير جميع الفهارس في التطبيق
 */

const fs = require('fs');
const path = require('path');

function auditIndexes(dirPath, prefix = '') {
    const results = {};

    try {
        const files = fs.readdirSync(dirPath);

        files.forEach(file => {
            if (file.endsWith('.js') && !file.startsWith('index.')) {
                const filePath = path.join(dirPath, file);
                const content = fs.readFileSync(filePath, 'utf8');

                // Count inline indexes
                const inlineIndexMatches = (content.match(/index:\s*true/g) || []).length;

                // Extract schema names
                const schemaMatches = content.match(/const\s+(\w+Schema)\s*=/g) || [];
                const schemaNames = schemaMatches.map(m => m.match(/(\w+Schema)/)[1]);

                // Count schema.index() definitions
                let schemaIndexCount = 0;
                schemaNames.forEach(schema => {
                    const pattern = new RegExp(`${schema}\\.index\\(`, 'g');
                    schemaIndexCount += (content.match(pattern) || []).length;
                });

                // Store results
                const relPath = prefix ? `${prefix}/${file}` : file;
                if (inlineIndexMatches > 0 || schemaIndexCount > 0) {
                    results[relPath] = {
                        inlineIndexes: inlineIndexMatches,
                        schemaIndexDefinitions: schemaIndexCount,
                        schemas: schemaNames.length
                    };
                }
            }
        });
    } catch (error) {
        console.error(`Error processing ${dirPath}: ${error.message}`);
    }

    return results;
}

function main() {
    console.log('🔍 Mongoose Index Audit Report\n');
    console.log('='.repeat(60) + '\n');

    const allResults = {};

    // Audit ERP System
    const erpPath = './erp_new_system/backend/models';
    if (fs.existsSync(erpPath)) {
        const erpResults = auditIndexes(erpPath, 'erp');
        Object.assign(allResults, erpResults);
    }

    // Audit Supply Chain
    const scmPath = './supply-chain-management/backend/models';
    if (fs.existsSync(scmPath)) {
        const scmResults = auditIndexes(scmPath, 'scm');
        Object.assign(allResults, scmResults);
    }

    // Generate report
    let totalInline = 0;
    let totalSchema = 0;
    let filesWithIssues = 0;

    console.log('📊 Summary by File:\n');

    Object.entries(allResults).forEach(([file, data]) => {
        totalInline += data.inlineIndexes;
        totalSchema += data.schemaIndexDefinitions;
        filesWithIssues++;

        console.log(`📄 ${file}`);
        console.log(`   - Inline indexes (index: true): ${data.inlineIndexes}`);
        console.log(`   - Schema index definitions: ${data.schemaIndexDefinitions}`);
        console.log(`   - Schemas in file: ${data.schemas}`);
        console.log('');
    });

    console.log('='.repeat(60));
    console.log('\n📈 Overall Statistics:\n');
    console.log(`Total inline "index: true" declarations: ${totalInline}`);
    console.log(`Total schema.index() definitions: ${totalSchema}`);
    console.log(`Files with index definitions: ${filesWithIssues}`);
    console.log(`Potential duplicate indexes: ${totalInline + totalSchema}`);

    console.log('\n🎯 Recommendations:\n');
    if (totalInline > 0) {
        console.log(`⚠️  Found ${totalInline} potential duplicate inline indexes`);
        console.log('   → Run: node fix_duplicate_indexes.js');
    }

    console.log('\n✅ Audit Complete!');
}

main();
