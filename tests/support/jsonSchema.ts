/**
 * Minimal, generic JSON Schema (draft 2020-12 subset) evaluator — test-only tooling.
 *
 * Not a hand-transcription of any one schema's field list: it recursively interprets
 * whatever schema object it is given (type, const, enum, required, properties,
 * additionalProperties, items, pattern, minLength), the same way any standard JSON
 * Schema validator would for this subset of the spec. Used to validate the literal,
 * byte-checksummed schema files committed under tests/fixtures/issue-141/schema/
 * against real payloads and fixtures, rather than re-encoding their rules as bespoke
 * TypeScript assertions.
 */

export type JsonSchema = {
  type?: string | string[];
  const?: unknown;
  enum?: unknown[];
  required?: string[];
  properties?: Record<string, JsonSchema>;
  additionalProperties?: boolean;
  items?: JsonSchema;
  pattern?: string;
  minLength?: number;
  minimum?: number;
  maxItems?: number;
};

function typeOf(value: unknown): string {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  return typeof value;
}

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (Array.isArray(a) && Array.isArray(b)) return a.length === b.length && a.every((v, i) => deepEqual(v, b[i]));
  if (a && b && typeof a === 'object' && typeof b === 'object') {
    const aKeys = Object.keys(a as object);
    const bKeys = Object.keys(b as object);
    if (aKeys.length !== bKeys.length) return false;
    return aKeys.every((key) => deepEqual((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key]));
  }
  return false;
}

/** Validates `data` against `schema`, returning a flat list of human-readable violations (empty = valid). */
export function validateAgainstSchema(schema: JsonSchema, data: unknown, path = '$'): string[] {
  const errors: string[] = [];

  const acceptedTypes = Array.isArray(schema.type) ? schema.type : schema.type ? [schema.type] : [];
  if (acceptedTypes.length && !acceptedTypes.includes(typeOf(data))) {
    errors.push(`${path}: expected type ${JSON.stringify(schema.type)}, got "${typeOf(data)}"`);
    return errors; // further checks are meaningless against the wrong type
  }

  if ('const' in schema && !deepEqual(data, schema.const)) {
    errors.push(`${path}: expected const ${JSON.stringify(schema.const)}, got ${JSON.stringify(data)}`);
  }

  if (schema.enum && !schema.enum.some((option) => deepEqual(option, data))) {
    errors.push(`${path}: value ${JSON.stringify(data)} not in enum ${JSON.stringify(schema.enum)}`);
  }

  if (schema.pattern && typeof data === 'string' && !new RegExp(schema.pattern).test(data)) {
    errors.push(`${path}: "${data}" does not match pattern ${schema.pattern}`);
  }

  if (schema.minLength != null && typeof data === 'string' && data.length < schema.minLength) {
    errors.push(`${path}: string shorter than minLength ${schema.minLength}`);
  }

  if (schema.minimum != null && typeof data === 'number' && data < schema.minimum) {
    errors.push(`${path}: number smaller than minimum ${schema.minimum}`);
  }

  if (schema.maxItems != null && Array.isArray(data) && data.length > schema.maxItems) {
    errors.push(`${path}: array longer than maxItems ${schema.maxItems}`);
  }

  if (acceptedTypes.includes('object') && data && typeof data === 'object' && !Array.isArray(data)) {
    const record = data as Record<string, unknown>;
    for (const key of schema.required ?? []) {
      if (!(key in record)) errors.push(`${path}: missing required property "${key}"`);
    }
    if (schema.additionalProperties === false) {
      const allowed = new Set(Object.keys(schema.properties ?? {}));
      for (const key of Object.keys(record)) {
        if (!allowed.has(key)) errors.push(`${path}: additionalProperties:false violated by "${key}"`);
      }
    }
    for (const [key, subSchema] of Object.entries(schema.properties ?? {})) {
      if (key in record) errors.push(...validateAgainstSchema(subSchema, record[key], `${path}.${key}`));
    }
  }

  if (acceptedTypes.includes('array') && Array.isArray(data) && schema.items) {
    data.forEach((item, index) => errors.push(...validateAgainstSchema(schema.items as JsonSchema, item, `${path}[${index}]`)));
  }

  return errors;
}
