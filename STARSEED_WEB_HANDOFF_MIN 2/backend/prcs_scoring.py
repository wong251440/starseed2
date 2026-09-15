from __future__ import annotations
import itertools, json
from pathlib import Path
from typing import Dict, Optional
import numpy as np

NUM_TOL=1e-12

class PRCSScorer:
    """Framework-agnostic reference scorer. The single source of truth is quiz_model.json."""
    def __init__(self, model_path: str):
        self.model_path=str(model_path)
        self.model=json.load(open(model_path,encoding='utf-8'))
        self.model_version=self.model['model_version']
        self.selection_version=self.model['selection_version']
        self.model_fingerprint=self.model['official_model_fingerprint']
        self.context_version=self.model['context_taxonomy_version']
        self.items=self.model['items']
        if len(self.items)!=60: raise ValueError('Expected exactly 60 items')
        self.item_ids=[x['uid'] for x in self.items]
        if len(set(self.item_ids))!=60: raise ValueError('Duplicate item UID')
        self.id_to_idx={u:i for i,u in enumerate(self.item_ids)}
        self.GOALS=self.model['dimensions']['goals']; self.OPS=self.model['dimensions']['operations']; self.SCOPES=self.model['dimensions']['scopes']
        self.G={x:i for i,x in enumerate(self.GOALS)}
        self.O={x:len(self.GOALS)+i for i,x in enumerate(self.OPS)}
        self.S={x:len(self.GOALS)+len(self.OPS)+i for i,x in enumerate(self.SCOPES)}
        base=len(self.GOALS)+len(self.OPS)+len(self.SCOPES)
        self.GO={(g,o):base+gi*len(self.OPS)+oi for gi,g in enumerate(self.GOALS) for oi,o in enumerate(self.OPS)}
        self.dim=base+len(self.GOALS)*len(self.OPS)
        self.lineages=[x['code'] for x in self.model['lineages']]
        self.prot={x['code']:[tuple(f) for f in x['prototype_fragments']] for x in self.model['lineages']}
        self.weight_scenarios={k:tuple(v) for k,v in self.model['prototype_weight_scenarios'].items()}
        self.max_dropout=int(self.model['registered_suite']['arbitrary_item_dropout_max'])
        self.max_notch=int(self.model['registered_suite']['distinct_one_notch_item_edits_max'])
        self.context_defs=self.model['context_domains']; self.domains=list(self.context_defs.keys())
        self.item_domains=[it['context_domain'] for it in self.items]
        D=[]
        for it in self.items:
            a=self.phi(tuple(it['left'])); b=self.phi(tuple(it['right']))
            d=b-a; n=np.linalg.norm(d)
            if n<=NUM_TOL: raise ValueError(f"Zero measurement axis: {it['uid']}")
            D.append(d/n)
        self.D=np.array(D)
        self.codewords={name:self.centered_prototypes(w)@self.D.T for name,w in self.weight_scenarios.items()}

    def phi(self,f):
        g,o,s=f; x=np.zeros(self.dim)
        x[self.G[g]]=1.; x[self.O[o]]=1.; x[self.S[s]]=1.; x[self.GO[(g,o)]]=1.
        return x

    def centered_prototypes(self,weights):
        sw=sum(weights); arr=[]
        for L in self.lineages:
            arr.append(sum(w*self.phi(f) for w,f in zip(weights,self.prot[L]))/sw)
        arr=np.array(arr); return arr-arr.mean(axis=0,keepdims=True)

    @staticmethod
    def response_value(r:int)->float:
        if isinstance(r,bool) or int(r)!=r or int(r) not in range(1,8): raise ValueError(f'Response must be integer 1..7, got {r!r}')
        return (int(r)-4)/3.0

    def _parse_answers(self,answers:Dict[str,Optional[int]]):
        y=np.zeros(60); mask=np.zeros(60,dtype=bool)
        for uid,val in answers.items():
            if uid not in self.id_to_idx: raise KeyError(f'Unknown item id: {uid}')
            if val is None: continue
            q=self.id_to_idx[uid]; y[q]=self.response_value(val); mask[q]=True
        return y,mask

    def _scores(self,y,mask,code):
        yy=y[mask]; yn=np.linalg.norm(yy)
        if yn<=NUM_TOL: return None,None,None
        cc=code[:,mask]; cn=np.linalg.norm(cc,axis=1)
        if np.any(cn<=NUM_TOL): raise ValueError('A lineage codeword vanished on answered dimensions')
        chat=cc/cn[:,None]; yhat=yy/yn; return chat@yhat,yhat,chat

    @staticmethod
    def _order(scores): return np.argsort(-scores,kind='stable')

    def _core(self,y,mask,scenario='nominal'):
        scores,yhat,chat=self._scores(y,mask,self.codewords[scenario])
        if scores is None:return None
        order=self._order(scores); w=int(order[0]); r=int(order[1]); top=float(scores[w])
        tie=[int(i) for i in order if abs(float(scores[int(i)])-top)<=NUM_TOL]
        pair=[]
        for j in range(len(self.lineages)):
            if j==w:continue
            v=chat[w]-chat[j]; nv=np.linalg.norm(v); m=0. if nv<=NUM_TOL else float(yhat@v/nv); pair.append((m,j))
        basin,jmin=min(pair,key=lambda z:z[0])
        return {'scores':scores,'yhat':yhat,'chat':chat,'order':order,'winner':w,'runner':r,'global_margin':float(scores[w]-scores[r]),'basin_depth':float(basin),'nearest_boundary':int(jmin),'tie_set':tie}

    def _pair_coverage(self,mask,i,j):
        c=self.codewords['nominal']; diff=(c[i]-c[j])**2; den=float(diff.sum()); return None if den<=NUM_TOL else float(diff[mask].sum()/den)

    @staticmethod
    def _min_one_notch(yvec,coeff,positive=True):
        margin=float(yvec@coeff)
        if positive and margin<=NUM_TOL:return 0,[]
        if (not positive) and margin>=-NUM_TOL:return 0,[]
        gains=[]
        for loc,(curr,a) in enumerate(zip(yvec,coeff)):
            opts=[]
            if curr>-1+NUM_TOL:opts.append(curr-1/3)
            if curr<1-NUM_TOL:opts.append(curr+1/3)
            if not opts:continue
            gain=max((curr*a-new*a) if positive else (new*a-curr*a) for new in opts)
            if gain>NUM_TOL:gains.append((gain,loc))
        gains.sort(reverse=True); need=margin if positive else -margin; s=0.; used=[]
        for k,(g,loc) in enumerate(gains,1):
            s+=g; used.append(loc)
            if s+NUM_TOL>=need:return k,used
        return None,used

    def _prototype_robustness(self,y,mask,w):
        rows=[]
        for name in self.weight_scenarios:
            c=self._core(y,mask,name)
            rows.append({'scenario':name,'primary':None if c is None else self.lineages[c['winner']],'runner_up':None if c is None else self.lineages[c['runner']],'global_margin':None if c is None else c['global_margin'],'evaluable':c is not None})
        same=sum(x['primary']==self.lineages[w] for x in rows if x['evaluable'])
        return {'same_primary':same,'evaluable':sum(x['evaluable'] for x in rows),'total':len(rows),'all_same_primary':same==len(rows),'scenarios':rows}

    def _context_robustness(self,y,mask,w):
        rows=[]
        for d in self.domains:
            m=mask.copy(); removed=[]
            for q,dom in enumerate(self.item_domains):
                if dom==d and m[q]:m[q]=False;removed.append(self.item_ids[q])
            c=self._core(y,m)
            rows.append({'domain':d,'removed_items':removed,'primary':None if c is None else self.lineages[c['winner']],'same_primary':c is not None and c['winner']==w,'evaluable':c is not None})
        return {'all_same_primary':all(x['same_primary'] for x in rows),'scenarios':rows}

    def _dropout(self,y,mask,w,max_k=3):
        idx=np.where(mask)[0]; code=self.codewords['nominal'][:,idx]; yy=y[idx]
        base_dot=code@yy; base_c2=np.sum(code*code,axis=1); base_y2=float(yy@yy); result={}; min_flip=None
        for k in range(1,min(max_k,len(idx)-1)+1):
            combos=np.array(list(itertools.combinations(range(len(idx)),k)),dtype=int)
            ydrop=yy[combos]; cdrop=np.transpose(code[:,combos],(1,2,0))
            dot=base_dot[None,:]-np.sum(ydrop[:,:,None]*cdrop,axis=1); c2=base_c2[None,:]-np.sum(cdrop*cdrop,axis=1); y2=base_y2-np.sum(ydrop*ydrop,axis=1)
            valid=(y2>NUM_TOL)&np.all(c2>NUM_TOL,axis=1); scores=np.full_like(dot,-np.inf,dtype=float); scores[valid]=dot[valid]/np.sqrt(y2[valid,None]*c2[valid])
            winners=np.argmax(scores,axis=1); flips=(winners!=w)|(~valid); fc=int(np.sum(flips))
            if fc and min_flip is None:min_flip=k
            result[str(k)]={'scenario_count':int(len(combos)),'flip_count':fc}
        return {'min_dropout_to_flip':min_flip if min_flip is not None else f'>{max_k}','by_k':result}

    def _notch_radius(self,y,mask,w,chat):
        full=np.where(mask)[0]; yy=y[mask]; best=10**9; bestrow={}
        for j in range(len(self.lineages)):
            if j==w:continue
            v=chat[w]-chat[j]; K,used=self._min_one_notch(yy,v,True)
            if K is not None and K<best:best=K;bestrow={'competitor':self.lineages[j],'items':[self.item_ids[int(full[z])] for z in used[:K]]}
        return {'min_edits':None if best==10**9 else best,**bestrow}

    def _direct(self,y,mask,core):
        w=core['winner'];r=core['runner'];full=np.where(mask)[0]; direct=[q for q,it in enumerate(self.items) if set(it.get('edges',[]))=={self.lineages[w],self.lineages[r]} and mask[q]]
        if not direct:return {'items':[],'supports':None,'conflict':'NO_DIRECT_ITEMS'}
        pos={q:i for i,q in enumerate(full)};loc=np.array([pos[q] for q in direct]); boundary=core['chat'][w]-core['chat'][r]; yd=y[mask][loc];bd=boundary[loc]; signed=float(yd@bd)
        if abs(signed)<=NUM_TOL:return {'items':[self.item_ids[q] for q in direct],'supports':'TIE','signed_contribution':signed,'conflict':'NONE'}
        if signed>0:return {'items':[self.item_ids[q] for q in direct],'supports':self.lineages[w],'signed_contribution':signed,'conflict':'NONE'}
        edits,_=self._min_one_notch(yd,bd,False); return {'items':[self.item_ids[q] for q in direct],'supports':self.lineages[r],'signed_contribution':signed,'conflict':'PERSISTENT' if edits is None or edits>=2 else 'FRAGILE'}

    def _contrib(self,core,mask,n=6):
        w=core['winner'];r=core['runner'];v=core['chat'][w]-core['chat'][r];v=v/(np.linalg.norm(v)+1e-15);full=np.where(mask)[0];vals=core['yhat']*v;pos=[];neg=[]
        for li,q in enumerate(full):
            row={'item':self.item_ids[q],'contribution':float(vals[li])};(pos if row['contribution']>=0 else neg).append(row)
        pos.sort(key=lambda z:z['contribution'],reverse=True);neg.sort(key=lambda z:z['contribution'])
        return {'supports_primary':pos[:n],'supports_runner_up':neg[:n]}

    def score(self,answers:Dict[str,Optional[int]],exact_dropout=True)->dict:
        y,mask=self._parse_answers(answers); core=self._core(y,mask)
        counts={'answered':int(mask.sum()),'missing':int((~mask).sum()),'directional':int(np.sum(mask&(np.abs(y)>NUM_TOL))),'midpoint':int(np.sum(mask&(np.abs(y)<=NUM_TOL)))}
        base={'model_version':self.model_version,'selection_version':self.selection_version,'model_fingerprint':self.model_fingerprint,'context_taxonomy_version':self.context_version,'response_counts':counts,'total_items':60}
        if core is None:return {**base,'status':'INSUFFICIENT_SIGNAL','primary':None,'runner_up':None,'reason':'No directional signal: all answered responses are midpoint or no items are answered.'}
        w=core['winner'];r=core['runner'];scores=core['scores'];order=core['order'];proto=self._prototype_robustness(y,mask,w);context=self._context_robustness(y,mask,w);drop=self._dropout(y,mask,w,self.max_dropout) if exact_dropout else None;notch=self._notch_radius(y,mask,w,core['chat']);direct=self._direct(y,mask,core)
        tie=len(core['tie_set'])>1;drop_ok=drop is None or drop['min_dropout_to_flip']==f'>{self.max_dropout}';notch_ok=notch['min_edits'] is None or notch['min_edits']>self.max_notch;robust=(not tie and proto['all_same_primary'] and context['all_same_primary'] and drop_ok and notch_ok)
        coverage=[self._pair_coverage(mask,w,j) for j in range(len(self.lineages)) if j!=w]
        return {**base,'status':'ROBUST_TO_REGISTERED_SUITE' if robust else 'SENSITIVE','primary':self.lineages[w],'runner_up':self.lineages[r],'nominal_tie':tie,'tie_set':[self.lineages[i] for i in core['tie_set']],
          'ranking':[{'lineage':self.lineages[int(i)],'similarity':float(scores[int(i)])} for i in order], 'primary_similarity':float(scores[w]),'runner_up_similarity':float(scores[r]),'global_margin':core['global_margin'],'basin_depth':core['basin_depth'],'nearest_boundary':self.lineages[core['nearest_boundary']],
          'response_amplitude':float(np.sqrt(np.mean(y[mask]**2))), 'information_coverage':{'primary_runner_up':self._pair_coverage(mask,w,r),'primary_vs_all':{'minimum_against_any_competitor':float(min(coverage)),'mean_against_competitors':float(np.mean(coverage))}},
          'direct_boundary':direct,'boundary_conflict':direct['conflict'] in ('FRAGILE','PERSISTENT'),'evidence_consistency':'MIXED' if direct['conflict'] in ('FRAGILE','PERSISTENT') else ('NO_DIRECT_ITEMS' if direct['conflict']=='NO_DIRECT_ITEMS' else 'CONSISTENT'),
          'prototype_robustness':proto,'context_robustness':context,'item_dropout_robustness':drop,'one_notch_flip_radius':notch,'separator_contributions':self._contrib(core,mask),
          'registered_suite':{'passed':robust,'max_arbitrary_item_dropout':self.max_dropout,'max_distinct_one_notch_item_edits':self.max_notch},
          'notes':['Similarities, margins and stability are geometric diagnostics, not probabilities.','Nominal Primary is never overridden by robustness or direct-boundary diagnostics.']}

if __name__=='__main__':
    import argparse
    ap=argparse.ArgumentParser();ap.add_argument('answers_json');ap.add_argument('--model',default=str(Path(__file__).resolve().parents[1]/'quiz_model.json'));ap.add_argument('--no-dropout',action='store_true');args=ap.parse_args()
    scorer=PRCSScorer(args.model);answers=json.load(open(args.answers_json,encoding='utf-8'));print(json.dumps(scorer.score(answers,exact_dropout=not args.no_dropout),ensure_ascii=False,indent=2))
