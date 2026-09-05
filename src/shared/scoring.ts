import model from '../data/model.json';
export const MODEL_VERSION = model.modelVersion;
export const HASHES = model.hashes;
export const SCHEMA_VERSION = 1;
export const APP_VERSION = '1.0.0';
export type Score = { id: number; score: number; distance: number };
export type Scored = { status: 'SCORED'; primary: number; comparator: number; ranking: Score[]; scores: Score[]; rawGap: number; decisionGap: number; rho: number; delta: number; boundaryMargin: number; separationIndex: number; tiedIds: number[]; contributions: number[] };
export type Result = Scored | { status: 'ZERO_VECTOR' };
export function validateAnswers(value: unknown): asserts value is number[] {
  if (!Array.isArray(value) || value.length !== 80 || !Array.from(value).every(v => typeof v === 'number' && Number.isInteger(v) && v >= -3 && v <= 3)) throw new Error('答案必須包含依序排列的 80 個整數，每個介於 −3 至 +3。');
}
export function parseImport(value: unknown): number[] {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('請選擇有效的答案 JSON 檔案。');
  const v = value as Record<string, unknown>;
  if (v.schemaVersion !== SCHEMA_VERSION) throw new Error('答案檔案的格式版本不相容。');
  if (v.modelVersion !== MODEL_VERSION) throw new Error('答案檔案的模型版本與目前測驗不同，無法匯入。');
  validateAnswers(v.answers);
  return [...v.answers];
}
export function makeExport(answers: number[]) { validateAnswers(answers); return {schemaVersion: SCHEMA_VERSION, modelVersion: MODEL_VERSION, answers: [...answers]}; }
const norm = (x: number[]) => Math.sqrt(x.reduce((s, v, j) => s + model.weights[j] * v * v, 0) / 80);
const prototypeNorms = model.prototypes.map(norm);
export function selectPrimary(scores: Score[]) {
  const max = Math.max(...scores.map(s => s.score));
  const tiedIds = scores.filter(s => s.score >= max - model.tieTolerance).map(s => s.id).sort((a,b) => a-b);
  const primary = tiedIds[0];
  const comparator = [...scores].filter(s => s.id !== primary).sort((a,b) => b.score-a.score || a.id-b.id)[0].id;
  const rawGap = scores.find(s => s.id === primary)!.score - scores.find(s => s.id === comparator)!.score;
  return { primary, comparator, tiedIds, rawGap, decisionGap: Math.abs(rawGap) <= model.tieTolerance ? 0 : rawGap };
}
// Shared mathematical core; only scoreAnswers is used at input boundaries.
export function scoreCanonical(x: number[]): Result {
  const nx = norm(x);
  if (nx === 0) return {status:'ZERO_VECTOR'};
  const scores = model.prototypes.map((c,i) => {
    const score = x.reduce((sum,v,j) => sum + model.weights[j]*v*c[j],0)/80/(nx*prototypeNorms[i]);
    return {id:i+1,score,distance:Math.sqrt(Math.max(0,2*(1-score)))};
  });
  const decision = selectPrimary(scores);
  const p=decision.primary-1, r=decision.comparator-1;
  const rho=model.rho[p][r], delta=Math.sqrt(Math.max(0,2*(1-rho)));
  return {status:'SCORED',...decision,scores,ranking:[...scores].sort((a,b)=>b.score-a.score || a.id-b.id),rho,delta,boundaryMargin:delta>0?decision.decisionGap/delta:0,separationIndex:1-rho>0?decision.decisionGap/(1-rho):0,contributions:x.map((v,j)=>(model.weights[j]/80)*(v/nx)*(model.prototypes[p][j]/prototypeNorms[p]-model.prototypes[r][j]/prototypeNorms[r]))};
}
export function scoreAnswers(raw: unknown): Result { validateAnswers(raw); return scoreCanonical(raw.map((v,j)=>v*model.keys[j])); }
export function demoAnswers(): number[] { return model.prototypes[0].map((v,j)=>v*model.keys[j]); }
