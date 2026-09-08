#!/usr/bin/env python3
from __future__ import annotations
import argparse,json,math
from pathlib import Path
import numpy as np
HERE=Path(__file__).resolve().parent

def contrast_basis(k):
    B=np.zeros((k,k-1))
    for j in range(k-1): B[j,j]=1; B[-1,j]=-1
    Q,_=np.linalg.qr(B); return Q
Q4=contrast_basis(4); Q9=contrast_basis(9)
BWS_ST=[]
for b in range(4):
    for w in range(4):
        if b==w: continue
        d=np.zeros(4); d[b]=1; d[w]=-1; BWS_ST.append(math.sqrt(3/2)*(Q4.T@d))
BWS_ST=np.array(BWS_ST)
CROSS_ST=[]
for st in range(9):
    e=np.zeros(9); e[st]=1; e-=1/9; CROSS_ST.append(3*(Q9.T@e))
CROSS_ST=np.array(CROSS_ST)

def load_model(model_path=None,arrays_path=None):
    mp=Path(model_path) if model_path else HERE/'model_v4_1.json'
    m=json.loads(mp.read_text(encoding='utf-8'))
    ap=Path(arrays_path) if arrays_path else mp.with_name(m['arrays_file'])
    return m,np.load(ap)

def _c4(v):
    if isinstance(v,str) and len(v.strip())==1 and v.strip().upper() in 'ABCD': return ord(v.strip().upper())-65
    raise ValueError('BWS choice must be A, B, C, or D.')
def _c3(v):
    if isinstance(v,int) and 1<=v<=3: return v-1
    if isinstance(v,str) and v.strip() in ('1','2','3'): return int(v.strip())-1
    raise ValueError('Crossed choice must be 1, 2, or 3.')

def encode_item(item,ans):
    f=item['format']
    if f=='BIP':
        if type(ans) is not int or not 1<=ans<=7: raise ValueError(f"{item['id']}: bipolar answer must be integer 1..7")
        return np.array([(ans-4)/2.0]),{'position':ans,'encoded':(ans-4)/2.0}
    if f=='BWS':
        if not isinstance(ans,dict) or 'best' not in ans or 'worst' not in ans: raise ValueError(f"{item['id']}: BWS needs best and worst")
        b=_c4(ans['best']); w=_c4(ans['worst'])
        if b==w: raise ValueError(f"{item['id']}: best and worst must differ")
        pairs=[(bb,ww) for bb in range(4) for ww in range(4) if bb!=ww]; idx=pairs.index((b,w))
        return BWS_ST[idx].copy(),{'best':b,'worst':w,'state':idx}
    if f=='CROSS':
        if not isinstance(ans,dict) or 'operation' not in ans or 'goal' not in ans: raise ValueError(f"{item['id']}: Crossed needs operation and goal")
        o=_c3(ans['operation']); g=_c3(ans['goal']); st=g*3+o
        return CROSS_ST[st].copy(),{'operation':o,'goal':g,'state':st}
    raise ValueError(f"unknown format {f}")

def encode(model,answers):
    r=answers.get('responses') if isinstance(answers,dict) else None
    if not isinstance(r,dict): raise ValueError('Input must contain responses object.')
    exp=[x['id'] for x in model['items']]; exp_set=set(exp)
    missing=[i for i in exp if i not in r]; extra=[i for i in r if i not in exp_set]
    if missing: raise ValueError('Missing responses: '+', '.join(missing))
    if extra: raise ValueError('Unknown responses: '+', '.join(extra))
    v=np.zeros(model['coordinate_count']); det={}
    for it in model['items']:
        a,b=it['span']; z,d=encode_item(it,r[it['id']]); v[a:b]=z; det[it['id']]=d
    return v,det

def view_score(r,Q,dirs,scale):
    z=(r*scale)@Q; n=float(np.linalg.norm(z))
    if n==0: return np.zeros(21),0.0
    return (z/n)@dirs.T,n

def interp_pct(x,knots,qgrid): return np.interp(x,knots,qgrid,left=0,right=1)
def rank_idx(model,s):
    tm={x:i for i,x in enumerate(model['tie_order'])}; lins=model['lineages']
    return sorted(range(21),key=lambda i:(-float(s[i]),tm[lins[i]['id']]))
def stable_label(index,all_preserved):
    if not all_preserved: return 'sensitive'
    if index>=90: return 'very_high'
    if index>=75: return 'high'
    if index>=50: return 'moderate'
    if index>=25: return 'low'
    return 'very_low'
def pair_key(model,a,b):
    order={x['id']:i for i,x in enumerate(model['lineages'])}; x,y=sorted((a,b),key=lambda q:order[q]); return f'{x}-{y}'

def score_vector(model,a,r,details=None):
    VQ=a['view_Q']; VD=a['view_dirs']; VS=a['view_scale']; VW=a['view_weights']; off=a['offsets']; view=[]; norms=[]
    for k in range(len(VW)):
        s,n=view_score(r,VQ[k],VD[k],VS[k]); view.append(s); norms.append(n)
    view=np.array(view); rawnorm=float(np.linalg.norm(r))
    if rawnorm==0 or max(norms)<=1e-10*rawnorm:
        return {'status':'no_classification','primary':None,'scores':{x['id']:50.0 for x in model['lineages']}},{'status':'zero_information','model_version':model['model_version']}

    g=np.sum(view*VW[:,None],axis=0)+off; order=rank_idx(model,g); w,ru=order[:2]
    mu=model['scoring']['structural_t_score']['mean']; sd=model['scoring']['structural_t_score']['sd']; Tun=50+10*(g-mu)/sd; T=np.clip(Tun,0,100)
    q=a['quantile_grid']; spq=a['score_quantiles']; evq=a['evidence_quantiles']; mq=a['margin_quantiles']; pct=100*interp_pct(g,spq,q)
    spread=float(np.sqrt(np.mean((g-g.mean())**2))); evidence=float(100*interp_pct(spread,evq,q)); margin=float(g[w]-g[ru]); marginpct=float(100*interp_pct(margin,mq,q))

    # Model-view uncertainty after same centrality intercept.
    vg=view+off[None,:]; vT=np.clip(50+10*(vg-mu)/sd,0,100); vw=np.array([rank_idx(model,vg[k])[0] for k in range(len(vg))])
    modelagree=float(np.sum(VW*(vw==w))); vmargin=np.array([vg[k,w]-np.max(np.delete(vg[k],w)) for k in range(len(vg))])
    vpair=vg[:,w]-vg[:,ru]; model_pair_agree=float(np.sum(VW*(vpair>0)))

    # Exact robust-ensemble whole-family jackknives.
    jq=a['jack_Q']; jd=a['jack_dirs']; js=a['jack_scale']; jw=a['jack_weights']; F=jq.shape[0]; jcentral=[]
    for f in range(F):
        ss=np.zeros(21)
        for k in range(jq.shape[1]):
            vv,_=view_score(r,jq[f,k],jd[f,k],js[f,k]); ss+=jw[f,k]*vv
        jcentral.append(ss+off)
    jcentral=np.array(jcentral); jT=np.clip(50+10*(jcentral-mu)/sd,0,100); jwin=np.array([rank_idx(model,jcentral[f])[0] for f in range(F)])
    familyagree=float(np.mean(jwin==w)); jmargin=np.array([jcentral[f,w]-np.max(np.delete(jcentral[f],w)) for f in range(F)])
    jpair=jcentral[:,w]-jcentral[:,ru]; family_pair_agree=float(np.mean(jpair>0))

    all_model=bool(np.all(vw==w)); all_family=bool(np.all(jwin==w)); all_preserved=all_model and all_family
    stability_index=float(min(marginpct,100*modelagree,100*familyagree))
    stability={
      'index':stability_index,
      'label':stable_label(stability_index,all_preserved),
      'all_variants_preserve_primary':all_preserved,
      'all_model_views_preserve_primary':all_model,
      'all_family_jackknives_preserve_primary':all_family,
      'components':{'central_margin_structural_percentile':marginpct,'model_top1_agreement_pct':100*modelagree,'family_top1_agreement_pct':100*familyagree},
      'robust_top1_margin_floor_t_points':float(10*min(vmargin.min(),jmargin.min())/sd),
      'note':'Structural robustness index, not an empirical probability.'
    }

    # Primary-vs-runner pair-specific result layer.
    lin=model['lineages']; wid=lin[w]['id']; rid=lin[ru]['id']; pkey=pair_key(model,wid,rid); boundary=model.get('pair_boundary_metrics',{}).get(pkey)
    pairdiag={
      'pair':pkey,
      'central_t_gap':float(10*margin/sd),
      'model_pair_agreement_pct':float(100*model_pair_agree),
      'family_pair_agreement_pct':float(100*family_pair_agree),
      'model_pair_margin_t_points':{'min':float(10*vpair.min()/sd),'p10':float(10*np.quantile(vpair,.1)/sd),'median':float(10*np.median(vpair)/sd)},
      'family_pair_margin_t_points':{'min':float(10*jpair.min()/sd),'p10':float(10*np.quantile(jpair,.1)/sd),'median':float(10*np.median(jpair)/sd)},
      'robust_pair_margin_floor_t_points':float(10*min(vpair.min(),jpair.min())/sd),
      'boundary_geometry':boundary,
      'note':'Pair geometry describes the frozen classifier boundary; pair margins describe this respondent. Neither is a probability.'
    }

    # Exact item decomposition of central winner-runner raw margin.
    rows=[]; fmt={}; fam={}
    for it in model['items']:
        aa,bb=it['span']; delta=wc=rc=0.0
        for k in range(len(VW)):
            z=(r*VS[k])@VQ[k]; zn=float(np.linalg.norm(z))
            if zn==0: continue
            full=VQ[k]@VD[k].T; rv=r[aa:bb]*VS[k,aa:bb]; wci=float(rv@full[aa:bb,w]/zn); rci=float(rv@full[aa:bb,ru]/zn)
            wc+=VW[k]*wci; rc+=VW[k]*rci; delta+=VW[k]*(wci-rci)
        row={'id':it['id'],'format':it['format'],'family':it['family'],'winner_over_runner':delta,'winner_over_runner_t_points':10*delta/sd,'winner_contribution':wc,'runner_contribution':rc}
        if details and it['id'] in details: row['response']=details[it['id']]
        rows.append(row); fmt[it['format']]=fmt.get(it['format'],0)+delta; fam[it['family']]=fam.get(it['family'],0)+delta
    od=float(off[w]-off[ru]); cs=math.fsum(x['winner_over_runner'] for x in rows); err=cs+od-margin

    ranking=[]
    for rank,i in enumerate(order,1):
        ranking.append({'rank':rank,'id':lin[i]['id'],'name':lin[i]['name'],'name_zh':lin[i]['name_zh'],'score':float(T[i]),'t_score_unclipped':float(Tun[i]),'structural_percentile':float(pct[i]),'central_score':float(g[i]),'model_band':[float(vT[:,i].min()),float(vT[:,i].max())],'family_band':[float(jT[:,i].min()),float(jT[:,i].max())]})

    public={
      'status':'classified',
      'primary':{'id':wid,'name':lin[w]['name'],'name_zh':lin[w]['name_zh']},
      'runner_up':{'id':rid,'name':lin[ru]['name'],'name_zh':lin[ru]['name_zh']},
      'scores':{lin[i]['id']:float(T[i]) for i in range(21)},
      'stability':{'index':stability_index,'label':stability['label'],'all_variants_preserve_primary':all_preserved},
      'score_note':'Common structural T-scores, clamped 0–100 for display; not probabilities and do not sum to 100.',
      'stability_note':'Structural robustness, not a probability or empirical reliability estimate.'
    }
    diag={
      'status':'classified','model_version':model['model_version'],'ranking':ranking,
      'runner_up':public['runner_up'],'winner_runner_margin':margin,'winner_runner_t_gap':10*margin/sd,'margin_structural_percentile':marginpct,'evidence_strength_percentile':evidence,
      'classification_stability':stability,'winner_runner_pair_stability':pairdiag,
      'model_stability':{'weighted_top1_agreement':modelagree,'winner_margin_min':float(vmargin.min()),'winner_margin_p10':float(np.quantile(vmargin,.1))},
      'family_stability':{'top1_agreement':familyagree,'winner_margin_min':float(jmargin.min()),'winner_margin_p10':float(np.quantile(jmargin,.1))},
      'centrality_offset_contribution':od,'centrality_offset_t_points':10*od/sd,'item_contribution_sum':cs,'decomposition_error':err,
      'format_margin_t_points':{k:10*v/sd for k,v in fmt.items()},'family_margin_t_points':{k:10*v/sd for k,v in fam.items()},
      'strongest_items':sorted(rows,key=lambda x:abs(x['winner_over_runner']),reverse=True)[:12],'item_contributions':rows,
      'note':'v4.1 keeps v4 point scores frozen and adds only result-level structural stability and pair-specific diagnostics.'
    }
    return public,diag

def score(model,a,answers):
    r,d=encode(model,answers); return score_vector(model,a,r,d)

def main():
    ap=argparse.ArgumentParser(); ap.add_argument('--answers',type=Path,required=True); ap.add_argument('--model',type=Path,default=HERE/'model_v4_1.json'); ap.add_argument('--arrays',type=Path,default=HERE/'model_v4_1_arrays.npz'); ap.add_argument('--diagnostic',type=Path); args=ap.parse_args()
    try:
        m=json.loads(args.model.read_text(encoding='utf-8')); a=np.load(args.arrays); ans=json.loads(args.answers.read_text(encoding='utf-8')); pub,d=score(m,a,ans)
        if args.diagnostic: args.diagnostic.write_text(json.dumps(d,ensure_ascii=False,indent=2,allow_nan=False),encoding='utf-8')
        print(json.dumps(pub,ensure_ascii=False,indent=2,allow_nan=False))
    except Exception as e: ap.exit(2,f'Error: {e}\n')
if __name__=='__main__': main()
