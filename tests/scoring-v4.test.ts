import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import golden from '../starseed_s4_web_handoff_v4_1_min/golden_tests.json';
import { decodeScoringModel, loadScoringModel, score, SCORING_MODEL_ASSET, SCORING_MODEL_VERSION } from '../worker/scorer';

const file = readFileSync(new URL(`../public${SCORING_MODEL_ASSET}`, import.meta.url));
const buffer = file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength);
const model = decodeScoringModel(buffer);

describe('frozen S4 v4.1 scoring parity', () => {
  it.each(golden.cases)('$name matches the frozen primary, runner, all 21 scores and stability', fixture => {
    const result = score(fixture.input, model);
    expect(result.public.status).toBe('classified');
    if (result.public.status !== 'classified' || result.diagnostic.status !== 'classified') throw new Error('Expected classified result');
    expect(result.diagnostic.model_version).toBe(golden.model_version);
    expect(result.public.primary.id).toBe(fixture.expected_primary);
    expect(result.public.runner_up.id).toBe(fixture.expected_runner_up);
    expect(Object.keys(result.public.scores)).toHaveLength(21);
    for (const [id, expected] of Object.entries(fixture.expected_scores)) {
      expect(Math.abs(result.public.scores[id] - expected), id).toBeLessThanOrEqual(golden.tolerance_abs);
    }
    expect(Math.abs(result.public.stability.index - fixture.expected_stability.index)).toBeLessThanOrEqual(golden.tolerance_abs);
    expect(result.public.stability.label).toBe(fixture.expected_stability.label);
    expect(result.public.stability.all_variants_preserve_primary).toBe(fixture.expected_stability.all_variants_preserve_primary);
    expect(result.diagnostic.ranking.map(row => row.rank)).toEqual(Array.from({length: 21}, (_, i) => i + 1));
    expect(result.diagnostic.ranking[0].id).toBe(fixture.expected_primary);
    expect(result.diagnostic.ranking[1].id).toBe(fixture.expected_runner_up);
    expect(Math.abs(result.diagnostic.decomposition_error)).toBeLessThan(1e-12);
    expect(result.diagnostic.item_contributions).toHaveLength(60);
    expect(result.diagnostic.winner_runner_pair_stability.boundary_geometry).not.toBeNull();
    const components = result.diagnostic.classification_stability.components;
    expect(result.public.stability.index).toBe(Math.min(...Object.values(components)));
  });

  it('rejects missing/unknown responses, defaulted answers, and invalid forced choices', () => {
    expect(() => score({}, model)).toThrow('responses object');
    const input = structuredClone(golden.cases[0].input) as {responses: Record<string, unknown>};
    const [bip, bws, cross] = ['S4-A3-B06', 'S4-A3-W32', 'S4-A3-X49'];
    for (const invalid of [null, true, 0, 8, 1.5, '4']) {
      expect(() => score({responses: {...input.responses, [bip]: invalid}}, model)).toThrow('integer 1..7');
    }
    expect(() => score({responses: {...input.responses, [bws]: {best: 'A', worst: 'A'}}}, model)).toThrow('must differ');
    expect(() => score({responses: {...input.responses, [cross]: {operation: 1}}}, model)).toThrow('needs operation and goal');
    expect(() => score({responses: {...input.responses, [cross]: {operation: 0, goal: 2}}}, model)).toThrow('choice must be');
    expect(() => score({responses: {...input.responses, unknown: 4}}, model)).toThrow('Unknown responses');
    delete input.responses[bip];
    expect(() => score(input, model)).toThrow('Missing responses');
  });

  it('loads the immutable asset once and rejects incomplete or unavailable model assets', async () => {
    expect(SCORING_MODEL_VERSION).toBe(golden.model_version);
    const fetch = vi.fn(async () => new Response(buffer.slice(0)));
    const assets = {fetch};
    const [first, second] = await Promise.all([loadScoringModel(assets), loadScoringModel(assets)]);
    expect(first).toBe(second);
    expect(await loadScoringModel(assets)).toBe(first);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(() => decodeScoringModel(new ArrayBuffer(8))).toThrow('invalid length');
    const unavailable = {fetch: vi.fn(async () => new Response('missing', {status: 404}))};
    await expect(loadScoringModel(unavailable)).rejects.toThrow('unavailable');
    await expect(loadScoringModel(unavailable)).rejects.toThrow('unavailable');
    expect(unavailable.fetch).toHaveBeenCalledTimes(2);
  });
});
