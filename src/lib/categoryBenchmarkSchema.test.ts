import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { toCanonicalBenchmarkPayload } from './analysis';
import { createCategoryBenchmarkDisplayProjection } from './categoryBenchmarkProjection';
import { validateAgainstSchema, type JsonSchema } from '../../tests/support/jsonSchema';
import type { CategoryBenchmarkPayload } from '../types/dashboard';

const ISSUE_141_ROOT = resolve(__dirname, '../../tests/fixtures/issue-141');
const ISSUE_172_ROOT = resolve(__dirname, '../../tests/fixtures/issue-172/accepted-artifact');

function json<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf8')) as T;
}

describe('historical #141 package remains immutable test evidence', () => {
  const manifest = json<{ fileSha256: Record<string, string> }>(resolve(ISSUE_141_ROOT, 'manifest.json'));

  it('preserves every one of the 143 accepted v1 files byte-for-byte', () => {
    const mismatches: string[] = [];
    const entries = Object.entries(manifest.fileSha256);
    for (const [relativePath, expectedSha] of entries) {
      const actual = createHash('sha256').update(readFileSync(resolve(ISSUE_141_ROOT, relativePath))).digest('hex');
      if (actual !== expectedSha.toLowerCase()) mismatches.push(relativePath);
    }
    expect(entries).toHaveLength(143);
    expect(mismatches).toEqual([]);
  });
});

describe('accepted #172 payload/projection artifact', () => {
  const manifest = json<{
    artifactVersion: string;
    fixtureCount: number;
    positiveFixtureCount: number;
    negativeFixtureCount: number;
    fileSha256: Record<string, string>;
  }>(resolve(ISSUE_172_ROOT, 'manifest.json'));
  const payloadSchema = json<JsonSchema>(resolve(ISSUE_172_ROOT, 'schemas/canonical-comparison-state.schema.json'));
  const projectionSchema = json<JsonSchema>(resolve(ISSUE_172_ROOT, 'schemas/display-projection.schema.json'));
  const positiveDir = resolve(ISSUE_172_ROOT, 'fixtures/positive');

  it('preserves all 50 manifest-listed files byte-for-byte and the 33-fixture composition', () => {
    const mismatches: string[] = [];
    const entries = Object.entries(manifest.fileSha256);
    for (const [relativePath, expectedSha] of entries) {
      const actual = createHash('sha256').update(readFileSync(resolve(ISSUE_172_ROOT, relativePath))).digest('hex');
      if (actual !== expectedSha.toLowerCase()) mismatches.push(relativePath);
    }
    expect(manifest.artifactVersion).toBe('2.0.0');
    expect(manifest.fixtureCount).toBe(33);
    expect(manifest.positiveFixtureCount).toBe(24);
    expect(manifest.negativeFixtureCount).toBe(9);
    expect(entries).toHaveLength(50);
    expect(mismatches).toEqual([]);
  });

  it('executes the accepted package validator, including all 9 negative contracts', () => {
    const output = execFileSync('python', ['validators/validate-package.py'], {
      cwd: ISSUE_172_ROOT,
      encoding: 'utf8',
    });
    const report = JSON.parse(output) as {
      status: string;
      positiveFixtureCount: number;
      negativeFixtureCount: number;
    };
    expect(report.status).toBe('PASS');
    expect(report.positiveFixtureCount).toBe(24);
    expect(report.negativeFixtureCount).toBe(9);
  });

  it('all 24 positive fixtures validate against the literal accepted schemas', () => {
    const failures: string[] = [];
    const files = readdirSync(positiveDir).filter((name) => name.endsWith('.json'));
    for (const file of files) {
      const fixture = json<{ fixtureId: string; canonicalPayload: unknown; expectedProjection: unknown }>(resolve(positiveDir, file));
      const errors = [
        ...validateAgainstSchema(payloadSchema, fixture.canonicalPayload),
        ...validateAgainstSchema(projectionSchema, fixture.expectedProjection),
      ];
      if (errors.length) failures.push(`${fixture.fixtureId}: ${errors.join('; ')}`);
    }
    expect(files).toHaveLength(24);
    expect(failures).toEqual([]);
  });

  it('one central projection reproduces every accepted positive fixture exactly', () => {
    const files = readdirSync(positiveDir).filter((name) => name.endsWith('.json'));
    for (const file of files) {
      const fixture = json<{
        fixtureId: string;
        mode: 'count' | 'share';
        canonicalPayload: CategoryBenchmarkPayload;
        expectedProjection: unknown;
      }>(resolve(positiveDir, file));
      const stats = fixture.canonicalPayload[fixture.mode];
      const actual = createCategoryBenchmarkDisplayProjection(fixture.mode, stats.deviationRaw, stats.comparisonState);
      expect(actual, fixture.fixtureId).toEqual(fixture.expectedProjection);
    }
  });

  it('runtime canonical adapter exposes v2 only and passes the accepted schema', () => {
    const payload: CategoryBenchmarkPayload = {
      payloadId: 'category-benchmark:Одежда',
      payloadVersion: '2.0.0',
      categoryId: 'Одежда',
      focusObjectId: 'focus',
      peerObjectIds: ['peer'],
      count: { focusValue: 3, peerMedian: 1, deviationRaw: 2, deviationUnit: 'brands', peerValues: [1], comparisonState: 'above' },
      share: {
        focusShareExact: 0.3,
        peerMedianShareExact: 0.1,
        shareExactDelta: 0.2,
        deviationRaw: 20,
        deviationUnit: 'percentage_points',
        peerSharesExact: [0.1],
        comparisonState: 'above',
      },
      quality: { state: 'ok', limitations: [] },
      provenance: { sourceFixtureId: 'runtime:Одежда', ownerDecisionCommentId: 5085245278, rawInputSha256: '0'.repeat(64) },
      state: 'ok',
      defaultMode: 'count',
      availableModes: ['count', 'share'],
      focusExcludedFromMedian: true,
      peerCount: 1,
      includedCount: 2,
      excludedCount: 0,
      methodologyId: 'categoryProfile.peerMedian.count',
      methodologyVersion: '1.0.0',
      dataVersion: `sha256-${'0'.repeat(64)}`,
      dataSnapshotAt: '2026-07-16',
    };
    const canonical = toCanonicalBenchmarkPayload(payload);
    expect(validateAgainstSchema(payloadSchema, canonical)).toEqual([]);
    expect(canonical.payloadVersion).toBe('2.0.0');
    expect(Object.keys(canonical)).not.toContain('methodologyId');
  });

  it('normalizes signed zero before any surface consumes the projection', () => {
    const projection = createCategoryBenchmarkDisplayProjection('share', -0, 'equal');
    expect(Object.is(projection.deviationRaw, -0)).toBe(false);
    expect(Object.is(projection.displayDeviation, -0)).toBe(false);
    expect(projection.displayRelationText).toBe('на уровне медианы');
  });
});
