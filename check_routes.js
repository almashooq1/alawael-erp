const fs = require('fs');
const svcDir = './frontend/src/services';
const backendRoutes = './backend/routes';
const backendDomains = './backend/domains';

// Build index of all backend routes
const routeFiles = new Set(fs.readdirSync(backendRoutes).map(f => f.replace(/\.routes\.js$|\.js$/, '')));
const domainDirs = new Set(
  fs.readdirSync(backendDomains).filter(d => {
    try {
      return fs.statSync(backendDomains + '/' + d).isDirectory();
    } catch (e) {
      return false;
    }
  }),
);

const missing = new Map();

fs.readdirSync(svcDir)
  .filter(f => f.endsWith('.js') || f.endsWith('.ts'))
  .forEach(f => {
    const c = fs.readFileSync(svcDir + '/' + f, 'utf8');
    const matches = c.match(/\/api\/v1\/([a-zA-Z0-9_-]+)/g) || [];
    const unique = [...new Set(matches.map(m => m.replace('/api/v1/', '')))];
    unique.forEach(route => {
      if (!route || route.includes(':') || route.includes('{')) return;
      // Check various route name patterns
      const variants = [route, route + 's', route.replace(/-/g, ''), route.replace(/-/g, '_')];
      const hasRoute = variants.some(v => routeFiles.has(v) || domainDirs.has(v));
      if (!hasRoute) {
        if (!missing.has(route)) missing.set(route, []);
        missing.get(route).push(f);
      }
    });
  });

console.log('=== Frontend routes with no obvious backend match ===');
const sorted = [...missing.entries()].sort((a, b) => a[0].localeCompare(b[0]));
sorted.slice(0, 30).forEach(([route, files]) => {
  console.log('  /api/v1/' + route + '  <-- ' + [...new Set(files)].join(', '));
});
console.log('Total unmatched routes:', sorted.length);
