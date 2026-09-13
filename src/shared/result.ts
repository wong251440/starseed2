import type {Robustness} from '../../worker/rpcs-engine.mjs';
export interface ResultLineage {id:string;name:string;name_zh:string}
export interface RankingEntry extends ResultLineage {rank:number;score:number;rawFit:number;coverage:number}
export interface PublicStability {index:number;label:'stable'|'sensitive';all_variants_preserve_primary:boolean}
export interface ClassifiedPublicResult {status:'classified';primary:ResultLineage;runner_up:ResultLineage;scores:Record<string,number>;stability:PublicStability}
export interface ClassifiedDiagnosticResult {status:'classified';model_version:string;ranking:RankingEntry[];robustness:Robustness;pairwise:{pair:string[];nominalMargin:number;coverage:number};responseAmplitude:number}
export type ScoringResult={public:ClassifiedPublicResult;diagnostic:ClassifiedDiagnosticResult}|{public:{status:'no_classification';primary:null;scores:Record<string,number>};diagnostic:{status:'zero_information';model_version:string}};
