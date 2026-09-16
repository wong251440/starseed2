import {useEffect,useMemo,useRef,useState,type FormEvent} from 'react';
import {Link,useParams,useLocation} from 'react-router-dom';
import Markdown from 'react-markdown';
import {ArrowUpRight,ArrowRight,ChevronLeft,Check,Copy,Orbit,RefreshCw,ChevronDown,Menu as MenuIcon} from 'lucide-react';
import civs from '../data/civilizations.json';
import resultCopy from '../../starseed_s4_rpd_web_handoff_v4_1_min/result_copy.zh-Hant.json';
import demoFixture from '../data/demo-responses.json';
import {categories,Icon,ExportButton} from '../App';
import {MODEL_VERSION,MODE_METADATA,responseMode,makeExport,parseImport,type Responses} from '../shared/questionnaire';
import {adaptResult,type ScoringResult} from '../shared/result';
import type {PRCSResult} from '../../worker/prcs';
import resultUI from '../../STARSEED_WEB_HANDOFF_MIN 2/result_ui_contract.json';
import {participant,write,submitAttempt,type Attempt} from '../shared/session';
import PairComparison from './PairComparison';
const fmt=(n:number,digits=2)=>n.toFixed(digits);
const civilization=(id:string)=>civs.find(c=>c.lineageId===id)!;
const shortCopy=(id:string)=>resultCopy.lineages[id as keyof typeof resultCopy.lineages]?.short;
const reportSubtitle:Record<number,string>={
 1:'你來自一個曾經太渴望和平，最後必須重新學會擁抱黑暗的文明',
 2:'宇宙的藍紫色架構師：那些為了把混亂重新編碼，而降生地球的靈魂',
 3:'從宇宙之海而來的守門者：你攜帶的從來不只是星光，而是一整個失落文明的記憶',
 4:'在宇宙裡走得太遠，所以比任何文明都明白：自由必須由靈魂自己選擇',
 5:'銀河最古老的火種：從「第一個家」到失去家園，從征服世界到學會不再征服',
 6:'從宇宙最漫長的戰場，走出來的靈魂',
 7:'失落樂園的水之靈魂：你真正想回去的地方，也許從來不在地圖上',
 8:'愛，是他們曾經用整個文明學會的一門宇宙技術',
 9:'被奪走故鄉之後，仍把「愛」帶回宇宙的文明',
 10:'宇宙的靜止軸——當所有星辰都在旋轉，你仍記得北方',
 11:'把光變成文明的人——你來自離地球最近的那一道「南天之門」',
 12:'「你不是為了尋找家而來。你來，是為了重新成為自己的北方。」',
 13:'最初的 Avyon：當宇宙需要一個懂得力量的種族',
 14:'當一個文明已經走到「愛也必須擁有智慧」之後，他們為什麼還要回到地球？',
 15:'紅色荒原以前，這裡曾經是一個把「力量」推到極致的文明',
 16:'有些靈魂思念一顆遙遠的星；馬爾德克靈魂思念的，是一顆已經不存在的星。',
 17:'從征服宇宙，到學會統御自己的古老龍裔',
 18:'當力量學會長出心臟：一個從生存、帝國走向主權的古老靈魂譜系',
 19:'把情緒從文明中刪除之後，他們花了漫長的時間，重新學會成為「生命」',
 20:'背負創世者業力而來的文明架構師',
 23:'你身上有一種古老到近乎沉默的記憶：你記得的故鄉，就是腳下這顆星球',
};
function CelebrityCard({name}:{name:string}){const [src,setSrc]=useState('');const fallback=()=>{const slug=name.replace(/[（）()]/g,' ').replace(/\s+/g,' ').trim();fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(slug.replace(/\s+/g,'_'))}`).then(r=>r.ok?r.json():null).then((data:any)=>{if(data?.thumbnail?.source||data?.originalimage?.source)return setSrc(data.thumbnail?.source||data.originalimage.source);return fetch(`https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(slug)}&gsrnamespace=6&gsrlimit=1&prop=imageinfo&iiprop=url&iiurlwidth=500&format=json&origin=*`).then(r=>r.ok?r.json():null).then((x:any)=>{const p=Object.values(x?.query?.pages||{})[0] as any;setSrc(p?.imageinfo?.[0]?.thumburl||p?.imageinfo?.[0]?.url||'');});}).catch(()=>{});};useEffect(()=>{fallback();},[name]);return <article className="celebrity-card"><div className="celebrity-photo">{src?<img loading="lazy" src={src} onError={fallback} alt={`${name} 肖像`}/>:<span aria-hidden="true">{name.slice(0,1)}</span>}</div><span>{name}</span></article>}
const encodeResponses=(responses:Responses)=>btoa(JSON.stringify(makeExport(responses))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
function readShared(search:string):{shared:boolean;responses?:Responses;error?:string}{
 const legacy=new URLSearchParams(search).has('s'),raw=new URLSearchParams(search).get('s2');
 if(!legacy&&!raw)return {shared:false};
 if(legacy)return {shared:true,error:'這份分享連結屬於舊版測驗，無法轉換為新版結果。請向分享者索取新版連結，或重新完成 60 題測驗。'};
 try{if(raw!.length>16000)throw Error();const payload=JSON.parse(atob(raw!.replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-raw!.length%4)%4)));return {shared:true,responses:parseImport(payload)};}
 catch{return {shared:true,error:'這份分享連結的答案不完整或屬於不同測驗版本。請向分享者索取新版連結。'};}
}
function validResult(value:ScoringResult|undefined, mode:'quick'|'full'='full'):value is ScoringResult{
 try{
  if(!value||value.diagnostic.model_version!==MODEL_VERSION||value.diagnostic.raw.model_fingerprint!==MODE_METADATA[mode].fingerprint)return false;
  if(value.public.status==='no_classification')return value.diagnostic.status==='zero_information';
  if(value.public.status!=='classified'||value.diagnostic.status!=='classified')return false;
  const p=value.public,d=value.diagnostic;
  return Boolean(civilization(p.primary.id)&&civilization(p.runner_up.id)&&d.ranking.length===21&&new Set(d.ranking.map(row=>row.id)).size===21&&civs.every(c=>Number.isFinite(p.scores[c.lineageId])&&d.ranking.some(row=>row.id===c.lineageId&&Number.isFinite(row.rawFit)))&&p.stability.label in stabilityLabels&&d.raw.prototype_robustness.total===5&&d.raw.context_robustness.scenarios.length===9&&Number.isFinite(d.raw.global_margin));
 }catch{return false;}
}
async function requestScore(responses:Responses,signal?:AbortSignal):Promise<ScoringResult>{
 const response=await fetch('/api/score',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({mode:responseMode(responses),answers:responses}),signal});
 const data=await response.json() as PRCSResult&{error?:string};if(!response.ok)throw Error(data.error||'暫時無法計算報告，請重試。');
 const result=adaptResult(data as PRCSResult);if(!validResult(result,responseMode(responses)))throw Error('報告版本與目前測驗不相容，請重新載入頁面。');return result;
}
function useTitle(title:string){useEffect(()=>{document.title=`${title}｜21 文明星種測驗`;},[title]);}
export function Atlas(){useTitle('文明圖鑑');return <div className="atlas-page section"><h1>你所熟悉的星光，<br/><em>也在尋找你。</em></h1><p className="page-intro">從文明的誕生，到靈魂在地球的使命。走進每一個星際世界的完整記憶。</p>{categories.map(cat=><section className="category-block" key={cat.name} style={{'--category':cat.color} as React.CSSProperties}><div className="category-heading"><h2>{cat.name}</h2><p>{cat.desc}</p></div><div className="civ-grid">{civs.filter(c=>c.category===cat.name).map(c=><Link to={`/civilizations/${c.id}`} className="civ-card" key={c.id}><div className="civ-card-art"><Icon id={c.id}/><span className="civ-index">{String(civs.findIndex(item=>item.id===c.id)+1).padStart(2,'0')}</span><ArrowUpRight className="civ-arrow" size={22}/></div><span className="english">{c.english}</span><h3>{c.name}</h3><p>{c.subtitle.replace(/^#+\s*/, '')}</p></Link>)}</div></section>)}</div>;}
export function OfficialText({id}:{id:number}){
 const [text,setText]=useState(''),[error,setError]=useState(false),[retry,setRetry]=useState(0);
 useEffect(()=>{const abort=new AbortController();setText('');setError(false);fetch(`/texts/${id}.md`,{signal:abort.signal}).then(r=>{if(!r.ok)throw Error();return r.text();}).then(setText).catch(e=>{if(e.name!=='AbortError')setError(true);});return()=>abort.abort();},[id,retry]);
 const celebrityMap:Record<number,string[]>={
  1:["黛安娜王妃（Princess Diana）", "約翰·藍儂（John Lennon）", "奧黛麗·赫本（Audrey Hepburn）", "鄧麗君", "基努·李維（Keanu Reeves）"],
  2:["尼古拉·特斯拉（Nikola Tesla）", "史蒂芬·霍金（Stephen Hawking）", "艾倫·圖靈（Alan Turing）", "李奧納多·達文西（Leonardo da Vinci）", "黃仁勳"],
  3:["李小龍", "鮑勃·馬利（Bob Marley）", "麥可·傑克森（Michael Jackson）", "傑森·摩莫亞（Jason Momoa）", "金·凱瑞（Jim Carrey）"],
  4:["大衛·鮑伊（David Bowie）", "碧玉（Björk）", "史蒂夫·賈伯斯（Steve Jobs）", "三毛", "喬治·歐威爾（George Orwell）"],
  5:["佛萊迪·墨裘瑞（Freddie Mercury）", "瑪丹娜（Madonna）", "亞歷山大大帝（Alexander the Great）", "穆罕默德·阿里（Muhammad Ali）", "碧昂絲（Beyoncé）"],
  6:["阿爾伯特·愛因斯坦（Albert Einstein）", "羅伯特·奧本海默（J. Robert Oppenheimer）", "比爾·蓋茲（Bill Gates）", "傑夫·貝佐斯（Jeff Bezos）", "克里斯多福·諾蘭（Christopher Nolan）"],
  7:["張國榮", "恩雅（Enya）", "文森·梵谷（Vincent van Gogh）", "周深", "漢斯·克里斯汀·安徒生（Hans Christian Andersen）"],
  8:["瑪麗蓮·夢露（Marilyn Monroe）", "伊麗莎白·泰勒（Elizabeth Taylor）", "金城武", "林青霞", "亞蘭·德倫（Alain Delon）"],
  9:["德蕾莎修女（Mother Teresa）", "聖雄甘地（Mahatma Gandhi）", "達賴喇嘛", "證嚴法師", "羅賓·威廉斯（Robin Williams）"],
  10:["鄭和", "斐迪南·麥哲倫（Ferdinand Magellan）", "摩根·費里曼（Morgan Freeman）", "湯姆·漢克斯（Tom Hanks）", "楊紫瓊"],
  11:["艾薩克·牛頓（Isaac Newton）", "理查·費曼（Richard Feynman）", "提姆·柏納-李（Tim Berners-Lee）", "張忠謀", "尼爾·阿姆斯壯（Neil Armstrong）"],
  12:["王菲", "弗雷德里克·蕭邦（Frédéric Chopin）", "史丹利·庫柏力克（Stanley Kubrick）", "坂本龍一", "周杰倫"],
  13:["安潔莉娜·裘莉（Angelina Jolie）", "鞏俐", "莫文蔚", "王祖賢", "泰勒絲（Taylor Swift）"],
  14:["老子", "蘇格拉底（Socrates）", "女神卡卡（Lady Gaga）", "G-Dragon（權志龍）", "王子（Prince）"],
  15:["伊隆·馬斯克（Elon Musk）", "阿諾·史瓦辛格（Arnold Schwarzenegger）", "道格拉斯·麥克阿瑟（Douglas MacArthur）", "曹操", "甄子丹"],
  16:["愛德華·泰勒（Edward Teller）", "諾斯特拉達穆斯（Nostradamus）", "芙烈達·卡蘿（Frida Kahlo）", "路德維希·范·貝多芬（Ludwig van Beethoven）", "小勞勃·道尼（Robert Downey Jr.）"],
  17:["秦始皇", "拿破崙·波拿巴（Napoleon Bonaparte）", "凱撒（Julius Caesar）", "成吉思汗", "約瑟夫·史達林（Joseph Stalin）"],
  18:["伊莉莎白二世（Queen Elizabeth II）", "喬治·W·布希（George W. Bush）", "亨利·季辛吉（Henry Kissinger）", "馬克·祖克柏（Mark Zuckerberg）", "小賈斯汀（Justin Bieber）"],
  19:["山姆·奧特曼（Sam Altman）", "提姆·庫克（Tim Cook）", "賴利·佩吉（Larry Page）", "馬雲", "孫宇晨"],
  20:["唐納·川普（Donald Trump）", "薩達姆·海珊（Saddam Hussein）", "克麗奧佩脫拉七世／埃及豔后（Cleopatra VII）", "拉美西斯二世（Ramesses II）", "圖坦卡門（Tutankhamun）"],
 21:["珍·古德（Jane Goodall）", "大衛·艾登堡（David Attenborough）", "宮崎駿", "葛莉塔·童貝里（Greta Thunberg）", "齊柏林"],
 23:["珍·古德（Jane Goodall）", "大衛·艾登堡（David Attenborough）", "宮崎駿", "葛莉塔·童貝里（Greta Thunberg）", "齊柏林"],
 };
 const names=celebrityMap[id]||[];const civ=civs.find(item=>String(item.id)===String(id));
 const splitAt=useMemo(()=>{let count=0;const lines=text.split('\n');const index=lines.findIndex(line=>/^#{1,3}\s/.test(line)&&++count===3);return index<0?lines.length:index;},[text]);
 const before=text.split('\n').slice(0,splitAt).join('\n'),after=text.split('\n').slice(splitAt).join('\n');
 const chapters=useMemo(()=>text.split('\n').map((line,i)=>({line:i+1,title:line.replace(/^#+\s*/,'').replace(/\*\*/g,'')})).filter((_,i)=>/^#{1,3}\s/.test(text.split('\n')[i])),[text]);
 if(error)return <div className="panel"><p>文明檔案暫時未能載入。</p><button className="button" onClick={()=>setRetry(retry+1)}>重新載入完整文案</button></div>;
 if(!text)return <div className="loading" role="status"><Orbit/> 正在展開文明檔案……</div>;
 const Heading=({node,children,offset=0}:any)=><h2 id={`chapter-${(node?.position?.start.line||1)+offset}`}>{children}</h2>;
 const beforeComponents={h1:(p:any)=><Heading {...p} offset={0}/>,h2:(p:any)=><Heading {...p} offset={0}/>,h3:(p:any)=><Heading {...p} offset={0}/>};
 const afterComponents={h1:(p:any)=><Heading {...p} offset={splitAt}/>,h2:(p:any)=><Heading {...p} offset={splitAt}/>,h3:(p:any)=><Heading {...p} offset={splitAt}/>};
 return <section className="official-layout" id="official"><aside className="reading-toc"><p className="eyebrow">完整文明檔案</p><h3>沿著記憶閱讀</h3><details open={window.innerWidth>=1000||undefined}><summary>章節導覽 <ChevronDown size={16}/></summary><nav aria-label="文明章節">{chapters.map((c,i)=><a href={`#chapter-${c.line}`} key={c.line}><span>{String(i+1).padStart(2,'0')}</span>{c.title}</a>)}</nav></details><span className="reading-note">官方正文 · 完整收錄</span></aside><article className="official-prose"><Markdown components={beforeComponents}>{before}</Markdown><section className="celebrity-region"><h2>著名{civ?.name||'星座'}</h2><div className="celebrity-grid">{names.map((name,index)=><CelebrityCard name={name} key={name}/>)}</div></section><Markdown components={afterComponents}>{after}</Markdown><div className="reading-end"><span>✦</span><p>這段星際記憶，已完整展開。</p><a href="#main">返回頁首 ↑</a></div></article></section>;
}
export function Civilization(){const {id}=useParams();const c=civs.find(c=>String(c.id)===id);useTitle(c?`${c.name}文明`:'找不到文明');if(!c)return <div className="empty"><h1>找不到這個文明。</h1><Link to="/civilizations">返回文明圖鑑</Link></div>;return <><div className="civilization-page section"><Link className="text-button" to="/civilizations"><ChevronLeft size={17}/> 返回文明圖鑑</Link><section className="civilization-hero"><div><p className="eyebrow">文明檔案 {String(civs.findIndex(item=>item.id===c.id)+1).padStart(2,'0')} / 21 <span className="category-tag">{c.category}</span></p><p className="english">{c.english}</p><h1>{c.name}</h1><p className="civ-subtitle">{c.subtitle}</p><a className="text-button" href="#official">展開完整文明記憶 ↓</a></div><Icon id={c.id}/></section><OfficialText id={c.id}/><section className="related"><div className="section-heading"><h2>繼續穿越星海</h2><Link className="text-button" to="/quiz">尋找我的起源 <ArrowUpRight size={16}/></Link></div><div className="related-grid">{civs.filter(x=>x.category===c.category&&x.id!==c.id).map(x=><Link key={x.id} to={`/civilizations/${x.id}`}><Icon id={x.id} size="small"/><span>{x.name}<small>{x.category}</small></span><ArrowUpRight size={17}/></Link>)}</div></section></div></>;}
export function Report({attempt,demo=false,onSaved,onEdit,onRestart}:{attempt?:Attempt|null;demo?:boolean;onSaved?:(a:Attempt)=>void;onEdit?:()=>void;onRestart:()=>void}){
 const location=useLocation(),shared=useMemo(()=>readShared(location.search),[location.search]);
 const responses=shared.shared?shared.responses:demo?demoFixture.responses as Responses:attempt?.responses;
 const mode=responses?responseMode(responses):'full';
 const localAttempt=!demo&&!shared.shared?attempt:null;
 const responseKey=JSON.stringify(responses),sourceKey=`${shared.shared?'shared':demo?'demo':localAttempt?.attemptId}:${responseKey}`;
 const [loaded,setLoaded]=useState<{key:string;result:ScoringResult}|null>(null),[error,setError]=useState(''),[retry,setRetry]=useState(0),[saveState,setSaveState]=useState(''),[saving,setSaving]=useState(false);
 const onSavedRef=useRef(onSaved);onSavedRef.current=onSaved;
 const result=loaded?.key===sourceKey?loaded.result:null;
 const [identityChoice,setIdentityChoice]=useState<string|null>(()=>demo||(localStorage.getItem('starseed2-identity-seen')==='1'&&localStorage.getItem('starseed2-familiarity'))?'skipped':null);
 const [scrollMode,setScrollMode]=useState<'top'|'down'|'up'>('top');
 useEffect(()=>{let last=window.scrollY;const onScroll=()=>{const y=window.scrollY;setScrollMode(y<20?'top':y<last?'up':'down');last=y;};window.addEventListener('scroll',onScroll,{passive:true});return()=>window.removeEventListener('scroll',onScroll);},[]);
 useEffect(()=>{
  if(!responses)return;let active=true;const abort=new AbortController();setError('');setSaveState('');setSaving(false);
  async function load(){
   try{let next:ScoringResult;
    if(localAttempt?.saved&&validResult(localAttempt.result,mode))next=localAttempt.result;
    else if(localAttempt&&!localAttempt.saved){
     setSaving(true);
     try{const saved=await submitAttempt(localAttempt);if(!validResult(saved.result,mode))throw Error('報告版本不相容，請重新載入頁面。');next=saved.result;if(active){onSavedRef.current?.({...localAttempt,saved:true,result:next});setSaveState('匿名校準資料已儲存。');}}
     catch(e){if(!active)return;setSaveState((e as Error).message);next=validResult(localAttempt.result,mode)?localAttempt.result:await requestScore(responses!,abort.signal);if(active)onSavedRef.current?.({...localAttempt,result:next});}
    }else next=await requestScore(responses!,abort.signal);
    if(active)setLoaded({key:sourceKey,result:next});
   }catch(e){if(active)setError((e as Error).message);}finally{if(active)setSaving(false);}
  }
  void load();return()=>{active=false;abort.abort();};
 },[sourceKey,retry]);
 useTitle(demo?'報告範例':result?.public.status==='classified'?`${civilization(result.public.primary.id).name}・你的星際報告`:'你的星際報告');
 async function save(){if(!localAttempt||saving)return;setSaving(true);setSaveState('正在匿名儲存完成的答案……');try{const response=await submitAttempt(localAttempt);if(!validResult(response.result,mode))throw Error('報告版本不相容，請重新載入頁面。');onSaved?.({...localAttempt,saved:true,result:response.result});setLoaded({key:sourceKey,result:response.result});setSaveState('匿名校準資料已儲存。');}catch(e){setSaveState((e as Error).message);}finally{setSaving(false);}}
 if(shared.error)return <div className="empty"><Orbit size={40}/><h1>這份分享需要更新。</h1><p>{shared.error}</p><Link className="button gold" to="/quiz">開始新版測驗 <ArrowUpRight size={18}/></Link></div>;
 if(!responses)return <div className="empty"><Orbit size={40}/><h1>你的星際報告，等待開啟。</h1><p>完成短版 24 題或完整版 54 題，或從選單匯入你的答案。</p><Link className="button gold" to="/quiz">開始測驗 <ArrowUpRight size={18}/></Link><Link to="/sample" className="text-button">查看報告範例</Link></div>;
 if(error)return <div className="empty"><Orbit size={40}/><h1>報告暫時未能開啟。</h1><p role="alert">{error}</p><button className="button gold" onClick={()=>setRetry(n=>n+1)}>重新載入報告 <RefreshCw size={18}/></button><ExportButton responses={responses}/></div>;
 if(!result)return <div className="empty" role="status"><Orbit className="report-loading-orbit" size={40}/><h1>正在整理你的星際座標。</h1><p>正在計算 21 個文明的分數、比較結果與結構穩定度……</p></div>;
 if(result.public.status==='no_classification'||result.diagnostic.status!=='classified')return <div className="empty zero"><Orbit size={50}/><p className="eyebrow">方向尚未形成</p><h1>你的答案，<br/>暫未形成可判讀方向。</h1><p>本次答案在模型中沒有足夠的方向資訊，因此不指定 Primary。你可以回顧答案，再開啟報告。</p>{localAttempt&&<button className="button gold" onClick={onEdit}>回去修改答案 <ArrowRight size={18}/></button>}<ExportButton responses={responses}/>{saveState&&<small role="status">{saveState}</small>}{localAttempt&&!localAttempt.saved&&<button onClick={save} disabled={saving} className="text-button">重新儲存匿名答案</button>}</div>;
 if(!demo&&!shared.shared&&identityChoice===null)return <IdentityGate onContinue={value=>{localStorage.setItem('starseed2-identity-seen','1');localStorage.setItem('starseed2-familiarity',value.familiarity);setIdentityChoice(value.identity)}}/>;
 const classified={public:result.public,diagnostic:result.diagnostic},c=civilization(result.public.primary.id);
 return <div className="report-page section">{demo&&<div className="demo-banner"><span>報告範例</span> 使用固定範例答案展示；不會保存至匿名校準資料庫。<Link to="/quiz">開始我的測驗 <ArrowUpRight size={15}/></Link></div>}{shared.shared&&<div className="demo-banner"><span>分享報告</span>這是分享連結中的答案結果。</div>}<div className={`result-floating ${scrollMode==='down'?'is-visible':''}`}><span>你的星際報告</span><ShareButton responses={responses} civilization={c.name}/></div><div className={`result-scroll-header ${scrollMode==='up'?'is-visible':''}`}><Link to="/" aria-label="回到首頁"><Orbit size={19}/><span>星際起源</span></Link><Link to="/civilizations" aria-label="探索文明圖鑑"><MenuIcon/></Link></div><div className="report-topline"><ShareButton responses={responses} civilization={c.name}/></div><section className="result-hero"><div className="result-identity"><span className="category-tag result-category" style={{'--category':categories.find(category=>category.name===c.category)?.color??'var(--gold)'} as React.CSSProperties}>{c.category}</span><p className="primary-result-line">你的星際種子是：</p><h1>{c.name}</h1><p className="english">{c.english}</p><p className="civ-subtitle">{reportSubtitle[c.id]??shortCopy(c.lineageId)}</p><a className="button" href="#official">閱讀完整文明記憶 <ArrowRight size={17}/></a></div><div className="result-art"><Icon id={c.id}/></div></section><nav className="report-nav" aria-label="報告章節"><a href="#official">完整文明記憶</a><a href="#structure">完整排行</a>{localAttempt&&<a href="#feedback">回饋與重測</a>}<a href="#analysis">深入了解你的結果</a></nav><TopFour result={classified}/><Stability result={classified}/><OfficialText id={c.id}/><RankedCivilizationRail result={classified}/>{localAttempt&&<><div className="save-status" role="status">{localAttempt.saved?<><Check size={16}/>匿名校準資料已儲存。</>:<><span>{saveState||'答案已在此裝置保存。'}</span><button className="text-button" onClick={save} disabled={saving}>{saving?'儲存中……':'重新儲存'}<RefreshCw size={14}/></button></>}</div><Feedback attempt={localAttempt}/><Retest onRestart={onRestart}/></>}<section className="report-end"><h2>每一道星光，<br/>都有值得理解的故事。</h2><div><Link className="button" to="/civilizations">探索全部 21 個文明 <ArrowUpRight size={18}/></Link><button className="text-button" onClick={onRestart}>{demo||shared.shared?'開始我的測驗':'重新測驗'} <ArrowRight size={17}/></button></div></section><section className="report-analysis" id="analysis"><p className="eyebrow">深入了解你的結果</p><div className="report-metrics"><Metric label="第一名匹配指數" value={fmt(result.public.scores[c.lineageId],1)} detail="越高，代表本次回答越接近這個文明"/><Metric label="第二名匹配指數" value={fmt(result.public.scores[result.public.runner_up.id],1)} detail="另一個值得你認識的文明"/><Metric label="結果穩定度" value={stabilityLabels[result.public.stability.label]} detail="換個角度看答案，第一名是否仍一樣"/><Metric label="已完成題目" value={`${MODE_METADATA[mode].count} / ${MODE_METADATA[mode].count}`} detail={demo?'範例的完整回答':localAttempt?.imported?'來自你匯入的答案':'你的完整回答'}/></div><Ranking result={classified}/><PairComparison result={classified}/></section><div className="report-export-bottom"><ExportButton responses={responses}/></div></div>;
}
type ClassifiedResult={public:Extract<ScoringResult['public'],{status:'classified'}>;diagnostic:Extract<ScoringResult['diagnostic'],{status:'classified'}>};
function IdentityGate({onContinue}:{onContinue:(value:{identity:string;familiarity:string})=>void}){const [known,setKnown]=useState(''),[familiarity,setFamiliarity]=useState('');const ready=Boolean(familiarity&&(known||known==='none'));return <section className="identity-gate section"><p className="eyebrow">在打開報告之前</p><h1>先留下你的直覺，<br/><em>再看看模型如何回答。</em></h1><p>你的回答會和自我認同及熟悉程度並列，方便你比較自己的感受與結果輪廓。</p><div className="identity-actions"><label>你本身對星際種子理論的熟悉程度<select value={familiarity} onChange={e=>setFamiliarity(e.target.value)}><option value="">請選擇</option><option value="none">從未接觸</option><option value="some">略有認識</option><option value="expert">專家級數</option></select></label><label>你是否有自我感覺屬於某個文明？<select value={known} onChange={e=>setKnown(e.target.value)}><option value="">請選擇</option><option value="none">沒有／不確定</option>{civs.map(c=><option value={String(c.id)} key={c.id}>{c.name}</option>)}</select></label><button className="button gold" disabled={!ready} onClick={()=>onContinue({identity:known,familiarity})}>查看我的報告 <ArrowRight size={17}/></button></div></section>}
function ShareButton({responses,civilization}:{responses:Responses;civilization:string}){
 const [open,setOpen]=useState(false),[copied,setCopied]=useState(false),[error,setError]=useState('');const closeRef=useRef<HTMLButtonElement>(null),triggerRef=useRef<HTMLButtonElement>(null),dialogRef=useRef<HTMLDivElement>(null);
 useEffect(()=>{if(!open)return;const previous=document.body.style.overflow;document.body.style.overflow='hidden';closeRef.current?.focus();const keydown=(e:KeyboardEvent)=>{if(e.key==='Escape')setOpen(false);if(e.key==='Tab'){const buttons=dialogRef.current?.querySelectorAll<HTMLButtonElement>('button');if(!buttons?.length)return;const first=buttons[0],last=buttons[buttons.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}};document.addEventListener('keydown',keydown);return()=>{document.body.style.overflow=previous;document.removeEventListener('keydown',keydown);triggerRef.current?.focus();};},[open]);
 const url=()=>`${window.location.origin}/report?s2=${encodeResponses(responses)}`;
 const copy=async()=>{try{await navigator.clipboard.writeText(url());setCopied(true);setError('');}catch{setError('未能複製連結，請允許瀏覽器使用剪貼簿後再試。');}};
 return <><button ref={triggerRef} className="share-button" onClick={()=>{setCopied(false);setOpen(true)}}><Copy size={15}/>分享結果</button>{open&&<div className="share-modal-backdrop" onClick={e=>{if(e.target===e.currentTarget)setOpen(false)}}><div ref={dialogRef} className="share-modal" role="dialog" aria-modal="true" aria-labelledby="share-title"><button ref={closeRef} className="share-close" onClick={()=>setOpen(false)} aria-label="關閉分享視窗">×</button><p className="eyebrow">分享你的星際座標</p><h2 id="share-title">我的主要文明是 {civilization}。<br/><em>你的是什麼？</em></h2><p>連結包含本次完整答案，持有連結的人可以查看報告及答案。請只分享給你願意讓對方閱讀的人。</p><div className="share-actions"><button onClick={()=>window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url())}`,'_blank','noopener,noreferrer')}>Facebook</button><button onClick={()=>window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(url())}&text=${encodeURIComponent(`我的主要文明是${civilization}。你的是什麼？`)}`,'_blank','noopener,noreferrer')}>X</button><button onClick={copy}><Copy size={15}/>{copied?'已複製連結':'複製連結'}</button></div>{error&&<p role="alert">{error}</p>}</div></div>}</>;
}
function TopFour({result}:{result:ClassifiedResult}){const near=result.diagnostic.ranking.slice(0,3),far=[...result.diagnostic.ranking].reverse().slice(0,3);const rows=(items:typeof near)=>items.map((s,i)=>{const c=civilization(s.id);return <Link className={`rank-row ${s.id===result.public.primary.id?'is-primary':''}`} to={`/civilizations/${c.id}`} key={s.id}><span className="rank-number">{String(i+1).padStart(2,'0')}</span><Icon id={c.id} size="small"/><span className="rank-name">{c.name}<small>{c.category}</small></span><div className="rank-score"><span className="score-track"><i style={{width:`${s.score}%`}}/></span><b>匹配指數 {s.score.toFixed(1)}</b></div></Link>});return <section className="top-four"><div className="top-four-columns"><div><p className="eyebrow">最匹配頭3名</p><div className="ranking-table">{rows(near)}</div></div><div><p className="eyebrow">最不匹配3名</p><div className="ranking-table">{rows(far)}</div></div></div><p className="chart-note">匹配指數越高，代表你的回答越接近這個文明。你可以同時與多個文明有共鳴；這些數字不是血統比例，也不用加起來等於 100。</p></section>}
function RankedCivilizationRail({result}:{result:ClassifiedResult}){return <section className="ranked-civilization-rail" aria-labelledby="civilization-rail-title"><div className="section-heading"><div><p className="eyebrow">延伸探索</p><h2 id="civilization-rail-title">依你的匹配排行，認識每個文明。</h2></div><span className="section-note">向右滑動查看全部 21 個文明</span></div><div className="civilization-rail-scroller">{result.diagnostic.ranking.map((row,index)=>{const c=civilization(row.id),color=categories.find(category=>category.name===c.category)?.color??'var(--gold)';return <Link className="civilization-rail-card" key={c.id} to={`/civilizations/${c.id}`} style={{'--category':color} as React.CSSProperties}><span className="civilization-rail-rank">#{String(index+1).padStart(2,'0')} · 匹配指數 {row.score.toFixed(1)}</span><Icon id={c.id} size="small"/><strong>{c.name}</strong><small>{c.category}</small><span className="civilization-rail-score">閱讀檔案 ↗</span></Link>;})}</div></section>;}
function Metric({label,value,detail}:{label:string;value:string;detail:string}){return <div><span>{label}</span><strong>{value}</strong><small>{detail}</small></div>;}
function Ranking({result}:{result:ClassifiedResult}){
 const [all,setAll]=useState(false);const rows=all?result.diagnostic.ranking:result.diagnostic.ranking.slice(0,7);
 return <section className="report-section" id="structure"><div className="section-heading"><div><p className="eyebrow">01 / 完整排行</p><h2>你的方向，如何落在星海之中。</h2></div><span className="section-note">21 個文明</span></div><p className="analysis-intro">從最接近到最不接近，看看你的回答與每個文明的相似之處。匹配指數介於 0 至 100，越高代表越接近；低分不代表好壞，只表示這些特質在本次回答中較少出現。</p><div className="ranking-table"><div className="rank-header"><span>排行 / 文明</span><span>匹配指數 0–100</span></div>{rows.map(s=>{const c=civilization(s.id);return <Link className={`rank-row ${s.id===result.public.primary.id?'is-primary':''}`} key={s.id} to={`/civilizations/${c.id}`}><span className="rank-number">{String(s.rank).padStart(2,'0')}</span><Icon id={c.id} size="small"/><span className="rank-name">{c.name}<small>{s.id===result.public.primary.id?'第一名 · 最接近你':s.id===result.public.runner_up.id?'第二名 · 同樣值得認識':c.category}</small></span><div className="rank-score"><span className="score-track"><i style={{width:`${s.score}%`}}/></span><b>匹配指數 {s.score.toFixed(1)}</b></div><ArrowUpRight className="rank-link" size={15}/></Link>;})}</div><button className="expand-button" aria-expanded={all} onClick={()=>setAll(!all)}>{all?'收合完整排行':'展開全部 21 個文明排行'} <ChevronDown size={17}/></button><p className="chart-note">每個文明分開比較，指數不需要加總為 100。原始匹配值介於 −1 至 1，以「(原始值 + 1) × 50」換成此刻度。50 是原始值 0，不是合格線或人群平均；畫面只顯示一位小數，指數看似相同時，仍可能有細微差別。</p></section>;
}
const stabilityLabels={stable:'通過預設壓力測試',sensitive:'第一名可能改變'};
function Stability({result:r}:{result:ClassifiedResult}){
 const raw=r.diagnostic.raw,passed=raw.registered_suite.passed;
 return <section className={`stability-panel ${passed?'':'is-sensitive'}`} id="stability"><div className="stability-heading"><div><p className="eyebrow">STABILITY · 結果穩定度</p><h2>{passed?'通過預設壓力測試':'部分變化可能改變第一名'}</h2></div></div><p>{resultUI.generic_ui_copy[raw.status]}</p><p className="chart-note">{resultUI.generic_ui_copy.technical_disclaimer}</p></section>;
}
function Feedback({attempt}:{attempt:Attempt}){const [fit,setFit]=useState(0),[self,setSelf]=useState(''),[prior,setPrior]=useState('unsure'),[priorId,setPriorId]=useState(''),[comment,setComment]=useState(''),[status,setStatus]=useState(''),[busy,setBusy]=useState(false);async function submit(e:FormEvent){e.preventDefault();setBusy(true);try{const response=await fetch('/api/feedback',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({attemptId:attempt.attemptId,feedbackToken:attempt.feedbackToken,fit,selfLineage:self?Number(self):null,priorIdentity:prior,priorLineage:prior==='yes'&&priorId?Number(priorId):null,comment})});const data=await response.json() as {error?:string};if(!response.ok)throw Error(data.error||"暫時無法儲存回饋。");setStatus('回饋已儲存。謝謝你讓這份星圖更加清晰。');}catch(e){setStatus((e as Error).message);}finally{setBusy(false);}}
 const options=<><option value="">不確定</option>{civs.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</>;
 return <section className="feedback-section report-section" id="feedback"><div><p className="eyebrow">讓你的聲音，回到星圖之中</p><h2>這份記憶，<br/>與你有多靠近？</h2><p>分享你的真實感受，協助未來的模型校準。回饋自由填寫，不影響本次結果。</p><Link className="text-button" to="/privacy">匿名資料如何使用 <ArrowUpRight size={16}/></Link></div><form onSubmit={submit}><fieldset><legend>結果符合程度</legend><div className="fit-scale">{[1,2,3,4,5,6,7].map(v=><label key={v} className={fit===v?'selected':''}><input required type="radio" name="fit" value={v} checked={fit===v} onChange={()=>setFit(v)}/><span>{v}</span></label>)}</div><div className="scale-labels"><span>很不符合</span><span>非常符合</span></div></fieldset><label>最符合／最不像自己的地方 <span>（選填）</span><textarea value={comment} onChange={e=>setComment(e.target.value)} maxLength={2000} rows={4} placeholder="說說讓你有感的片段。請勿填寫姓名、聯絡方式等個人資料。"/></label><small>{comment.length} / 2000</small><button className="button gold" type="submit" disabled={busy||!attempt.saved}>{busy?'正在儲存……':'送出匿名回饋'}<ArrowRight size={17}/></button>{!attempt.saved&&<p className="chart-note">完成答案儲存後即可提交回饋，請使用上方「重新儲存」。</p>}<p className="form-status" role="status">{status}</p></form></section>;}
function Retest({onRestart}:{onRestart:()=>void}){const [code]=useState(participant),[copied,setCopied]=useState(false);return <section className="retest panel"><div><p className="eyebrow">留一個座標，給未來的你</p><h3>匿名重測碼</h3><p>此裝置會自動連結未來測驗。換裝置時，可在「資料與隱私」輸入這組代碼，延續匿名重測紀錄。</p></div><div><code>{code}</code><button className="text-button" onClick={async()=>{try{await navigator.clipboard.writeText(code);setCopied(true);}catch{setCopied(false);}}}><Copy size={15}/>{copied?'已複製':'複製代碼'}</button><button className="text-button" onClick={onRestart}>開始一次新的測驗 <ArrowRight size={15}/></button></div></section>;}
export function Privacy(){useTitle('資料與隱私');const [code,setCode]=useState(''),[status,setStatus]=useState('');function restore(e:FormEvent){e.preventDefault();if(!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(code.trim()))return setStatus('請輸入完整的匿名重測碼。');if(write('starseed2-participant',code.trim().toLowerCase()))setStatus('匿名重測碼已設定，下一次完成的測驗將連結至這組代碼。');else setStatus('此瀏覽器無法保存代碼，請允許本機儲存後再試。');}
 return <div className="privacy-page section"><p className="eyebrow">資料與隱私</p><h1>讓記憶留下，<br/><em>讓身份保持匿名。</em></h1><div className="privacy-prose"><h2>完成測驗時會保存什麼</h2><p>完成 24 或 54 題後，網站會自動提交匿名校準資料：隨機產生的參與者與測驗識別碼、該模式的原始答案、模型版本與指紋、開始與完成時間、作答時長、匯入狀態、由伺服器計算的結果、21 個完整精度相似度、模型變體、情境移除、缺題與答案微調的壓力測試、兩者差距、覆蓋度及作答幅度，以及網站與部署版本。若沒有足夠方向資訊，則保留「未分類」狀態。</p><p>未完成的測驗只留在你的瀏覽器，不會寫入校準資料庫。報告範例與分享報告會將答案傳送至伺服器計算，但不寫入匿名校準資料庫。匯入答案會重新計算，並以匯入紀錄保存；其作答時長記為匯入處理時間。</p><h2>資料用來做什麼</h2><p>分析題目表現、分類邊界、匿名重測一致性與自我認同回饋，協助未來研究和建立明確的新模型版本。目前凍結的題目、權重、計分與分類不會因收集資料而自動改變。紀錄保留供歷史結果重建與校準研究使用。</p><h2>自由填寫的結果回饋</h2><p>結果符合程度與選填文字，只在你主動送出回饋時保存。請勿在文字回饋中填入姓名、電話、email 或其他身份資料。</p><h2>身份與基礎設施</h2><p>網站不要求帳號，不收集姓名、電話、email、精確位置、完整地址、裝置指紋或廣告識別碼，也不使用第三方廣告追蹤器。匿名重測碼用於連結你的多次測驗，不提供公開查詢個人答案的功能，請自行保管。</p><p>網站與資料庫由 Cloudflare Workers 與 D1 承載。Cloudflare 為提供網路服務與防濫用會處理必要的連線資訊；應用程式不把 IP 位址或瀏覽器指紋寫入校準資料庫。資料沒有公開下載介面。</p><h2>分享報告</h2><p>分享連結包含完整答案及測驗版本，不包含匿名重測碼或回饋驗證碼。任何持有連結的人都可以重新計算報告、查看及匯出答案。開啟分享報告不會取代此裝置的個人結果。</p><h2>這個裝置上的資料</h2><p>瀏覽器本機儲存包含未完成進度、最近一次完成的答案與報告、匿名參與者識別碼及回饋驗證碼。你可隨時匯出完整答案，也可透過瀏覽器清除此網站的本機資料；清除本機資料不會刪除已提交的匿名校準紀錄。</p><h2>換裝置後延續重測</h2><p>輸入之前保存的匿名重測碼。設定只影響之後完成的測驗，不會變更既有紀錄。</p><form className="restore-form" onSubmit={restore}><label>匿名重測碼<input type="text" value={code} onChange={e=>setCode(e.target.value)} placeholder="xxxxxxxx-xxxx-4xxx-xxxx-xxxxxxxxxxxx" autoComplete="off" maxLength={36}/></label><button className="button" type="submit">設定重測碼</button><p role="status">{status}</p></form><Link className="text-button" to="/quiz">返回你的旅程 <ArrowRight size={16}/></Link></div></div>;
}
