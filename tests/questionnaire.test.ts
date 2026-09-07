import {afterEach,describe,expect,it,vi} from 'vitest';
import {MODEL_VERSION,questions,isCompleteAnswer,validateResponses,parseImport,makeExport,answeredCount,type Responses} from '../src/shared/questionnaire';
import {DRAFT_KEY,loadDraft,legacyData} from '../src/shared/session';
import quiz from '../starseed_strict180_web_handoff_v4_1_min/quiz.zh-Hant.json';
import model from '../starseed_strict180_web_handoff_v4_1_min/model_v4_1.json';
import demo from '../src/data/demo-responses.json';
afterEach(()=>vi.unstubAllGlobals());
const answers=()=>structuredClone(demo.responses) as Responses;
describe('Strict180 question and storage contract',()=>{
 it('uses the exact frozen order and 24/19/17 format mix',()=>{
  expect(MODEL_VERSION).toBe(model.model_version);
  expect(questions.map(q=>q.id)).toEqual(quiz.display_order);
  expect(questions.map(q=>q.id)).toEqual(model.selection_ids);
  expect(['BIP','BWS','CROSS'].map(f=>questions.filter(q=>q.format===f).length)).toEqual([24,19,17]);
 });
 it('requires all60 answers and rejects unknown or malformed responses',()=>{
  const valid=answers();expect(()=>validateResponses(valid)).not.toThrow();
  const missing=answers();delete missing[questions[0].id];
  for(const bad of [null,[],missing,{...valid,unknown:4}])expect(()=>validateResponses(bad)).toThrow();
  const b=questions.find(q=>q.format==='BIP')!,w=questions.find(q=>q.format==='BWS')!,c=questions.find(q=>q.format==='CROSS')!;
  for(const value of [0,8,1.5,'4',true,null,{}])expect(isCompleteAnswer(b,value)).toBe(false);
  for(const value of [{best:'A'}, {best:'A',worst:'A'},{best:'E',worst:'A'},4])expect(isCompleteAnswer(w,value)).toBe(false);
  for(const value of [{operation:1},{operation:0,goal:1},{operation:1,goal:4},{operation:true,goal:1},{operation:'1',goal:2}])expect(isCompleteAnswer(c,value)).toBe(false);
 });
 it('does not count a partial BWS/CROSS answer as complete',()=>{
  const w=questions.find(q=>q.format==='BWS')!,c=questions.find(q=>q.format==='CROSS')!;
  expect(answeredCount({[w.id]:{best:'A'},[c.id]:{operation:1}})).toBe(0);
 });
 it('roundtrips versioned exports and rejects old model answers',()=>{
  const responses=answers();expect(parseImport(makeExport(responses))).toEqual(responses);
  expect(()=>parseImport({schemaVersion:1,modelVersion:'starseed-v4.4-phase6b-prod-20260905',answers:Array(80).fill(1)})).toThrow('不同測驗版本');
 });
 it('restores partial responses and navigation without overwriting legacy data',()=>{
  const w=questions.find(q=>q.format==='BWS')!;
  const draft={modelVersion:MODEL_VERSION,responses:{[w.id]:{best:'D'}},index:24,startedAt:'2026-09-07T00:00:00Z'};
  const entries:Record<string,string>={[DRAFT_KEY]:JSON.stringify(draft),'starseed2-attempt':JSON.stringify({modelVersion:'old',answers:Array(80).fill(1)})};
  const setItem=vi.fn();vi.stubGlobal('localStorage',{getItem:(key:string)=>entries[key]??null,setItem});
  expect(loadDraft()).toEqual(draft);expect(legacyData()?.attempt).not.toBeNull();expect(setItem).not.toHaveBeenCalled();
 });
});
