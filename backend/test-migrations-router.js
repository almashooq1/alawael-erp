// Test if migrations router is valid
console.log('=== Testing Migrations Router ===\n');

try {
  const router = require('./routes/migrations');
  console.log('✅ Router loaded successfully');
  console.log('Router type:', typeof router);
  console.log('Is Express Router:', router.stack ? 'YES - has stack' : 'NO');
  
  if (router.stack) {
    console.log(`Total routes: ${router.stack.length}`);
    console.log('\nFirst 5 routes:');
    router.stack.slice(0, 5).forEach((layer, i) => {
      const path = layer.route ? layer.route.path : 'middleware';
      const methods = layer.route ? Object.keys(layer.route.methods).join(',') : 'N/A';
      console.log(`  ${i+1}. ${methods.toUpperCase().padEnd(6)} ${path}`);
    });
  } else {
    console.log('❌ Router does not have stack property - might not be Express router');
  }
} catch (error) {
  console.error('❌ Error loading router:', error.message);
  console.error(error.stack);
}

console.log('\n=== Test Complete ===');
