import {describe,it,expect} from 'vitest';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {MemoryRouter} from 'react-router-dom';
import data from '../starseed_quiz_min_v1/quiz.json';
import {scoreQuiz as reference} from '../starseed_quiz_min_v1/scoring.mjs';
import {scoreQuiz} from '../worker/rpcs-engine.mjs';
import {score,siteLineage,modelAnswers} from '../worker/rpcs';
import {questions,isCompleteAnswer,isDraftAnswer,makeExport,parseImport,type Responses} from '../src/shared/questionnaire';
import {freshDraft} from '../src/shared/session';
import Quiz from '../src/components/Quiz';
import PairComparison from '../src/components/PairComparison';
import demo from '../src/data/demo-responses.json';
const responses=demo.responses as Responses;
describe('RPCS production integration',()=>{
 it.each([0,1,2])('matches every reference output for profile %i, including all scenarios',seed=>{
  const a=Object.fromEntries(data.items.map((q,i)=>[q.id,q.format==='BP'?(i+seed)%7+1:q.format==='BW'?{best:'ABCD'[(i+seed)%4],worst:'ABCD'[(i+seed+1)%4]}:q.format==='CP'?{a:(i+seed)%3+1,b:(i+seed*2)%3+1}:{first:(i+seed)%2?'L':'R',second:(i+seed)%3?'L':'R'}]));
  const expected=reference(data,a);expect(scoreQuiz(data,a)).toEqual(expected);expect(scoreQuiz(data,a)).toEqual(expected);
 });
 it('adapts the first-legal-state reference to the website without changing rank or stability',()=>{
  const raw=reference(data,modelAnswers(responses)),result=score(responses);
  if(result.diagnostic.status!=='classified'||result.public.status!=='classified')throw Error('Expected classified');
  expect(result.public.primary.id).toBe('PO');expect(result.public.runner_up.id).toBe('DR');
  expect(result.diagnostic.ranking.map(r=>r.id)).toEqual(raw.ranking.map(r=>siteLineage(r.lineage)));
  raw.ranking.forEach((r,i)=>{expect(result.diagnostic.ranking[i].score).toBe(50*(r.fit+1));expect(result.diagnostic.ranking[i].rawFit).toBe(r.fit);});
  expect(result.public.stability.index).toBe(raw.robustness.classificationStabilityIndex);
  const html=renderToStaticMarkup(createElement(MemoryRouter,null,createElement(PairComparison,{result})));
  expect(html).toContain('兩者專屬比較值');expect(html).not.toContain('1,024');expect(html).not.toContain('少看一組');
 });
 it('keeps all 21 lineage mappings bijective, especially Venusian and Vegan',()=>{
  const ids=data.lineages.map(l=>siteLineage(l.code));expect(new Set(ids).size).toBe(21);
  expect(['AD','VE','VG','ZG'].map(siteLineage)).toEqual(['AN','VN','VE','ZE']);
 });
 it('renders all 60 empty and saved questions, including every CP and CF',()=>{
  for(const [index,q] of questions.entries())for(const saved of [false,true]){
   const html=renderToStaticMarkup(createElement(MemoryRouter,null,createElement(Quiz,{draft:{...freshDraft(),index,responses:saved?responses:{}},setDraft:()=>{},complete:()=>{}})));
   expect(html).toContain(q.stem);
   expect((html.match(/type="radio"/g)||[]).length).toBe(q.format==='BIP'?7:q.format==='BWS'?8:q.format==='CROSS'?3:2);
  }
 });
 it('preserves every CP/CF prompt and option and encodes the two CP answers in order',()=>{
  for(const item of data.items){const q=questions.find(q=>q.id===item.id)!;
   if(q.format==='CROSS')for(const operation of [1,2,3])for(const goal of [1,2,3])expect(modelAnswers({[q.id]:{operation,goal}} as Responses)[q.id]).toEqual({a:operation,b:goal});
   if(q.format==='CF'){expect(q.condition1).toBe(item.condition1);expect(q.condition2).toBe(item.condition2);expect(q.left).toBe(item.left);expect(q.right).toBe(item.right);}
  }
 });
 it('validates both CF choices, retains partial progress, and rejects older versions',()=>{
  const q=questions.find(q=>q.format==='CF')!;
  expect(isDraftAnswer(q,{first:'L'})).toBe(true);expect(isCompleteAnswer(q,{first:'L'})).toBe(false);
  for(const first of ['L','R'])for(const second of ['L','R'])expect(isCompleteAnswer(q,{first,second})).toBe(true);
  for(const bad of [null,[],{},1,{first:'A',second:'L'},{first:'L',second:'R',extra:1}])expect(isCompleteAnswer(q,bad)).toBe(false);
  expect(parseImport(makeExport(responses))).toEqual(responses);
  expect(()=>parseImport({...makeExport(responses),modelVersion:'S21-scoring-v4.1-s4rpd-99f5e4ac3bbf'})).toThrow();
 });
 it('rejects partial or unknown responses before invoking the permissive reference scorer',()=>{
  expect(()=>score({})).toThrow();expect(()=>score({...responses,extra:1})).toThrow();
 });
});
