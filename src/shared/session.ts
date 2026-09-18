import {MODEL_VERSION,SCHEMA_VERSION,responseMode,validateResponses,isDraftAnswer,type Responses,type DraftResponses,type QuizMode,questionsForMode,wordingVersionsForMode} from './questionnaire';
import type {ScoringResult} from './result';
export const DRAFT_KEY='starseed21-prcs-v2-draft';
export const ATTEMPT_KEY='starseed21-prcs-v2-attempt';
export const REFERRAL_KEY='starseed21-referral';
export type Pretest={familiarity:'none'|'some'|'expert';priorIdentity:'yes'|'no'|'unsure';priorLineage:number|null};
export type Draft={modelVersion:string;mode:QuizMode;responses:DraftResponses;index:number;startedAt:string;referralCode:string|null;itemVersions:Record<string,number>};
export type Attempt={mode:QuizMode;attemptId:string;participantId:string;feedbackToken:string;schemaVersion:number;modelVersion:string;responses:Responses;startedAt:string;completedAt:string;durationMs:number;imported:boolean;referralCode:string|null;itemVersions?:Record<string,number>;pretest?:Pretest;reportIntroSeen?:boolean;saved:boolean;result?:ScoringResult};
export function read<T>(key:string):T|null{try{return JSON.parse(localStorage.getItem(key)||'null');}catch{return null;}}
export function write(key:string,value:unknown){try{localStorage.setItem(key,JSON.stringify(value));return true;}catch{return false;}}
export function captureReferral(search:string){const ref=new URLSearchParams(search).get('ref')?.trim();if(ref&&/^[A-Za-z0-9_-]{1,64}$/.test(ref))write(REFERRAL_KEY,ref);}
export function referralCode(){const ref=read<string>(REFERRAL_KEY);return typeof ref==='string'&&/^[A-Za-z0-9_-]{1,64}$/.test(ref)?ref:null;}
export function freshDraft(mode:QuizMode='full'):Draft{return {modelVersion:MODEL_VERSION,mode,responses:{},index:0,startedAt:new Date().toISOString(),referralCode:referralCode(),itemVersions:wordingVersionsForMode(mode)};}
export function loadDraft():Draft{
 const d=read<Draft>(DRAFT_KEY);
 if(d&&d.modelVersion===MODEL_VERSION&&d.responses&&typeof d.responses==='object'&&!Array.isArray(d.responses)){
  const modes:QuizMode[]=d.mode==='quick'||d.mode==='full'?[d.mode]:['full','quick'];
  for(const mode of modes){if(Object.entries(d.responses).every(([id,value])=>{const q=questionsForMode(mode).find(q=>q.id===id);return q&&isDraftAnswer(q,value);})&&Number.isInteger(d.index)&&d.index>=0&&d.index<questionsForMode(mode).length&&Number.isFinite(Date.parse(d.startedAt))){const itemVersions=wordingVersionsForMode(mode),responses={...d.responses};for(const question of questionsForMode(mode))if((d.itemVersions?.[question.id]??1)!==itemVersions[question.id])delete responses[question.id];return {...d,mode,responses,itemVersions,referralCode:typeof d.referralCode==='string'||d.referralCode===null?d.referralCode:referralCode()};}}
 }
 return freshDraft();
}
export function loadAttempt():Attempt|null{const a=read<Attempt>(ATTEMPT_KEY);try{if(!a||a.modelVersion!==MODEL_VERSION||a.schemaVersion!==SCHEMA_VERSION)return null;const mode=responseMode(a.responses,a.mode);return {...a,mode,reportIntroSeen:typeof a.reportIntroSeen==='boolean'?a.reportIntroSeen:Boolean(a.saved)};}catch{return null;}}
export function participant(){let p=read<string>('starseed2-participant');if(!p||!/^[0-9a-f-]{36}$/i.test(p)){p=crypto.randomUUID();write('starseed2-participant',p);}return p;}
export function newAttempt(responses:Responses,startedAt:string,imported:boolean,mode:QuizMode='full',lockedReferralCode:string|null=referralCode()):Attempt{validateResponses(responses,mode);const completedAt=new Date().toISOString();return {mode,attemptId:crypto.randomUUID(),participantId:participant(),feedbackToken:crypto.randomUUID(),schemaVersion:SCHEMA_VERSION,modelVersion:MODEL_VERSION,responses:structuredClone(responses),startedAt,completedAt,durationMs:Math.max(0,Date.parse(completedAt)-Date.parse(startedAt)),imported,referralCode:lockedReferralCode,itemVersions:wordingVersionsForMode(mode),reportIntroSeen:false,saved:false};}
export async function submitAttempt(a:Attempt){
 const response=await fetch('/api/attempts',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...a,mode:responseMode(a.responses,a.mode),result:undefined})});
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
