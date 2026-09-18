import type {PRCSResult,ClassifiedPRCS} from '../../worker/prcs';
import civs from '../data/civilizations.json';
import {toMatchScore} from './match-score';
import type {QuizMode} from './questionnaire';
import {classifyClarity,type ClassificationClarity} from './classification-clarity';
export const siteLineage=(code:string)=>({AD:'AN',VE:'VN',VG:'VE',ZG:'ZE'}[code]??code);
export interface ResultLineage {id:string;name:string;name_zh:string}
export interface RankingEntry extends ResultLineage {rank:number;rawCosine:number;zScore:number;matchScore:number}
export interface PublicStability {label:'stable'|'sensitive';all_variants_preserve_primary:boolean}
export interface ClassifiedPublicResult {status:'classified';primary:ResultLineage;runner_up:ResultLineage;scores:Record<string,number>;stability:PublicStability;classificationClarity:ClassificationClarity}
export interface ClassifiedDiagnosticResult {status:'classified';model_version:string;ranking:RankingEntry[];raw:ClassifiedPRCS}
export type ScoringResult={public:ClassifiedPublicResult;diagnostic:ClassifiedDiagnosticResult}|{public:{status:'no_classification';primary:null;scores:Record<string,number>};diagnostic:{status:'zero_information';model_version:string;raw:PRCSResult}};
export function adaptResult(raw:PRCSResult,mode:QuizMode='full'):ScoringResult{
 if(raw.status==='INSUFFICIENT_SIGNAL')return {public:{status:'no_classification',primary:null,scores:{}},diagnostic:{status:'zero_information',model_version:raw.model_version,raw}};
 const lineage=(code:string)=>{const id=siteLineage(code),c=civs.find(c=>c.lineageId===id);if(!c)throw Error('Unknown lineage');return {id,name:c.english,name_zh:c.name};};
 const ranking=raw.ranking.map((r,i)=>({...lineage(r.lineage),rank:i+1,...toMatchScore(r.similarity,mode)}));
 const scores=Object.fromEntries(ranking.map(r=>[r.id,r.matchScore]));
 const stable=raw.status==='ROBUST_TO_REGISTERED_SUITE';
 const primary=lineage(raw.primary),runnerUp=lineage(raw.runner_up),classificationClarity=classifyClarity({form:mode,primary:primary.id,runnerUp:runnerUp.id,marginRaw:raw.primary_similarity-raw.runner_up_similarity,prototypeStable:raw.prototype_robustness.scenarios.every(s=>s.primary===raw.primary)});
 return {public:{status:'classified',primary,runner_up:runnerUp,scores,stability:{label:stable?'stable':'sensitive',all_variants_preserve_primary:stable},classificationClarity},diagnostic:{status:'classified',model_version:raw.model_version,ranking,raw}};
}
