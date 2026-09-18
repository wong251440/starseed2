import {useEffect,useMemo,useRef,useState,type FormEvent,type ReactNode} from 'react';
import {Link,useParams,useLocation} from 'react-router-dom';
import {createPortal} from 'react-dom';
import Markdown from 'react-markdown';
import {ArrowUpRight,ArrowRight,ChevronLeft,Check,Copy,Orbit,RefreshCw,ChevronDown,Menu as MenuIcon} from 'lucide-react';
import civs from '../data/civilizations.json';
import resultCopy from '../../starseed_s4_rpd_web_handoff_v4_1_min/result_copy.zh-Hant.json';
import demoFixture from '../data/demo-responses.json';
import {categories,Icon,ExportButton} from '../App';
import {MODEL_VERSION,MODE_METADATA,responseMode,makeExport,parseImport,type Responses} from '../shared/questionnaire';
import type {ScoringResult} from '../shared/result';
import {participant,write,submitAttempt,type Attempt,type Pretest} from '../shared/session';
const displayMatch=(value:number)=>String(Math.round(value));
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
const localCelebrityImages:Record<string,string>={
 '老子':'/celebrities/laozi.webp',
 '蘇格拉底（Socrates）':'/celebrities/socrates.webp',
 '女神卡卡（Lady Gaga）':'/celebrities/lady-gaga.webp',
 '王子（Prince）':'/celebrities/prince.webp',
 '三毛':'/celebrities/sanmao.webp',
 '史蒂夫·賈伯斯（Steve Jobs）':'/celebrities/steve-jobs.webp',
 '碧昂絲（Beyoncé）':'/celebrities/beyonce.webp',
 '孫宇晨':'/celebrities/justin-sun.webp',
};
function CelebrityCard({name}:{name:string}){const local=localCelebrityImages[name], [src,setSrc]=useState(local??'');const fallback=()=>{const slug=name.replace(/[（）()]/g,' ').replace(/\s+/g,' ').trim();fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(slug.replace(/\s+/g,'_'))}`).then(r=>r.ok?r.json():null).then((data:any)=>{if(data?.thumbnail?.source||data?.originalimage?.source)return setSrc(data.thumbnail?.source||data.originalimage.source);return fetch(`https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(slug)}&gsrnamespace=6&gsrlimit=1&prop=imageinfo&iiprop=url&iiurlwidth=500&format=json&origin=*`).then(r=>r.ok?r.json():null).then((x:any)=>{const p=Object.values(x?.query?.pages||{})[0] as any;setSrc(p?.imageinfo?.[0]?.thumburl||p?.imageinfo?.[0]?.url||'');});}).catch(()=>{});};useEffect(()=>{setSrc(local??'');if(!local)fallback();},[name,local]);return <article className="celebrity-card"><div className="celebrity-photo">{src?<img loading="lazy" src={src} onError={fallback} alt={`${name} 肖像`}/>:<span aria-hidden="true">{name.slice(0,1)}</span>}</div><span>{name}</span></article>}
type SharedReport={shared:boolean;responses?:Responses;error?:string;code?:string};
function readShared(search:string):SharedReport{
 const params=new URLSearchParams(search),legacy=params.has('s'),raw=params.get('s2'),code=params.get('share');
 if(!legacy&&!raw&&!code)return {shared:false};
 if(legacy)return {shared:true,error:'這份分享連結屬於舊版測驗，無法轉換為新版結果。請向分享者索取新版連結，或重新完成 60 題測驗。'};
 if(code){if(!/^[A-Za-z0-9_-]{16}$/.test(code))return {shared:true,error:'這份分享連結格式不正確。'};return {shared:true,code};}
 try{if(raw!.length>16000)throw Error();const payload=JSON.parse(atob(raw!.replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-raw!.length%4)%4)));return {shared:true,responses:parseImport(payload)};}
 catch{return {shared:true,error:'這份分享連結的答案不完整或屬於不同測驗版本。請向分享者索取新版連結。'};}
}
function validResult(value:ScoringResult|undefined, mode:'quick'|'full'='full'):value is ScoringResult{
 try{
  if(!value||value.diagnostic.model_version!==MODEL_VERSION||value.diagnostic.raw.model_fingerprint!==MODE_METADATA[mode].fingerprint)return false;
  if(value.public.status==='no_classification')return value.diagnostic.status==='zero_information';
  if(value.public.status!=='classified'||value.diagnostic.status!=='classified')return false;
  const p=value.public,d=value.diagnostic;
  const clarity=p.classificationClarity;
  return Boolean(civilization(p.primary.id)&&civilization(p.runner_up.id)&&d.ranking.length===21&&new Set(d.ranking.map(row=>row.id)).size===21&&civs.every(c=>Number.isFinite(p.scores[c.lineageId])&&d.ranking.some(row=>row.id===c.lineageId&&Number.isFinite(row.rawCosine)&&Number.isFinite(row.zScore)&&Number.isFinite(row.matchScore)))&&clarity?.form===mode&&clarity.primary===p.primary.id&&clarity.runnerUp===p.runner_up.id&&Number.isFinite(clarity.marginRaw)&&['very_close','close','clear','very_clear'].includes(clarity.baseTier)&&['very_close','close','clear','very_clear'].includes(clarity.tier)&&typeof clarity.prototypeStable==='boolean'&&['stable','sensitive'].includes(p.stability.label)&&d.raw.prototype_robustness.total===5&&d.raw.context_robustness.scenarios.length===9&&Number.isFinite(d.raw.global_margin));
 }catch{return false;}
}
async function requestScore(responses:Responses,signal?:AbortSignal):Promise<ScoringResult>{
 const mode=responseMode(responses),response=await fetch('/api/score',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({mode,responses}),signal});
 const data=await response.json() as {error?:string;modelVersion?:string;result?:ScoringResult};if(!response.ok)throw Error(data.error||'暫時無法計算報告，請重試。');
 if(data.modelVersion!==MODEL_VERSION||!validResult(data.result,mode))throw Error('報告版本與目前測驗不相容，請重新載入頁面。');return data.result;
}
function useTitle(title:string){useEffect(()=>{document.title=`${title}｜21 文明星種測驗`;},[title]);}
export function Atlas(){useTitle('文明圖鑑');return <div className="atlas-page section"><h1>你所熟悉的星光，<br/><em>也在尋找你。</em></h1><p className="page-intro">從文明的誕生，到靈魂在地球的使命。走進每一個星際世界的完整記憶。</p>{categories.map(cat=><section className="category-block" key={cat.name} style={{'--category':cat.color} as React.CSSProperties}><div className="category-heading"><h2>{cat.name}</h2><p>{cat.desc}</p></div><div className="civ-grid">{civs.filter(c=>c.category===cat.name).map(c=><Link to={`/civilizations/${c.id}`} className="civ-card" key={c.id}><div className="civ-card-art"><Icon id={c.id}/><span className="civ-index">{String(civs.findIndex(item=>item.id===c.id)+1).padStart(2,'0')}</span><ArrowUpRight className="civ-arrow" size={22}/></div><span className="english">{c.english}</span><h3>{c.name}</h3><p>{c.subtitle.replace(/^#+\s*/, '')}</p></Link>)}</div></section>)}</div>;}
export function OfficialText({id,insertions}:{id:number;insertions?:Partial<Record<number,ReactNode>>}){
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
 const lines=useMemo(()=>text.split('\n'),[text]);
 const chapters=useMemo(()=>lines.map((line,i)=>({line:i+1,title:line.replace(/^#+\s*/,'').replace(/\*\*/g,'')})).filter((_,i)=>/^#{1,3}\s/.test(lines[i])),[lines]);
 const chapterStarts=useMemo(()=>lines.reduce<number[]>((starts,line,index)=>{if(/^#{1,3}\s/.test(line))starts.push(index);return starts;},[]),[lines]);
 if(error)return <div className="panel"><p>文明檔案暫時未能載入。</p><button className="button" onClick={()=>setRetry(retry+1)}>重新載入完整文案</button></div>;
 if(!text)return <div className="loading" role="status"><Orbit/> 正在展開文明檔案……</div>;
 const slots=new Map<number,ReactNode>([[2,<section className="celebrity-region" key="celebrities"><h2>著名{civ?.name||'星座'}</h2><div className="celebrity-grid">{names.map(name=><CelebrityCard name={name} key={name}/>)}</div></section>]]);
 for(const [chapter,content] of Object.entries(insertions??{}))if(content)slots.set(Number(chapter),content);
 const slotChapters=[...slots.keys()].filter(chapter=>chapterStarts[chapter]!==undefined).sort((a,b)=>a-b);
 const renderMarkdown=(start:number,end:number,key:string)=>{const source=lines.slice(start,end).join('\n');if(!source)return null;const components={h1:(p:any)=><h2 id={`chapter-${(p.node?.position?.start.line||1)+start}`}>{p.children}</h2>,h2:(p:any)=><h2 id={`chapter-${(p.node?.position?.start.line||1)+start}`}>{p.children}</h2>,h3:(p:any)=><h2 id={`chapter-${(p.node?.position?.start.line||1)+start}`}>{p.children}</h2>};return <Markdown key={key} components={components}>{source}</Markdown>;};
 let start=0;
 const body=slotChapters.flatMap(chapter=>{const end=chapterStarts[chapter],content=[renderMarkdown(start,end,`text-${start}`),<div className="report-chapter-insert" key={`insert-${chapter}`}>{slots.get(chapter)}</div>];start=end;return content;});
 body.push(renderMarkdown(start,lines.length,`text-${start}`));
 return <section className="official-layout" id="official"><aside className="reading-toc"><p className="eyebrow">完整文明檔案</p><h3>沿著記憶閱讀</h3><details open={window.innerWidth>=1000||undefined}><summary>章節導覽 <ChevronDown size={16}/></summary><nav aria-label="文明章節">{chapters.map((c,i)=><a href={`#chapter-${c.line}`} key={c.line}><span>{String(i+1).padStart(2,'0')}</span>{c.title}</a>)}</nav></details><span className="reading-note">官方正文 · 完整收錄</span></aside><article className="official-prose">{body}<div className="reading-end"><span>✦</span><p>這段星際記憶，已完整展開。</p><a href="#main">返回頁首 ↑</a></div></article></section>;
}
export function Civilization(){const {id}=useParams();const c=civs.find(c=>String(c.id)===id);useTitle(c?`${c.name}文明`:'找不到文明');if(!c)return <div className="empty"><h1>找不到這個文明。</h1><Link to="/civilizations">返回文明圖鑑</Link></div>;return <><div className="civilization-page section"><Link className="text-button" to="/civilizations"><ChevronLeft size={17}/> 返回文明圖鑑</Link><section className="civilization-hero"><div><p className="eyebrow">文明檔案 {String(civs.findIndex(item=>item.id===c.id)+1).padStart(2,'0')} / 21 <span className="category-tag">{c.category}</span></p><p className="english">{c.english}</p><h1>{c.name}</h1><p className="civ-subtitle">{c.subtitle}</p><a className="text-button" href="#official">展開完整文明記憶 ↓</a></div><Icon id={c.id}/></section><OfficialText id={c.id}/><section className="related"><div className="section-heading"><h2>繼續穿越星海</h2><Link className="text-button" to="/quiz">尋找我的起源 <ArrowUpRight size={16}/></Link></div><div className="related-grid">{civs.filter(x=>x.category===c.category&&x.id!==c.id).map(x=><Link key={x.id} to={`/civilizations/${x.id}`}><Icon id={x.id} size="small"/><span>{x.name}<small>{x.category}</small></span><ArrowUpRight size={17}/></Link>)}</div></section></div></>;}
export function Report({attempt,demo=false,onSaved,onEdit,onRestart}:{attempt?:Attempt|null;demo?:boolean;onSaved?:(a:Attempt)=>void;onEdit?:()=>void;onRestart:()=>void}){
 const location=useLocation(),sharedRequest=useMemo(()=>readShared(location.search),[location.search]),[shared,setShared]=useState<SharedReport>(sharedRequest);
 useEffect(()=>{if(!sharedRequest.code){setShared(sharedRequest);return;}let active=true;void fetch(`/api/shares/${sharedRequest.code}`).then(async response=>{const data=await response.json() as {error?:string;payload?:unknown};if(!response.ok)throw Error(data.error||'這份分享連結暫時未能開啟。');return parseImport(data.payload);}).then(responses=>{if(active)setShared({shared:true,responses});}).catch(error=>{if(active)setShared({shared:true,error:(error as Error).message});});return()=>{active=false;};},[sharedRequest]);
 const responses=shared.shared?shared.responses:demo?demoFixture.responses as Responses:attempt?.responses;
 const mode=responses?responseMode(responses):'full';
 const localAttempt=!demo&&!shared.shared?attempt:null;
 const itemVersions=localAttempt?.itemVersions??(localAttempt?Object.fromEntries(Object.keys(responses??{}).map(id=>[id,1])):undefined);
 const responseKey=JSON.stringify(responses),sourceKey=`${shared.shared?'shared':demo?'demo':localAttempt?.attemptId}:${responseKey}`;
 const [loaded,setLoaded]=useState<{key:string;result:ScoringResult}|null>(null),[error,setError]=useState(''),[retry,setRetry]=useState(0),[saveState,setSaveState]=useState(''),[saving,setSaving]=useState(false);
 const onSavedRef=useRef(onSaved);onSavedRef.current=onSaved;
 const result=loaded?.key===sourceKey?loaded.result:null;
 const [scrollMode,setScrollMode]=useState<'top'|'down'|'up'>('top');
 useEffect(()=>{let last=window.scrollY;const onScroll=()=>{const y=window.scrollY;setScrollMode(y<20?'top':y<last?'up':'down');last=y;};window.addEventListener('scroll',onScroll,{passive:true});return()=>window.removeEventListener('scroll',onScroll);},[]);
 useEffect(()=>{
  if(!responses)return;let active=true;const abort=new AbortController();setError('');setSaveState('');setSaving(false);
  async function load(){
   try{let next:ScoringResult;
    if(localAttempt?.saved&&validResult(localAttempt.result,mode))next=localAttempt.result;
    else if(localAttempt&&!localAttempt.saved){
     if(!localAttempt.pretest)next=await requestScore(responses!,abort.signal);
     else{setSaving(true);
      try{const saved=await submitAttempt(localAttempt);if(!validResult(saved.result,mode))throw Error('報告版本不相容，請重新載入頁面。');next=saved.result;if(active){onSavedRef.current?.({...localAttempt,saved:true,result:next});setSaveState('匿名校準資料已儲存。');}}
      catch(e){if(!active)return;setSaveState((e as Error).message);next=validResult(localAttempt.result,mode)?localAttempt.result:await requestScore(responses!,abort.signal);if(active)onSavedRef.current?.({...localAttempt,result:next});}
     }
    }else next=await requestScore(responses!,abort.signal);
    if(active)setLoaded({key:sourceKey,result:next});
   }catch(e){if(active)setError((e as Error).message);}finally{if(active)setSaving(false);}
  }
  void load();return()=>{active=false;abort.abort();};
 },[sourceKey,retry,localAttempt?.pretest]);
 useTitle(demo?'報告範例':result?.public.status==='classified'?`${civilization(result.public.primary.id).name}・你的星際報告`:'你的星際報告');
 async function save(){if(!localAttempt||saving)return;setSaving(true);setSaveState('正在匿名儲存完成的答案……');try{const response=await submitAttempt(localAttempt);if(!validResult(response.result,mode))throw Error('報告版本不相容，請重新載入頁面。');onSaved?.({...localAttempt,saved:true,result:response.result});setLoaded({key:sourceKey,result:response.result});setSaveState('匿名校準資料已儲存。');}catch(e){setSaveState((e as Error).message);}finally{setSaving(false);}}
 if(shared.error)return <div className="empty"><Orbit size={40}/><h1>這份分享需要更新。</h1><p>{shared.error}</p><Link className="button gold" to="/quiz">開始新版測驗 <ArrowUpRight size={18}/></Link></div>;
 if(shared.shared&&!shared.responses)return <div className="empty" role="status"><Orbit className="report-loading-orbit" size={40}/><h1>正在開啟分享報告。</h1><p>正在取得這份星際座標。</p></div>;
 if(!responses)return <div className="empty"><Orbit size={40}/><h1>你的星際報告，等待開啟。</h1><p>完成短版 24 題或完整版 54 題，或從選單匯入你的答案。</p><Link className="button gold" to="/quiz">開始測驗 <ArrowUpRight size={18}/></Link><Link to="/sample" className="text-button">查看報告範例</Link></div>;
 if(error)return <div className="empty"><Orbit size={40}/><h1>報告暫時未能開啟。</h1><p role="alert">{error}</p><button className="button gold" onClick={()=>setRetry(n=>n+1)}>重新載入報告 <RefreshCw size={18}/></button><ExportButton responses={responses} itemVersions={itemVersions}/></div>;
 if(!result)return <div className="empty" role="status"><Orbit className="report-loading-orbit" size={40}/><h1>正在整理你的星際座標。</h1><p>正在計算 21 個文明的分數、比較結果與結構穩定度……</p></div>;
 if(result.public.status==='no_classification'||result.diagnostic.status!=='classified')return <div className="empty zero"><Orbit size={50}/><p className="eyebrow">方向尚未形成</p><h1>你的答案，<br/>暫未形成可判讀方向。</h1><p>本次答案在模型中沒有足夠的方向資訊，因此不指定 Primary。你可以回顧答案，再開啟報告。</p>{localAttempt&&<button className="button gold" onClick={onEdit}>回去修改答案 <ArrowRight size={18}/></button>}<ExportButton responses={responses} itemVersions={itemVersions}/>{saveState&&<small role="status">{saveState}</small>}{localAttempt&&!localAttempt.saved&&<button onClick={save} disabled={saving} className="text-button">重新儲存匿名答案</button>}</div>;
 if(!demo&&!shared.shared&&localAttempt&&!localAttempt.saved&&!localAttempt.pretest)return <IdentityGate onContinue={pretest=>onSaved?.({...localAttempt,pretest})}/>;
 if(!demo&&!shared.shared&&localAttempt?.pretest&&!localAttempt.reportIntroSeen)return <ReportPrelude familiarity={localAttempt.pretest.familiarity} onContinue={()=>onSaved?.({...localAttempt,reportIntroSeen:true})}/>;
 const classified={public:result.public,diagnostic:result.diagnostic},c=civilization(result.public.primary.id);
 return <div className="report-page section">{demo&&<div className="demo-banner"><span>報告範例</span> 使用固定範例答案展示；不會保存至匿名校準資料庫。<Link to="/quiz">開始我的測驗 <ArrowUpRight size={15}/></Link></div>}{shared.shared&&<div className="demo-banner"><span>分享報告</span>這是分享連結中的答案結果。</div>}<div className={`result-floating ${scrollMode==='down'?'is-visible':''}`}><span>你的星際報告</span><ShareButton responses={responses} civilization={c.name} itemVersions={itemVersions}/></div><div className={`result-scroll-header ${scrollMode==='up'?'is-visible':''}`}><Link to="/" aria-label="回到首頁"><Orbit size={19}/><span>星際起源</span></Link><Link to="/civilizations" aria-label="探索文明圖鑑"><MenuIcon/></Link></div><div className="report-topline"><ShareButton responses={responses} civilization={c.name} itemVersions={itemVersions}/></div><section className="result-hero"><div className="result-identity"><span className="category-tag result-category" style={{'--category':categories.find(category=>category.name===c.category)?.color??'var(--gold)'} as React.CSSProperties}>{c.category}</span><p className="primary-result-line">你的星際種子是：</p><h1>{c.name}</h1><p className="english">{c.english}</p><p className="civ-subtitle">{reportSubtitle[c.id]??shortCopy(c.lineageId)}</p><a className="button" href="#official">閱讀完整文明記憶 <ArrowRight size={17}/></a></div><div className="result-art"><Icon id={c.id}/></div></section><nav className="report-nav" aria-label="報告章節"><a href="#official">完整文明記憶</a><a href="#structure">完整排行</a>{localAttempt&&<a href="#feedback">回饋</a>}<a href="#civilization-rail-title">探索文明</a></nav><TopFour result={classified}/><ClassificationClarity result={classified}/><OfficialText id={c.id} insertions={{4:localAttempt?<><div className="save-status" role="status">{localAttempt.saved?<><Check size={16}/>匿名校準資料已儲存。</>:<><span>{saveState||'答案已在此裝置保存。'}</span><button className="text-button" onClick={save} disabled={saving}>{saving?'儲存中……':'重新儲存'}<RefreshCw size={14}/></button></>}</div><Feedback attempt={localAttempt}/></>:null,7:<Ranking result={classified}/>,10:<RankedCivilizationRail result={classified}/>}}/>{localAttempt&&<Retest onRestart={onRestart}/>}<section className="report-end"><h2>每一道星光，<br/>都有值得理解的故事。</h2><div><Link className="button" to="/civilizations">探索全部 21 個文明 <ArrowUpRight size={18}/></Link><button className="text-button" onClick={onRestart}>{demo||shared.shared?'開始我的測驗':'重新測驗'} <ArrowRight size={17}/></button></div></section><div className="report-export-bottom"><ExportButton responses={responses} itemVersions={itemVersions}/></div></div>;
}
type ClassifiedResult={public:Extract<ScoringResult['public'],{status:'classified'}>;diagnostic:Extract<ScoringResult['diagnostic'],{status:'classified'}>};
function IdentityGate({onContinue}:{onContinue:(value:Pretest)=>void}){const [known,setKnown]=useState(''),[familiarity,setFamiliarity]=useState<Pretest['familiarity']|''>('');const priorIdentity=known==='no'||known==='unsure'?known:known?'yes':'';const priorLineage=priorIdentity==='yes'?Number(known):null;const ready=Boolean(familiarity&&priorIdentity&&(priorIdentity!=='yes'||priorLineage));return <section className="identity-gate section"><p className="eyebrow">在打開報告之前</p><h1>先留下你的直覺，<br/><em>再看看模型如何回答。</em></h1><p>這些資料會與本次答案一起匿名保存，用於理解結果與你原本的認同是否一致。</p><div className="identity-actions"><label>你本身對星際種子理論的熟悉程度<select value={familiarity} onChange={e=>setFamiliarity(e.target.value as Pretest['familiarity'])}><option value="">請選擇</option><option value="none">從未接觸</option><option value="some">略有認識</option><option value="expert">專家級數</option></select></label><label>作答前，你是否已有明確的星際身份認同？<select value={known} onChange={e=>setKnown(e.target.value)}><option value="">請選擇</option><option value="no">沒有</option><option value="unsure">不確定</option>{civs.map(c=><option value={String(c.id)} key={c.id}>{c.name}</option>)}</select></label><button className="button gold" disabled={!ready} onClick={()=>onContinue({familiarity:familiarity as Pretest['familiarity'],priorIdentity:priorIdentity as Pretest['priorIdentity'],priorLineage})}>查看我的報告 <ArrowRight size={17}/></button></div></section>}
export function ReportPrelude({familiarity,onContinue}:{familiarity:Pretest['familiarity'];onContinue:()=>void}){
 const newcomer=familiarity==='none';
 return <section className={`report-prelude section ${newcomer?'is-newcomer':'is-familiar'}`}><div className="prelude-orbit" aria-hidden="true"><Orbit size={38}/><span>✦</span></div><div className="prelude-copy"><p className="eyebrow">你的星際檔案已準備完成</p><h1>{newcomer?'請先深呼吸：':'請先做好心理準備：'}</h1>{newcomer?<><p>接下來的訊息量極大，這是一份逐層解開你星際起源的檔案。</p><p>內容很長，不用急著一次讀完。你的結果已經存好了，隨時可以回來重溫——它很可能會在不同時期，帶給你關鍵的啟發。</p><div className="prelude-reveals"><h2>這份檔案將為你揭露：</h2><ol><li><span>01</span><p>你母星文明的宇宙歷史，以及你曾親歷過的故事</p></li><li><span>02</span><p>你當初「自願」投生地球的真正使命與未竟課題</p></li><li><span>03</span><p>你目前的意識維度，以及將在哪個生命轉折點徹底覺醒</p></li></ol></div></>:<div className="prelude-familiar-copy"><p>結果揭曉的那一刻，很可能會顛覆你的預期。</p><p>這份測驗刻意抽離了所有容易被「對號入座」的靈性字眼，直接從你最底層的行為潛意識切入。</p><p>我們比對了多位通靈者未經潤飾的第一手原始資料，並剔除了靈性圈長久以來的標籤與迷思，再經過大量作答數據的反覆校準。</p><p>因此，請放下你過去對特定星系的投射或執念。你靈魂的真實底色，或許和你想的大不相同。</p></div>}<button className="button gold prelude-ready" onClick={onContinue}>我準備好了 <ArrowRight size={18}/></button></div></section>;
}
function ShareButton({responses,civilization,itemVersions}:{responses:Responses;civilization:string;itemVersions?:Record<string,number>}){
 const [open,setOpen]=useState(false),[copied,setCopied]=useState(false),[error,setError]=useState(''),[shareUrl,setShareUrl]=useState(''),[creating,setCreating]=useState(false);const creationAttempted=useRef(false),closeRef=useRef<HTMLButtonElement>(null),triggerRef=useRef<HTMLButtonElement>(null),dialogRef=useRef<HTMLDivElement>(null);
 useEffect(()=>{if(!open)return;const previous=document.body.style.overflow;document.body.style.overflow='hidden';closeRef.current?.focus();const keydown=(e:KeyboardEvent)=>{if(e.key==='Escape')setOpen(false);if(e.key==='Tab'){const buttons=dialogRef.current?.querySelectorAll<HTMLButtonElement>('button');if(!buttons?.length)return;const first=buttons[0],last=buttons[buttons.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}};document.addEventListener('keydown',keydown);return()=>{document.body.style.overflow=previous;document.removeEventListener('keydown',keydown);triggerRef.current?.focus();};},[open]);
 useEffect(()=>{if(!open||shareUrl||creationAttempted.current)return;let active=true;creationAttempted.current=true;setCreating(true);setError('');void fetch('/api/shares',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({payload:makeExport(responses,itemVersions)})}).then(async response=>{const data=await response.json() as {error?:string;code?:string};if(!response.ok||!data.code)throw Error(data.error||'暫時未能建立短連結。');return `${window.location.origin}/report?share=${data.code}`;}).then(url=>{if(active)setShareUrl(url);}).catch(error=>{if(active)setError((error as Error).message);}).finally(()=>{if(active)setCreating(false);});return()=>{active=false;};},[open,shareUrl,responses,itemVersions]);
 const copy=async()=>{if(!shareUrl)return;try{await navigator.clipboard.writeText(shareUrl);setCopied(true);setError('');}catch{setError('未能複製連結，請允許瀏覽器使用剪貼簿後再試。');}};
 const share=(service:'facebook'|'x')=>{if(!shareUrl)return;const target=service==='facebook'?`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`:`https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(`我的主要文明是${civilization}。你的是什麼？`)}`;window.open(target,'_blank','noopener,noreferrer');};
 return <><button ref={triggerRef} className="share-button" onClick={()=>{setCopied(false);setError('');creationAttempted.current=false;setOpen(true)}}><Copy size={15}/>分享結果</button>{open&&createPortal(<div className="share-modal-backdrop" onClick={e=>{if(e.target===e.currentTarget)setOpen(false)}}><div ref={dialogRef} className="share-modal" role="dialog" aria-modal="true" aria-labelledby="share-title"><button ref={closeRef} className="share-close" onClick={()=>setOpen(false)} aria-label="關閉分享視窗">×</button><p className="eyebrow">分享你的星際座標</p><h2 id="share-title">我的主要文明是 {civilization}。<br/><em>你的是什麼？</em></h2><p>連結會以短代碼保存你的答案；持有連結的人可查看報告及匯出答案，請只分享給你願意讓對方閱讀的人。</p><div className="share-actions"><button disabled={!shareUrl} onClick={()=>share('facebook')}>Facebook</button><button disabled={!shareUrl} onClick={()=>share('x')}>X</button><button disabled={!shareUrl} onClick={copy}><Copy size={15}/>{creating?'正在建立短連結……':copied?'已複製連結':'複製短連結'}</button></div>{error&&<p role="alert">{error}</p>}</div></div>,document.body)}</>;
}
function TopFour({result}:{result:ClassifiedResult}){const near=result.diagnostic.ranking.slice(0,3),far=[...result.diagnostic.ranking].reverse().slice(0,3);const rows=(items:typeof near)=>items.map((s,i)=>{const c=civilization(s.id);return <Link className={`rank-row ${s.id===result.public.primary.id?'is-primary':''}`} to={`/civilizations/${c.id}`} key={s.id}><span className="rank-number">{String(i+1).padStart(2,'0')}</span><Icon id={c.id} size="small"/><span className="rank-name">{c.name}<small>{c.category}</small></span><div className="rank-score"><span className="score-track"><i style={{width:`${s.matchScore}%`}}/></span><b>契合度 {displayMatch(s.matchScore)}</b></div></Link>});return <section className="top-four"><div className="top-four-columns"><div><p className="eyebrow">最匹配頭3名</p><div className="ranking-table">{rows(near)}</div></div><div><p className="eyebrow">最不匹配3名</p><div className="ranking-table">{rows(far)}</div></div></div><p className="chart-note">契合度以此測驗版本校正過的原始相似度換算；50 代表中性匹配。你可以同時與多個文明有共鳴，這些數字不是血統比例，也不用加起來等於 100。</p></section>}
function RankedCivilizationRail({result}:{result:ClassifiedResult}){return <section className="ranked-civilization-rail" aria-labelledby="civilization-rail-title"><div className="section-heading"><div><p className="eyebrow">延伸探索</p><h2 id="civilization-rail-title">依你的契合度排行，認識每個文明。</h2></div><span className="section-note">向右滑動查看全部 21 個文明</span></div><div className="civilization-rail-scroller">{result.diagnostic.ranking.map((row,index)=>{const c=civilization(row.id),color=categories.find(category=>category.name===c.category)?.color??'var(--gold)';return <Link className="civilization-rail-card" key={c.id} to={`/civilizations/${c.id}`} style={{'--category':color} as React.CSSProperties}><span className="civilization-rail-rank">#{String(index+1).padStart(2,'0')} · 契合度 {displayMatch(row.matchScore)}</span><Icon id={c.id} size="small"/><strong>{c.name}</strong><small>{c.category}</small><span className="civilization-rail-score">閱讀檔案 ↗</span></Link>;})}</div></section>;}
function Ranking({result}:{result:ClassifiedResult}){
 const rows=result.diagnostic.ranking;
 return <section className="report-section" id="structure"><div className="section-heading"><div><p className="eyebrow">01 / 完整排行</p><h2>你的方向，如何落在星海之中。</h2></div><span className="section-note">21 個文明</span></div><p className="analysis-intro">從最接近到最不接近，完整看看你的回答與每個文明的契合度。50 代表中性匹配；低於 50 不代表好壞，只表示這些特質在本次回答中較少出現。</p><div className="ranking-table"><div className="rank-header"><span>排行 / 文明</span><span>契合度 0–100</span></div>{rows.map(s=>{const c=civilization(s.id);return <Link className={`rank-row ${s.id===result.public.primary.id?'is-primary':''}`} key={s.id} to={`/civilizations/${c.id}`}><span className="rank-number">{String(s.rank).padStart(2,'0')}</span><Icon id={c.id} size="small"/><span className="rank-name">{c.name}<small>{s.id===result.public.primary.id?'第一名 · 最接近你':s.id===result.public.runner_up.id?'第二名 · 同樣值得認識':c.category}</small></span><div className="rank-score"><span className="score-track"><i style={{width:`${s.matchScore}%`}}/></span><b>契合度 {displayMatch(s.matchScore)}</b></div><ArrowUpRight className="rank-link" size={15}/></Link>;})}</div><p className="chart-note">契合度由原始 cosine 依測驗版本換算而成；50 是原始 cosine 為 0 的中性匹配。各文明分開比較，分數不需要加總為 100。</p></section>;
}
const clarityCopy={very_close:{title:'雙向共鳴',text:'你和前兩個文明都有很強的共鳴，目前很難只用其中一個完全概括你。'},close:{text:'你的第一文明比較明顯，同時第二文明也在你身上留下很明顯的痕跡。'},clear:{text:'你的第一文明輪廓很明顯，和其他文明拉開了一段距離。'},very_clear:{text:'你的整體回答高度集中在同一個方向，第一文明的特質在你身上非常突出。'}};
export function ClassificationClarity({result}:{result:ClassifiedResult}){const clarity=result.public.classificationClarity,copy=clarityCopy[clarity.tier],primary=civilization(result.public.primary.id),runnerUp=civilization(result.public.runner_up.id),primaryScore=displayMatch(result.public.scores[primary.lineageId]),runnerUpScore=displayMatch(result.public.scores[runnerUp.lineageId]),gap=Math.abs(Number(primaryScore)-Number(runnerUpScore));return <section className="clarity-panel" aria-labelledby="clarity-title"><p className="eyebrow" id="clarity-title">{clarity.form==='quick'?'快速版結果清晰度':'結果清晰度'}</p>{'title'in copy&&<h2>{copy.title}</h2>}<div className="clarity-scores"><div><span>第一名 · {primary.name}</span><strong>{primaryScore}</strong><small>契合度</small></div><div><span>第二名 · {runnerUp.name}</span><strong>{runnerUpScore}</strong><small>契合度</small></div><div><span>分數相差</span><strong>{gap}</strong><small>個契合度點</small></div></div><p>第一、二名的顯示契合度相差 {gap} 點。{copy.text}</p></section>;}
function Feedback({attempt}:{attempt:Attempt}){const [fit,setFit]=useState(0),[self,setSelf]=useState(''),[comment,setComment]=useState(''),[status,setStatus]=useState(''),[busy,setBusy]=useState(false);async function submit(e:FormEvent){e.preventDefault();setBusy(true);try{const response=await fetch('/api/feedback',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({attemptId:attempt.attemptId,feedbackToken:attempt.feedbackToken,fit,selfLineage:self?Number(self):null,comment})});const data=await response.json() as {error?:string};if(!response.ok)throw Error(data.error||"暫時無法儲存回饋。");setStatus('回饋已儲存。謝謝你讓這份星圖更加清晰。');}catch(e){setStatus((e as Error).message);}finally{setBusy(false);}}
 const options=<><option value="">不確定</option>{civs.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</>;
 return <section className="feedback-section report-section" id="feedback"><div><p className="eyebrow">讓你的聲音，回到星圖之中</p><h2>這份記憶，<br/>與你有多靠近？</h2><p>分享你的真實感受，協助未來的模型校準。回饋自由填寫，不影響本次結果。</p><Link className="text-button" to="/privacy">匿名資料如何使用 <ArrowUpRight size={16}/></Link></div><form onSubmit={submit}><fieldset><legend>結果符合程度</legend><div className="fit-scale">{[1,2,3,4,5,6,7].map(v=><label key={v} className={fit===v?'selected':''}><input required type="radio" name="fit" value={v} checked={fit===v} onChange={()=>setFit(v)}/><span>{v}</span></label>)}</div><div className="scale-labels"><span>很不符合</span><span>非常符合</span></div></fieldset><label>看完報告後，你現在最認同的文明 <span>（選填）</span><select value={self} onChange={e=>setSelf(e.target.value)}>{options}</select></label><label>最符合／最不像自己的地方 <span>（選填）</span><textarea value={comment} onChange={e=>setComment(e.target.value)} maxLength={2000} rows={4} placeholder="說說讓你有感的片段。請勿填寫姓名、聯絡方式等個人資料。"/></label><small>{comment.length} / 2000</small><button className="button gold" type="submit" disabled={busy||!attempt.saved}>{busy?'正在儲存……':'送出匿名回饋'}<ArrowRight size={17}/></button>{!attempt.saved&&<p className="chart-note">完成答案儲存後即可提交回饋，請使用上方「重新儲存」。</p>}<p className="form-status" role="status">{status}</p></form></section>;}
function Retest({onRestart}:{onRestart:()=>void}){const [code]=useState(participant),[copied,setCopied]=useState(false);return <section className="retest panel"><div><p className="eyebrow">留一個座標，給未來的你</p><h3>匿名重測碼</h3><p>此裝置會自動連結未來測驗。換裝置時，可在「資料與隱私」輸入這組代碼，延續匿名重測紀錄。</p></div><div><code>{code}</code><button className="text-button" onClick={async()=>{try{await navigator.clipboard.writeText(code);setCopied(true);}catch{setCopied(false);}}}><Copy size={15}/>{copied?'已複製':'複製代碼'}</button><button className="text-button" onClick={onRestart}>開始一次新的測驗 <ArrowRight size={15}/></button></div></section>;}
export function Privacy(){useTitle('資料與隱私');const [code,setCode]=useState(''),[status,setStatus]=useState('');function restore(e:FormEvent){e.preventDefault();if(!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(code.trim()))return setStatus('請輸入完整的匿名重測碼。');if(write('starseed2-participant',code.trim().toLowerCase()))setStatus('匿名重測碼已設定，下一次完成的測驗將連結至這組代碼。');else setStatus('此瀏覽器無法保存代碼，請允許本機儲存後再試。');}
 return <div className="privacy-page section"><p className="eyebrow">資料與隱私</p><h1>讓記憶留下，<br/><em>讓身份保持匿名。</em></h1><div className="privacy-prose"><h2>完成測驗時會保存什麼</h2><p>完成 24 或 54 題後，網站會自動提交匿名校準資料：隨機產生的參與者與測驗識別碼、鎖定於開始測驗時的模式與推廣來源代碼（連結中的 ref）、該模式的完整原始答案、作答時長、匯入狀態、作答前對星際種子理論的熟悉程度與原本的身份認同、模型版本與指紋、由伺服器計算的結果、21 個完整精度相似度、分類差距、覆蓋度、作答幅度與結果穩定度摘要，以及單一部署版本。若沒有足夠方向資訊，則保留「未分類」狀態。</p><p>資料庫只保留伺服器收到提交的時間與作答時長，不保存開始與完成的兩個時間點；詳細診斷可依完整原始答案與凍結模型在本地重新計算。未完成的測驗只留在你的瀏覽器，不會寫入校準資料庫。報告範例與分享報告會將答案傳送至伺服器計算，但不寫入匿名校準資料庫。匯入答案會重新計算，並以匯入紀錄保存；其作答時長記為匯入處理時間。</p><h2>資料用來做什麼</h2><p>分析題目表現、分類邊界、匿名重測一致性與自我認同回饋，協助未來研究和建立明確的新模型版本。目前凍結的題目、權重、計分與分類不會因收集資料而自動改變。紀錄保留供歷史結果重建與校準研究使用。</p><h2>自由填寫的結果回饋</h2><p>結果符合程度、看完報告後最認同的文明與選填文字，只在你主動送出回饋時保存；作答前的身份認同會自動帶入同一筆匿名回饋。請勿在文字回饋中填入姓名、電話、email 或其他身份資料。</p><h2>身份與基礎設施</h2><p>網站不要求帳號，不收集姓名、電話、email、精確位置、完整地址、裝置指紋或廣告識別碼，也不使用第三方廣告追蹤器。匿名重測碼用於連結你的多次測驗，不提供公開查詢個人答案的功能，請自行保管。</p><p>網站與資料庫由 Cloudflare Workers 與 D1 承載。Cloudflare 為提供網路服務與防濫用會處理必要的連線資訊；應用程式不把 IP 位址或瀏覽器指紋寫入校準資料庫。資料沒有公開下載介面。</p><h2>分享報告</h2><p>分享連結包含完整答案及測驗版本，不包含匿名重測碼或回饋驗證碼。任何持有連結的人都可以重新計算報告、查看及匯出答案。開啟分享報告不會取代此裝置的個人結果。</p><h2>這個裝置上的資料</h2><p>瀏覽器本機儲存包含未完成進度、最近一次完成的答案與報告、匿名參與者識別碼及回饋驗證碼。你可隨時匯出完整答案，也可透過瀏覽器清除此網站的本機資料；清除本機資料不會刪除已提交的匿名校準紀錄。</p><h2>換裝置後延續重測</h2><p>輸入之前保存的匿名重測碼。設定只影響之後完成的測驗，不會變更既有紀錄。</p><form className="restore-form" onSubmit={restore}><label>匿名重測碼<input type="text" value={code} onChange={e=>setCode(e.target.value)} placeholder="xxxxxxxx-xxxx-4xxx-xxxx-xxxxxxxxxxxx" autoComplete="off" maxLength={36}/></label><button className="button" type="submit">設定重測碼</button><p role="status">{status}</p></form><Link className="text-button" to="/quiz">返回你的旅程 <ArrowRight size={16}/></Link></div></div>;
}
