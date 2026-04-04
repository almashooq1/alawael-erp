const fs = require('fs');
const items = [
  'backend/utils/logger.js',
  'backend/utils/logger/index.js',
  'backend/lib/logger.js',
  'backend/middleware/auth.middleware.js',
  'backend/middleware/auth.js',
  'backend/auth/middleware.js',
];
items.forEach(f => {
  const e = fs.existsSync(f);
  process.stdout.write((e ? 'OK     ' : 'MISSING') + ' ' + f + '\n');
});
