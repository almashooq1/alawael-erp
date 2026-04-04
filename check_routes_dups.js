const fs = require('fs');
const content = fs.readFileSync('backend/routes/_registry.js', 'utf8');
const lines = content.split('\n');

// استخراج جميع مسارات API المثبّتة
const paths = {};

lines.forEach((line, i) => {
  const trimmed = line.trim();
  if (trimmed.startsWith('//')) return; // تجاهل التعليقات

  // dualMount(app, 'path', ...)
  const dual = line.match(/dualMount\s*\(\s*app\s*,\s*['"]([^'"]+)['"]/);
  if (dual) {
    const p = '/api/' + dual[1];
    if (!paths[p]) paths[p] = [];
    paths[p].push({ line: i + 1, type: 'dualMount', text: trimmed.substring(0, 90) });
    // dualMount also mounts on /api/v1/
    const pv1 = '/api/v1/' + dual[1];
    if (!paths[pv1]) paths[pv1] = [];
    paths[pv1].push({ line: i + 1, type: 'dualMount→v1', text: trimmed.substring(0, 90) });
  }

  // app.use('/api/path', ...)
  const appUse = line.match(/app\.use\s*\(\s*['"]([^'"]+)['"]/);
  if (appUse) {
    const p = appUse[1];
    if (!paths[p]) paths[p] = [];
    paths[p].push({ line: i + 1, type: 'app.use', text: trimmed.substring(0, 90) });
  }

  // safeMount(app, '/api/path', ...) - string version
  const safe1 = line.match(/safeMount\s*\(\s*app\s*,\s*['"]([^'"]+)['"]/);
  if (safe1) {
    const p = safe1[1];
    if (!paths[p]) paths[p] = [];
    paths[p].push({ line: i + 1, type: 'safeMount', text: trimmed.substring(0, 90) });
  }
});

// البحث عن تكرارات حقيقية (نفس المسار، نفس النوع أو أنواع مختلفة لكن ليست dualMount)
let dups = 0;
const dupDetails = [];

Object.entries(paths).forEach(([p, entries]) => {
  // تجاهل المسارات التي تحتوي فقط على dualMount + dualMount→v1 (هذا طبيعي)
  const nonDualV1 = entries.filter(e => e.type !== 'dualMount→v1');
  if (nonDualV1.length > 1) {
    dups++;
    dupDetails.push({ path: p, entries: nonDualV1 });
  }
});

if (dupDetails.length === 0) {
  console.log('✅ لا توجد مسارات مكررة!');
} else {
  dupDetails.forEach(({ path: p, entries }) => {
    console.log('\nDUPLICATE: ' + p);
    entries.forEach(e => console.log('  L' + e.line + ' [' + e.type + '] ' + e.text));
  });
}

console.log('\n--- إجمالي المسارات المكررة: ' + dups + ' ---');
