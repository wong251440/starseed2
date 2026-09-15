import {describe,it,expect} from 'vitest';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {MemoryRouter} from 'react-router-dom';
import {scorePRCS,validateAnswers} from '../worker/prcs';
import {adaptResult,siteLineage} from '../src/shared/result';
import {freshDraft} from '../src/shared/session';
import {questions} from '../src/shared/questionnaire';
import Quiz from '../src/components/Quiz';
import PairComparison from '../src/components/PairComparison';
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
  const html=renderToStaticMarkup(createElement(MemoryRouter,null,createElement(PairComparison,{result:r as Extract<typeof r,{public:{status:'classified'}}> })));
  expect(html).toContain('34,220');expect(html).not.toContain('換 7 種設定');expect(html).toContain('不是類型機率');
 });
 it('accepts null / omitted UID as missing and 4 as valid midpoint',()=>{
  const r=scorePRCS(Object.fromEntries(questions.map((q,i)=>[q.id,i===0?null:4])));
  expect(r.status).toBe('INSUFFICIENT_SIGNAL');
  expect(r.response_counts).toEqual({answered:59,missing:1,directional:0,midpoint:59});
  expect(scorePRCS({}).response_counts.missing).toBe(60);
 });
 it('rejects invalid input at the scorer boundary',()=>{
  for(const a of [[],null,{unknown:4},{[questions[0].id]:'4'},{[questions[0].id]:true},{[questions[0].id]:8},{[questions[0].id]:1.1},{[questions[0].id]:{best:'A'}}])expect(()=>validateAnswers(a)).toThrow();
 });
});
