import {describe,it,expect} from 'vitest';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {MemoryRouter} from 'react-router-dom';
import {scorePRCS,validateAnswers} from '../worker/prcs';
import {adaptResult,siteLineage} from '../src/shared/result';
import {MATCH_SCORE_CONSTANTS,toMatchScore} from '../src/shared/match-score';
import {freshDraft} from '../src/shared/session';
import {questions} from '../src/shared/questionnaire';
import Quiz from '../src/components/Quiz';
import PairComparison from '../src/components/PairComparison';
import {ReportPrelude} from '../src/components/Pages';
import demo from '../src/data/demo-responses.json';
import model from '../STARSEED_WEB_HANDOFF_MIN 2/quiz_model.json';
import civs from '../src/data/civilizations.json';
describe('PRCS production integration',()=>{
 it('preserves all 21 story IDs, especially Venusian / Vegan and Gaian',()=>{
  expect(new Set(model.lineages.map(l=>siteLineage(l.code)))).toEqual(new Set(civs.map(c=>c.lineageId)));
  expect(siteLineage('VE')).toBe('VN');expect(siteLineage('VG')).toBe('VE');expect(civs.find(c=>c.lineageId===siteLineage('GA'))?.id).toBe(23);
 });
 it('renders every question with 7 circles and no old multistep formats',()=>{
  for(let index=0;index<questions.length;index++){
   const html=renderToStaticMarkup(createElement(MemoryRouter,null,createElement(Quiz,{draft:{...freshDraft(),index},setDraft:()=>{},complete:async()=>{}})));
   expect(html.match(/type="radio"/g)).toHaveLength(7);
  }
 });
 it('retains complete raw diagnostics in the site result and renders generic comparison',()=>{
  const raw=scorePRCS(demo.responses),r=adaptResult(raw);
  expect(r.diagnostic.raw).toEqual(raw);expect(r.public.primary?.id).toBe('PL');
  if(r.public.status!=='classified')throw Error('Expected classified');
  expect(r.diagnostic.ranking.map(row=>row.id)).toEqual(raw.ranking.map(row=>siteLineage(row.lineage)));
  expect(r.diagnostic.ranking.map(row=>row.rawCosine)).toEqual(raw.ranking.map(row=>row.similarity));
  expect(r.diagnostic.ranking.every(row=>Number.isFinite(row.zScore)&&Number.isFinite(row.matchScore))).toBe(true);
  const html=renderToStaticMarkup(createElement(MemoryRouter,null,createElement(PairComparison,{result:r as Extract<typeof r,{public:{status:'classified'}}> })));
  expect(html).toContain('24,804');expect(html).not.toContain('換 7 種設定');expect(html).toContain('不是類型機率');
 });
 it('normalizes match scores by form without changing raw-cosine ranking',()=>{
  const rawCosine=.102,quick=toMatchScore(rawCosine,'quick'),full=toMatchScore(rawCosine,'full');
  expect(quick.zScore).toBeCloseTo(rawCosine/MATCH_SCORE_CONSTANTS.quick.rawCosineScale);
  expect(full.zScore).toBeCloseTo(rawCosine/MATCH_SCORE_CONSTANTS.full.rawCosineScale);
  expect(full.matchScore).toBeGreaterThan(quick.matchScore);
  expect(toMatchScore(0,'full').matchScore).toBe(50);
  expect(toMatchScore(-.1,'full').matchScore).toBeLessThan(50);
  expect(toMatchScore(.1,'full').matchScore).toBeGreaterThan(50);
 });
 it('accepts null / omitted UID as missing and 4 as valid midpoint',()=>{
  const r=scorePRCS(Object.fromEntries(questions.map((q,i)=>[q.id,i===0?null:4])));
  expect(r.status).toBe('SENSITIVE');
  expect(r.response_counts).toMatchObject({answered:53,missing:1});
  expect(r.response_counts.directional).toBeGreaterThan(0);
  expect(scorePRCS({}).response_counts.missing).toBe(54);
 });
 it('rejects invalid input at the scorer boundary',()=>{
  for(const a of [[],null,{unknown:4},{[questions[0].id]:'4'},{[questions[0].id]:true},{[questions[0].id]:8},{[questions[0].id]:1.1},{[questions[0].id]:{best:'A'}}])expect(()=>validateAnswers(a)).toThrow();
 });
 it('shows the correct pre-report message for each familiarity level',()=>{
  const newcomer=renderToStaticMarkup(createElement(ReportPrelude,{familiarity:'none',onContinue:()=>{}}));
  expect(newcomer).toContain('請先深呼吸：');expect(newcomer).toContain('這份檔案將為你揭露：');expect(newcomer).not.toContain('顛覆你的預期');
  for(const familiarity of ['some','expert'] as const){const familiar=renderToStaticMarkup(createElement(ReportPrelude,{familiarity,onContinue:()=>{}}));expect(familiar).toContain('請先做好心理準備：');expect(familiar).toContain('顛覆你的預期');expect(familiar).not.toContain('這份檔案將為你揭露：');}
 });
});
