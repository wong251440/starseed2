export interface RawRanking {lineage:string;fit:number;coverage:number}
export interface Robustness {scenarioCount:number;classificationStabilityIndex:number;robustGlobalMinGap:number;robustPairMinMargin:number;scenarios:{scenario:string;winner:string;top1Gap:number;pairMargin:number}[]}
export type RawResult={status:'OK';primary:string;runnerUp:string;ranking:RawRanking[];pairwise:{pair:string[];nominalMargin:number;coverage:number};robustness:Robustness;responseAmplitude:number}|{status:'INSUFFICIENT_SIGNAL';primary:null;ranking:RawRanking[]};
export function scoreQuiz(data:unknown,answers:Record<string,unknown>,options?:{robust?:boolean}):RawResult;
