'use strict';
/**
 * Mongoose ↔ Canonical drift detector — Wave 285.
 *
 * Given a canonical entry (with `mongooseModelName`) and the registered
 * Mongoose model, walk the canonical Zod object shape and assert that
 * every top-level field exists in the Mongoose schema with a compatible
 * type.
 *
 * Returns a structured report; callers (the drift guard test) decide how
 * to fail.
 *
 * Compatibility rules (intentionally lenient — we want to catch real
 * divergence, not bikeshed over String-vs-Mixed):
 *   - Canonical `string` accepts Mongoose String, Mixed, or sub-schema.
 *   - Canonical `number` accepts Number, Mixed.
 *   - Canonical `boolean` accepts Boolean, Mixed.
 *   - Canonical `date` accepts Date, String, Mixed.
 *   - Canonical `ObjectIdLike` accepts ObjectId, String, Mixed.
 *   - Canonical `enum(...)` accepts any String / Mixed in Mongoose; the
 *     Mongoose enum values must be a SUPERSET of canonical enum values
 *     (Mongoose may add legacy values, but must accept every canonical
 *     value).
 *   - Canonical `array/object` accepts Array/sub-schema/Mixed.
 *   - Missing field in Mongoose → drift error.
 *
 * Limitations:
 *   - Walks only the top-level keys of the canonical object. Nested
 *     refinement is the schema author's responsibility (Zod handles
 *     runtime validation; drift guard only ensures persistence layer
 *     can hold the data).
 */

const ZOD_TYPES = {
  ZodString: 'string',
  ZodNumber: 'number',
  ZodBoolean: 'boolean',
  ZodDate: 'date',
  ZodEnum: 'enum',
  ZodNativeEnum: 'enum',
  ZodArray: 'array',
  ZodObject: 'object',
  ZodUnion: 'union',
  ZodOptional: 'optional',
  ZodNullable: 'nullable',
  ZodDefault: 'default',
  ZodEffects: 'effects',
  ZodLiteral: 'literal',
  ZodAny: 'any',
  ZodUnknown: 'any',
};

function zodKind(node) {
  const def = node && node._def;
  if (!def) return 'unknown';
  return ZOD_TYPES[def.typeName] || def.typeName || 'unknown';
}

function unwrap(node) {
  // Strip optional/nullable/default/effects wrappers to get inner kind.
  let cur = node;

  while (cur && cur._def) {
    const k = cur._def.typeName;
    if (k === 'ZodOptional' || k === 'ZodNullable' || k === 'ZodDefault') {
      cur = cur._def.innerType;
    } else if (k === 'ZodEffects') {
      cur = cur._def.schema;
    } else {
      break;
    }
  }
  return cur;
}

function canonicalEnumValues(node) {
  const inner = unwrap(node);
  const def = inner && inner._def;
  if (!def) return null;
  if (def.typeName === 'ZodEnum') return def.values.slice();
  if (def.typeName === 'ZodNativeEnum') return Object.values(def.values);
  return null;
}

function topLevelCanonicalFields(zodSchema) {
  const inner = unwrap(zodSchema);
  if (!inner || !inner._def || inner._def.typeName !== 'ZodObject') return null;
  const shape = typeof inner._def.shape === 'function' ? inner._def.shape() : inner.shape;
  return Object.keys(shape).map(name => ({ name, node: shape[name] }));
}

function mongooseFieldInfo(model, path) {
  if (!model || !model.schema) return null;
  const sp = model.schema.path(path);
  if (!sp) return null;
  const instance = sp.instance; // 'String' | 'Number' | 'Boolean' | 'Date' | 'ObjectID' | 'Array' | 'Embedded' | 'Mixed'
  const enumValues = sp.enumValues && sp.enumValues.length ? sp.enumValues.slice() : null;
  return { instance, enumValues, path };
}

const COMPATIBILITY = {
  string: ['String', 'Mixed', 'Embedded'],
  number: ['Number', 'Mixed'],
  boolean: ['Boolean', 'Mixed'],
  date: ['Date', 'String', 'Mixed'],
  enum: ['String', 'Number', 'Mixed'],
  array: ['Array', 'Mixed'],
  object: ['Embedded', 'Mixed', 'Map'],
  any: [
    'String',
    'Number',
    'Boolean',
    'Date',
    'ObjectID',
    'ObjectId',
    'Array',
    'Embedded',
    'Mixed',
    'Map',
  ],
  // ObjectIdLike, IsoDate, and most ID/date unions surface as ZodUnion;
  // accept the common Mongoose-side primitives they map to.
  union: ['String', 'Number', 'Mixed', 'ObjectID', 'ObjectId', 'Embedded', 'Date', 'Array'],
  literal: ['String', 'Number', 'Boolean', 'Mixed'],
  unknown: ['Mixed'],
};

function isCompatible(canonicalKind, mongooseInstance) {
  const allowed = COMPATIBILITY[canonicalKind];
  if (!allowed) return true; // unknown canonical kind → permissive
  return allowed.includes(mongooseInstance);
}

/**
 * @param {{name:string, schema:any, mongooseModelName?:string, mongooseFieldMap?:Record<string,string>}} entry
 * @param {(name:string)=>any} modelLookup - e.g. mongoose.model.bind(mongoose), or test injector
 * @returns {{entity:string, mongooseModel:string|null, issues:Array}}
 */
function detectDrift(entry, modelLookup) {
  const issues = [];
  if (!entry.mongooseModelName) {
    return {
      entity: entry.name,
      mongooseModel: null,
      issues,
      skipped: 'no-mongoose-model-declared',
    };
  }
  let model;
  try {
    model = modelLookup(entry.mongooseModelName);
  } catch (err) {
    return {
      entity: entry.name,
      mongooseModel: entry.mongooseModelName,
      issues: [{ severity: 'error', code: 'MODEL_NOT_REGISTERED', message: err.message }],
    };
  }
  if (!model || !model.schema) {
    return {
      entity: entry.name,
      mongooseModel: entry.mongooseModelName,
      issues: [{ severity: 'error', code: 'MODEL_HAS_NO_SCHEMA' }],
    };
  }

  const fields = topLevelCanonicalFields(entry.schema);
  if (!fields) {
    return {
      entity: entry.name,
      mongooseModel: entry.mongooseModelName,
      issues: [{ severity: 'error', code: 'CANONICAL_NOT_OBJECT_SCHEMA' }],
    };
  }

  const fieldMap = entry.mongooseFieldMap || {};

  for (const { name, node } of fields) {
    const mongoosePath = fieldMap[name] || name;
    const info = mongooseFieldInfo(model, mongoosePath);
    const kind = zodKind(unwrap(node));

    if (!info) {
      issues.push({
        severity: 'error',
        code: 'FIELD_MISSING_IN_MONGOOSE',
        canonicalField: name,
        mongoosePath,
        canonicalKind: kind,
        message: `Mongoose model "${entry.mongooseModelName}" has no path "${mongoosePath}"`,
      });
      continue;
    }

    if (!isCompatible(kind, info.instance)) {
      issues.push({
        severity: 'error',
        code: 'TYPE_INCOMPATIBLE',
        canonicalField: name,
        mongoosePath,
        canonicalKind: kind,
        mongooseInstance: info.instance,
        message: `canonical ${kind} but mongoose stores ${info.instance}`,
      });
      continue;
    }

    if (kind === 'enum') {
      const canonicalVals = canonicalEnumValues(node);
      if (canonicalVals && info.enumValues) {
        const missingFromMongoose = canonicalVals.filter(v => !info.enumValues.includes(v));
        if (missingFromMongoose.length) {
          issues.push({
            severity: 'error',
            code: 'ENUM_VALUE_MISSING_IN_MONGOOSE',
            canonicalField: name,
            mongoosePath,
            missingValues: missingFromMongoose,
            message: `Mongoose enum at "${mongoosePath}" is missing canonical values: ${missingFromMongoose.join(',')}`,
          });
        }
      }
    }
  }

  return {
    entity: entry.name,
    mongooseModel: entry.mongooseModelName,
    issues,
  };
}

module.exports = {
  detectDrift,
  // exported for white-box tests
  _zodKind: zodKind,
  _unwrap: unwrap,
  _isCompatible: isCompatible,
  _topLevelCanonicalFields: topLevelCanonicalFields,
};
