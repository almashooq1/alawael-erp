/**
 * lighthouse-ci.js
 * سكربت CI لتشغيل Lighthouse على URLs محددة والتحقق من ميزانية الأداء
 *
 * Usage:
 *   node scripts/lighthouse-ci.js --urls=https://example.com,https://example.com/dashboard
 *   node scripts/lighthouse-ci.js --config=./lighthouse-ci.json
 */

const fs = require('fs');
const path = require('path');

// نحتاج إلى تشغيل من مجلد backend للوصول إلى الخدمات
process.chdir(path.join(__dirname, '..', 'backend'));

const lighthouseService = require('../backend/services/lighthouse.service');
const { getCurrentBudget } = require('../backend/services/performanceAlert.service');

function parseArgs() {
  const args = process.argv.slice(2);
  const result = { urls: [], strategy: 'mobile', minScore: 90 };

  for (const arg of args) {
    if (arg.startsWith('--urls=')) {
      result.urls = arg.replace('--urls=', '').split(',').map(u => u.trim()).filter(Boolean);
    } else if (arg.startsWith('--strategy=')) {
      result.strategy = arg.replace('--strategy=', '');
    } else if (arg.startsWith('--min-score=')) {
      result.minScore = parseInt(arg.replace('--min-score=', ''), 10);
    } else if (arg.startsWith('--config=')) {
      const configPath = arg.replace('--config=', '');
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      Object.assign(result, config);
    }
  }

  return result;
}

async function main() {
  const args = parseArgs();

  if (args.urls.length === 0) {
    const envUrls = process.env.LIGHTHOUSE_AUDIT_URLS;
    if (envUrls) {
      args.urls = envUrls.split(',').map(u => u.trim()).filter(Boolean);
    }
  }

  if (args.urls.length === 0) {
    console.error('❌ No URLs provided. Use --urls= or set LIGHTHOUSE_AUDIT_URLS');
    process.exit(1);
  }

  console.log(`🔍 Running Lighthouse CI on ${args.urls.length} URL(s) with strategy=${args.strategy}`);

  const budget = await getCurrentBudget().catch(() => ({ lighthouseScores: { performance: args.minScore } }));
  const minPerformanceScore = budget.lighthouseScores?.performance || args.minScore;

  let failures = 0;
  const results = [];

  for (const url of args.urls) {
    try {
      const audit = await lighthouseService.runAudit(url, { strategy: args.strategy });
      const score = audit.scores?.performance || 0;
      const passed = score >= minPerformanceScore;

      results.push({ url, score, passed });

      if (!passed) {
        failures++;
        console.error(`❌ ${url} — Performance score ${score} < ${minPerformanceScore}`);
      } else {
        console.log(`✅ ${url} — Performance score ${score}`);
      }
    } catch (err) {
      failures++;
      results.push({ url, error: err.message, passed: false });
      console.error(`❌ ${url} — Audit failed: ${err.message}`);
    }
  }

  // كتابة نتائج JSON
  const outputPath = path.join(process.cwd(), '..', 'logs', 'lighthouse-ci-results.json');
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify({ results, failures, timestamp: new Date().toISOString() }, null, 2));

  if (failures > 0) {
    console.error(`\n❌ ${failures} URL(s) failed performance budget`);
    process.exit(1);
  }

  console.log('\n✅ All URLs passed performance budget');
  process.exit(0);
}

main().catch(err => {
  console.error('Lighthouse CI failed:', err);
  process.exit(1);
});
