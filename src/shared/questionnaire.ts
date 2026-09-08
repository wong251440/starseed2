import quiz from '../../starseed_s4_web_handoff_v4_1_min/quiz.zh-Hant.json';
export const MODEL_VERSION='S21-scoring-v4.1-s4-f4521622d070';
export const APP_VERSION='2.1.0';
export const SCHEMA_VERSION=3;
export type Choice='A'|'B'|'C'|'D';
export type Priority=1|2|3;
export type Answer=number|{best:Choice;worst:Choice}|{operation:Priority;goal:Priority};
export type DraftAnswer=number|{best?:Choice;worst?:Choice}|{operation?:Priority;goal?:Priority};
export type Responses=Record<string,Answer>;
export type DraftResponses=Record<string,DraftAnswer>;
export type Question={id:string;stem:string}&({format:'BIP';left:string;right:string}|{format:'BWS';options:Record<Choice,string>}|{format:'CROSS';operation_prompt:string;operations:Record<Priority,string>;goal_prompt:string;goals:Record<Priority,string>});
export const questions=quiz.questions as Question[];
export const QUESTION_COUNT=questions.length;
export const instructions=quiz.format_instructions;
export const quizIntro=quiz.intro;
const record=(value:unknown):value is Record<string,unknown>=>Boolean(value)&&typeof value==='object'&&!Array.isArray(value);
const choice=(v:unknown):v is Choice=>typeof v==='string'&&['A','B','C','D'].includes(v);
const priority=(v:unknown):v is Priority=>Number.isInteger(v)&&Number(v)>=1&&Number(v)<=3;
export function isCompleteAnswer(question:Question,value:unknown):value is Answer{
 if(question.format==='BIP')return typeof value==='number'&&Number.isInteger(value)&&value>=1&&value<=7;
 if(!record(value))return false;
 if(question.format==='BWS')return choice(value.best)&&choice(value.worst)&&value.best!==value.worst;
 return priority(value.operation)&&priority(value.goal);
}
export function isDraftAnswer(question:Question,value:unknown):value is DraftAnswer{
 if(question.format==='BIP')return isCompleteAnswer(question,value);
 if(!record(value))return false;
 if(question.format==='BWS')return Object.keys(value).every(k=>k==='best'||k==='worst')&&(value.best===undefined||choice(value.best))&&(value.worst===undefined||choice(value.worst))&&(!value.best||!value.worst||value.best!==value.worst);
 return Object.keys(value).every(k=>k==='operation'||k==='goal')&&(value.operation===undefined||priority(value.operation))&&(value.goal===undefined||priority(value.goal));
}
export function validateResponses(value:unknown):asserts value is Responses{
 if(!record(value)||Object.keys(value).length!==QUESTION_COUNT||!questions.every(q=>isCompleteAnswer(q,value[q.id])))throw new Error(`答案必須依照題型完整回答 ${QUESTION_COUNT} 題，最像與最不像不可相同。`);
}
export function parseImport(value:unknown):Responses{
 if(!record(value))throw new Error('請選擇有效的答案 JSON 檔案。');
 if(value.schemaVersion!==SCHEMA_VERSION||value.modelVersion!==MODEL_VERSION)throw new Error('答案檔案屬於不同測驗版本，無法轉換為新版結果。請重新完成 60 題測驗。');
 validateResponses(value.responses);return value.responses;
}
export function makeExport(responses:Responses){validateResponses(responses);return {schemaVersion:SCHEMA_VERSION,modelVersion:MODEL_VERSION,responses};}
export function answeredCount(responses:DraftResponses){return questions.filter(q=>isCompleteAnswer(q,responses[q.id])).length;}
