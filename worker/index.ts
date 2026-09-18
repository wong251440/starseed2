import {parseImport,validateResponses,MODEL_VERSION,APP_VERSION,SELECTION_VERSION,MODEL_FINGERPRINT,questionsForMode,responseMode,wordingVersionsForMode,hasActiveWordingVersions} from '../src/shared/questionnaire';
import {scorePRCS,validateAnswers} from './prcs';
import {scoreQuick,validateQuick} from './prcs-quick';
import {score} from './rpcs';
import {CALIBRATION_VERSION} from './prcs-calibration';
import HASHES from './prcs-hashes.json';
import civs from '../src/data/civilizations.json';
interface Env { DB: D1Database; ASSETS: Fetcher; RATE_LIMITER?: RateLimit; BUILD_VERSION: string; ALLOWED_ORIGINS?: string }
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const json=(data: unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
function fail(message: string,status=400): never { throw Object.assign(new Error(message),{status}); }
function id(v: unknown) { if(typeof v!=='string'||!uuid.test(v)) fail('匿名識別碼格式不正確。'); return v as string; }
const hash=async(value:string)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)))).map(v=>v.toString(16).padStart(2,'0')).join('');
async function body(request:Request):Promise<Record<string,unknown>> {
 if(!request.headers.get('content-type')?.startsWith('application/json')) fail('請使用 JSON 格式。',415);
 const reader=request.body?.getReader(); if(!reader) fail('缺少資料。');
 const chunks:Uint8Array[]=[];let length=0;
 while(true){const {done,value}=await reader!.read();if(done)break;length+=value.byteLength;if(length>16384){await reader!.cancel();fail('提交資料過大。',413);}chunks.push(value);}
 const buffer=new Uint8Array(length);let offset=0;for(const chunk of chunks){buffer.set(chunk,offset);offset+=chunk.length;}
 let data;try{data=JSON.parse(new TextDecoder().decode(buffer));}catch{fail('JSON 格式不正確。');}
 if(!data||typeof data!=='object'||Array.isArray(data))fail('資料格式不正確。');return data;
}
function date(v:unknown){if(typeof v!=='string'||!Number.isFinite(Date.parse(v)))fail('時間格式不正確。');return v as string;}
function referral(v:unknown){if(v===undefined||v===null)return null;if(typeof v!=='string'||!/^[A-Za-z0-9_-]{1,64}$/.test(v))fail('來源代碼格式不正確。');return v;}
function pretest(v:unknown){if(v===undefined||v===null)return null;if(!v||typeof v!=='object'||Array.isArray(v))fail('測驗前認同資料格式不正確。');const data=v as Record<string,unknown>,familiarity=data.familiarity,priorIdentity=data.priorIdentity,priorLineage=data.priorLineage;if(!['none','some','expert'].includes(familiarity as string)||!['yes','no','unsure'].includes(priorIdentity as string)||!(priorLineage===null||(typeof priorLineage==='number'&&Number.isInteger(priorLineage)&&civs.some(c=>c.id===priorLineage)) )||(priorIdentity==='yes'&&priorLineage===null)||(priorIdentity!=='yes'&&priorLineage!==null))fail('測驗前認同資料格式不正確。');return {familiarity:familiarity as string,priorIdentity:priorIdentity as string,priorLineage:priorLineage as number|null};}
function compactMetrics(result:ReturnType<typeof score>){const raw=result.diagnostic.raw;const common={status:raw.status,selection_version:raw.selection_version,model_fingerprint:raw.model_fingerprint,calibration_version:raw.calibration_version,context_taxonomy_version:raw.context_taxonomy_version,response_counts:raw.response_counts,total_items:raw.total_items};if(raw.status==='INSUFFICIENT_SIGNAL')return common;return {...common,primary_similarity:raw.primary_similarity,runner_up_similarity:raw.runner_up_similarity,global_margin:raw.global_margin,basin_depth:raw.basin_depth,nearest_boundary:raw.nearest_boundary,response_amplitude:raw.response_amplitude,information_coverage:raw.information_coverage,boundary_conflict:raw.boundary_conflict,evidence_consistency:raw.evidence_consistency,registered_suite:raw.registered_suite};}
export default {
 async fetch(request:Request,env:Env):Promise<Response>{
 const path=new URL(request.url).pathname;
 if(!path.startsWith('/api/'))return env.ASSETS.fetch(request);
 try{
 if(path==='/api/health'&&request.method==='GET'){await env.DB.prepare('SELECT 1').first();return json({ok:true,modelVersion:MODEL_VERSION,selectionVersion:SELECTION_VERSION,modelFingerprint:MODEL_FINGERPRINT,calibrationVersion:CALIBRATION_VERSION,buildVersion:env.BUILD_VERSION||APP_VERSION});}
 if(!['/api/score','/api/attempts','/api/feedback'].includes(path))return json({error:'找不到此服務。'},404);
 if(request.method!=='POST')return json({error:'請使用 POST。'},405);
 const origin=request.headers.get('origin');const allowedOrigins=(env.ALLOWED_ORIGINS||'').split(',').map(v=>v.trim()).filter(Boolean);if(origin&&origin!==new URL(request.url).origin&&!allowedOrigins.includes(origin))fail('請從本站提交。',403);
 if(env.RATE_LIMITER){const {success}=await env.RATE_LIMITER.limit({key:request.headers.get('CF-Connecting-IP')||'local'});if(!success)fail('提交次數較多，請稍後再試。',429);}
 const data=await body(request);
 if(path==='/api/score'){
  // Preserve the deployed site's wrapper contract; the authoritative answers API returns raw PRCS JSON.
  if('responses' in data){const mode=responseMode(data.responses,data.mode);validateResponses(data.responses,mode);return json({modelVersion:MODEL_VERSION,result:score(data.responses,mode)});}
  const answers='answers' in data?data.answers:data; if(data.mode!==undefined&&data.mode!=='quick'&&data.mode!=='full')fail('測驗模式不正確。'); const mode=data.mode==='quick'?'quick':'full'; if(mode==='quick'){validateQuick(answers);return json(scoreQuick(answers));} validateAnswers(answers);return json(scorePRCS(answers));
 }
 if(path==='/api/attempts'){
  if(data.demo===true)fail('範例不收集校準資料。');
  const responses=parseImport(data),attemptId=id(data.attemptId),participantId=id(data.participantId),tokenHash=await hash(id(data.feedbackToken));
  if(typeof data.imported!=='boolean')fail('缺少匯入狀態。');
  const startedAt=date(data.startedAt),completedAt=date(data.completedAt),duration=data.durationMs,referralCode=referral(data.referralCode),pretestData=pretest(data.pretest);
  if(typeof duration!=='number'||!Number.isSafeInteger(duration)||duration<0||duration>31536000000||Date.parse(completedAt)<Date.parse(startedAt)||Date.parse(completedAt)>Date.now()+300000||duration!==Date.parse(completedAt)-Date.parse(startedAt))fail('完成時間不正確。');
  const mode=responseMode(responses,data.mode);if(!hasActiveWordingVersions(data.itemVersions,mode))fail('題目文案版本與目前測驗不相容，請重新完成新版測驗。');
  const result=score(responses,mode),encoded=JSON.stringify({responses:Object.fromEntries(questionsForMode(mode).map(q=>[q.id,responses[q.id]])),item_versions:wordingVersionsForMode(mode)});
  const previous=await env.DB.prepare('SELECT participant_id,feedback_token_hash,raw_answers FROM attempts WHERE id=?').bind(attemptId).first<{participant_id:string;feedback_token_hash:string;raw_answers:string}>();
  if(previous){if(previous.participant_id!==participantId||previous.feedback_token_hash!==tokenHash||previous.raw_answers!==encoded)fail('這組提交識別碼已用於其他答案。',409);return json({attemptId,modelVersion:MODEL_VERSION,result,saved:true});}
  const metrics=compactMetrics(result),primary=result.public.primary,primaryId=primary?civs.find(c=>c.lineageId===primary.id)?.id:null;
  if(result.public.status==='classified'&&!primaryId)throw new Error('Unknown model lineage');
  await env.DB.batch([
   env.DB.prepare('INSERT INTO participants(id) VALUES(?) ON CONFLICT(id) DO NOTHING').bind(participantId),
   env.DB.prepare('INSERT INTO attempts(id,participant_id,feedback_token_hash,model_version,production_hashes,duration_ms,raw_answers,status,primary_id,scores,metrics,imported,build_version,referral_code,quiz_mode,pretest_familiarity,pretest_prior_identity,pretest_prior_lineage) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO NOTHING').bind(attemptId,participantId,tokenHash,MODEL_VERSION,JSON.stringify(HASHES),duration,encoded,result.public.status,primaryId??null,JSON.stringify(result.public.scores),JSON.stringify(metrics),data.imported?1:0,env.BUILD_VERSION||APP_VERSION,referralCode,mode,pretestData?.familiarity??null,pretestData?.priorIdentity??null,pretestData?.priorLineage??null)
  ]);
  const stored=await env.DB.prepare('SELECT participant_id,feedback_token_hash,raw_answers FROM attempts WHERE id=?').bind(attemptId).first<{participant_id:string;feedback_token_hash:string;raw_answers:string}>();
  if(!stored||stored.participant_id!==participantId||stored.feedback_token_hash!==tokenHash||stored.raw_answers!==encoded)fail('這組提交識別碼已用於其他答案。',409);
  return json({attemptId,modelVersion:MODEL_VERSION,result,saved:true},201);
 }
 const attemptId=id(data.attemptId),tokenHash=await hash(id(data.feedbackToken));
 const row=await env.DB.prepare('SELECT id,model_version,pretest_prior_identity,pretest_prior_lineage FROM attempts WHERE id=? AND feedback_token_hash=?').bind(attemptId,tokenHash).first<{id:string;model_version:string;pretest_prior_identity:string|null;pretest_prior_lineage:number|null}>();
 if(!row)fail('找不到可提交回饋的測驗，請先儲存結果。',404);
 if(typeof data.fit!=='number'||!Number.isInteger(data.fit)||data.fit<1||data.fit>7)fail('請選擇 1 至 7 的符合程度。');
 const priorIdentity=data.priorIdentity??row.pretest_prior_identity??'unsure',priorLineage=data.priorLineage??row.pretest_prior_lineage??null;const lineage=(v:unknown)=>v===null||(typeof v==='number'&&Number.isInteger(v)&&(row.model_version===MODEL_VERSION?civs.some(c=>c.id===v):v>=1&&v<=23));
 if(!lineage(data.selfLineage)||!lineage(priorLineage)||!['yes','no','unsure'].includes(priorIdentity as string)||typeof data.comment!=='string'||data.comment.length>2000||(priorIdentity!=='yes'&&priorLineage!==null))fail('回饋格式不正確。');
 await env.DB.prepare("INSERT INTO feedback(attempt_id,fit,self_lineage,prior_identity,prior_lineage,comment) VALUES(?,?,?,?,?,?) ON CONFLICT(attempt_id) DO UPDATE SET fit=excluded.fit,self_lineage=excluded.self_lineage,prior_identity=excluded.prior_identity,prior_lineage=excluded.prior_lineage,comment=excluded.comment,updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now')").bind(attemptId,data.fit,data.selfLineage,priorIdentity,priorLineage,data.comment).run();
 return json({saved:true});
 }catch(error){const e=error as Error&{status?:number};const status=e.status||(e.message.includes('答案')||e.message.includes('版本')||e.message.includes('JSON')?400:500);return json({error:status===500?'暫時無法儲存，答案仍保存在此裝置。請稍後重試。':e.message},status);}
 }
};
