#!/usr/bin/env node
/**
 * Check if Phase 29-33 routes file exists and loads properly
 */

try {
  console.log('🔍 Loading Phase 29-33 routes...\n');
  const router = require('./routes/phases-29-33.routes');

  console.log(`✅ Router loaded successfully`);
  console.log(`📊 Total route layers: ${router.stack.length}`);

  console.log('\n📋 First 10 routes:\n');
  let count = 0;
  for (const layer of router.stack) {
    if (layer.route) {
      const methods = Object.keys(layer.route.methods)
        .map(m => m.toUpperCase())
        .join(', ');
      console.log(`  ${methods.padEnd(10)} ${layer.route.path}`);
      count++;
      if (count >= 10) break;
    }
  }

  console.log('\n✅ Routes file exists and is valid!');
} catch (error) {
  console.error('❌ Error loading routes:', error.message);
  console.error(error.stack);
  process.exit(1);
}
