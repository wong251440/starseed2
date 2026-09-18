import type {PRCSResult,ClassifiedPRCS} from '../../worker/prcs';
import civs from '../data/civilizations.json';
import {toMatchScore} from './match-score';
import type {QuizMode} from './questionnaire';
export const siteLineage=(code:string)=>({AD:'AN',VE:'VN',VG:'VE',ZG:'ZE'}[code]??code);
export interface ResultLineage {id:string;name:string;name_zh:string}
export interface RankingEntry extends ResultLineage {rank:number;rawCosine:number;zScore:number;matchScore:number}
export interface PublicStability {label:'stable'|'sensitive';all_variants_preserve_primary:boolean}
export interface ClassifiedPublicResult {status:'classified';primary:ResultLineage;runner_up:ResultLineage;scores:Record<string,number>;stability:PublicStability}
export interface ClassifiedDiagnosticResult {status:'classified';model_version:string;ranking:RankingEntry[];raw:ClassifiedPRCS}
export type ScoringResult={public:ClassifiedPublicResult;diagnostic:ClassifiedDiagnosticResult}|{public:{status:'no_classification';primary:null;scores:Record<string,number>};diagnostic:{status:'zero_information';model_version:string;raw:PRCSResult}};
export function adaptResult(raw:PRCSResult,mode:QuizMode='full'):ScoringResult{
 if(raw.status==='INSUFFICIENT_SIGNAL')return {public:{status:'no_classification',primary:null,scores:{}},diagnostic:{status:'zero_information',model_version:raw.model_version,raw}};
 const lineage=(code:string)=>{const id=siteLineage(code),c=civs.find(c=>c.lineageId===id);if(!c)throw Error('Unknown lineage');return {id,name:c.english,name_zh:c.name};};
 const ranking=raw.ranking.map((r,i)=>({...lineage(r.lineage),rank:i+1,...toMatchScore(r.similarity,mode)}));
 const scores=Object.fromEntries(ranking.map(r=>[r.id,r.matchScore]));
 const stable=raw.status==='ROBUST_TO_REGISTERED_SUITE';
 return {public:{status:'classified',primary:lineage(raw.primary),runner_up:lineage(raw.runner_up),scores,stability:{label:stable?'stable':'sensitive',all_variants_preserve_primary:stable}},diagnostic:{status:'classified',model_version:raw.model_version,ranking,raw}};
}
