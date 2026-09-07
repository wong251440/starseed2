import {afterEach,describe,expect,it,vi} from 'vitest';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {MemoryRouter} from 'react-router-dom';
import App from '../src/App';
import {freshDraft,newAttempt,DRAFT_KEY,ATTEMPT_KEY,type Draft,type Attempt} from '../src/shared/session';
import {questions,type Responses} from '../src/shared/questionnaire';
import demo from '../src/data/demo-responses.json';
afterEach(()=>vi.unstubAllGlobals());
function home(draft:Draft,attempt:Attempt|null=null){
 const entries:Record<string,string>={[DRAFT_KEY]:JSON.stringify(draft),[ATTEMPT_KEY]:JSON.stringify(attempt)};
 vi.stubGlobal('localStorage',{getItem:(key:string)=>entries[key]??null});
 return renderToStaticMarkup(createElement(MemoryRouter,{initialEntries:['/']},createElement(App)));
}
function completed(){
 vi.stubGlobal('localStorage',{getItem:()=>null,setItem:()=>{}});
 const draft={...freshDraft(),startedAt:'2026-09-01T00:00:00.000Z',responses:structuredClone(demo.responses) as Responses,index:59};
 return {draft,attempt:newAttempt(draft.responses,draft.startedAt,false)};
}
describe('Home journey actions',()=>{
 it('does not offer resume before answering',()=>expect(home(freshDraft())).not.toContain('繼續上次的旅程'));
 it('offers resume for neutral and partial multistep responses',()=>{
  const draft=freshDraft();draft.responses[questions[0].id]=4;
  expect(home(draft)).toContain('繼續上次的旅程');
  draft.responses={[questions.find(q=>q.format==='BWS')!.id]:{best:'A'}};
  expect(home(draft)).toContain('繼續上次的旅程');
 });
 it('offers resume alongside previous result and restart after a partial retake',()=>{
  const {attempt}=completed(),draft=freshDraft();draft.responses[questions[0].id]=4;draft.index=1;
  const html=home(draft,attempt);
  expect(html).toContain('繼續上次的旅程');
  expect(html.match(/<a\b[^>]*class="resume-link"[^>]*>/)?.[0]).toContain('href="/quiz"');
  expect(html).toContain('查看我的結果');expect(html).toContain('重新測驗');
 });
 it('does not offer resume for empty retake or completed draft',()=>{
  const {draft,attempt}=completed();expect(home(freshDraft(),attempt)).not.toContain('繼續上次的旅程');expect(home(draft,attempt)).not.toContain('繼續上次的旅程');
 });
 it('offers resume for a fully answered retake before opening report',()=>{
  const {draft,attempt}=completed();expect(home({...draft,startedAt:'2026-09-02T00:00:00.000Z'},attempt)).toContain('繼續上次的旅程');
 });
 it('offers resume for changed previous answers',()=>{
  const {draft,attempt}=completed();draft.responses[questions[0].id]=1;expect(home(draft,attempt)).toContain('繼續上次的旅程');
 });
});
