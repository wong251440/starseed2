import {describe,it,expect} from 'vitest';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {scoreAnswers,scoreCanonical,selectPrimary,parseImport,makeExport,MODEL_VERSION} from '../src/shared/scoring';
import model from '../src/data/model.json';
import questions from '../src/data/questions.json';
import civs from '../src/data/civilizations.json';
const raw=(c:number[])=>c.map((v,j)=>v*model.keys[j]);
const hash=(b:any)=>createHash('sha256').update(b).digest('hex');
const requireScore=(r:ReturnType<typeof scoreAnswers>)=>{if(r.status!=='SCORED')throw Error('Expected classification');return r;};
function generator(){let seed=20260905;return ()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};}
describe('Frozen production contract',()=>{
 it('retains all source hashes with exact serialization',()=>{
  expect(hash(questions.map((q,j)=>[q.q,q.slot,q.stem,q.left,q.right,model.keys[j]].join('|')).join('\n'))).toBe(model.hashes.Item);
  expect(hash(Buffer.from(model.keys.map(v=>v&255)))).toBe(model.hashes.Key);
  expect(hash(Buffer.from(model.prototypes.flat().map(v=>v&255)))).toBe(model.hashes.Codebook);
  const b=Buffer.alloc(80*8);model.weights.forEach((v,i)=>b.writeDoubleLE(v,i*8));expect(hash(b)).toBe(model.hashes.Weight);
  expect(model.weights.reduce((a,b)=>a+b,0)).toBeCloseTo(80,12);expect(model.keys.filter(k=>k===1)).toHaveLength(40);
 });
 it('classifies 23/23 canonical prototypes',()=>{model.prototypes.forEach((c,i)=>{const r=requireScore(scoreAnswers(raw(c)));expect(r.primary).toBe(i+1);expect(r.scores[i].score).toBeCloseTo(1,12);});});
 it('reproduces workbook pair geometry: 253 pairs, minimum 17/20, median',()=>{
  const pairs=[];for(let a=0;a<23;a++)for(let b=a+1;b<23;b++){const r=requireScore(scoreAnswers(raw(model.prototypes[a])));expect(r.scores[b].score).toBeCloseTo(model.rho[a][b],12);pairs.push({a:a+1,b:b+1,d:Math.sqrt(2*(1-model.rho[a][b]))});}
  pairs.sort((a,b)=>a.d-b.d);expect(pairs).toHaveLength(253);expect(pairs[0]).toMatchObject({a:17,b:20});expect(pairs[0].d).toBeCloseTo(0.6045865669458961,12);expect(pairs[126].d).toBeCloseTo(1.260257340855912,12);
 });
 it('preserves all prototypes at 25/50/75/100 percent continuous and quantized amplitude',()=>{
  for(const factor of [.25,.5,.75,1])model.prototypes.forEach((c,i)=>{
   expect(requireScore(scoreCanonical(c.map(v=>v*factor))).primary).toBe(i+1);
   expect(requireScore(scoreAnswers(raw(c.map(v=>Math.sign(v)*Math.round(Math.abs(v)*factor))))).primary).toBe(i+1);
  });
 });
 it('reproduces 11,040 arbitrary one-item corruption classifications',()=>{let count=0;model.prototypes.forEach((c,i)=>{for(let q=0;q<80;q++)for(let v=-3;v<=3;v++){if(v===c[q])continue;const x=[...c];x[q]=v;expect(requireScore(scoreAnswers(raw(x))).primary).toBe(i+1);count++;}});expect(count).toBe(11040);});
 it('preserves contribution identity and scale invariance across 2000 independent legal profiles',()=>{
  const rand=generator();for(let i=0;i<2000;i++){
   const x=Array.from({length:80},()=>Math.floor(rand()*7)-3);const a=requireScore(scoreCanonical(x)),b=requireScore(scoreCanonical(x.map(v=>v*.37)));
   expect(a.contributions.reduce((s,v)=>s+v,0)).toBeCloseTo(a.rawGap,12);expect(a.primary).toBe(b.primary);
   expect(a.rawGap).toBeCloseTo(b.rawGap,12);expect(a.boundaryMargin).toBeCloseTo(b.boundaryMargin,12);expect(a.separationIndex).toBeCloseTo(b.separationIndex,12);
  }
 });
 it('returns only ZERO_VECTOR for 80 zero answers',()=>{expect(scoreAnswers(Array(80).fill(0))).toEqual({status:'ZERO_VECTOR'});});
 it('rejects missing, sparse, malformed, fractional, nonfinite, boolean and out-of-range input',()=>{
  for(const bad of [null,{},'answers',[],Array(79).fill(0),Array(81).fill(0),Array(80),...['0',true,null,undefined,NaN,Infinity,3.1,4,-4].map(v=>[v,...Array(79).fill(0)])])expect(()=>scoreAnswers(bad)).toThrow();
 });
 it('uses max-relative tolerance group, lowest ID, raw runner and zero decision gap',()=>{
  const s=[{id:1,score:1-8e-13,distance:0},{id:2,score:1,distance:0},{id:3,score:1-1.6e-12,distance:0}];
  const r=selectPrimary(s);expect(r.primary).toBe(1);expect(r.comparator).toBe(2);expect(r.tiedIds).toEqual([1,2]);expect(r.rawGap).toBeLessThan(0);expect(r.decisionGap).toBe(0);
  expect(selectPrimary([...s].reverse())).toEqual(r);
  expect(selectPrimary(s.map(s=>({...s,score:0.5})))).toMatchObject({primary:1,comparator:2,decisionGap:0});
 });
 it('ranks full precision even when display values round equally',()=>{expect(selectPrimary([{id:1,score:.50001,distance:0},{id:2,score:.50002,distance:0}]).primary).toBe(2);});
 it('roundtrips versioned import and ignores forged result fields',()=>{const answers=raw(model.prototypes[0]),file=makeExport(answers);expect(parseImport({...file,primary:23,scores:[],canonicalAnswers:Array(80).fill(0),category:'fake'})).toEqual(answers);expect(requireScore(scoreAnswers(parseImport({...file,primary:23}))).primary).toBe(1);for(const f of [{...file,schemaVersion:2},{...file,modelVersion:'old'},{...file,answers:Array(79).fill(1)},null,[]])expect(()=>parseImport(f)).toThrow();expect(file.modelVersion).toBe(MODEL_VERSION);});
 it('keeps all 23 official texts byte-identical and categories exhaustive',()=>{
  expect(civs.map(c=>c.id)).toEqual(Array.from({length:23},(_,i)=>i+1));
  civs.forEach(c=>expect(readFileSync(`public/texts/${c.id}.md`)).toEqual(readFileSync(`23文明文案/${c.id}.md`)));
  expect(civs.filter(c=>c.category==='心域文明').map(c=>c.id)).toEqual([1,2,7,8,9,21]);
  expect(civs.filter(c=>c.category==='無界文明').map(c=>c.id)).toEqual([4,5,12,14,15]);
  expect(civs.filter(c=>c.category==='智序文明').map(c=>c.id)).toEqual([6,11,16,17,19,20]);
  expect(civs.filter(c=>c.category==='聖殿文明').map(c=>c.id)).toEqual([3,10,13,18,22,23]);
 });
});
