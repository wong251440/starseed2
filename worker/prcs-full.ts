import model from '../models/full54.json';
import {CALIBRATION_VERSION,calibratedResponse} from './prcs-calibration';

// Formula-for-formula port of the supplied PRCSScorer; model/order are authoritative.
const TOL=1e-12;
const sum=(x:number[])=>x.reduce((a,b)=>a+b,0);
const dot=(a:number[],b:number[])=>sum(a.map((v,i)=>v*b[i]));
const norm=(a:number[])=>Math.sqrt(dot(a,a));
const {goals,operations,scopes}=model.dimensions;
const base=goals.length+operations.length+scopes.length;
function phi(f:string[]){
 const [g,o,s]=f,x=Array(base+goals.length*operations.length).fill(0) as number[];
 x[goals.indexOf(g)]=1;x[goals.length+operations.indexOf(o)]=1;
 x[goals.length+operations.length+scopes.indexOf(s)]=1;
 x[base+goals.indexOf(g)*operations.length+operations.indexOf(o)]=1;return x;
}
const ids=model.items.map(i=>i.uid),wordingVersions=model.items.map(i=>i.wording_version??1),lineages=model.lineages.map(l=>l.code);
const axes=model.items.map(i=>{const a=phi(i.left),b=phi(i.right),d=b.map((v,k)=>v-a[k]);return d.map(v=>v/norm(d));});
const codes=Object.fromEntries(Object.entries(model.prototype_weight_scenarios).map(([name,weights])=>{
 const prototypes=model.lineages.map(l=>{const f=l.prototype_fragments.map(phi);return f[0].map((_,k)=>sum(weights.map((w,i)=>w*f[i][k]))/sum(weights));});
 const mean=prototypes[0].map((_,k)=>sum(prototypes.map(p=>p[k]))/prototypes.length);
 return [name,prototypes.map(p=>axes.map(d=>dot(p.map((v,k)=>v-mean[k]),d)))];
}));
export type PRCSAnswers=Record<string,number|null>;
export function validateAnswers(value:unknown):asserts value is PRCSAnswers{
 if(!value||typeof value!=='object'||Array.isArray(value)||Object.entries(value).some(([uid,v])=>!ids.includes(uid)||(v!==null&&(typeof v!=='number'||!Number.isInteger(v)||v<1||v>7))))throw Error('答案只接受正式題目 UID，以及 1 至 7 的整數或 null。');
}
function core(y:number[],idx:number[],scenario='nominal'){
 const yy=idx.map(i=>y[i]),yn=norm(yy);if(yn<=TOL)return null;
 const cc=codes[scenario].map(c=>idx.map(i=>c[i]));
 const cn=cc.map(norm);if(cn.some(n=>n<=TOL))throw Error('A lineage codeword vanished on answered dimensions');
 const chat=cc.map((c,i)=>c.map(v=>v/cn[i])),yhat=yy.map(v=>v/yn);
 const scores=chat.map(c=>dot(c,yhat)),order=scores.map((_,i)=>i).sort((a,b)=>scores[b]-scores[a]||a-b);
 const [w,r]=order,ties=order.filter(i=>Math.abs(scores[i]-scores[w])<=TOL);
 let basin=Infinity,nearest=-1;
 for(let j=0;j<lineages.length;j++){if(j===w)continue;const v=chat[w].map((a,k)=>a-chat[j][k]),nv=norm(v),margin=nv<=TOL?0:dot(yhat,v)/nv;if(margin<basin){basin=margin;nearest=j;}}
 return {scores,chat,yhat,order,w,r,ties,basin,nearest,margin:scores[w]-scores[r]};
}
function minNotch(y:number[],coeff:number[],positive=true):{k:number|null;used:number[]}{
 const margin=dot(y,coeff);if(positive?margin<=TOL:margin>=-TOL)return {k:0,used:[]};
 const gains:{gain:number;loc:number}[]=[];
 y.forEach((curr,loc)=>{const opts:number[]=[];if(curr>-1+TOL)opts.push(curr-1/3);if(curr<1-TOL)opts.push(curr+1/3);
  const gain=Math.max(...opts.map(v=>positive?curr*coeff[loc]-v*coeff[loc]:v*coeff[loc]-curr*coeff[loc]));if(gain>TOL)gains.push({gain,loc});});
 // Python tuple reverse sorting breaks equal gains by descending item position.
 gains.sort((a,b)=>b.gain-a.gain||b.loc-a.loc);let total=0;const used:number[]=[];
 for(const g of gains){total+=g.gain;used.push(g.loc);if(total+TOL>=(positive?margin:-margin))return {k:used.length,used};}
 return {k:null,used};
}
function dropout(y:number[],idx:number[],winner:number){
 const code=codes.nominal.map(c=>idx.map(i=>c[i])),yy=idx.map(i=>y[i]);
 const dots=code.map(c=>dot(c,yy)),squares=code.map(c=>dot(c,c)),y2=dot(yy,yy);
 const by_k:Record<string,{scenario_count:number;flip_count:number}>={};let min:number|null=null;
 const max=model.registered_suite.arbitrary_item_dropout_max;
 for(let k=1;k<=Math.min(max,idx.length-1);k++){
  let count=0,flips=0;const chosen:number[]=[];
  const visit=(start:number)=>{if(chosen.length<k){for(let i=start;i<=idx.length-(k-chosen.length);i++){chosen.push(i);visit(i+1);chosen.pop();}return;}
   count++;let removedY=0;for(const i of chosen)removedY+=yy[i]*yy[i];const remainY=y2-removedY;
   let valid=remainY>TOL,best=-Infinity,win=0;
   for(let l=0;l<lineages.length;l++){let removedDot=0,removedC=0;for(const i of chosen){removedDot+=yy[i]*code[l][i];removedC+=code[l][i]*code[l][i];}
    const remainC=squares[l]-removedC;if(remainC<=TOL)valid=false;
    const s=(dots[l]-removedDot)/Math.sqrt(remainY*remainC);if(s>best){best=s;win=l;}}
   if(!valid||win!==winner)flips++;
  };visit(0);by_k[String(k)]={scenario_count:count,flip_count:flips};if(flips&&min===null)min=k;
 }
 return {min_dropout_to_flip:min??`>${max}`,by_k};
}
export function scorePRCS(answers:PRCSAnswers,exactDropout=true){
 validateAnswers(answers);
 const idx=ids.flatMap((id,i)=>answers[id]!==undefined&&answers[id]!==null?[i]:[]);
 const y=ids.map((id,i)=>calibratedResponse(id,wordingVersions[i],answers[id])),c=core(y,idx);
 const directional=idx.filter(i=>Math.abs(y[i])>TOL).length;
 const common={model_version:model.model_version,selection_version:model.selection_version,model_fingerprint:model.official_model_fingerprint,calibration_version:CALIBRATION_VERSION,context_taxonomy_version:model.context_taxonomy_version,response_counts:{answered:idx.length,missing:ids.length-idx.length,directional,midpoint:idx.length-directional},total_items:ids.length};
 if(!c)return {...common,status:'INSUFFICIENT_SIGNAL' as const,primary:null,runner_up:null,reason:'No directional signal: all answered responses are midpoint or no items are answered.'};
 const {w,r}=c;
 const protoRows=Object.keys(codes).map(scenario=>{const x=core(y,idx,scenario);return {scenario,primary:x?lineages[x.w]:null,runner_up:x?lineages[x.r]:null,global_margin:x?x.margin:null,evaluable:x!==null};});
 const same=protoRows.filter(x=>x.evaluable&&x.primary===lineages[w]).length;
 const prototype_robustness={same_primary:same,evaluable:protoRows.filter(x=>x.evaluable).length,total:protoRows.length,all_same_primary:same===protoRows.length,scenarios:protoRows};
 const contextRows=Object.keys(model.context_domains).map(domain=>{const removed=idx.filter(i=>model.items[i].context_domain===domain),remaining=idx.filter(i=>model.items[i].context_domain!==domain),x=core(y,remaining);return {domain,removed_items:removed.map(i=>ids[i]),primary:x?lineages[x.w]:null,same_primary:x!==null&&x.w===w,evaluable:x!==null};});
 const context_robustness={all_same_primary:contextRows.every(x=>x.same_primary),scenarios:contextRows};
 const item_dropout_robustness=exactDropout?dropout(y,idx,w):null;
 let one_notch_flip_radius:{min_edits:number|null;competitor?:string;items?:string[]}={min_edits:null};
 for(let j=0;j<lineages.length;j++){if(j===w)continue;const v=c.chat[w].map((a,k)=>a-c.chat[j][k]),n=minNotch(idx.map(i=>y[i]),v);if(n.k!==null&&(one_notch_flip_radius.min_edits===null||n.k<one_notch_flip_radius.min_edits))one_notch_flip_radius={min_edits:n.k,competitor:lineages[j],items:n.used.slice(0,n.k).map(i=>ids[idx[i]])};}
 const boundary=c.chat[w].map((v,i)=>v-c.chat[r][i]);
 const direct=idx.filter(i=>{const edges=new Set(model.items[i].edges);return edges.size===2&&edges.has(lineages[w])&&edges.has(lineages[r]);});
 let direct_boundary:{items:string[];supports:string|null;conflict:string;signed_contribution?:number}={items:[],supports:null,conflict:'NO_DIRECT_ITEMS'};
 if(direct.length){const loc=direct.map(i=>idx.indexOf(i)),yd=direct.map(i=>y[i]),bd=loc.map(i=>boundary[i]),signed=dot(yd,bd);let supports='TIE',conflict='NONE';
  if(signed>TOL)supports=lineages[w];else if(signed<-TOL){supports=lineages[r];const n=minNotch(yd,bd,false);conflict=n.k===null||n.k>=2?'PERSISTENT':'FRAGILE';}
  direct_boundary={items:direct.map(i=>ids[i]),supports,signed_contribution:signed,conflict};}
 const conflict=['FRAGILE','PERSISTENT'].includes(direct_boundary.conflict),bn=norm(boundary)+1e-15;
 const contrib=idx.map((q,i)=>({item:ids[q],contribution:c.yhat[i]*boundary[i]/bn}));
 const coverage=(j:number)=>{const diff=codes.nominal[w].map((v,i)=>(v-codes.nominal[j][i])**2),den=sum(diff);return den<=TOL?null:sum(idx.map(i=>diff[i]))/den;};
 const allCoverage=lineages.flatMap((_,j)=>j!==w?[coverage(j)!]:[]);
 const maxD=model.registered_suite.arbitrary_item_dropout_max,maxN=model.registered_suite.distinct_one_notch_item_edits_max;
 const robust=c.ties.length===1&&prototype_robustness.all_same_primary&&context_robustness.all_same_primary&&(!item_dropout_robustness||item_dropout_robustness.min_dropout_to_flip===`>${maxD}`)&&(one_notch_flip_radius.min_edits===null||one_notch_flip_radius.min_edits>maxN);
 return {...common,status:robust?'ROBUST_TO_REGISTERED_SUITE' as const:'SENSITIVE' as const,primary:lineages[w],runner_up:lineages[r],nominal_tie:c.ties.length>1,tie_set:c.ties.map(i=>lineages[i]),ranking:c.order.map(i=>({lineage:lineages[i],similarity:c.scores[i]})),primary_similarity:c.scores[w],runner_up_similarity:c.scores[r],global_margin:c.margin,basin_depth:c.basin,nearest_boundary:lineages[c.nearest],response_amplitude:Math.sqrt(sum(idx.map(i=>y[i]*y[i]))/idx.length),information_coverage:{primary_runner_up:coverage(r),primary_vs_all:{minimum_against_any_competitor:Math.min(...allCoverage),mean_against_competitors:sum(allCoverage)/allCoverage.length}},direct_boundary,boundary_conflict:conflict,evidence_consistency:conflict?'MIXED':'NO_DIRECT_ITEMS'===direct_boundary.conflict?'NO_DIRECT_ITEMS':'CONSISTENT',prototype_robustness,context_robustness,item_dropout_robustness,one_notch_flip_radius,separator_contributions:{supports_primary:contrib.filter(x=>x.contribution>=0).sort((a,b)=>b.contribution-a.contribution).slice(0,6),supports_runner_up:contrib.filter(x=>x.contribution<0).sort((a,b)=>a.contribution-b.contribution).slice(0,6)},registered_suite:{passed:robust,max_arbitrary_item_dropout:maxD,max_distinct_one_notch_item_edits:maxN},notes:['Similarities, margins and stability are geometric diagnostics, not probabilities.','Nominal Primary is never overridden by robustness or direct-boundary diagnostics.']};
}
export type PRCSResult=ReturnType<typeof scorePRCS>;
export type ClassifiedPRCS=Extract<PRCSResult,{primary:string}>;
