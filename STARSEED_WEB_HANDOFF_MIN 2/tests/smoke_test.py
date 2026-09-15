import json, sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'backend'))
from prcs_scoring import PRCSScorer

s=PRCSScorer(str(ROOT/'quiz_model.json'))
assert len(s.items)==60 and len(set(s.item_ids))==60
assert s.model_fingerprint=='79dec38680e6f71004b88d0d2c4e8162622251277ae3f9b5a9bfaeb036ab2396'
# all midpoint = no directional signal
z=s.score({u:4 for u in s.item_ids}, exact_dropout=False)
assert z['status']=='INSUFFICIENT_SIGNAL' and z['primary'] is None
# Canonical codeword-direction test: directly map nominal theoretical codeword sign/magnitude to nearest 7-level answer.
code=s.codewords['nominal']
for li,L in enumerate(s.lineages):
    row=code[li]
    # positive global scale is nuisance under projective scoring; choose largest scale that stays in [-1,1]
    scale=1/max(1e-12,max(abs(row)))
    answers={}
    for q,u in enumerate(s.item_ids):
        y=max(-1,min(1,row[q]*scale)); r=int(round(4+3*y)); r=max(1,min(7,r)); answers[u]=r
    out=s.score(answers, exact_dropout=False)
    assert out['primary']==L,(L,out['primary'])
print('SMOKE TEST PASS: 60 items, zero-signal rule, fingerprint, canonical 21/21')
