import type {PRCSResult,ClassifiedPRCS} from '../../worker/prcs';
import civs from '../data/civilizations.json';
export const siteLineage=(code:string)=>({AD:'AN',VE:'VN',VG:'VE',ZG:'ZE'}[code]??code);
export interface ResultLineage {id:string;name:string;name_zh:string}
export interface RankingEntry extends ResultLineage {rank:number;score:number;rawFit:number}
export interface PublicStability {label:'stable'|'sensitive';all_variants_preserve_primary:boolean}
export interface ClassifiedPublicResult {status:'classified';primary:ResultLineage;runner_up:ResultLineage;scores:Record<string,number>;stability:PublicStability}
export interface ClassifiedDiagnosticResult {status:'classified';model_version:string;ranking:RankingEntry[];raw:ClassifiedPRCS}
export type ScoringResult={public:ClassifiedPublicResult;diagnostic:ClassifiedDiagnosticResult}|{public:{status:'no_classification';primary:null;scores:Record<string,number>};diagnostic:{status:'zero_information';model_version:string;raw:PRCSResult}};
export function adaptResult(raw:PRCSResult):ScoringResult{
 if(raw.status==='INSUFFICIENT_SIGNAL')return {public:{status:'no_classification',primary:null,scores:{}},diagnostic:{status:'zero_information',model_version:raw.model_version,raw}};
 const lineage=(code:string)=>{const id=siteLineage(code),c=civs.find(c=>c.lineageId===id);if(!c)throw Error('Unknown lineage');return {id,name:c.english,name_zh:c.name};};
 const scores=Object.fromEntries(raw.ranking.map(r=>[siteLineage(r.lineage),50*(r.similarity+1)]));
 const stable=raw.status==='ROBUST_TO_REGISTERED_SUITE';
 return {public:{status:'classified',primary:lineage(raw.primary),runner_up:lineage(raw.runner_up),scores,stability:{label:stable?'stable':'sensitive',all_variants_preserve_primary:stable}},diagnostic:{status:'classified',model_version:raw.model_version,ranking:raw.ranking.map((r,i)=>({...lineage(r.lineage),rank:i+1,score:scores[siteLineage(r.lineage)],rawFit:r.similarity})),raw}};
}
