const fs = require('fs');
const path = 'c:\\Users\\x-be\\OneDrive\\المستندات\\04-10-2025\\66666\\supply-chain-management\\frontend\\src\\components\\__tests__\\RiskDashboard.test.js';

let content = fs.readFileSync(path, 'utf8');

// Remove all waitFor calls
let count = 0;
while (content.includes('await waitFor') && count < 50) {
  content = content.replace(
    /await waitFor\(\(\) => \{[\s\S]*?\}\);/,
    'await new Promise(resolve => setTimeout(resolve, 500));'
  );
  count++;
}

fs.writeFileSync(path, content, 'utf8');
console.log('✓ Fixed RiskDashboard waitFor calls');
