import {Link} from 'react-router-dom';
import {ArrowUpRight,ArrowRight,Scale,Layers3,ShieldCheck,ScanLine} from 'lucide-react';
import {Icon} from '../App';
import civs from '../data/civilizations.json';
import copy from '../../starseed_s4_rpd_web_handoff_v4_1_min/result_copy.zh-Hant.json';
import {questions} from '../shared/questionnaire';
import type {ScoringResult,RankingEntry,PairStability} from '../shared/result';

type ClassifiedResult=Extract<ScoringResult,{public:{status:'classified'}}>;
const num=(value:number,digits=2)=>value.toFixed(digits);
const signed=(value:number)=>`${value>0?'+':''}${num(value)}`;
const formats={BIP:'左右傾向',BWS:'最像與最不像',CROSS:'做法與期待'};
const short=(id:string)=>copy.lineages[id as keyof typeof copy.lineages].short;
const qNumber=(id:string)=>questions.findIndex(q=>q.id===id)+1;

function Stat({label,value,note}:{label:string;value:string;note:string}){
 return <div className="pair-stat"><span>{label}</span><strong>{value}</strong><p>{note}</p></div>;
}

function SignedBar({value,limit}:{value:number;limit:number}){
 const width=Math.min(50,Math.abs(value)/limit*50);
 return <div className="pair-signed-bar" aria-hidden="true"><i className={value<0?'runner':''} style={{left:`${value<0?50-width:50}%`,width:`${width}%`}}/></div>;
}

function RangeBand({entry,field,label}:{entry:RankingEntry;field:'model_band'|'family_band';label:string}){
 const [low,high]=entry[field];
 return <div className="pair-range-row"><div><span>{label}</span><b>{num(low,1)} – {num(high,1)}</b></div><div className="pair-range-track" role="img" aria-label={`${label}：${num(low,1)} 至 ${num(high,1)}；本次匹配指數 ${num(entry.score,1)}`}><i style={{left:`${low}%`,width:`${high-low}%`}}/><b style={{left:`${entry.score}%`}}/></div></div>;
}

function MarginRow({title,values,limit}:{title:string;values:PairStability['model_pair_margin_t_points'];limit:number}){
 return <div className="pair-margin-row"><h4>{title}</h4>{([
  ['min','最不利的一次'],['p10','偏不利的一端'],['median','中間的一次'],
 ] as const).map(([key,label])=><div key={key}><span>{label}</span><strong className={values[key]<0?'runner-ink':''}>{signed(values[key])}<small> 分</small></strong><SignedBar value={values[key]} limit={limit}/></div>)}</div>;
}

export default function PairComparison({result:r}:{result:ClassifiedResult}){
 const d=r.diagnostic,pair=d.winner_runner_pair_stability,stability=d.classification_stability,g=pair.boundary_geometry;
 const primary=d.ranking[0],runner=d.ranking[1];
 const p=civs.find(c=>c.lineageId===primary.id)!,ru=civs.find(c=>c.lineageId===runner.id)!;
 const marginLimit=Math.max(1,pair.central_t_gap,...Object.values(pair.model_pair_margin_t_points).map(Math.abs),...Object.values(pair.family_pair_margin_t_points).map(Math.abs));
 const formatRows=Object.entries(d.format_margin_t_points),formatLimit=Math.max(1,...formatRows.map(([,v])=>Math.abs(v)),Math.abs(d.centrality_offset_t_points));
 const groups=Object.entries(d.family_margin_t_points).map(([family,value])=>({family,value,items:d.item_contributions.filter(item=>item.family===family)})).sort((a,b)=>Math.abs(b.value)-Math.abs(a.value));
 const groupLimit=Math.max(1,...groups.map(group=>Math.abs(group.value)));
 const itemTotal=d.item_contributions.reduce((sum,item)=>sum+item.winner_over_runner_t_points,0);
 const checks=[
  {label:'換個角度看答案',pair:pair.model_pair_agreement_pct,all:stability.components.model_top1_agreement_pct,note:'調整不同特質的重要程度。各種看法按既定權重合計，因此這個比例不是單純數次數。'},
  {label:'每次少看一組相關答案',pair:pair.family_pair_agreement_pct,all:stability.components.family_top1_agreement_pct,note:`共 ${groups.length} 次檢查，每次略去一組相關題目。100% 表示每次都維持領先。`},
 ];
 const geometryRows=g?[
  ['原本的區分角度',g.nominal_angle_deg,'兩個文明在原定設計中的分開程度。'],
  ['少看一道題，最接近的一次',g.same_pair_leave_one_item_min_angle_deg,'逐題略去後，兩者最容易混在一起的情況。'],
  ['少看一組題，最接近的一次',g.same_pair_whole_family_dropout_min_angle_deg,'逐組略去相關題目後，兩者最接近的情況。'],
  ['1,024 種極端設定：最小角度',g.corner1024_min_angle_deg,'整套極端設定裡，兩個文明最接近的一次。'],
  ['1,024 種極端設定：較低的 5% 位置',g.corner1024_p05_angle_deg,'排好角度後，靠近較小那一端的 5% 位置。'],
  ['1,024 種極端設定：較低的 10% 位置',g.corner1024_p10_angle_deg,'排好角度後，靠近較小那一端的 10% 位置。'],
  ['1,024 種極端設定：中間位置',g.corner1024_median_angle_deg,'一半設定的角度較小，另一半較大。'],
 ] as const:[];

 return <section className="pair-lab" id="boundary" aria-labelledby="pair-title">
  <header className="pair-intro"><div><p className="eyebrow">02 / 第一名與第二名 · 深入比較</p><h2 id="pair-title">同一份答案，<br/>兩個值得認識的你。</h2><p>「{p.name}」是本次最接近你的文明。「{ru.name}」緊隨其後。從分數、不同看法和每一道選擇，看看兩者為什麼排在這裡。</p></div><div className="pair-lead"><span>本次完整計分差距</span><strong>{num(pair.central_t_gap)}<small> 分</small></strong><p>{pair.robust_pair_margin_floor_t_points>0?'所有比較檢查中，第一名都保持領先。':pair.robust_pair_margin_floor_t_points<0?'在部分比較檢查中，第二名會反超。':'在至少一次比較檢查中，兩者並列。'}</p></div></header>

  <div className="pair-profiles">{[primary,runner].map((entry,index)=>{
   const c=index===0?p:ru;
   return <article className={`pair-profile ${index===1?'is-runner':''}`} key={c.id}><div className="pair-profile-top"><Icon id={c.id}/><div><span>{index===0?'PRIMARY / 第一名':'RUNNER-UP / 第二名'}</span><h3>{c.name}</h3><p>{c.english}</p></div><strong>{num(entry.score,1)}<small>匹配指數</small></strong></div><p className="pair-profile-copy">{short(c.lineageId)}</p><RangeBand entry={entry} field="model_band" label="換個角度後的分數範圍"/><RangeBand entry={entry} field="family_band" label="少看一組答案後的分數範圍"/><div className="pair-reference"><span>在模擬參考答案中的相對位置</span><b>{num(entry.structural_percentile,1)} / 100</b></div><Link className="text-button" to={`/civilizations/${c.id}`}>閱讀{c.name}的完整故事 <ArrowUpRight size={16}/></Link></article>;
  })}</div>
  <p className="pair-note">範圍線顯示不同檢查下的最低與最高分，圓點是本次分數；0 在左，100 在右。兩個範圍重疊，不代表同一次檢查下就會交換名次。「相對位置」來自固定的模擬答案，不是人群排名、血統比例或答對的機率。</p>

  <section className="pair-band" aria-labelledby="pair-check-title"><div className="pair-band-heading"><Scale size={22}/><div><span>01 / 換個看法，誰還站在前面？</span><h3 id="pair-check-title">領先，是偶然還是一直如此？</h3></div></div><p className="pair-description">先只比較這兩個文明，再把另外 19 個文明一起放回來看。兩個問題分開回答，才不會把「贏過第二名」誤當成「永遠是第一名」。</p>
   <div className="pair-agreement-table"><div className="pair-agreement-head"><span>檢查方式</span><span>仍領先這個第二名</span><span>仍是全部 21 個文明的第一名</span></div>{checks.map(check=><div className="pair-agreement-row" key={check.label}><div><h4>{check.label}</h4><p>{check.note}</p></div>{[check.pair,check.all].map((value,index)=><div key={index}><span className="pair-mobile-label">{index===0?'仍領先第二名':'仍是全排行第一名'}</span><strong>{num(value,1)}<small>%</small></strong><div className="pair-meter" aria-hidden="true"><i style={{width:`${value}%`}}/></div></div>)}</div>)}</div>
   <p className="pair-note">兩者比較要「確實領先」才計入；遇到同分，全排行仍會按既定規則選出第一名。上述百分比是檢查的結果，不是身份機率。</p>
  </section>

  <section className="pair-band" aria-labelledby="pair-margin-title"><div className="pair-band-heading"><ScanLine size={22}/><div><span>02 / 把領先幅度攤開來看</span><h3 id="pair-margin-title">最接近被追上的時候，還差多少？</h3></div></div><div className="pair-sign-legend"><span className="runner-ink">← {ru.name}領先</span><span>0 · 兩者並列</span><span>{p.name}領先 →</span></div><MarginRow title="換個角度看答案" values={pair.model_pair_margin_t_points} limit={marginLimit}/><MarginRow title="少看一組相關答案" values={pair.family_pair_margin_t_points} limit={marginLimit}/><p className="pair-note">正數代表原本第一名領先，負數代表原本第二名超前。「偏不利的一端」是把分差由小排到大後的 10% 位置；「中間的一次」是一半分差比它小、一半比它大。這兩個位置按檢查次數排列，與上面的加權比例不同。</p><div className="pair-stat-grid"><Stat label="兩者之間，最不利時的差距" value={`${signed(pair.robust_pair_margin_floor_t_points)} 分`} note="把兩種檢查合起來，原本第一名相對這個第二名的最小分差。"/><Stat label="面對所有文明，最不利時的差距" value={`${signed(stability.robust_top1_margin_floor_t_points)} 分`} note="比較對象可能換成其他文明。負數表示至少有一個文明曾經超前原本的第一名。"/></div></section>

  <section className="pair-band" aria-labelledby="pair-stability-title"><div className="pair-band-heading"><ShieldCheck size={22}/><div><span>03 / 這份答案有多清楚？</span><h3 id="pair-stability-title">領先幅度與穩定度，一起看才完整。</h3></div></div><div className="pair-stat-grid three"><Stat label="第一名領先差距的相對位置" value={`${num(d.margin_structural_percentile,1)} / 100`} note="和固定的模擬答案相比，這次的領先差距落在哪裡。越高表示差距相對較大，不代表勝過多少真實用家。"/><Stat label="整份答案的區分程度" value={`${num(d.evidence_strength_percentile,1)} / 100`} note="21 個文明的分數是擠在一起，還是有高有低？這是分數分散程度在模擬答案中的相對位置，不代表答案好壞。"/><Stat label="結果穩定度" value={`${num(stability.index,1)} / 100`} note="取領先差距的相對位置、換看法後保留第一名的比例、少看題組後保留第一名的比例，三者中最低的一項。"/></div><p className="pair-verdict">{stability.all_variants_preserve_primary?'本次所有檢查都保留同一個第一名。你可以先閱讀主要文明，再用第二名補充理解自己的其他面向。':'本次有檢查讓第一名改變。建議把前幾個文明一起閱讀，找出哪些描述與你的實際生活更接近。'}<span>這些是同一份答案的結構檢查，不保證下次重測也得到相同結果。</span></p></section>

  <section className="pair-band" aria-labelledby="pair-evidence-title"><div className="pair-band-heading"><Layers3 size={22}/><div><span>04 / 分差從哪裡來？</span><h3 id="pair-evidence-title">不是一道題定生死，是整份選擇的累積。</h3></div></div><p className="pair-description">右邊的金色讓「{p.name}」更領先，左邊的藍色讓「{ru.name}」更佔優勢。以下全部以兩者的分差為單位，可以正負相抵。</p><div className="pair-format-list">{[...formatRows,['固定的平衡調整',d.centrality_offset_t_points] as [string,number]].map(([format,value])=><div key={format}><span>{formats[format as keyof typeof formats]||format}<small>{format in formats?`${d.item_contributions.filter(item=>item.format===format).length} 道題`:'設計時已固定，不因人而改'}</small></span><SignedBar value={value} limit={formatLimit}/><b className={value<0?'runner-ink':''}>{signed(value)} 分</b></div>)}</div><div className="pair-equation"><div><span>60 題合計</span><b>{signed(itemTotal)}</b></div><span>+</span><div><span>固定平衡調整</span><b>{signed(d.centrality_offset_t_points)}</b></div><ArrowRight size={18}/><div><span>本次完整分差</span><b>{num(pair.central_t_gap)}</b></div></div><p className="pair-note">固定調整是測驗在設計時加入的平衡項，不是額外回答，也不是因為你屬於哪個文明才加分。這裡保留完整分差；上方匹配指數只顯示一位小數，並限制在 0–100，所以相減可能略有不同。</p>
   <h4 className="pair-subtitle">最影響這次比較的 12 道回答</h4><div className="pair-key-answers">{d.strongest_items.map(item=>{const q=questions[qNumber(item.id)-1],value=item.winner_over_runner_t_points;return <article key={item.id}><div><span>第 {qNumber(item.id)} 題 · {formats[item.format as keyof typeof formats]}</span><b className={value<0?'runner-ink':''}>{signed(value)} 分</b></div><p>{q.stem}</p><small>{value===0?'這道回答沒有拉開兩者差距':`這道回答較支持${value>0?p.name:ru.name}`}</small></article>;})}</div>
   <h4 className="pair-subtitle">全部 {groups.length} 組相關答案，各自推向哪一邊？</h4><p className="pair-description">測到相近內容的題目會放在同一組。每組按影響大小排列，標示原來題號，方便回看；單題成組也是正常情況。</p><div className="pair-family-grid">{groups.map(group=><div key={group.family}><span>第 {group.items.map(item=>qNumber(item.id)).join('、')} 題</span><b className={group.value<0?'runner-ink':''}>{signed(group.value)}</b><SignedBar value={group.value} limit={groupLimit}/></div>)}</div>
  </section>

  {g&&<section className="pair-band pair-design" aria-labelledby="pair-design-title"><div className="pair-band-heading"><Scale size={22}/><div><span>05 / 測驗的設計底稿</span><h3 id="pair-design-title">這兩個文明，本身容易分辨嗎？</h3></div></div><p className="pair-description">以下是「{p.name}」和「{ru.name}」在測驗中的固定設計資料，不是你的個人分數。把兩種文明想成兩支箭頭：0° 指向同一邊，90° 指向不同方向，180° 完全相反。角度越小，兩者在這份測驗中越容易接近；它不是身份差異的百分比。</p><div className="pair-angle-table">{geometryRows.map(([label,value,note])=><div key={label}><div><span>{label}</span><p>{note}</p></div><div className="pair-angle-track" aria-hidden="true"><i style={{width:`${value/180*100}%`}}/></div><strong>{num(value)}°</strong></div>)}</div><p className="pair-note">1,024 種設定是預先定好的極端組合，不是 1,024 位受測者，也不是對你重測 1,024 次。這裡的 5%／10% 只是設定排列後的位置。</p><div className="pair-stat-grid four"><Stat label="影響最大的單題佔比" value={`${num(g.item_max_share*100,1)}%`} note="這兩個文明的區分方向，有多少集中在同一道題。這是設計資料，不是你那一題的得分。"/><Stat label="影響最大的題組佔比" value={`${num(g.family_max_share*100,1)}%`} note="把相關題目一起看，有多少區分力量集中在影響最大的一組。"/><Stat label="單題影響的分散程度" value={`${num(g.item_neff,1)} 題`} note="換算成影響一樣大的題目，大約相當於多少題在共同出力；不是實際題目數。"/><Stat label="題組影響的分散程度" value={`${num(g.family_neff,1)} 組`} note="換算成影響一樣大的題組，大約相當於多少組共同出力。越大表示來源較分散。"/></div></section>}

  <section className="pair-band pair-audit" aria-labelledby="pair-audit-title"><div className="pair-band-heading"><ScanLine size={22}/><div><span>06 / 數字怎樣接起來？</span><h3 id="pair-audit-title">保留完整數字，讓每一步都有跡可循。</h3></div></div><p className="pair-description">這一段是計算底稿。原始比較值會再換成你看到的匹配指數，兩種刻度不能直接混加。接近零的核對誤差只是電腦小數運算留下的尾差。</p><div className="pair-audit-grid">{[
   ['第一名：完整匹配值',num(primary.t_score_unclipped,6)],['第二名：完整匹配值',num(runner.t_score_unclipped,6)],
   ['第一名：原始比較值',num(primary.central_score,9)],['第二名：原始比較值',num(runner.central_score,9)],
   ['兩者原始分差',num(d.winner_runner_margin,9)],['60 題的原始分差合計',num(d.item_contribution_sum,9)],
   ['固定平衡項的原始值',num(d.centrality_offset_contribution,9)],['合計核對誤差',d.decomposition_error.toExponential(2)],
   ['換看法後：對全排行最小原始分差',num(d.model_stability.winner_margin_min,9)],['換看法後：對全排行偏低 10% 分差',num(d.model_stability.winner_margin_p10,9)],
   ['少看題組後：對全排行最小原始分差',num(d.family_stability.winner_margin_min,9)],['少看題組後：對全排行偏低 10% 分差',num(d.family_stability.winner_margin_p10,9)],
  ].map(([label,value])=><div key={label}><span>{label}</span><b>{value}</b></div>)}</div><p className="pair-note">「對全排行」表示原本第一名與當次最接近它的文明比較，對象不一定是本頁的第二名。完整匹配值尚未限制在 0–100；原始值只供核對，不代表另一種人格分數。</p></section>
 </section>;
}
