import {scoreAnswers, parseImport, MODEL_VERSION, HASHES, APP_VERSION} from '../src/shared/scoring';
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
export default {
 async fetch(request:Request,env:Env):Promise<Response>{
 const path=new URL(request.url).pathname;
 if(!path.startsWith('/api/'))return env.ASSETS.fetch(request);
 try{
 if(path==='/api/health'&&request.method==='GET'){await env.DB.prepare('SELECT 1').first();return json({ok:true,modelVersion:MODEL_VERSION,appVersion:APP_VERSION,buildVersion:env.BUILD_VERSION});}
 if(!['/api/attempts','/api/feedback'].includes(path))return json({error:'找不到此服務。'},404);
 if(request.method!=='POST')return json({error:'請使用 POST。'},405);
 const origin=request.headers.get('origin');const allowedOrigins=(env.ALLOWED_ORIGINS||'').split(',').map(v=>v.trim()).filter(Boolean);if(origin&&origin!==new URL(request.url).origin&&!allowedOrigins.includes(origin))fail('請從本站提交。',403);
 if(env.RATE_LIMITER){const {success}=await env.RATE_LIMITER.limit({key:request.headers.get('CF-Connecting-IP')||'local'});if(!success)fail('提交次數較多，請稍後再試。',429);}
 const data=await body(request);
 if(path==='/api/attempts'){
  if(data.demo===true)fail('範例不收集校準資料。');
  const answers=parseImport(data),attemptId=id(data.attemptId),participantId=id(data.participantId),tokenHash=await hash(id(data.feedbackToken));
  if(typeof data.imported!=='boolean')fail('缺少匯入狀態。');
  const startedAt=date(data.startedAt),completedAt=date(data.completedAt),duration=data.durationMs;
  if(typeof duration!=='number'||!Number.isSafeInteger(duration)||duration<0||duration>31536000000||Date.parse(completedAt)<Date.parse(startedAt)||Date.parse(completedAt)>Date.now()+300000||duration!==Date.parse(completedAt)-Date.parse(startedAt))fail('完成時間不正確。');
  const result=scoreAnswers(answers),encoded=JSON.stringify(answers);
  const previous=await env.DB.prepare('SELECT participant_id,feedback_token_hash,raw_answers FROM attempts WHERE id=?').bind(attemptId).first<{participant_id:string;feedback_token_hash:string;raw_answers:string}>();
  if(previous){if(previous.participant_id!==participantId||previous.feedback_token_hash!==tokenHash||previous.raw_answers!==encoded)fail('這組提交識別碼已用於其他答案。',409);return json({attemptId,result,saved:true});}
  const metrics=result.status==='SCORED'?{comparator:result.comparator,rawGap:result.rawGap,decisionGap:result.decisionGap,rho:result.rho,delta:result.delta,boundaryMargin:result.boundaryMargin,separationIndex:result.separationIndex,tiedIds:result.tiedIds}:{};
  await env.DB.batch([
   env.DB.prepare('INSERT INTO participants(id) VALUES(?) ON CONFLICT(id) DO NOTHING').bind(participantId),
   env.DB.prepare('INSERT INTO attempts(id,participant_id,feedback_token_hash,model_version,production_hashes,started_at,completed_at,duration_ms,raw_answers,status,primary_id,scores,metrics,imported,app_version,build_version) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO NOTHING').bind(attemptId,participantId,tokenHash,MODEL_VERSION,JSON.stringify(HASHES),startedAt,completedAt,duration,encoded,result.status,result.status==='SCORED'?result.primary:null,JSON.stringify(result.status==='SCORED'?result.scores:[]),JSON.stringify(metrics),data.imported?1:0,APP_VERSION,env.BUILD_VERSION||APP_VERSION)
  ]);
  const stored=await env.DB.prepare('SELECT participant_id,feedback_token_hash,raw_answers FROM attempts WHERE id=?').bind(attemptId).first<{participant_id:string;feedback_token_hash:string;raw_answers:string}>();
  if(!stored||stored.participant_id!==participantId||stored.feedback_token_hash!==tokenHash||stored.raw_answers!==encoded)fail('這組提交識別碼已用於其他答案。',409);
  return json({attemptId,result,saved:true},201);
 }
 const attemptId=id(data.attemptId),tokenHash=await hash(id(data.feedbackToken));
 const row=await env.DB.prepare('SELECT id FROM attempts WHERE id=? AND feedback_token_hash=?').bind(attemptId,tokenHash).first();
 if(!row)fail('找不到可提交回饋的測驗，請先儲存結果。',404);
 if(typeof data.fit!=='number'||!Number.isInteger(data.fit)||data.fit<1||data.fit>7)fail('請選擇 1 至 7 的符合程度。');
 const lineage=(v:unknown)=>v===null||(typeof v==='number'&&Number.isInteger(v)&&v>=1&&v<=23);
 if(!lineage(data.selfLineage)||!lineage(data.priorLineage)||!['yes','no','unsure'].includes(data.priorIdentity as string)||typeof data.comment!=='string'||data.comment.length>2000||(data.priorIdentity!=='yes'&&data.priorLineage!==null))fail('回饋格式不正確。');
 await env.DB.prepare("INSERT INTO feedback(attempt_id,fit,self_lineage,prior_identity,prior_lineage,comment) VALUES(?,?,?,?,?,?) ON CONFLICT(attempt_id) DO UPDATE SET fit=excluded.fit,self_lineage=excluded.self_lineage,prior_identity=excluded.prior_identity,prior_lineage=excluded.prior_lineage,comment=excluded.comment,updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now')").bind(attemptId,data.fit,data.selfLineage,data.priorIdentity,data.priorLineage,data.comment).run();
 return json({saved:true});
 }catch(error){const e=error as Error&{status?:number};const status=e.status||(e.message.includes('答案')||e.message.includes('版本')||e.message.includes('JSON')?400:500);return json({error:status===500?'暫時無法儲存，答案仍保存在此裝置。請稍後重試。':e.message},status);}
 }
};
