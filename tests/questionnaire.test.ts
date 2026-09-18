import {afterEach,describe,expect,it,vi} from 'vitest';
import {MODEL_VERSION,questions,questionsForMode,isCompleteAnswer,validateResponses,parseImport,makeExport,answeredCount,wordingVersionsForMode,type Responses} from '../src/shared/questionnaire';
import {DRAFT_KEY,loadDraft,legacyData} from '../src/shared/session';
import fullQuiz from '../models/full54.json';
import demo from '../src/data/demo-responses.json';
afterEach(()=>vi.unstubAllGlobals());
const answers=()=>structuredClone(demo.responses) as Responses;
describe('PRCS question and storage contract',()=>{
 it('renders the current full model UIDs, text and wording versions exactly',()=>{
  expect(MODEL_VERSION).toBe('PRCS-v2.0');
  expect(questions).toEqual(fullQuiz.items.map(q=>({id:q.uid,stem:q.prompt,wordingVersion:q.wording_version??1,format:'BIP',left:q.left_text,right:q.right_text})));
  expect(questions).toHaveLength(54);
  expect(questionsForMode('quick')).toHaveLength(24);
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
  expect(()=>parseImport(makeExport(answers(),Object.fromEntries(questions.map(q=>[q.id,1]))))).toThrow('題目文案版本');
 });
 it('restores progress without overwriting historical data',()=>{
  const draft={modelVersion:MODEL_VERSION,responses:{[questions[0].id]:4},index:28,startedAt:'2026-09-07T00:00:00Z'};
  const entries:Record<string,string>={[DRAFT_KEY]:JSON.stringify(draft),'starseed2-attempt':JSON.stringify({modelVersion:'old',answers:Array(80).fill(1)})};
  const setItem=vi.fn();vi.stubGlobal('localStorage',{getItem:(key:string)=>entries[key]??null,setItem});
  expect(loadDraft()).toEqual({...draft,mode:'full',referralCode:null,itemVersions:wordingVersionsForMode('full')});expect(legacyData()?.attempt).not.toBeNull();expect(setItem).not.toHaveBeenCalled();
 });
 it('clears only answers whose wording version changed before an old draft resumes',()=>{
  const draft={modelVersion:MODEL_VERSION,responses:{'A-05':4,'A-06':5},index:1,startedAt:'2026-09-07T00:00:00Z'};
  vi.stubGlobal('localStorage',{getItem:(key:string)=>key===DRAFT_KEY?JSON.stringify(draft):null});
  expect(loadDraft()).toEqual({...draft,mode:'full',responses:{'A-05':4},referralCode:null,itemVersions:wordingVersionsForMode('full')});
 });
});
