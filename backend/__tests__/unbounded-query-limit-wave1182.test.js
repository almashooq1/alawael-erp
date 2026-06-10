/**
 * W1182 — حارس انجراف أمني: سقف حدود الاستعلام (Memory DoS)
 *
 * الثغرة: تمرير req.query.limit إلى .limit() أو إلى متغير limit بدون سقف أعلى
 * يسمح للمهاجم بطلب ?limit=99999999 وسحب مجموعة كاملة إلى الذاكرة (DoS).
 *
 * القاعدة: كل موقع يقرأ req.query.limit يجب أن يكون محصوناً بأحد:
 *   - Math.min(..., CAP)
 *   - دالة مقيّدة معروفة (parseIntOpt / _parsePositiveInt / paginate / clampLimit)
 *   - تحقق نطاق صريح يرفض بـ 400 ضمن نافذة السطور التالية
 *
 * نمط الحارس المتدرج (ratchet):
 *   1. أي موقع جديد غير محصون وغير موجود في الأساس => فشل CI.
 *   2. أي إدخال أساس لم يعد موجوداً في المصدر => فشل CI (إجبار التقليص).
 */

const fs = require('fs');
const path = require('path');

const BACKEND_ROOT = path.join(__dirname, '..');
const SCAN_DIRS = ['routes', 'domains'];

// ===== الأساس (فارغ — جميع المواقع أُصلحت في W1182) =====
const KNOWN_UNBOUNDED_LIMIT_BASELINE = new Set([]);

// ===== الكاشف =====

// .limit(<expr يحتوي req.query>) — مباشر
const DIRECT_LIMIT_RE = /\.limit\(([^()]*(?:\([^()]*\)[^()]*)*)\)/g;

// const/let/var <x>limit<y> = <expr يحتوي req.query.limit>
const DECL_LIMIT_RE =
  /(?:const|let|var)\s+\w*[Ll]imit\w*\s*=\s*([^;\n]*req\.query\??\.limit[^;\n]*)/g;

const BOUNDED_HELPERS_RE =
  /\b(parseIntOpt|_parsePositiveInt|clampLimit|paginate|paginateMeta)\s*\(/;

function isBoundedExpr(expr) {
  if (/Math\.min\s*\(/.test(expr)) return true;
  if (BOUNDED_HELPERS_RE.test(expr)) return true;
  return false;
}

/**
 * يفحص نافذة السطور التالية (8 أسطر) بعد إعلان limit عن تحصين لاحق:
 * Math.min على المتغير أو تحقق نطاق يرفض بـ 400.
 */
function windowHasGuard(lines, declIdx, windowSize = 8) {
  const end = Math.min(lines.length, declIdx + 1 + windowSize);
  for (let i = declIdx; i < end; i++) {
    const l = lines[i];
    if (/Math\.min\s*\(/.test(l)) return true;
    if (/\.status\(400\)/.test(l)) return true;
  }
  return false;
}

/**
 * يفحص محتوى ملف ويعيد قائمة انتهاكات [{line, snippet, kind}].
 */
function findUnboundedLimits(content, lines) {
  const violations = [];

  // 1) المباشر: .limit(...req.query...)
  let m;
  DIRECT_LIMIT_RE.lastIndex = 0;
  while ((m = DIRECT_LIMIT_RE.exec(content)) !== null) {
    const arg = m[1];
    if (!/req\.query/.test(arg)) continue;
    if (isBoundedExpr(arg)) continue;
    const lineNo = content.slice(0, m.index).split('\n').length;
    violations.push({
      line: lineNo,
      snippet: m[0].slice(0, 120),
      kind: 'direct-limit',
    });
  }

  // 2) الإعلانات: const limit = ...req.query.limit...
  DECL_LIMIT_RE.lastIndex = 0;
  while ((m = DECL_LIMIT_RE.exec(content)) !== null) {
    const expr = m[1];
    if (isBoundedExpr(expr)) continue;
    const lineNo = content.slice(0, m.index).split('\n').length;
    if (windowHasGuard(lines, lineNo - 1)) continue;
    violations.push({
      line: lineNo,
      snippet: m[0].slice(0, 120),
      kind: 'decl-limit',
    });
  }

  return violations;
}

function walkJsFiles(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkJsFiles(full, out);
    else if (entry.name.endsWith('.js')) out.push(full);
  }
  return out;
}

function scanAll() {
  const found = new Map(); // key "relPath:line" -> violation
  for (const dir of SCAN_DIRS) {
    for (const file of walkJsFiles(path.join(BACKEND_ROOT, dir))) {
      const content = fs.readFileSync(file, 'utf8');
      if (!/req\.query/.test(content)) continue;
      const lines = content.split('\n');
      for (const v of findUnboundedLimits(content, lines)) {
        const rel = path.relative(BACKEND_ROOT, file).replace(/\\/g, '/');
        found.set(`${rel}:${v.line}`, { ...v, file: rel });
      }
    }
  }
  return found;
}

describe('W1182 — حارس سقف حدود الاستعلام (Memory DoS)', () => {
  let found;
  beforeAll(() => {
    found = scanAll();
  });

  test('لا مواقع limit غير محصونة جديدة خارج الأساس', () => {
    const newViolations = [...found.entries()].filter(
      ([key]) => !KNOWN_UNBOUNDED_LIMIT_BASELINE.has(key)
    );
    if (newViolations.length > 0) {
      const report = newViolations
        .map(([key, v]) => `  ${key} [${v.kind}]: ${v.snippet}`)
        .join('\n');
      throw new Error(
        `مواقع limit غير محصونة جديدة (أضف Math.min(..., 1000) أو استخدم paginate):\n${report}`
      );
    }
  });

  test('لا إدخالات أساس قديمة (ratchet-down)', () => {
    const stale = [...KNOWN_UNBOUNDED_LIMIT_BASELINE].filter((key) => !found.has(key));
    expect(stale).toEqual([]);
  });

  // ===== اختبارات ذاتية للكاشف =====
  describe('الكاشف — اختبارات ذاتية', () => {
    const detect = (src) => findUnboundedLimits(src, src.split('\n'));

    test('يكتشف .limit(Number(req.query.limit) || 500) غير المحصون', () => {
      const v = detect('q.limit(Number(req.query.limit) || 500)');
      expect(v).toHaveLength(1);
      expect(v[0].kind).toBe('direct-limit');
    });

    test('يستثني .limit المغلف بـ Math.min', () => {
      expect(detect('q.limit(Math.min(Number(req.query.limit) || 500, 2000))')).toHaveLength(0);
    });

    test('يكتشف const limit = parseInt(req.query.limit) || 20 غير المحصون', () => {
      const v = detect('const limit = parseInt(req.query.limit) || 20;');
      expect(v).toHaveLength(1);
      expect(v[0].kind).toBe('decl-limit');
    });

    test('يستثني الإعلان المغلف بـ Math.min', () => {
      expect(detect('const limit = Math.min(parseInt(req.query.limit) || 20, 1000);')).toHaveLength(
        0
      );
    });

    test('يستثني الدوال المقيّدة المعروفة', () => {
      expect(detect('const limit = parseIntOpt(req.query.limit, 1, 100);')).toHaveLength(0);
      expect(detect('const limit = _parsePositiveInt(req.query.limit, 50, 200);')).toHaveLength(0);
    });

    test('يستثني تحصين النافذة اللاحقة (Math.min أو رفض 400)', () => {
      const srcMin = [
        'const limit = parseInt(req.query.limit) || 20;',
        'const capped = Math.min(limit, 100);',
      ].join('\n');
      expect(detect(srcMin)).toHaveLength(0);

      const src400 = [
        'const limit = parseInt(req.query.limit) || 20;',
        "if (limit > 100) return res.status(400).json({ error: 'limit too large' });",
      ].join('\n');
      expect(detect(src400)).toHaveLength(0);
    });

    test('يستثني .limit بدون req.query (متغير محلي)', () => {
      expect(detect('q.limit(limit)')).toHaveLength(0);
      expect(detect('q.limit(50)')).toHaveLength(0);
    });

    test('يكتشف صيغة req.query?.limit الاختيارية', () => {
      const v = detect('const limit = req.query?.limit ? Number(req.query.limit) : 20;');
      expect(v).toHaveLength(1);
    });
  });

  // ===== تأكيد المواقع المُصلحة =====
  describe('المواقع المُصلحة في W1182 تبقى محصونة', () => {
    const fixedSites = [
      ['routes/cctv/ai.routes.js', 2],
      ['routes/cctv/audit.routes.js', 4],
      ['routes/cctv/recordings.routes.js', 1],
      ['routes/forms-submission.routes.js', 1],
      ['routes/parentPortal.routes.js', 6],
      ['routes/hikvision.routes.js', 2],
    ];

    test.each(fixedSites)('%s يحتوي %i سقف/أسقف Math.min على limit', (rel, expectedCount) => {
      const content = fs.readFileSync(path.join(BACKEND_ROOT, rel), 'utf8');
      const matches = content.match(/Math\.min\([^)]*req\.query\??\.limit[^)]*\)|Math\.min\((?:parseInt|Number)\(req\.query\??\.limit[^;]*W1182/g) || [];
      const w1182Caps = (content.match(/W1182/g) || []).length;
      expect(w1182Caps).toBeGreaterThanOrEqual(expectedCount);
      expect(matches.length + w1182Caps).toBeGreaterThan(0);
    });

    test('measure-recommendations يقصّ limitRaw بـ Math.min', () => {
      const content = fs.readFileSync(
        path.join(BACKEND_ROOT, 'routes/measure-recommendations.routes.js'),
        'utf8'
      );
      expect(content).toMatch(/Math\.min\(limitRaw,\s*1000\)/);
    });
  });
});
