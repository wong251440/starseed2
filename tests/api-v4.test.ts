import {afterEach,beforeEach,describe,expect,it} from 'vitest';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import worker from '../worker/index';
import {MODEL_VERSION,makeExport,type Responses} from '../src/shared/questionnaire';
import demo from '../src/data/demo-responses.json';
const oldSchema=readFileSync('migrations/0001_calibration.sql','utf8'),migration=readFileSync('migrations/0002_strict180.sql','utf8')+readFileSync('migrations/0003_referral_code.sql','utf8')+readFileSync('migrations/0004_attempt_metadata.sql','utf8');
const assets={fetch:async()=>new Response('unused')};
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
function payload(){return {...makeExport(demo.responses as Responses),attemptId:crypto.randomUUID(),participantId:crypto.randomUUID(),feedbackToken:crypto.randomUUID(),startedAt:'2026-09-01T00:00:00.000Z',completedAt:'2026-09-01T00:10:00.000Z',durationMs:600000,imported:false};}
describe('PRCS API and historical migration',()=>{
 it('preserves old attempts, removed civilization IDs and linked feedback',()=>{
  db.prepare('INSERT INTO participants(id) VALUES(?)').run('old-participant');
  db.prepare('INSERT INTO attempts(id,participant_id,feedback_token_hash,model_version,production_hashes,started_at,completed_at,duration_ms,raw_answers,status,primary_id,scores,metrics,imported,app_version,build_version) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)').run('old-attempt','old-participant','hash','v4.4','{}','2026-09-01','2026-09-01',0,JSON.stringify(Array(80).fill(1)),'SCORED',21,'[]','{}',0,'1.0.0','old');
  db.prepare('INSERT INTO feedback(attempt_id,fit,self_lineage,prior_identity,comment) VALUES(?,?,?,?,?)').run('old-attempt',7,22,'unsure','preserve');
  const old=db.prepare('SELECT * FROM attempts').get(),feedback=db.prepare('SELECT * FROM feedback').get();
  migrate();const migrated=db.prepare('SELECT * FROM attempts').get() as Record<string,unknown>;expect(migrated).toMatchObject({id:old.id,participant_id:old.participant_id,feedback_token_hash:old.feedback_token_hash,model_version:old.model_version,production_hashes:old.production_hashes,received_at:old.received_at,duration_ms:old.duration_ms,raw_answers:old.raw_answers,status:old.status,primary_id:old.primary_id,scores:old.scores,metrics:old.metrics,imported:old.imported,build_version:old.build_version,referral_code:null,quiz_mode:'full',pretest_familiarity:null,pretest_prior_identity:null,pretest_prior_lineage:null});expect(migrated).not.toHaveProperty('started_at');expect(migrated).not.toHaveProperty('completed_at');expect(migrated).not.toHaveProperty('app_version');expect(db.prepare('SELECT * FROM feedback').get()).toEqual(feedback);expect(db.prepare('PRAGMA foreign_key_check').all()).toEqual([]);
  expect(()=>db.prepare("UPDATE attempts SET status='classified',raw_answers='{}'").run()).toThrow();
 });
 it('returns authoritative raw JSON for answers/direct bodies without collecting data',async()=>{
  migrate();const e=env();
  for(const body of [{answers:demo.responses},demo.responses]){
   const response=await worker.fetch(request('/api/score',body),e);expect(response.status).toBe(200);
   const d=await response.json() as any;expect(d.model_version).toBe('PRCS-v2.0');expect(d.selection_version).toBe('V4-RPCB-FULL54');expect(d.model_fingerprint).toBe('b2b0cdfa11aca0a28ac195352784fdd8a67ac4f6838c644914127673184dfed6');expect(d.primary).toBe('PL');expect(d.item_dropout_robustness.by_k['3'].scenario_count).toBe(24804);
  }
  const partial=await worker.fetch(request('/api/score',{answers:{'A-05':null,'D-08':4}}),e);expect(partial.status).toBe(200);expect((await partial.json() as any).status).toBe('INSUFFICIENT_SIGNAL');
  for(const answers of [{'A-05':'4'},{'A-05':true},{unknown:4},[],{'A-05':{best:'A'}}])expect((await worker.fetch(request('/api/score',{answers}),e)).status).toBe(400);
  expect(db.prepare('SELECT count(*) n FROM attempts').get()?.n).toBe(0);
 });
 it('preserves the deployed responses wrapper without collecting sample/shared answers',async()=>{
  migrate();const response=await worker.fetch(request('/api/score',demo),env());
  expect(response.status).toBe(200);const data=await response.json() as any;
  expect(data.modelVersion).toBe(MODEL_VERSION);expect(data.result.public.primary.id).toBe('PL');expect(data.result.diagnostic.ranking).toHaveLength(21);expect(db.prepare('SELECT count(*) n FROM attempts').get()?.n).toBe(0);
 });
 it('recomputes results, saves new data idempotently and rejects changed answers for the same attempt',async()=>{
  migrate();const a=payload(),e=env();
  const response=await worker.fetch(request('/api/attempts',{...a,result:{primary:'forged'},scores:[]}),e);
  expect(response.status).toBe(201);const data=await response.json() as any;expect(data.result.public.primary.id).toBe('PL');
  const stored=db.prepare('SELECT * FROM attempts').get() as any;expect(stored.primary_id).toBe(1);expect(stored.model_version).toBe(MODEL_VERSION);expect(stored.referral_code).toBeNull();expect(stored.quiz_mode).toBe('full');expect(JSON.parse(stored.raw_answers)).toEqual(demo);const metrics=JSON.parse(stored.metrics);expect(metrics).toMatchObject({model_fingerprint:data.result.diagnostic.raw.model_fingerprint,global_margin:data.result.diagnostic.raw.global_margin,information_coverage:data.result.diagnostic.raw.information_coverage});expect(metrics).not.toHaveProperty('raw');
  expect((await worker.fetch(request('/api/attempts',a),e)).status).toBe(200);
  expect((await worker.fetch(request('/api/attempts',{...a,responses:{...a.responses,'A-05':2}}),e)).status).toBe(409);
  expect(db.prepare('SELECT count(*) n FROM attempts').get()?.n).toBe(1);
 });
 it('stores a start-locked referral, mode and pre-result identity data with the anonymous result',async()=>{
  migrate();const a=payload(),e=env();
  expect((await worker.fetch(request('/api/attempts',{...a,referralCode:'kol_amy-2026',pretest:{familiarity:'some',priorIdentity:'yes',priorLineage:1}}),e)).status).toBe(201);
  expect(db.prepare('SELECT referral_code,quiz_mode,pretest_familiarity,pretest_prior_identity,pretest_prior_lineage FROM attempts').get()).toEqual({referral_code:'kol_amy-2026',quiz_mode:'full',pretest_familiarity:'some',pretest_prior_identity:'yes',pretest_prior_lineage:1});
  expect((await worker.fetch(request('/api/attempts',{...payload(),referralCode:'not valid'}),e)).status).toBe(400);
  expect((await worker.fetch(request('/api/attempts',{...payload(),pretest:{familiarity:'some',priorIdentity:'yes',priorLineage:null}}),e)).status).toBe(400);
 });
 it('requires full valid answers, current version and permitted origin',async()=>{
  migrate();const e=env();
  for(const invalid of [{responses:{}},{responses:{...demo.responses,'A-BW30':{best:'A',worst:'A'}}},{responses:{...demo.responses,'A-CP49':{operation:1}}}])expect((await worker.fetch(request('/api/score',invalid),e)).status).toBe(400);
  expect((await worker.fetch(request('/api/attempts',{...payload(),modelVersion:'old'}),e)).status).toBe(400);
  expect((await worker.fetch(request('/api/score',demo,'https://untrusted.example'),e)).status).toBe(403);
 });
 it('keeps feedback token protection and limits new lineage choices to the21 supported civilizations',async()=>{
  migrate();const a=payload(),e=env();await worker.fetch(request('/api/attempts',{...a,pretest:{familiarity:'expert',priorIdentity:'yes',priorLineage:1}}),e);
  const feedback={attemptId:a.attemptId,feedbackToken:a.feedbackToken,fit:6,selfLineage:null,comment:'A test'};
  expect((await worker.fetch(request('/api/feedback',{...feedback,feedbackToken:crypto.randomUUID()}),e)).status).toBe(404);
  expect((await worker.fetch(request('/api/feedback',{...feedback,selfLineage:21}),e)).status).toBe(400);
  expect((await worker.fetch(request('/api/feedback',feedback),e)).status).toBe(200);
  expect(db.prepare('SELECT prior_identity,prior_lineage FROM feedback').get()).toEqual({prior_identity:'yes',prior_lineage:1});
 });
});
