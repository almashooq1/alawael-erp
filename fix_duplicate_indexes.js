#!/usr/bin/env node
/**
 * Fix Duplicate Mongoose Indexes Script
 * يصلح جميع تعاريف الفهارس المكررة في نماذج Mongoose
 */

const fs = require('fs');
const path = require('path');

const MODELS_DIR = path.join(__dirname, 'erp_new_system/backend/models');
const SUPPLY_CHAIN_MODELS_DIR = path.join(__dirname, 'supply-chain-management/backend/models');

// الأنماط التي نبحث عنها
const PATTERNS = [
    {
        name: 'inline_index_with_type',
        regex: /^\s*(\w+):\s*\{\s*type:\s*[^,]+,\s*index:\s*true([^}]*)\},?$/gm,
        replacement: (match, fieldName, rest) => {
            const config = rest.split(',').filter(item => item.includes(':')).join(',');
            return `    ${fieldName}: { type: ... ${config} },`;
        }
    }
];

function fixDuplicateIndexes(content, filePath) {
    let fixed = content;
    let changes = 0;

    // Find all lines with "index: true"
    const lines = content.split('\n');
    const indexLines = [];

    lines.forEach((line, idx) => {
        if (line.includes('index: true')) {
            indexLines.push({
                lineNumber: idx + 1,
                line: line.trim()
            });
        }
    });

    // For each index: true found, check if there's a corresponding schema.index() call
    const schemas = [];
    const indexed_fields = new Set();

    // Extract schema variables
    const schemaMatches = content.match(/const\s+(\w+Schema)\s*=/g);
    if (schemaMatches) {
        schemaMatches.forEach(match => {
            schemas.push(match.match(/\w+Schema/)[0]);
        });
    }

    // Extract fields with inline index: true
    lines.forEach(line => {
        const match = line.match(/(\w+):\s*\{[^}]*index:\s*true/);
        if (match) {
            indexed_fields.add(match[1]);
        }
    });

    // Check for schema.index() definitions
    const schemaIndexPattern = /(\w+Schema)\.index\(\{([^}]+)\}/g;
    const schemaIndexMatches = [...content.matchAll(schemaIndexPattern)];

    // Remove "index: true" if field has schema.index() definition
    let modified = false;
    schemaIndexMatches.forEach(match => {
        const indexDef = match[2];
        const fields = indexDef.split(',').map(f => f.split(':')[0].trim());

        fields.forEach(field => {
            if (indexed_fields.has(field)) {
                // Remove "index: true" from this field
                const fieldRegex = new RegExp(
                    `(${field}:\\s*\\{[^}]*?)(index:\\s*true,?\\s*)([^}]*)`,
                    'g'
                );
                if (fieldRegex.test(content)) {
                    fixed = fixed.replace(fieldRegex, '$1$3');
                    changes++;
                }
            }
        });
    });

    return { fixed, changes };
}

function processFile(filePath) {
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        const result = fixDuplicateIndexes(content, filePath);

        if (result.changes > 0) {
            fs.writeFileSync(filePath, result.fixed, 'utf8');
            return { success: true, changes: result.changes, filePath };
        }
        return { success: true, changes: 0, filePath };
    } catch (error) {
        return { success: false, error: error.message, filePath };
    }
}

function processDirectory(dirPath) {
    try {
        const files = fs.readdirSync(dirPath);
        const results = [];

        files.forEach(file => {
            if (file.endsWith('.js') && !file.startsWith('index.')) {
                const filePath = path.join(dirPath, file);
                const result = processFile(filePath);
                if (result.changes > 0) {
                    results.push(result);
                }
            }
        });

        return results;
    } catch (error) {
        console.error(`Error processing directory ${dirPath}:`, error.message);
        return [];
    }
}

// Main execution
async function main() {
    console.log('🔧 Starting Duplicate Index Fix Process...\n');

    const allResults = [];

    // Fix ERPNew System
    console.log('📂 Processing erp_new_system models...');
    const erpResults = processDirectory(MODELS_DIR);
    allResults.push(...erpResults);

    // Fix Supply Chain Management
    console.log('📂 Processing supply-chain-management models...');
    if (fs.existsSync(SUPPLY_CHAIN_MODELS_DIR)) {
        const scmResults = processDirectory(SUPPLY_CHAIN_MODELS_DIR);
        allResults.push(...scmResults);
    }

    // Report results
    console.log('\n✅ Fix Complete!\n');
    console.log(`Total files processed: ${allResults.length}`);
    console.log(`Total changes made: ${allResults.reduce((sum, r) => sum + r.changes, 0)}\n`);

    if (allResults.length > 0) {
        console.log('📝 Files Modified:');
        allResults.forEach(result => {
            console.log(`  - ${path.basename(result.filePath)}: ${result.changes} changes`);
        });
    } else {
        console.log('✨ No duplicate indexes found to fix!');
    }
}

main().catch(console.error);
