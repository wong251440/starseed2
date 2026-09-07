import metadata from './scoring-model.json';
export {default as HASHES} from './model-hashes.json';
import type {
  ClassificationStability, ItemContribution, PairBoundaryGeometry, PairStability,
  RankingEntry, ScoringResult, StabilityLabel,
} from '../src/shared/result';

type NumericArray = Float32Array | Float64Array;
export interface ScoringModel { arrays: Record<string, NumericArray> }
interface ModelAssets { fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> }
export const SCORING_MODEL_VERSION = metadata.model_version;
export const SCORING_MODEL_ASSET = metadata.asset_path;
const N = metadata.coordinate_count;
const L = metadata.lineages.length;
const D = metadata.arrays.view_Q.shape[2];
const K = metadata.arrays.view_weights.shape[0];
const F = metadata.arrays.jack_Q.shape[0];
const tieOrder = metadata.lineages.map(lineage => metadata.tie_order.indexOf(lineage.id));
const modelCache = new WeakMap<ModelAssets, Promise<ScoringModel>>();

/** One native-precision, 20.4 MiB backing buffer; no matrix copies or promotion. */
export function decodeScoringModel(buffer: ArrayBuffer): ScoringModel {
  if (buffer.byteLength !== metadata.byte_length) throw new Error('Frozen scoring model asset has an invalid length.');
  const arrays: Record<string, NumericArray> = {};
  for (const [name, spec] of Object.entries(metadata.arrays)) {
    const count = spec.shape.reduce((a, b) => a * b, 1);
    arrays[name] = spec.dtype === 'float64'
      ? new Float64Array(buffer, spec.offset, count)
      : new Float32Array(buffer, spec.offset, count);
  }
  return {arrays};
}

/** Cache immutable arrays across requests; a failed asset load remains retryable. */
export function loadScoringModel(assets: ModelAssets): Promise<ScoringModel> {
  const existing = modelCache.get(assets);
  if (existing) return existing;
  const loading = (async () => {
    const response = await assets.fetch(new Request(`https://scoring.internal${SCORING_MODEL_ASSET}`));
    if (!response.ok) throw new Error('Frozen scoring model asset is unavailable.');
    return decodeScoringModel(await response.arrayBuffer());
  })();
  modelCache.set(assets, loading);
  loading.catch(() => modelCache.delete(assets));
  return loading;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function choice4(value: unknown): number {
  if (typeof value === 'string' && /^[ABCD]$/i.test(value.trim())) return value.trim().toUpperCase().charCodeAt(0) - 65;
  throw new Error('BWS choice must be A, B, C, or D.');
}
function choice3(value: unknown): number {
  const choice = typeof value === 'string' && /^[123]$/.test(value.trim()) ? Number(value.trim()) : value;
  if (typeof choice === 'number' && Number.isInteger(choice) && choice >= 1 && choice <= 3) return choice - 1;
  throw new Error('Crossed choice must be 1, 2, or 3.');
}
function encode(payload: unknown): {r: Float64Array; details: Record<string, Record<string, number>>} {
  if (!isObject(payload) || !isObject(payload.responses)) throw new Error('Input must contain responses object.');
  const responses = payload.responses;
  const ids = new Set(metadata.items.map(item => item.id));
  const missing = metadata.items.filter(item => !Object.hasOwn(responses, item.id));
  if (missing.length) throw new Error(`Missing responses: ${missing.map(item => item.id).join(', ')}`);
  const extra = Object.keys(responses).filter(id => !ids.has(id));
  if (extra.length) throw new Error(`Unknown responses: ${extra.join(', ')}`);
  const r = new Float64Array(N);
  const details: Record<string, Record<string, number>> = {};
  for (const item of metadata.items) {
    const answer = responses[item.id];
    const start = item.span[0];
    if (item.format === 'BIP') {
      if (typeof answer !== 'number' || !Number.isInteger(answer) || answer < 1 || answer > 7) throw new Error(`${item.id}: bipolar answer must be integer 1..7`);
      r[start] = (answer - 4) / 2;
      details[item.id] = {position: answer, encoded: r[start]};
    } else if (item.format === 'BWS') {
      if (!isObject(answer) || !('best' in answer) || !('worst' in answer)) throw new Error(`${item.id}: BWS needs best and worst`);
      const best = choice4(answer.best), worst = choice4(answer.worst);
      if (best === worst) throw new Error(`${item.id}: best and worst must differ`);
      const state = best * 3 + worst - (worst > best ? 1 : 0);
      r.set(metadata.bws_states[state], start);
      details[item.id] = {best, worst, state};
    } else {
      if (!isObject(answer) || !('operation' in answer) || !('goal' in answer)) throw new Error(`${item.id}: Crossed needs operation and goal`);
      const operation = choice3(answer.operation), goal = choice3(answer.goal), state = goal * 3 + operation;
      r.set(metadata.cross_states[state], start);
      details[item.id] = {operation, goal, state};
    }
  }
  return {r, details};
}

/** Equivalent to ((r * scale) @ Q / norm) @ dirs.T in the frozen scorer. */
function viewScore(r: Float64Array, q: NumericArray, dirs: NumericArray, scale: NumericArray, index: number) {
  const z = new Float64Array(D);
  const qStart = index * N * D, sStart = index * N, dStart = index * L * D;
  for (let i = 0; i < N; i++) {
    const scaled = r[i] * scale[sStart + i];
    for (let d = 0; d < D; d++) z[d] += scaled * q[qStart + i * D + d];
  }
  let squared = 0;
  for (let d = 0; d < D; d++) squared += z[d] * z[d];
  const norm = Math.sqrt(squared), scores = new Float64Array(L);
  if (norm !== 0) {
    for (let d = 0; d < D; d++) z[d] /= norm;
    for (let i = 0; i < L; i++) for (let d = 0; d < D; d++) scores[i] += z[d] * dirs[dStart + i * D + d];
  }
  return {scores, norm};
}
function rank(values: NumericArray): number[] {
  return Array.from({length: L}, (_, i) => i).sort((a, b) => values[b] - values[a] || tieOrder[a] - tieOrder[b]);
}
function percentile(x: number, knots: NumericArray, grid: NumericArray): number {
  if (x < knots[0]) return 0;
  if (x > knots[knots.length - 1]) return 1;
  // Upper bound matches np.interp's use of the rightmost repeated knot.
  let low = 0, high = knots.length;
  while (low < high) {
    const middle = (low + high) >>> 1;
    if (knots[middle] <= x) low = middle + 1; else high = middle;
  }
  const left = low - 1;
  if (left === knots.length - 1 || knots[left] === x) return grid[left];
  return grid[left] + (x - knots[left]) * (grid[low] - grid[left]) / (knots[low] - knots[left]);
}
function quantile(values: number[], probability: number): number {
  const sorted = [...values].sort((a, b) => a - b), position = (sorted.length - 1) * probability;
  const left = Math.floor(position), fraction = position - left;
  return sorted[left] + fraction * (sorted[Math.ceil(position)] - sorted[left]);
}
function compensatedSum(values: number[]): number {
  let sum = 0, correction = 0;
  for (const value of values) {
    const next = sum + value;
    correction += Math.abs(sum) >= Math.abs(value) ? (sum - next) + value : (value - next) + sum;
    sum = next;
  }
  return sum + correction;
}
function stableLabel(index: number, all: boolean): StabilityLabel {
  if (!all) return 'sensitive';
  return index >= 90 ? 'very_high' : index >= 75 ? 'high' : index >= 50 ? 'moderate' : index >= 25 ? 'low' : 'very_low';
}

export function score(payload: unknown, model: ScoringModel): ScoringResult {
  const {r, details} = encode(payload), a = model.arrays;
  const views = Array.from({length: K}, (_, k) => viewScore(r, a.view_Q, a.view_dirs, a.view_scale, k));
  const rawnorm = Math.sqrt(r.reduce((sum, value) => sum + value * value, 0));
  if (rawnorm === 0 || Math.max(...views.map(view => view.norm)) <= 1e-10 * rawnorm) {
    return {
      public: {status: 'no_classification', primary: null, scores: Object.fromEntries(metadata.lineages.map(lineage => [lineage.id, 50]))},
      diagnostic: {status: 'zero_information', model_version: SCORING_MODEL_VERSION},
    };
  }
  const central = new Float64Array(L);
  for (let k = 0; k < K; k++) for (let i = 0; i < L; i++) central[i] += views[k].scores[i] * a.view_weights[k];
  for (let i = 0; i < L; i++) central[i] += a.offsets[i];
  const order = rank(central), [w, ru] = order;
  const {mean: mu, sd} = metadata.scoring.structural_t_score;
  const tPoints = (value: number) => 10 * value / sd;
  const unclipped = (value: number) => 50 + 10 * (value - mu) / sd;
  const tScore = (value: number) => Math.max(0, Math.min(100, unclipped(value)));
  const margin = central[w] - central[ru];
  const marginpct = 100 * percentile(margin, a.margin_quantiles, a.quantile_grid);
  const vg = views.map(view => Float64Array.from(view.scores, (s, i) => s + a.offsets[i]));
  const jcentral: Float64Array[] = [];
  for (let f = 0; f < F; f++) {
    const scores = new Float64Array(L);
    for (let k = 0; k < K; k++) {
      const index = f * K + k;
      const view = viewScore(r, a.jack_Q, a.jack_dirs, a.jack_scale, index);
      for (let i = 0; i < L; i++) scores[i] += a.jack_weights[index] * view.scores[i];
    }
    for (let i = 0; i < L; i++) scores[i] += a.offsets[i];
    jcentral.push(scores);
  }
  const vw = vg.map(values => rank(values)[0]), jw = jcentral.map(values => rank(values)[0]);
  const modelagree = vw.reduce((sum, winner, k) => sum + (winner === w ? a.view_weights[k] : 0), 0);
  const familyagree = jw.filter(winner => winner === w).length / F;
  const marginOverAll = (values: Float64Array) => values[w] - Math.max(...values.filter((_, i) => i !== w));
  const vmargin = vg.map(marginOverAll), jmargin = jcentral.map(marginOverAll);
  const vpair = vg.map(values => values[w] - values[ru]), jpair = jcentral.map(values => values[w] - values[ru]);
  const allModel = vw.every(winner => winner === w), allFamily = jw.every(winner => winner === w), allPreserved = allModel && allFamily;
  const index = Math.min(marginpct, 100 * modelagree, 100 * familyagree);
  const stability: ClassificationStability = {
    index, label: stableLabel(index, allPreserved), all_variants_preserve_primary: allPreserved,
    all_model_views_preserve_primary: allModel, all_family_jackknives_preserve_primary: allFamily,
    components: {central_margin_structural_percentile: marginpct, model_top1_agreement_pct: 100 * modelagree, family_top1_agreement_pct: 100 * familyagree},
    robust_top1_margin_floor_t_points: tPoints(Math.min(...vmargin, ...jmargin)),
    note: 'Structural robustness index, not an empirical probability.',
  };
  const primary = metadata.lineages[w], runner = metadata.lineages[ru];
  const pairKey = [Math.min(w, ru), Math.max(w, ru)].map(i => metadata.lineages[i].id).join('-');
  const pairMargins = (values: number[]) => ({min: tPoints(Math.min(...values)), p10: tPoints(quantile(values, .1)), median: tPoints(quantile(values, .5))});
  const pair: PairStability = {
    pair: pairKey, central_t_gap: tPoints(margin),
    model_pair_agreement_pct: 100 * vpair.reduce((sum, value, k) => sum + (value > 0 ? a.view_weights[k] : 0), 0),
    family_pair_agreement_pct: 100 * jpair.filter(value => value > 0).length / F,
    model_pair_margin_t_points: pairMargins(vpair), family_pair_margin_t_points: pairMargins(jpair),
    robust_pair_margin_floor_t_points: tPoints(Math.min(...vpair, ...jpair)),
    boundary_geometry: (metadata.pair_boundary_metrics as Record<string, PairBoundaryGeometry>)[pairKey] ?? null,
    note: 'Pair geometry describes the frozen classifier boundary; pair margins describe this respondent. Neither is a probability.',
  };

  // Q @ winner/runner directions once per view, then sum each item's exact span.
  const winnerCoordinates = new Float64Array(K * N), runnerCoordinates = new Float64Array(K * N);
  for (let k = 0; k < K; k++) for (let i = 0; i < N; i++) for (let d = 0; d < D; d++) {
    const q = a.view_Q[(k * N + i) * D + d];
    winnerCoordinates[k * N + i] += q * a.view_dirs[(k * L + w) * D + d];
    runnerCoordinates[k * N + i] += q * a.view_dirs[(k * L + ru) * D + d];
  }
  const format: Record<string, number> = {}, family: Record<string, number> = {};
  const rows: ItemContribution[] = metadata.items.map(item => {
    let delta = 0, wc = 0, rc = 0;
    for (let k = 0; k < K; k++) {
      if (views[k].norm === 0) continue;
      let wci = 0, rci = 0;
      for (let i = item.span[0]; i < item.span[1]; i++) {
        const rv = r[i] * a.view_scale[k * N + i];
        wci += rv * winnerCoordinates[k * N + i];
        rci += rv * runnerCoordinates[k * N + i];
      }
      wci /= views[k].norm; rci /= views[k].norm;
      wc += a.view_weights[k] * wci; rc += a.view_weights[k] * rci;
      delta += a.view_weights[k] * (wci - rci);
    }
    format[item.format] = (format[item.format] ?? 0) + delta;
    family[item.family] = (family[item.family] ?? 0) + delta;
    return {id: item.id, format: item.format, family: item.family, winner_over_runner: delta,
      winner_over_runner_t_points: tPoints(delta), winner_contribution: wc, runner_contribution: rc, response: details[item.id]};
  });
  const offset = a.offsets[w] - a.offsets[ru], contributionSum = compensatedSum(rows.map(row => row.winner_over_runner));
  const ranking: RankingEntry[] = order.map((i, position) => ({
    rank: position + 1, ...metadata.lineages[i], score: tScore(central[i]), t_score_unclipped: unclipped(central[i]),
    structural_percentile: 100 * percentile(central[i], a.score_quantiles, a.quantile_grid), central_score: central[i],
    model_band: [Math.min(...vg.map(values => tScore(values[i]))), Math.max(...vg.map(values => tScore(values[i])))],
    family_band: [Math.min(...jcentral.map(values => tScore(values[i]))), Math.max(...jcentral.map(values => tScore(values[i])))],
  }));
  const centralMean = central.reduce((sum, value) => sum + value, 0) / L;
  const spread = Math.sqrt(central.reduce((sum, value) => sum + (value - centralMean) ** 2, 0) / L);
  return {
    public: {
      status: 'classified', primary, runner_up: runner,
      scores: Object.fromEntries(metadata.lineages.map((lineage, i) => [lineage.id, tScore(central[i])])),
      stability: {index, label: stability.label, all_variants_preserve_primary: allPreserved},
      score_note: 'Common structural T-scores, clamped 0–100 for display; not probabilities and do not sum to 100.',
      stability_note: 'Structural robustness, not a probability or empirical reliability estimate.',
    },
    diagnostic: {
      status: 'classified', model_version: SCORING_MODEL_VERSION, ranking, runner_up: runner,
      winner_runner_margin: margin, winner_runner_t_gap: tPoints(margin), margin_structural_percentile: marginpct,
      evidence_strength_percentile: 100 * percentile(spread, a.evidence_quantiles, a.quantile_grid),
      classification_stability: stability, winner_runner_pair_stability: pair,
      model_stability: {weighted_top1_agreement: modelagree, winner_margin_min: Math.min(...vmargin), winner_margin_p10: quantile(vmargin, .1)},
      family_stability: {top1_agreement: familyagree, winner_margin_min: Math.min(...jmargin), winner_margin_p10: quantile(jmargin, .1)},
      centrality_offset_contribution: offset, centrality_offset_t_points: tPoints(offset),
      item_contribution_sum: contributionSum, decomposition_error: contributionSum + offset - margin,
      format_margin_t_points: Object.fromEntries(Object.entries(format).map(([key, value]) => [key, tPoints(value)])),
      family_margin_t_points: Object.fromEntries(Object.entries(family).map(([key, value]) => [key, tPoints(value)])),
      strongest_items: [...rows].sort((a, b) => Math.abs(b.winner_over_runner) - Math.abs(a.winner_over_runner)).slice(0, 12),
      item_contributions: rows,
      note: 'v4.1 keeps v4 point scores frozen and adds only result-level structural stability and pair-specific diagnostics.',
    },
  };
}
