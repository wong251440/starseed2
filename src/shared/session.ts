import {MODEL_VERSION,SCHEMA_VERSION,APP_VERSION,questions,validateResponses,isDraftAnswer,type Responses,type DraftResponses} from './questionnaire';
import type {ScoringResult} from './result';
export const DRAFT_KEY='starseed21-v4-draft';
export const ATTEMPT_KEY='starseed21-v4-attempt';
export type Draft={modelVersion:string;responses:DraftResponses;index:number;startedAt:string};
export type Attempt={attemptId:string;participantId:string;feedbackToken:string;schemaVersion:number;modelVersion:string;responses:Responses;startedAt:string;completedAt:string;durationMs:number;imported:boolean;appVersion:string;saved:boolean;result?:ScoringResult};
export function read<T>(key:string):T|null{try{return JSON.parse(localStorage.getItem(key)||'null');}catch{return null;}}
export function write(key:string,value:unknown){try{localStorage.setItem(key,JSON.stringify(value));return true;}catch{return false;}}
export function freshDraft():Draft{return {modelVersion:MODEL_VERSION,responses:{},index:0,startedAt:new Date().toISOString()};}
export function loadDraft():Draft{
 const d=read<Draft>(DRAFT_KEY);
 if(d&&d.modelVersion===MODEL_VERSION&&d.responses&&typeof d.responses==='object'&&!Array.isArray(d.responses)&&Object.entries(d.responses).every(([id,value])=>{const q=questions.find(q=>q.id===id);return q&&isDraftAnswer(q,value);})&&Number.isInteger(d.index)&&d.index>=0&&d.index<questions.length&&Number.isFinite(Date.parse(d.startedAt)))return d;
 return freshDraft();
}
export function loadAttempt():Attempt|null{const a=read<Attempt>(ATTEMPT_KEY);try{if(!a||a.modelVersion!==MODEL_VERSION||a.schemaVersion!==SCHEMA_VERSION)return null;validateResponses(a.responses);return a;}catch{return null;}}
export function participant(){let p=read<string>('starseed2-participant');if(!p||!/^[0-9a-f-]{36}$/i.test(p)){p=crypto.randomUUID();write('starseed2-participant',p);}return p;}
export function newAttempt(responses:Responses,startedAt:string,imported:boolean):Attempt{validateResponses(responses);const completedAt=new Date().toISOString();return {attemptId:crypto.randomUUID(),participantId:participant(),feedbackToken:crypto.randomUUID(),schemaVersion:SCHEMA_VERSION,modelVersion:MODEL_VERSION,responses:structuredClone(responses),startedAt,completedAt,durationMs:Math.max(0,Date.parse(completedAt)-Date.parse(startedAt)),imported,appVersion:APP_VERSION,saved:false};}
export async function submitAttempt(a:Attempt){
 const response=await fetch('/api/attempts',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...a,result:undefined})});
 const data=await response.json() as {error?:string;modelVersion:string;result:ScoringResult};
 if(!response.ok)throw new Error(data.error||'暫時無法儲存，請稍後再試。');
 if(data.modelVersion!==MODEL_VERSION)throw new Error('計分版本核對未通過，請重新載入頁面。');
 return data;
}
export function legacyData(){
 const attempt=read<{modelVersion?:string;answers?:unknown}>('starseed2-attempt'),draft=read<{modelVersion?:string;answers?:unknown}>('starseed2-draft');
 const hasAnswers=(v:typeof attempt)=>v&&Array.isArray(v.answers)&&v.answers.length===80&&v.answers.some(x=>x!==null);
 if(!hasAnswers(attempt)&&!hasAnswers(draft))return null;
 return {format:'starseed-legacy-archive',attempt:hasAnswers(attempt)?attempt:null,draft:hasAnswers(draft)?draft:null};
}
