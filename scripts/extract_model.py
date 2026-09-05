"""Read frozen workbook and copy official assets; never derive new model constants."""
import json, hashlib, struct, pathlib
import openpyxl
from PIL import Image
ROOT=pathlib.Path(__file__).resolve().parents[1]
w=openpyxl.load_workbook(ROOT/'starseed_v4_4_PRODUCTION_phase6b_scoring_engine_PUBLIC_WORDING.xlsx',data_only=True)
rows=list(w['09_ADMIN_ORDER_CODEBOOK'].values)[4:84]
control={r[0]:r[1] for r in list(w['32_PROD_CONTROL'].values)[4:]}
weights=[r[2] for r in list(w['97_PROD_WEIGHTS'].values)[1:]]
cb=list(w['98_PROD_CODEBOOK_Q'].values)
prototypes=[[r[i+2] for r in cb[1:]] for i in range(23)]
keys=[r[5] for r in rows]
hashes={k:control[k+' hash'] for k in ['Item','Codebook','Weight','Key','Engine']}
actual={'Item':hashlib.sha256('\n'.join('|'.join(str(x) for x in r[:6]) for r in rows).encode()).hexdigest(),'Codebook':hashlib.sha256(b''.join(struct.pack('b',v) for p in prototypes for v in p)).hexdigest(),'Weight':hashlib.sha256(struct.pack('<80d',*weights)).hexdigest(),'Key':hashlib.sha256(struct.pack('80b',*keys)).hexdigest()}
assert all(actual[k]==hashes[k] for k in actual),(actual,hashes)
final={r[0]:r for r in list(w['03_FINAL_ITEMS'].values)[4:] if r[0]}
for r in rows:
 f=final[r[1]]; assert r[2]==f[6]
 assert (r[3],r[4])==((f[8],f[7]) if r[5]==1 else (f[7],f[8]))
 assert list(r[7:30])==list(cb[r[0]][2:])
 assert list(w['97_PROD_WEIGHTS'].values)[r[0]][:2]==tuple(r[:2])
model={'modelVersion':control['Model version'],'tieTolerance':control['Tie tolerance'],'hashes':hashes,'keys':keys,'weights':weights,'prototypes':prototypes,'rho':[list(r[1:]) for r in list(w['96_PROD_PAIR_RHO'].values)[1:]],'lineages':list(cb[0][2:])}
(ROOT/'src/data/model.json').write_text(json.dumps(model,ensure_ascii=False,separators=(',',':')))
questions=[{'q':r[0],'slot':r[1],'stem':r[2],'left':r[3],'right':r[4]} for r in rows]
(ROOT/'src/data/questions.json').write_text(json.dumps(questions,ensure_ascii=False,indent=2))
names=['昴宿','大角','天狼','仙女','天琴','獵戶','明塔卡','金星','哈達爾','北極','半人馬 α','織女','貓科・烏爾瑪','藍鳥','火星','馬爾德克','天龍','爬蟲','灰人・澤塔','阿努納奇','鯨魚座 τ','安塔瑞斯','地球源靈魂']
categories={'心域文明':[1,2,7,8,9,21],'無界文明':[4,5,12,14,15],'智序文明':[6,11,16,17,19,20],'聖殿文明':[3,10,13,18,22,23]}
civs=[]
for i in range(1,24):
 raw=(ROOT/f'23文明文案/{i}.md').read_bytes()
 (ROOT/f'public/texts/{i}.md').write_bytes(raw)
 lines=raw.decode().splitlines(); headings=[s.lstrip('#').strip() for s in lines if s.startswith('#')]
 civs.append({'id':i,'name':names[i-1],'english':cb[0][i+1],'category':next(k for k,v in categories.items() if i in v),'title':headings[0],'subtitle':headings[1],'chapters':headings,'textBytes':len(raw)})
 im=Image.open(ROOT/f'23文明icon/{"6.1" if i==6 else i}.png')
 for size,suffix in [(768,''),(160,'-small')]:
  copy=im.copy(); copy.thumbnail((size,size)); copy.save(ROOT/f'public/icons/{i}{suffix}.webp',quality=88,method=6)
(ROOT/'src/data/civilizations.json').write_text(json.dumps(civs,ensure_ascii=False,indent=2))
print('80 questions verified against 03/09/97/98; 4 exact hashes verified; 23 texts copied byte-for-byte; icons matched by official IDs.')
