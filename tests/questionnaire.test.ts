import {afterEach,describe,expect,it,vi} from 'vitest';
import {MODEL_VERSION,questions,isCompleteAnswer,validateResponses,parseImport,makeExport,answeredCount,type Responses} from '../src/shared/questionnaire';
import {DRAFT_KEY,loadDraft,legacyData} from '../src/shared/session';
import quiz from '../STARSEED_WEB_HANDOFF_MIN 2/quiz_model.json';
import demo from '../src/data/demo-responses.json';
afterEach(()=>vi.unstubAllGlobals());
const answers=()=>structuredClone(demo.responses) as Responses;
describe('PRCS question and storage contract',()=>{
 it('renders all 60 frozen UIDs, prompts and left/right text exactly',()=>{
  expect(MODEL_VERSION).toBe('PRCS-v2.0');
  expect(questions).toEqual(quiz.items.map(q=>({id:q.uid,stem:q.prompt,format:'BIP',left:q.left_text,right:q.right_text})));
  expect(questions).toHaveLength(60);
 });
 it('requires complete 1..7 answers for saved attempts and rejects unknown UIDs',()=>{
  const valid=answers();expect(()=>validateResponses(valid)).not.toThrow();
  const missing=answers();delete missing[questions[0].id];
  for(const bad of [null,[],missing,{...valid,unknown:4}])expect(()=>validateResponses(bad)).toThrow();
  for(const value of [0,8,1.5,'4',true,null,{}, {best:'A',worst:'B'}])expect(isCompleteAnswer(questions[0],value)).toBe(false);
 });
 it('counts midpoint as answered and omitted as missing',()=>{
  expect(answeredCount({[questions[0].id]:4})).toBe(1);
  expect(answeredCount({})).toBe(0);
 });
 it('roundtrips exports and rejects deployed old questionnaire data',()=>{
  expect(parseImport(makeExport(answers()))).toEqual(answers());
  for(const version of ['RPCS-starseed-quiz-min-v1','S21-scoring-v4.1-s4rpd-99f5e4ac3bbf'])expect(()=>parseImport({schemaVersion:4,modelVersion:version,responses:answers()})).toThrow('不同測驗版本');
 });
 it('restores progress without overwriting historical data',()=>{
  const draft={modelVersion:MODEL_VERSION,responses:{[questions[0].id]:4},index:28,startedAt:'2026-09-07T00:00:00Z'};
  const entries:Record<string,string>={[DRAFT_KEY]:JSON.stringify(draft),'starseed2-attempt':JSON.stringify({modelVersion:'old',answers:Array(80).fill(1)})};
  const setItem=vi.fn();vi.stubGlobal('localStorage',{getItem:(key:string)=>entries[key]??null,setItem});
  expect(loadDraft()).toEqual(draft);expect(legacyData()?.attempt).not.toBeNull();expect(setItem).not.toHaveBeenCalled();
 });
});
