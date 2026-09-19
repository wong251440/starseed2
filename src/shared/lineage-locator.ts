import type {QuizMode} from './questionnaire';

export const LINEAGE_RESOLVER_VERSION='lineage-v1.1';
export const LINEAGE_RESOLVER_CONSTANTS={
 tau:0.18,
 full:{depthPenalty:0.05,endpointZ:0.40,maxRawRank:9,maxAnchorDrop:1.00,branchGap:0.08,singleChildDrop:0.65},
 quick:{depthPenalty:0.07,endpointZ:0.55,maxRawRank:7,maxAnchorDrop:0.85,branchGap:0.12,singleChildDrop:0.55},
} as const;

export interface RawFit {lineage:string;similarity:number}
export interface BranchScore {
 current:string;
 root:string;
 nodes:string[];
 score:number;
 carrier:string;
 carrierAdjustedZ:number;
 carrierZ:number;
 carrierRank:number;
 endpointEligible:boolean;
 selected:boolean;
}
export interface LineageResolution {
 rawAnchor:string;
 lineageResult:string;
 refinementApplied:boolean;
 decisionPath:string[];
 canonicalLineagePath:string[];
 zScores:Record<string,number>;
 branchScores:BranchScore[];
 branchGapZ:number|null;
 winningBranchScore:number|null;
 runnerUpBranchScore:number|null;
 resolverVersion:typeof LINEAGE_RESOLVER_VERSION;
}

// This graph is intentionally narrower than the display tree. It contains only
// the permitted classification routes; display-only associations never enter it.
const CHILDREN:Record<string,string[]>={
 LY:['FE','PL','VG','OR'],
 VG:['SI','AC','ZG','OR'],
 SI:['OR'],
 OR:['MI'],
 RE:['DR'],
};
const RESOLVABLE_ANCHORS=new Set(Object.keys(CHILDREN));

function relationPenalty(parent:string,child:string){
 if(child!=='OR')return 0;
 if(parent==='LY'||parent==='VG')return 0.08;
 if(parent==='SI')return 0.15;
 return 0;
}

function mean(values:number[]){return values.reduce((sum,value)=>sum+value,0)/values.length;}
function softMaxMean(values:number[],tau:number){
 const top=Math.max(...values);
 return top+tau*Math.log(mean(values.map(value=>Math.exp((value-top)/tau))));
}

function canonicalPath(result:string,rawAnchor:string,decisionPath:string[]){
 const refined=decisionPath.length>1;
 if(refined&&decisionPath.includes('OR')&&rawAnchor!=='OR'){
  const route=[...decisionPath];
  if(route[0]==='VG')route.unshift('LY');
  else if(route[0]==='SI')route.unshift('VG'),route.unshift('LY');
  return route;
 }
 if(refined&&decisionPath[0]==='LY')return [...decisionPath];
 if(result==='FE'||result==='PL'||result==='VG')return ['LY',result];
 if(result==='SI'||result==='AC')return ['LY','VG',result];
 if(result==='ZG')return ['LY','VG','APEX','ZG'];
 if(result==='MI')return ['OR','MI'];
 if(result==='DR')return ['RE','DR'];
 return [result];
}

export function resolveLineage(rawFits:RawFit[],mode:QuizMode):LineageResolution{
 if(!rawFits.length)throw Error('Lineage resolver requires a ranking.');
 const average=mean(rawFits.map(row=>row.similarity));
 const variance=mean(rawFits.map(row=>(row.similarity-average)**2));
 const sd=Math.sqrt(variance);
 const zScores=Object.fromEntries(rawFits.map(row=>[row.lineage,sd>0?(row.similarity-average)/sd:0]));
 const rank=Object.fromEntries(rawFits.map((row,index)=>[row.lineage,index+1]));
 const rawAnchor=rawFits[0].lineage;
 const constants=LINEAGE_RESOLVER_CONSTANTS[mode];
 const anchorZ=zScores[rawAnchor];
 const endpointEligible=(node:string)=>zScores[node]>=constants.endpointZ&&rank[node]<=constants.maxRawRank&&zScores[node]>=anchorZ-constants.maxAnchorDrop;
 const branchScores:BranchScore[]=[];

 const descendants=(parent:string,root:string)=>{
  const rows:{node:string;adjusted:number}[]=[];
  const visit=(node:string,penalty:number)=>{
   rows.push({node,adjusted:zScores[node]-penalty});
   for(const child of CHILDREN[node]??[])visit(child,penalty+constants.depthPenalty+relationPenalty(node,child));
  };
  visit(root,relationPenalty(parent,root));
  return rows;
 };
 const evaluate=(current:string)=>{
  const roots=CHILDREN[current]??[];
  return roots.map(root=>{
   const rows=descendants(current,root);
   const carrier=[...rows].sort((a,b)=>b.adjusted-a.adjusted||rank[a.node]-rank[b.node])[0];
   return {current,root,nodes:rows.map(row=>row.node),score:softMaxMean(rows.map(row=>row.adjusted),LINEAGE_RESOLVER_CONSTANTS.tau),carrier:carrier.node,carrierAdjustedZ:carrier.adjusted,carrierZ:zScores[carrier.node],carrierRank:rank[carrier.node],endpointEligible:endpointEligible(carrier.node)};
  });
 };
 type Step={result:string|null;path:string[];decisions:{winner:string;gap:number|null;score:number;runnerUp:number|null}[]};
 const descend=(current:string,path:string[],isAnchor=false):Step=>{
  const candidates=evaluate(current);
  if(!candidates.length)return {result:isAnchor||endpointEligible(current)?current:null,path,decisions:[]};
  const ordered=[...candidates].sort((a,b)=>b.score-a.score||rank[a.root]-rank[b.root]);
  const winner=ordered[0],runnerUp=ordered[1]??null;
  const gap=runnerUp?winner.score-runnerUp.score:null;
  const single=candidates.length===1;
  const passes=winner.endpointEligible&&(!single?gap!>=constants.branchGap:winner.carrierAdjustedZ>=zScores[current]-constants.singleChildDrop);
  if(!passes)return {result:isAnchor||endpointEligible(current)?current:null,path,decisions:[]};
  const nested=descend(winner.root,[...path,winner.root]);
  const decision={winner:winner.root,gap,score:winner.score,runnerUp:runnerUp?.score??null};
  if(nested.result)return {result:nested.result,path:nested.path,decisions:[decision,...nested.decisions]};
  return {result:isAnchor||endpointEligible(current)?current:null,path,decisions:[]};
 };
 const resolved=RESOLVABLE_ANCHORS.has(rawAnchor)?descend(rawAnchor,[rawAnchor],true):{result:rawAnchor,path:[rawAnchor],decisions:[]};
 const lineageResult=resolved.result??rawAnchor;
 const selected=new Set(resolved.path.slice(1));
 for(const step of resolved.path.slice(0,-1)){
  for(const row of evaluate(step))branchScores.push({...row,selected:selected.has(row.root)});
 }
 const last=resolved.decisions.at(-1);
 return {rawAnchor,lineageResult,refinementApplied:lineageResult!==rawAnchor,decisionPath:resolved.path,canonicalLineagePath:canonicalPath(lineageResult,rawAnchor,resolved.path),zScores,branchScores,branchGapZ:last?.gap??null,winningBranchScore:last?.score??null,runnerUpBranchScore:last?.runnerUp??null,resolverVersion:LINEAGE_RESOLVER_VERSION};
}
