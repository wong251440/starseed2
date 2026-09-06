import {afterEach,describe,expect,it,vi} from 'vitest';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {MemoryRouter} from 'react-router-dom';
import App from '../src/App';
import {freshDraft,newAttempt,type Draft,type Attempt} from '../src/shared/session';

afterEach(()=>vi.unstubAllGlobals());

function home(draft:Draft,attempt:Attempt|null=null){
 const entries:Record<string,string>={'starseed2-draft':JSON.stringify(draft),'starseed2-attempt':JSON.stringify(attempt)};
 vi.stubGlobal('localStorage',{getItem:(key:string)=>entries[key]??null});
 return renderToStaticMarkup(createElement(MemoryRouter,{initialEntries:['/']},createElement(App)));
}

function completed(){
 vi.stubGlobal('localStorage',{getItem:()=>null,setItem:()=>{}});
 const draft={...freshDraft(),startedAt:'2026-09-01T00:00:00.000Z',answers:Array(80).fill(1),index:79};
 return {draft,attempt:newAttempt(draft.answers,draft.startedAt,false)};
}

describe('Home journey actions',()=>{
 it('does not offer resume before answering any questions',()=>{
  expect(home(freshDraft())).not.toContain('繼續上次的旅程');
 });

 it('offers resume for a new visitor with saved answers, including neutral answers',()=>{
  const draft=freshDraft();draft.answers[0]=0;
  expect(home(draft)).toContain('繼續上次的旅程');
 });

 it('offers resume alongside the previous result and restart after a partial retake',()=>{
  const {attempt}=completed(),draft=freshDraft();draft.answers[0]=0;draft.answers[1]=-2;draft.index=2;
  const html=home(draft,attempt);
  expect(html).toContain('繼續上次的旅程');
  expect(html.match(/<a\b[^>]*class="resume-link"[^>]*>/)?.[0]).toContain('href="/quiz"');
  expect(html).toContain('查看我的結果');
  expect(html).toContain('重新測驗');
 });

 it('does not offer resume for an empty retake or the already completed draft',()=>{
  const {draft,attempt}=completed();
  expect(home(freshDraft(),attempt)).not.toContain('繼續上次的旅程');
  expect(home(draft,attempt)).not.toContain('繼續上次的旅程');
 });

 it('offers resume when all retake answers are filled but the report has not been opened',()=>{
  const {draft,attempt}=completed();
  expect(home({...draft,startedAt:'2026-09-02T00:00:00.000Z'},attempt)).toContain('繼續上次的旅程');
 });

 it('offers resume for changes to the previous answers',()=>{
  const {draft,attempt}=completed();draft.answers[0]=-1;
  expect(home(draft,attempt)).toContain('繼續上次的旅程');
 });
});
