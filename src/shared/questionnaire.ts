import quiz from '../../starseed_quiz_min_v1/quiz.json';
export const MODEL_VERSION='RPCS-starseed-quiz-min-v1';
export const APP_VERSION='3.0.0';
export const SCHEMA_VERSION=4;
export type Choice='A'|'B'|'C'|'D';
export type Priority=1|2|3;
export type Side='L'|'R';
export type Answer=number|{best:Choice;worst:Choice}|{operation:Priority;goal:Priority}|{first:Side;second:Side};
export type DraftAnswer=number|{best?:Choice;worst?:Choice}|{operation?:Priority;goal?:Priority}|{first?:Side;second?:Side};
export type Responses=Record<string,Answer>;
export type DraftResponses=Record<string,DraftAnswer>;
export type Question={id:string;stem:string}&({format:'BIP';left:string;right:string}|{format:'BWS';options:Record<Choice,string>}|{format:'CROSS';operation_prompt:string;operations:Record<Priority,string>;goal_prompt:string;goals:Record<Priority,string>}|{format:'CF';condition1:string;condition2:string;left:string;right:string});
export const questions:Question[]=quiz.items.map(item=>{
 const base={id:item.id,stem:item.prompt??'條件不同時，你會怎樣選擇？'};
 switch(item.format){
  case 'BP':return {...base,format:'BIP',left:item.left!,right:item.right!};
  case 'BW':return {...base,format:'BWS',options:Object.fromEntries(item.options!.map(o=>[o.id,o.text])) as Record<Choice,string>};
  case 'CP':return {...base,format:'CROSS',operation_prompt:item.aPrompt!,operations:Object.fromEntries(item.aOptions!.map(o=>[o.id,o.text])) as Record<Priority,string>,goal_prompt:item.bPrompt!,goals:Object.fromEntries(item.bOptions!.map(o=>[o.id,o.text])) as Record<Priority,string>};
  case 'CF':return {...base,format:'CF',condition1:item.condition1!,condition2:item.condition2!,left:item.left!,right:item.right!};
  default:throw Error('Unknown question format');
 }
});
export const QUESTION_COUNT=questions.length;
export const instructions={BIP:{scale:['完全偏左','明顯偏左','稍微偏左','兩者接近／視情況','稍微偏右','明顯偏右','完全偏右']}};
const record=(v:unknown):v is Record<string,unknown>=>Boolean(v)&&typeof v==='object'&&!Array.isArray(v);
const choice=(v:unknown):v is Choice=>typeof v==='string'&&['A','B','C','D'].includes(v);
const priority=(v:unknown):v is Priority=>Number.isInteger(v)&&Number(v)>=1&&Number(v)<=3;
const side=(v:unknown):v is Side=>v==='L'||v==='R';
export function isDraftAnswer(q:Question,v:unknown):v is DraftAnswer{
 if(q.format==='BIP')return typeof v==='number'&&Number.isInteger(v)&&v>=1&&v<=7;
 if(!record(v))return false;
 if(q.format==='BWS')return Object.keys(v).every(k=>k==='best'||k==='worst')&&(v.best===undefined||choice(v.best))&&(v.worst===undefined||choice(v.worst))&&(!v.best||!v.worst||v.best!==v.worst);
 if(q.format==='CROSS')return Object.keys(v).every(k=>k==='operation'||k==='goal')&&(v.operation===undefined||priority(v.operation))&&(v.goal===undefined||priority(v.goal));
 return Object.keys(v).every(k=>k==='first'||k==='second')&&(v.first===undefined||side(v.first))&&(v.second===undefined||side(v.second));
}
export function isCompleteAnswer(q:Question,v:unknown):v is Answer{
 if(!isDraftAnswer(q,v))return false;
 if(q.format==='BIP')return true;
 if(!record(v))return false;
 if(q.format==='BWS')return 'best' in v&&'worst' in v&&choice(v.best)&&choice(v.worst);
 if(q.format==='CROSS')return 'operation' in v&&'goal' in v&&priority(v.operation)&&priority(v.goal);
 return 'first' in v&&'second' in v&&side(v.first)&&side(v.second);
}
export function validateResponses(v:unknown):asserts v is Responses{
 if(!record(v)||Object.keys(v).length!==QUESTION_COUNT||!questions.every(q=>isCompleteAnswer(q,v[q.id])))throw Error(`答案必須依照題型完整回答 ${QUESTION_COUNT} 題，最像與最不像不可相同。`);
}
export function parseImport(v:unknown):Responses{
 if(!record(v))throw Error('請選擇有效的答案 JSON 檔案。');
 if(v.schemaVersion!==SCHEMA_VERSION||v.modelVersion!==MODEL_VERSION)throw Error('答案檔案屬於不同測驗版本，請重新完成新版 60 題測驗。');
 validateResponses(v.responses);return v.responses;
}
export function makeExport(responses:Responses){validateResponses(responses);return {schemaVersion:SCHEMA_VERSION,modelVersion:MODEL_VERSION,responses};}
export function answeredCount(responses:DraftResponses){return questions.filter(q=>isCompleteAnswer(q,responses[q.id])).length;}
