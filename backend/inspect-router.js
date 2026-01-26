/**
 * Deep Inspection of Phase 29-33 Router
 */
const phases2933Routes = require('./routes/phases-29-33.routes');

console.log('\n=== ROUTER INSPECTION ===\n');
console.log('Type:', typeof phases2933Routes);
console.log('Constructor:', phases2933Routes.constructor.name);
console.log('Is EventEmitter:', phases2933Routes._events !== undefined);
console.log('\n=== STACK LAYERS ===\n');

if (phases2933Routes.stack && Array.isArray(phases2933Routes.stack)) {
  console.log(`Total layers: ${phases2933Routes.stack.length}\n`);

  phases2933Routes.stack.forEach((layer, i) => {
    if (i < 15 || i >= phases2933Routes.stack.length - 5) {
      const route = layer.route;
      const methods = route ? Object.keys(route.methods).join(', ') : 'middleware';
      const path = route ? route.path : layer.name;
      console.log(`${i + 1}. [${methods.toUpperCase()}] ${path}`);
    } else if (i === 15) {
      console.log(`... (${phases2933Routes.stack.length - 20} more layers) ...\n`);
    }
  });
} else {
  console.log('ERROR: stack is not an array!');
  console.log('Keys:', Object.keys(phases2933Routes).slice(0, 20));
}
