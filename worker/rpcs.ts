import data from '../starseed_quiz_min_v1/quiz.json';
import {scoreQuiz} from './rpcs-engine.mjs';
import {MODEL_VERSION,validateResponses,type Responses} from '../src/shared/questionnaire';
import type {ScoringResult} from '../src/shared/result';
import civs from '../src/data/civilizations.json';
// Map new model codes to the established website IDs, preserving names and stories.
export const siteLineage=(code:string)=>({AD:'AN',VE:'VN',VG:'VE',ZG:'ZE'}[code]??code);
export function modelAnswers(responses:Responses){return Object.fromEntries(Object.entries(responses).map(([id,a])=>[id,typeof a==='object'&&'operation' in a?{a:a.operation,b:a.goal}:a]));}
export function score(responses:Responses):ScoringResult{
 validateResponses(responses);
 const raw=scoreQuiz(data,modelAnswers(responses));
 const scores=Object.fromEntries(raw.ranking.map(r=>[siteLineage(r.lineage),50*(r.fit+1)]));
 if(raw.status==='INSUFFICIENT_SIGNAL')return {public:{status:'no_classification',primary:null,scores},diagnostic:{status:'zero_information',model_version:MODEL_VERSION}};
 const lineage=(code:string)=>{const id=siteLineage(code),c=civs.find(c=>c.lineageId===id);if(!c)throw Error('Unknown lineage');return {id,name:c.english,name_zh:c.name};};
 const index=raw.robustness.classificationStabilityIndex;
 return {public:{status:'classified',primary:lineage(raw.primary),runner_up:lineage(raw.runnerUp),scores,stability:{index,label:index===100?'stable':'sensitive',all_variants_preserve_primary:index===100}},diagnostic:{status:'classified',model_version:MODEL_VERSION,ranking:raw.ranking.map((r,i)=>({...lineage(r.lineage),rank:i+1,score:scores[siteLineage(r.lineage)],rawFit:r.fit,coverage:r.coverage})),pairwise:{...raw.pairwise,pair:raw.pairwise.pair.map(siteLineage)},robustness:{...raw.robustness,scenarios:raw.robustness.scenarios.map(s=>({...s,winner:siteLineage(s.winner)}))},responseAmplitude:raw.responseAmplitude}};
}
