/**
 * Test Loading Phase 29-33 Routes Module
 */

console.log('=== Testing Phase 29-33 Routes Loading ===\n');

try {
  console.log('Loading phases-29-33.routes.js...');
  const routes = require('./routes/phases-29-33.routes');

  console.log('✅ Routes loaded successfully!');
  console.log('Type:', typeof routes);
  console.log('Has stack:', routes.stack !== undefined);
  console.log('Layers:', routes.stack ? routes.stack.length : 'N/A');

  if (routes.stack) {
    console.log('\n=== First 10 Routes ===');
    routes.stack.slice(0, 10).forEach((layer, i) => {
      console.log(
        `${i + 1}. ${layer.route ? layer.route.path : 'middleware'} (${layer.route ? Object.keys(layer.route.methods).join(', ') : 'N/A'})`
      );
    });
  }
} catch (error) {
  console.error('❌ Error loading routes:', error.message);
  console.error('Stack:', error.stack);
}
