import {afterEach,beforeEach,describe,expect,it} from 'vitest';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import worker from '../worker/index';
import {MODEL_VERSION,APP_VERSION,makeExport,type Responses} from '../src/shared/questionnaire';
import demo from '../src/data/demo-responses.json';
import {SCORING_MODEL_ASSET} from '../worker/scorer';
const oldSchema=readFileSync('migrations/0001_calibration.sql','utf8'),migration=readFileSync('migrations/0002_strict180.sql','utf8');
const assets={fetch:async()=>new Response(readFileSync(`public${SCORING_MODEL_ASSET}`))};
let db:DatabaseSync;
beforeEach(()=>{db=new DatabaseSync(':memory:');db.exec('PRAGMA foreign_keys=ON;'+oldSchema);});
afterEach(()=>db.close());
function migrate(){db.exec('BEGIN;'+migration+'COMMIT;');}
function env(){
 const statement=(sql:string,params:any[]=[])=>({bind:(...values:any[])=>statement(sql,values),first:async()=>db.prepare(sql).get(...params)??null,run:async()=>db.prepare(sql).run(...params)});
 return {ASSETS:assets,BUILD_VERSION:'test-v4.1',ALLOWED_ORIGINS:'https://starseed-steel.vercel.app',DB:{prepare:statement,batch:async(statements:ReturnType<typeof statement>[])=>{db.exec('BEGIN');try{const values=[];for(const s of statements)values.push(await s.run());db.exec('COMMIT');return values;}catch(e){db.exec('ROLLBACK');throw e;}}}} as unknown as Parameters<typeof worker.fetch>[1];
}
function request(path:string,value:unknown,origin='https://starseed-steel.vercel.app'){
 return new Request('https://test.local'+path,{method:'POST',headers:{'Content-Type':'application/json',Origin:origin},body:JSON.stringify(value)});
}
function payload(){return {...makeExport(demo.responses as Responses),attemptId:crypto.randomUUID(),participantId:crypto.randomUUID(),feedbackToken:crypto.randomUUID(),startedAt:'2026-09-01T00:00:00.000Z',completedAt:'2026-09-01T00:10:00.000Z',durationMs:600000,imported:false,appVersion:APP_VERSION};}
describe('Strict180 API and migration',()=>{
 it('preserves old attempts, removed civilization IDs and linked feedback',()=>{
  db.prepare('INSERT INTO participants(id) VALUES(?)').run('old-participant');
  db.prepare('INSERT INTO attempts(id,participant_id,feedback_token_hash,model_version,production_hashes,started_at,completed_at,duration_ms,raw_answers,status,primary_id,scores,metrics,imported,app_version,build_version) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)').run('old-attempt','old-participant','hash','v4.4','{}','2026-09-01','2026-09-01',0,JSON.stringify(Array(80).fill(1)),'SCORED',21,'[]','{}',0,'1.0.0','old');
  db.prepare('INSERT INTO feedback(attempt_id,fit,self_lineage,prior_identity,comment) VALUES(?,?,?,?,?)').run('old-attempt',7,22,'unsure','preserve');
  const old=db.prepare('SELECT * FROM attempts').get(),feedback=db.prepare('SELECT * FROM feedback').get();
  migrate();expect(db.prepare('SELECT * FROM attempts').get()).toEqual(old);expect(db.prepare('SELECT * FROM feedback').get()).toEqual(feedback);expect(db.prepare('PRAGMA foreign_key_check').all()).toEqual([]);
  expect(()=>db.prepare("UPDATE attempts SET status='classified',raw_answers='{}'").run()).toThrow();
 });
 it('scores without collecting sample/shared answers',async()=>{
  migrate();const response=await worker.fetch(request('/api/score',demo),env());
  expect(response.status).toBe(200);const data=await response.json() as any;
  expect(data.modelVersion).toBe(MODEL_VERSION);expect(data.result.public.primary.id).toBe('PL');expect(data.result.diagnostic.ranking).toHaveLength(21);expect(db.prepare('SELECT count(*) n FROM attempts').get()?.n).toBe(0);
 });
 it('recomputes results, saves new data idempotently and rejects changed answers for the same attempt',async()=>{
  migrate();const a=payload(),e=env();
  const response=await worker.fetch(request('/api/attempts',{...a,result:{primary:'forged'},scores:[]}),e);
  expect(response.status).toBe(201);const data=await response.json() as any;expect(data.result.public.primary.id).toBe('PL');
  const stored=db.prepare('SELECT * FROM attempts').get() as any;expect(stored.primary_id).toBe(1);expect(stored.model_version).toBe(MODEL_VERSION);expect(JSON.parse(stored.raw_answers)).toEqual(demo);expect(JSON.parse(stored.metrics).classification_stability.index).toBeCloseTo(data.result.public.stability.index,10);
  expect((await worker.fetch(request('/api/attempts',a),e)).status).toBe(200);
  expect((await worker.fetch(request('/api/attempts',{...a,responses:{...a.responses,'A2-B04':1}}),e)).status).toBe(409);
  expect(db.prepare('SELECT count(*) n FROM attempts').get()?.n).toBe(1);
 });
 it('requires full valid answers, current version and permitted origin',async()=>{
  migrate();const e=env();
  for(const invalid of [{responses:{}},{responses:{...demo.responses,'A2-W08':{best:'A',worst:'A'}}},{responses:{...demo.responses,'A2-C07':{operation:1}}}])expect((await worker.fetch(request('/api/score',invalid),e)).status).toBe(400);
  expect((await worker.fetch(request('/api/attempts',{...payload(),modelVersion:'old'}),e)).status).toBe(400);
  expect((await worker.fetch(request('/api/score',demo,'https://untrusted.example'),e)).status).toBe(403);
 });
 it('keeps feedback token protection and limits new lineage choices to the21 supported civilizations',async()=>{
  migrate();const a=payload(),e=env();await worker.fetch(request('/api/attempts',a),e);
  const feedback={attemptId:a.attemptId,feedbackToken:a.feedbackToken,fit:6,selfLineage:null,priorIdentity:'unsure',priorLineage:null,comment:'A test'};
  expect((await worker.fetch(request('/api/feedback',{...feedback,feedbackToken:crypto.randomUUID()}),e)).status).toBe(404);
  expect((await worker.fetch(request('/api/feedback',{...feedback,selfLineage:21}),e)).status).toBe(400);
  expect((await worker.fetch(request('/api/feedback',feedback),e)).status).toBe(200);
 });
});
