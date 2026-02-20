#!/usr/bin/env node
/**
 * Quick Test Script - اختبار سريع للنظام
 */

const fs = require('fs');
const path = require('path');

const modelsDir = path.join(__dirname, 'erp_new_system/backend/models');

let totalIndexes = 0;
let fileCount = 0;

try {
    const files = fs.readdirSync(modelsDir).filter(f => f.endsWith('.js'));

    files.forEach(file => {
        const content = fs.readFileSync(path.join(modelsDir, file), 'utf8');
        const matches = content.match(/index:\s*true/g) || [];

        if (matches.length > 0) {
            fileCount++;
            totalIndexes += matches.length;
            console.log(`✓ ${file}: ${matches.length} inline indexes`);
        }
    });

    console.log(`\n📊 Total: ${totalIndexes} inline "index: true" across ${fileCount} files`);

    if (totalIndexes > 50) {
        console.log('⚠️  محتاج إلى معالجة المزيد من الملفات');
    } else if (totalIndexes > 0) {
        console.log('✅ تقدم جيد - متبقي بعض الملفات');
    } else {
        console.log('🎉 Perfect! جميع الفهارس المكررة تم إصلاحها');
    }

} catch (error) {
    console.error('Error:', error.message);
}
