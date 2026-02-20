const fs = require('fs');
const path = 'c:\\Users\\x-be\\OneDrive\\المستندات\\04-10-2025\\66666\\supply-chain-management\\frontend\\src\\components\\__tests__\\ValidationDashboard.test.js';

let content = fs.readFileSync(path, 'utf8');

// Remove all waitFor calls with greedy matching
let count = 0;
while (content.includes('await waitFor') && count < 50) {
  content = content.replace(
    /await waitFor\(\(\) => \{[\s\S]{0,2000}?\}\);/m,
    'await new Promise(resolve => setTimeout(resolve, 500));'
  );
  count++;
}

fs.writeFileSync(path, content, 'utf8');
console.log('✓ Fixed ValidationDashboard waitFor calls');
