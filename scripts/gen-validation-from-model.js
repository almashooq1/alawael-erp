#!/usr/bin/env node
'use strict';
/**
 * gen-validation-from-model.js
 * ════════════════════════════
 * Auto-generates express-validator validation files from DDD Mongoose model schemas.
 *
 * Reads a DDD model file, extracts schemas, field types, enums, required flags,
 * and generates a validation .js file with create/update chains for each schema.
 *
 * Usage:
 *   node scripts/gen-validation-from-model.js DddPerformanceEvaluator
 *   node scripts/gen-validation-from-model.js --all          # Process ALL unvalidated DDD models
 *   node scripts/gen-validation-from-model.js --dry-run --all
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const DRY = process.argv.includes('--dry-run');
const ALL = process.argv.includes('--all');
const names = process.argv.slice(2).filter(a => !a.startsWith('--'));

const modelsDir = path.join(__dirname, '..', 'backend', 'models');
const validationsDir = path.join(__dirname, '..', 'backend', 'validations');
const routesDir = path.join(__dirname, '..', 'backend', 'routes');

if (!fs.existsSync(validationsDir)) fs.mkdirSync(validationsDir, { recursive: true });

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
/*  Helpers                                                    */
/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function kebab(name) {
  // DddPerformanceEvaluator → performance-evaluator
  return name
    .replace(/^Ddd/, '')
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .toLowerCase();
}

function camelCase(kebabStr) {
  return kebabStr.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
/*  Schema Parser                                              */
/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function parseSchemas(src) {
  const schemas = [];
  // Resolve constant arrays like REVIEW_TYPES = ['a','b',...]
  const constMap = resolveConstants(src);

  // Match both:  new Schema({   and   new Schema(\n  {
  const schemaRegex = /const\s+(\w+Schema)\s*=\s*new\s+(?:mongoose\.)?Schema\(\s*\{/g;
  let match;
  while ((match = schemaRegex.exec(src)) !== null) {
    const varName = match[1];
    // Find the opening { inside the Schema(
    const braceIdx = src.indexOf('{', match.index + match[0].length - 1);
    const startIdx = braceIdx;

    // Find matching closing brace
    let depth = 0;
    let endIdx = startIdx;
    for (let i = startIdx; i < src.length; i++) {
      if (src[i] === '{') depth++;
      if (src[i] === '}') {
        depth--;
        if (depth === 0) {
          endIdx = i;
          break;
        }
      }
    }

    const block = src.substring(startIdx, endIdx + 1);
    const fields = parseFields(block, constMap);

    // Find model name: mongoose.models.DDD... || mongoose.model('DDD...', varName)
    const modelRegex = new RegExp(`mongoose\\.model[s]?\\(['\"]([\\w]+)['\"].*?${varName}`);
    const modelMatch = src.match(modelRegex);
    const modelName = modelMatch ? modelMatch[1] : null;

    schemas.push({ varName, modelName, fields });
  }

  return schemas;
}

function resolveConstants(src) {
  const map = {};
  // Match: const NAME = ['val1', 'val2', ...];
  const re = /const\s+(\w+)\s*=\s*\[([\s\S]*?)\];/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    const name = m[1];
    const values = [];
    const valRe = /['"]([^'"]+)['"]/g;
    let vm;
    while ((vm = valRe.exec(m[2])) !== null) values.push(vm[1]);
    if (values.length > 0) map[name] = values;
  }
  return map;
}

function parseFields(block, constMap) {
  const fields = [];
  const SKIP = new Set(['_id', 'createdAt', 'updatedAt', '__v', 'metadata']);

  // We look at depth-1 fields only (the schema's top-level fields)
  // Strategy: find lines that look like "fieldName: { type: X" or "fieldName: [{ ... }]"
  // at indentation level matching the schema's first-level fields

  const lines = block.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Match field with { type: ... } pattern on single or multi-line
    const fieldStart = line.match(/^(\w+)\s*:\s*\{/);
    if (fieldStart) {
      const fieldName = fieldStart[1];
      if (SKIP.has(fieldName)) continue;

      // Collect the whole field block { ... }
      let fieldBlock = '';
      let depth = 0;
      for (let j = i; j < lines.length; j++) {
        for (const ch of lines[j]) {
          if (ch === '{') depth++;
          if (ch === '}') depth--;
        }
        fieldBlock += lines[j] + '\n';
        if (depth <= 0) {
          i = j;
          break;
        }
      }

      const field = extractFieldInfo(fieldName, fieldBlock, constMap);
      if (field) fields.push(field);
      continue;
    }

    // Match array-of-subdoc: fieldName: [{ ... }]
    const arraySubdoc = line.match(/^(\w+)\s*:\s*\[\{/);
    if (arraySubdoc) {
      const fieldName = arraySubdoc[1];
      if (SKIP.has(fieldName)) continue;
      fields.push({ name: fieldName, type: 'Array', required: false, enumValues: null, min: null, max: null });
      // skip past the closing }]
      let depth = 0;
      for (let j = i; j < lines.length; j++) {
        for (const ch of lines[j]) {
          if (ch === '[') depth++;
          if (ch === ']') depth--;
        }
        if (depth <= 0) {
          i = j;
          break;
        }
      }
      continue;
    }

    // Match array: fieldName: [T] or [T, T]
    const arraySimple = line.match(/^(\w+)\s*:\s*\[\s*\{?\s*type:\s*(\w+)/);
    if (arraySimple) {
      const fieldName = arraySimple[1];
      if (SKIP.has(fieldName)) continue;
      fields.push({ name: fieldName, type: 'Array', required: false, enumValues: null, min: null, max: null });
      continue;
    }

    // Shorthand: fieldName: String, fieldName: Number, etc.
    const shortMatch = line.match(/^(\w+)\s*:\s*(String|Number|Boolean|Date)(?:\s*[,}]|$)/);
    if (shortMatch) {
      const fieldName = shortMatch[1];
      if (SKIP.has(fieldName)) continue;
      fields.push({ name: fieldName, type: shortMatch[2], required: false, enumValues: null, min: null, max: null });
    }
  }

  return fields;
}

function extractFieldInfo(name, block, constMap) {
  // Type detection
  let type = 'String';
  if (/Schema\.Types\.ObjectId|mongoose\.Schema\.Types\.ObjectId|type:\s*mongoose\.Schema\.ObjectId/.test(block)) type = 'ObjectId';
  else if (/type:\s*Number/.test(block)) type = 'Number';
  else if (/type:\s*Boolean/.test(block)) type = 'Boolean';
  else if (/type:\s*Date/.test(block)) type = 'Date';
  else if (/type:\s*\[/.test(block) || /^\w+\s*:\s*\[/.test(block)) type = 'Array';
  else if (/type:\s*Map/.test(block))
    return null; // Skip Map/Mixed
  else if (/type:\s*String/.test(block)) type = 'String';

  // Required
  const required = /required:\s*true/.test(block);

  // Enum — first try inline array
  let enumValues = null;
  const enumInline = block.match(/enum:\s*\[([^\]]+)\]/);
  if (enumInline) {
    enumValues = [];
    const valRe = /['"]([^'"]+)['"]/g;
    let ev;
    while ((ev = valRe.exec(enumInline[1])) !== null) enumValues.push(ev[1]);
  }
  // then try constant reference
  if (!enumValues) {
    const enumConst = block.match(/enum:\s*(\w+)/);
    if (enumConst && constMap && constMap[enumConst[1]]) {
      enumValues = constMap[enumConst[1]];
    }
  }

  // Min/Max
  let min = null,
    max = null;
  const minMatch = block.match(/min:\s*([\d.]+)/);
  const maxMatch = block.match(/max:\s*([\d.]+)/);
  if (minMatch) min = parseFloat(minMatch[1]);
  if (maxMatch) max = parseFloat(maxMatch[1]);

  return { name, type, required, enumValues, min, max };
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
/*  Validation Code Generator                                  */
/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function generateValidationFile(moduleName, schemas) {
  const kebabName = kebab(moduleName);
  const lines = [];

  lines.push(`'use strict';`);
  lines.push(`/**`);
  lines.push(` * ${moduleName.replace(/^Ddd/, '')} — Auto-Generated Validation Schemas`);
  lines.push(` * Generated by: scripts/gen-validation-from-model.js`);
  lines.push(` */`);
  lines.push(``);
  lines.push(`const { body, param } = require('express-validator');`);
  lines.push(``);
  lines.push(`const isObjectId = (value) => /^[a-f\\d]{24}$/i.test(value);`);
  lines.push(``);

  const exports = [];

  for (const schema of schemas) {
    if (!schema.modelName) continue;
    const shortName = schema.modelName.replace(/^DDD/, '');

    // Generate create validation
    const createRules = [];
    const updateRules = [];

    for (const f of schema.fields) {
      const { name, type, required, enumValues, min, max } = f;

      // Skip computed / internal fields
      if (
        [
          'viewCount',
          'likeCount',
          'helpfulCount',
          'notHelpfulCount',
          'occupancyRate',
          'bookingRate',
          'overallProgress',
          'subtotal',
          'totalAmount',
          'taxAmount',
          'discount',
          'acknowledgedAt',
          'completedAt',
          'verifiedAt',
          'reviewedAt',
          'approvedAt',
          'publishedAt',
          'retiredAt',
          'submittedAt',
          'actualStartTime',
          'actualEndTime',
          'actualDeliveryDate',
          'actualHours',
          'actualCost',
          'actualAttendees',
          'currentValue',
          'version',
          'previousVersions',
          'completedDate',
          'lastPerformed',
          'receivedQty',
        ].includes(name)
      )
        continue;

      let createChain = generateChain(name, type, required, enumValues, min, max, true);
      let updateChain = generateChain(name, type, false, enumValues, min, max, false);

      if (createChain) createRules.push(createChain);
      if (updateChain) updateRules.push(updateChain);
    }

    if (createRules.length > 0) {
      const createName = `create${shortName}`;
      lines.push(`/* ═══ ${shortName}: Create ═══ */`);
      lines.push(`const ${createName} = [`);
      createRules.forEach(r => lines.push(`  ${r},`));
      lines.push(`];`);
      lines.push(``);
      exports.push(createName);
    }

    if (updateRules.length > 0) {
      const updateName = `update${shortName}`;
      lines.push(`/* ═══ ${shortName}: Update ═══ */`);
      lines.push(`const ${updateName} = [`);
      updateRules.forEach(r => lines.push(`  ${r},`));
      lines.push(`];`);
      lines.push(``);
      exports.push(updateName);
    }
  }

  lines.push(`module.exports = {`);
  exports.forEach((e, i) => lines.push(`  ${e},`));
  lines.push(`};`);

  return lines.join('\n');
}

function generateChain(name, type, required, enumValues, min, max, isCreate) {
  const parts = [];
  const prefix = isCreate && required ? `body('${name}')` : `body('${name}').optional()`;

  parts.push(prefix);

  switch (type) {
    case 'ObjectId':
      parts.push(`.custom(isObjectId).withMessage('${name} غير صالح')`);
      break;
    case 'Number':
      if (min !== null && max !== null) {
        parts.push(`.isFloat({ min: ${min}, max: ${max} }).withMessage('${name} يجب أن يكون بين ${min} و ${max}')`);
      } else if (min !== null) {
        parts.push(`.isFloat({ min: ${min} }).withMessage('${name} يجب أن يكون ≥ ${min}')`);
      } else {
        parts.push(`.isFloat().withMessage('${name} يجب أن يكون رقماً')`);
      }
      break;
    case 'Boolean':
      parts.push(`.isBoolean().withMessage('${name} يجب أن يكون قيمة منطقية')`);
      break;
    case 'Date':
      parts.push(`.isISO8601().withMessage('${name} يجب أن يكون تاريخ ISO صالح')`);
      break;
    case 'Array':
      parts.push(`.isArray().withMessage('${name} يجب أن يكون مصفوفة')`);
      break;
    case 'String':
      if (enumValues && enumValues.length > 0) {
        parts.push(`.isIn(${JSON.stringify(enumValues)}).withMessage('${name} غير صالح')`);
      } else if (isCreate && required) {
        parts.push(`.trim().notEmpty().withMessage('${name} مطلوب')`);
      } else {
        parts.push(`.trim().isString().withMessage('${name} يجب أن يكون نصاً')`);
      }
      break;
  }

  return parts.join('');
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
/*  Find Route Endpoints                                       */
/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function findRouteEndpoints(kebabName) {
  const routeFile = path.join(routesDir, `ddd-${kebabName}.routes.js`);
  if (!fs.existsSync(routeFile)) return [];
  const src = fs.readFileSync(routeFile, 'utf8');
  const endpoints = [];
  const re = /router\.(post|put)\(\s*['"]([^'"]+)['"]/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    endpoints.push({ method: m[1], path: m[2] });
  }
  return endpoints;
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
/*  Main                                                       */
/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function getTargets() {
  if (ALL) {
    // All Ddd model files without existing validation
    const existing = new Set(fs.readdirSync(validationsDir).map(f => f.replace('.validation.js', '')));
    return fs
      .readdirSync(modelsDir)
      .filter(f => f.startsWith('Ddd') && f.endsWith('.js'))
      .map(f => f.replace('.js', ''))
      .filter(name => !existing.has(kebab(name)));
  }
  return names;
}

const targets = getTargets();
console.log(`Targets: ${targets.length} modules`);
console.log(DRY ? '=== DRY RUN ===' : '=== LIVE RUN ===');
console.log('');

let ok = 0,
  fail = 0;

for (const moduleName of targets) {
  const modelFile = path.join(modelsDir, `${moduleName}.js`);
  if (!fs.existsSync(modelFile)) {
    console.log(`  SKIP ${moduleName} — model file not found`);
    continue;
  }

  const src = fs.readFileSync(modelFile, 'utf8');
  const schemas = parseSchemas(src);

  if (schemas.length === 0) {
    console.log(`  SKIP ${moduleName} — no schemas found`);
    continue;
  }

  const kb = kebab(moduleName);
  const endpoints = findRouteEndpoints(kb);
  const code = generateValidationFile(moduleName, schemas);

  // Syntax check
  try {
    new vm.Script(code, { filename: `${kb}.validation.js` });
  } catch (err) {
    console.log(`  FAIL ${moduleName} — syntax error: ${err.message}`);
    fail++;
    continue;
  }

  const outFile = path.join(validationsDir, `${kb}.validation.js`);

  if (DRY) {
    const exportCount = (code.match(/^const \w+ = \[/gm) || []).length;
    console.log(
      `  WOULD create ${kb}.validation.js (${schemas.length} schemas, ${exportCount} validators, ${endpoints.length} POST/PUT endpoints)`,
    );
  } else {
    fs.writeFileSync(outFile, code, 'utf8');
    const exportCount = (code.match(/^const \w+ = \[/gm) || []).length;
    console.log(`  CREATED ${kb}.validation.js (${schemas.length} schemas, ${exportCount} validators)`);
  }
  ok++;
}

console.log('');
console.log(`=== SUMMARY: ${ok} OK, ${fail} FAIL ===`);
