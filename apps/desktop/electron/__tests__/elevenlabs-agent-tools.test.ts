import { describe, it, expect } from 'vitest';
import { ELEVENLABS_AGENT_TOOLS } from '../elevenlabs-agent';

type Path = Array<string | number>;

function pathToString(path: Path): string {
  return path
    .map((p) => (typeof p === 'number' ? `[${p}]` : p))
    .join('.')
    .replace(/\.\[/g, '[');
}

function hasElevenLabsStringMeta(node: Record<string, unknown>): boolean {
  if (typeof node.description === 'string' && node.description.trim().length > 0) return true;
  if (node.dynamic_variable != null) return true;
  if (node.is_system_provided != null) return true;
  if (node.constant_value != null) return true;
  return false;
}

function validateSchema(node: unknown, path: Path, issues: string[]): void {
  if (!node || typeof node !== 'object') return;

  const rec = node as Record<string, unknown>;
  const type = rec.type;
  if (type === 'string' && !hasElevenLabsStringMeta(rec)) {
    issues.push(pathToString(path));
  }

  if (type === 'array' && rec.items) {
    validateSchema(rec.items, [...path, 'items'], issues);
  }

  if (type === 'object' && rec.properties && typeof rec.properties === 'object') {
    for (const [key, val] of Object.entries(rec.properties as Record<string, unknown>)) {
      validateSchema(val, [...path, 'properties', key], issues);
    }
  }

  for (const key of ['anyOf', 'oneOf', 'allOf'] as const) {
    const v = rec[key];
    if (Array.isArray(v)) {
      v.forEach((item, idx) => validateSchema(item, [...path, key, idx], issues));
    }
  }
}

describe('ElevenLabs agent tool schemas', () => {
  it('provide required metadata for string parameters', () => {
    const issues: string[] = [];

    for (const tool of ELEVENLABS_AGENT_TOOLS as unknown as Array<Record<string, unknown>>) {
      const name = typeof tool.name === 'string' ? tool.name : 'unknown_tool';
      if (!tool.parameters) continue;
      validateSchema(tool.parameters, [name, 'parameters'], issues);
    }

    expect(issues, `Missing metadata for string schema nodes: ${issues.join(', ')}`).toEqual([]);
  });
});
