// Production port of starseed_quiz_min_v1/scoring.mjs. Only immutable geometry is memoized.
/*
  Minimal RPCS scorer.
  Zero dependencies. Browser/Node compatible.
  Input: quiz.json object + answers keyed by item id.
  Output: one Primary, runner-up, full ranking, local pair margin, coverage,
          response amplitude and deterministic robustness diagnostics.

  Important: do not present any numeric output as a probability of lineage membership.
*/

const EPS = 1e-12;
const dot=(a,b)=>a.reduce((s,x,i)=>s+x*b[i],0);
const norm=a=>Math.sqrt(dot(a,a));
const add=(a,b)=>a.map((x,i)=>x+b[i]);
const sub=(a,b)=>a.map((x,i)=>x-b[i]);
const scale=(a,c)=>a.map(x=>x*c);
const mean=arr=>{
  if(!arr.length) return [];
  return arr[0].map((_,i)=>arr.reduce((s,a)=>s+a[i],0)/arr.length);
};
const unit=a=>{ const n=norm(a); return n>EPS?scale(a,1/n):a.slice(); };

function makeFeatureSpace(data){
  const G=data.featureSpace.goals, O=data.featureSpace.operations, S=data.featureSpace.scopes;
  const gi=Object.fromEntries(G.map((x,i)=>[x,i]));
  const oi=Object.fromEntries(O.map((x,i)=>[x,i]));
  const si=Object.fromEntries(S.map((x,i)=>[x,i]));
  const offO=G.length, offS=G.length+O.length, offGO=G.length+O.length+S.length;
  const dim=offGO+G.length*O.length;
  function phi([g,o,s]){
    const v=Array(dim).fill(0);
    v[gi[g]]=1; v[offO+oi[o]]=1; v[offS+si[s]]=1;
    v[offGO+gi[g]*O.length+oi[o]]=1;
    return v;
  }
  return {G,O,S,dim,phi};
}

const prototypeCache=new WeakMap();
const stateCache=new WeakMap();
function prototypeVectors(data, weights=[3,2,1]){
  let cache=prototypeCache.get(data);
  if(!cache){cache=new Map();prototypeCache.set(data,cache);}
  const key=weights.join(',');
  if(cache.has(key))return cache.get(key);
  const result=buildPrototypeVectors(data,weights);cache.set(key,result);return result;
}
function buildPrototypeVectors(data, weights=[3,2,1]){
  const fs=makeFeatureSpace(data);
  const raw={};
  for(const [L,parts] of Object.entries(data.prototypes)){
    let v=Array(fs.dim).fill(0), d=0;
    parts.forEach((p,i)=>{
      const w=weights[i]??p[3]??1;
      v=add(v,scale(fs.phi(p.slice(0,3)),w)); d+=w;
    });
    raw[L]=scale(v,1/d);
  }
  const c=mean(Object.values(raw));
  return Object.fromEntries(Object.entries(raw).map(([L,v])=>[L,unit(sub(v,c))]));
}

function stateVectors(data,item,protos,kappa=0.5){
  let cache=stateCache.get(protos);
  if(!cache){cache=new Map();stateCache.set(protos,cache);}
  const key=`${item.id}:${kappa}`;
  if(cache.has(key))return cache.get(key);
  const result=buildStateVectors(data,item,protos,kappa);cache.set(key,result);return result;
}
function buildStateVectors(data,item,protos,kappa=0.5){
  const fs=makeFeatureSpace(data), raw={};
  if(item.format==="BP"){
    const L=fs.phi(item.score.left), R=fs.phi(item.score.right);
    for(let i=1;i<=7;i++){
      const t=(i-4)/3;
      raw[String(i)]=add(scale(L,(1-t)/2),scale(R,(1+t)/2));
    }
  } else if(item.format==="BW"){
    const o=Object.fromEntries(item.options.map(x=>[x.id,fs.phi(x.fragment)]));
    for(const a of Object.keys(o)) for(const b of Object.keys(o)) if(a!==b) raw[`${a}>${b}`]=sub(o[a],o[b]);
  } else if(item.format==="CP"){
    for(const [k,f] of Object.entries(item.cells)) raw[k]=fs.phi(f);
  } else if(item.format==="CF"){
    const L=fs.phi(item.score.left), R=fs.phi(item.score.right);
    const d=unit(sub(protos[item.switchTarget],protos[item.stableTarget]));
    const code={L:-1,R:1};
    for(const a of ["L","R"]) for(const b of ["L","R"]){
      const va=a==="L"?L:R, vb=b==="L"?L:R;
      const sw=(code[b]-code[a])/2;
      raw[`${a},${b}`]=add(scale(add(va,vb),0.5),scale(d,kappa*sw));
    }
  } else throw new Error("Unknown format "+item.format);

  const c=mean(Object.values(raw));
  const centered=Object.fromEntries(Object.entries(raw).map(([k,v])=>[k,sub(v,c)]));
  const maxN=Math.max(...Object.values(centered).map(norm),EPS);
  return Object.fromEntries(Object.entries(centered).map(([k,v])=>[k,scale(v,1/maxN)]));
}

function parseAnswer(item,a){
  if(a==null) return null;
  if(item.format==="BP") return String(Number(a));
  if(item.format==="BW"){
    if(typeof a==="string") return a.replace(/\s/g,"").toUpperCase();
    return `${String(a.best).toUpperCase()}>${String(a.worst).toUpperCase()}`;
  }
  if(item.format==="CP"){
    if(typeof a==="string") return a.replace(/\s/g,"");
    return `${Number(a.a)},${Number(a.b)}`;
  }
  if(item.format==="CF"){
    const n=x=>{
      x=String(x).trim().toUpperCase();
      if(["L","A","1"].includes(x)) return "L";
      if(["R","B","2"].includes(x)) return "R";
      throw new Error("Bad CF answer");
    };
    if(typeof a==="string"){ const [x,y]=a.split(","); return `${n(x)},${n(y)}`; }
    return `${n(a.first)},${n(a.second)}`;
  }
}

function supportAwareFit(data,answers,weights=[3,2,1],kappa=0.5,excluded=new Set()){
  const protos=prototypeVectors(data,weights);
  const result={};
  const itemMap=Object.fromEntries(data.items.map(i=>[i.id,i]));
  const parsed={};
  for(const [id,a] of Object.entries(answers||{})) if(itemMap[id] && a!=null && !excluded.has(id)) parsed[id]=parseAnswer(itemMap[id],a);

  for(const L of Object.keys(protos)){
    let num=0,den=0,answeredSupport=0,totalSupport=0;
    for(const item of data.items){
      const states=stateVectors(data,item,protos,kappa);
      const zs=Object.fromEntries(Object.entries(states).map(([k,v])=>[k,dot(v,protos[L])]));
      const vals=Object.values(zs), lo=Math.min(...vals), hi=Math.max(...vals), sup=hi-lo;
      totalSupport+=sup;
      if(parsed[item.id]==null || excluded.has(item.id) || sup<=EPS) continue;
      const z=zs[parsed[item.id]];
      if(z==null) throw new Error(`Illegal answer state ${parsed[item.id]} for ${item.id}`);
      const e=2*(z-lo)/sup-1;
      num+=sup*e; den+=sup; answeredSupport+=sup;
    }
    result[L]={fit:den>EPS?num/den:0,coverage:totalSupport>EPS?answeredSupport/totalSupport:0};
  }
  return {result,protos,parsed};
}

function pairMargin(data,answers,a,b,weights=[3,2,1],kappa=0.5,excluded=new Set()){
  const {protos,parsed}=supportAwareFit(data,answers,weights,kappa,excluded);
  const d=unit(sub(protos[a],protos[b]));
  let num=0,den=0,answered=0,total=0;
  for(const item of data.items){
    const states=stateVectors(data,item,protos,kappa);
    const p=Object.fromEntries(Object.entries(states).map(([k,v])=>[k,dot(v,d)]));
    const vals=Object.values(p),lo=Math.min(...vals),hi=Math.max(...vals),h=hi-lo;
    total+=h;
    if(parsed[item.id]==null || excluded.has(item.id) || h<=EPS) continue;
    const m=2*(p[parsed[item.id]]-lo)/h-1;
    num+=h*m; den+=h; answered+=h;
  }
  return {margin:den>EPS?num/den:0,coverage:total>EPS?answered/total:0};
}

function rankFits(fitObj,order){
  return order.slice().sort((a,b)=>{
    const d=fitObj[b].fit-fitObj[a].fit;
    return Math.abs(d)>1e-15?d:order.indexOf(a)-order.indexOf(b);
  });
}

function aggregateVector(data,answers,weights=[3,2,1],kappa=0.5){
  const protos=prototypeVectors(data,weights), fs=makeFeatureSpace(data);
  let acc=Array(fs.dim).fill(0), n=0, amp=0;
  for(const item of data.items){
    if(answers[item.id]==null) continue;
    const state=parseAnswer(item,answers[item.id]);
    const v=stateVectors(data,item,protos,kappa)[state];
    if(!v) continue;
    acc=add(acc,v); amp+=norm(v); n++;
  }
  return {vector:n?scale(acc,1/n):acc,amplitude:n?amp/n:0};
}

function robustness(data,answers,nominalTop1,nominalTop2){
  const order=data.lineages.map(x=>x.code);
  const scenarios=[
    {name:"nominal",w:[3,2,1],k:0.5},
    {name:"w-secondary-soft",w:[3,1.8,1.1],k:0.5},
    {name:"w-balanced",w:[2.8,2.2,1],k:0.5},
    {name:"w-primary-heavy",w:[3.2,1.8,1],k:0.5},
    {name:"w-tertiary-heavier",w:[2.7,2,1.3],k:0.5},
    {name:"cf-kappa-low",w:[3,2,1],k:0.25},
    {name:"cf-kappa-high",w:[3,2,1],k:0.75}
  ];
  const rows=[];
  for(const s of scenarios){
    const {result}=supportAwareFit(data,answers,s.w,s.k);
    const r=rankFits(result,order);
    rows.push({
      scenario:s.name,
      winner:r[0],
      top1Gap:result[nominalTop1].fit-result[nominalTop2].fit,
      pairMargin:pairMargin(data,answers,nominalTop1,nominalTop2,s.w,s.k).margin
    });
  }
  const stability=100*rows.filter(x=>x.winner===nominalTop1).length/rows.length;
  return {
    scenarioCount:rows.length,
    classificationStabilityIndex:stability,
    robustGlobalMinGap:Math.min(...rows.map(x=>x.top1Gap)),
    robustPairMinMargin:Math.min(...rows.map(x=>x.pairMargin)),
    scenarios:rows
  };
}

export function scoreQuiz(data,answers,{robust=true}={}){
  const order=data.lineages.map(x=>x.code);
  const {result}=supportAwareFit(data,answers);
  const ranking=rankFits(result,order);
  const top1=ranking[0], top2=ranking[1];
  const agg=aggregateVector(data,answers);
  const fitVals=ranking.map(x=>result[x].fit);
  const sd=Math.sqrt(fitVals.reduce((s,x)=>s+(x-fitVals.reduce((a,b)=>a+b,0)/fitVals.length)**2,0)/fitVals.length);
  if(norm(agg.vector)<=1e-10 && sd<=1e-10){
    return {status:"INSUFFICIENT_SIGNAL",primary:null,ranking:ranking.map(x=>({lineage:x,...result[x]}))};
  }
  const pair=pairMargin(data,answers,top1,top2);
  const rob=robust?robustness(data,answers,top1,top2):null;
  return {
    status:"OK",
    primary:top1,
    runnerUp:top2,
    ranking:ranking.map(x=>({lineage:x,...result[x]})),
    pairwise:{pair:[top1,top2],nominalMargin:pair.margin,coverage:pair.coverage},
    robustness:rob,
    responseAmplitude:agg.amplitude,
    interpretation:"Ranking/stability are model diagnostics, not probabilities."
  };
}
