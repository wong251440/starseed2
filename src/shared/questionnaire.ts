import quickQuiz from '../../models/quick24.json';
import fullQuiz from '../../models/full54.json';
export const MODEL_VERSION='PRCS-v2.0';
export type QuizMode='quick'|'full';
export const APP_VERSION='4.0.0';
export const SCHEMA_VERSION=5;
export type Choice='A'|'B'|'C'|'D';
export type Priority=1|2|3;
export type Side='L'|'R';
export type Answer=number|{best:Choice;worst:Choice}|{operation:Priority;goal:Priority}|{first:Side;second:Side};
export type DraftAnswer=number|{best?:Choice;worst?:Choice}|{operation?:Priority;goal?:Priority}|{first?:Side;second?:Side};
export type Responses=Record<string,Answer>;
export type DraftResponses=Record<string,DraftAnswer>;
export type Question={id:string;stem:string;wordingVersion:number}&({format:'BIP';left:string;right:string}|{format:'BWS';options:Record<Choice,string>}|{format:'CROSS';operation_prompt:string;operations:Record<Priority,string>;goal_prompt:string;goals:Record<Priority,string>}|{format:'CF';condition1:string;condition2:string;left:string;right:string});
const mapQuestions=(quiz:typeof fullQuiz):Question[]=>quiz.items.map(item=>({id:item.uid,stem:item.prompt,wordingVersion:item.wording_version??1,format:'BIP',left:item.left_text,right:item.right_text}));
export const questionsByMode={quick:mapQuestions(quickQuiz),full:mapQuestions(fullQuiz)};
export const questions=questionsByMode.full;
export const questionsForMode=(mode:QuizMode)=>questionsByMode[mode];
export function wordingVersionsForMode(mode:QuizMode){return Object.fromEntries(questionsForMode(mode).map(question=>[question.id,question.wordingVersion]));}
export function hasActiveWordingVersions(value:unknown,mode:QuizMode){const expected=wordingVersionsForMode(mode);return record(value)&&Object.keys(value).length===Object.keys(expected).length&&Object.entries(expected).every(([id,version])=>value[id]===version);}
export function hasPresentationFlips(value:unknown,mode:QuizMode){const ids=questionsForMode(mode).map(question=>question.id);return record(value)&&Object.keys(value).length===ids.length&&ids.every(id=>typeof value[id]==='boolean');}
export function canonicalResponseForDisplay(displayed:number,flipped:boolean){return flipped?8-displayed:displayed;}
export function displayResponseForCanonical(canonical:number,flipped:boolean){return flipped?8-canonical:canonical;}
export const SELECTION_VERSION=fullQuiz.selection_version;
export const MODEL_FINGERPRINT=fullQuiz.official_model_fingerprint;
export const MODE_METADATA={quick:{selectionVersion:quickQuiz.selection_version,fingerprint:quickQuiz.official_model_fingerprint,count:quickQuiz.items.length},full:{selectionVersion:fullQuiz.selection_version,fingerprint:fullQuiz.official_model_fingerprint,count:fullQuiz.items.length}};
export const QUESTION_COUNT=questions.length;
export const instructions={BIP:{scale:['完全偏左','明顯偏左','稍微偏左','兩邊同樣自然／沒有明顯偏向','稍微偏右','明顯偏右','完全偏右']}};
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
export function validateResponses(v:unknown,mode:QuizMode='full'):asserts v is Responses{
 const qs=questionsForMode(mode); if(!record(v)||Object.keys(v).length!==qs.length||!qs.every(q=>isCompleteAnswer(q,v[q.id])))throw Error(`答案必須以正式 UID 完整回答 ${qs.length} 題，每題為 1 至 7。`);
}
// Recover completed records created before mode was persisted; require an exact UID set.
export function responseMode(responses:unknown, supplied?:unknown):QuizMode{
 if(supplied!==undefined&&supplied!=='quick'&&supplied!=='full')throw Error('測驗模式不正確。');
 if(supplied){validateResponses(responses,supplied);return supplied;}
 for(const mode of ['quick','full'] as const){try{validateResponses(responses,mode);return mode;}catch{}}
 throw Error('答案與目前 24 / 54 題測驗不相容。');
}
export function parseImport(v:unknown):Responses{
 if(!record(v))throw Error('請選擇有效的答案 JSON 檔案。');
 if(v.schemaVersion!==SCHEMA_VERSION||v.modelVersion!==MODEL_VERSION)throw Error('答案檔案屬於不同測驗版本，請重新完成新版測驗。');
 const mode=responseMode(v.responses,v.mode);if(!hasActiveWordingVersions(v.itemVersions,mode))throw Error('答案檔案的題目文案版本與目前測驗不相容，請重新完成新版測驗。');
 validateResponses(v.responses,mode);return v.responses;
}
export function makeExport(responses:Responses,itemVersions:Record<string,number>=wordingVersionsForMode(responseMode(responses)),presentationFlips?:Record<string,boolean>){const mode=responseMode(responses);if(presentationFlips!==undefined&&!hasPresentationFlips(presentationFlips,mode))throw Error('答案檔案的呈現順序不正確。');return {schemaVersion:SCHEMA_VERSION,modelVersion:MODEL_VERSION,mode,itemVersions,responses,...(presentationFlips?{presentationFlips}: {})};}
export function answeredCount(responses:DraftResponses, mode:QuizMode='full'){return questionsForMode(mode).filter(q=>isCompleteAnswer(q,responses[q.id])).length;}
