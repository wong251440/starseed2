import {Link} from 'react-router-dom';
import civs from '../data/civilizations.json';
import {Icon} from '../App';
import {siteLineage,type ScoringResult} from '../shared/result';
import ui from '../../STARSEED_WEB_HANDOFF_MIN 2/result_ui_contract.json';
import {questions} from '../shared/questionnaire';
type ClassifiedResult=Extract<ScoringResult,{public:{status:'classified'}}>;
const num=(n:number)=>n.toFixed(4);
const title=(code:string|null)=>civs.find(c=>c.lineageId===siteLineage(code??''))?.name??'無足夠訊號';
const settings:Record<string,string>={nominal:'原本設定',secondary_soft:'稍微降低第二層特質比重',more_balanced:'更平衡核心與第二層特質',primary_heavy:'加重核心特質',tertiary_heavier:'加重第三層特質'};
const domains:Record<string,string>={relational:'人際關係',home_environment:'生活環境',work_org:'工作與組織',technical_problem:'技術問題',learning_guidance:'學習與指導',community_governance:'社群與治理',risk_resource:'風險與資源',agency_decision:'自主與決策',personal_internal:'個人內在'};
function Stat({label,value,note}:{label:string;value:string;note:string}){return <div className="pair-stat"><span>{label}</span><strong>{value}</strong><p>{note}</p></div>;}
export default function PairComparison({result}:{result:ClassifiedResult}){
 const d=result.diagnostic.raw,rows=result.diagnostic.ranking.slice(0,2),notch=d.one_notch_flip_radius.min_edits;
 return <details className="pair-comparison-details" id="boundary">
  <summary><span className="eyebrow">02 / 第一名與第二名 · 深入比較</span><span>查看比較</span></summary>
  <section className="pair-lab" aria-labelledby="pair-title">
  <header className="pair-intro"><div><h2 id="pair-title">同一份答案，<br/>兩個接近的方向。</h2><p>第一名由完整答案的原始 cosine 排名決定。以下檢查幫助你理解差距與敏感程度，不會改寫主要結果或契合度。</p></div><div className="pair-lead"><span>第一、第二名原始相似度差距</span><strong>{num(d.global_margin)}</strong><p>這是獨立的分類差距診斷，不是契合度，也不是身份比例。</p></div></header>
  <div className="pair-profiles">{rows.map((r,i)=>{const c=civs.find(c=>c.lineageId===r.id)!;return <article key={r.id} className={`pair-profile ${i?'is-runner':''}`}><div className="pair-profile-top"><Icon id={c.id}/><div><span>{i?ui.generic_ui_copy.closest_alternative_label:'Primary · 主要文明'}</span><h3>{c.name}</h3><p>{c.english}</p></div><strong>{Math.round(r.matchScore)}<small>契合度</small></strong></div><Stat label="原始方向相似度" value={num(r.rawCosine)} note="範圍 −1 至 1；越高，這份答案的整體方向越接近該類型。"/><Link className="text-button" to={`/civilizations/${c.id}`}>閱讀文明檔案 →</Link></article>;})}</div>
  <section className="pair-band"><h3>這個差距有多容易改變？</h3><div className="pair-stat-grid">
   <Stat label="最少幾題各移動一格，可讓第一名不再獨自領先" value={notch===null?'一格微調仍無法到達邊界':`${notch} 題`} note="每題只向左或右移動一格，而且是不同題目。到達平手邊界也算；不是預測你下次會改幾題。"/>
   <Stat label="最多省略三題的完整檢查" value={typeof d.item_dropout_robustness?.min_dropout_to_flip==='number'?`最少 ${d.item_dropout_robustness.min_dropout_to_flip} 題`:'三題內未改變'} note="檢查所有一題、兩題、三題缺失的組合；結果改變或剩餘訊號不足都計入。"/>
   <Stat label="距離最近的分類邊界" value={num(d.basin_depth)} note={`最近的邊界通往「${title(d.nearest_boundary)}」。數值越小，答案方向越接近分類交界；它不是機率。`}/>
   <Stat label="第一、第二名的辨別資訊覆蓋度" value={d.information_coverage.primary_runner_up===null?'不適用':(d.information_coverage.primary_runner_up*100).toFixed(1)+'%'} note="有多少用來區分這兩者的題目資訊已被回答涵蓋；選中間值仍算已答，不代表匹配程度。"/>
  </div></section>
  <section className="pair-band"><h3>換個特質比重，第一名還一樣嗎？</h3><p>{d.prototype_robustness.same_primary} / {d.prototype_robustness.total} 種預設模型設定維持同一個第一名。</p><div className="rpcs-scenarios">{d.prototype_robustness.scenarios.map(s=><article key={s.scenario}><h4>{settings[s.scenario]}</h4><p>第一名：<b>{title(s.primary)}</b></p><p>該設定第一、第二名相似度差：{s.global_margin===null?'無足夠訊號':num(s.global_margin)}</p></article>)}</div></section>
  <section className="pair-band"><h3>暫時不看某一類情境</h3><p>每次拿走一整類已答題，檢查其餘答案是否仍指向相同文明。</p><div className="rpcs-scenarios">{d.context_robustness.scenarios.map(s=><article key={s.domain}><h4>{domains[s.domain]}</h4><p>移除 {s.removed_items.length} 題 · {s.same_primary?'維持第一名':s.evaluable?'第一名改變':'無足夠訊號'}</p><p>剩餘答案第一名：{title(s.primary)}</p></article>)}</div></section>
  <section className="pair-band"><h3>答案中的不同聲音</h3><p>{d.boundary_conflict?ui.generic_ui_copy.mixed_evidence:d.evidence_consistency==='NO_DIRECT_ITEMS'?'本次沒有已回答、直接對比這兩個類型的專屬題目。':'直接比較兩個類型的題目，沒有形成支持另一側的合計訊號。'}</p><div className="pair-stat-grid"><Stat label="方向性回答 / 中間值回答" value={`${d.response_counts.directional} / ${d.response_counts.midpoint}`} note="4 是有效中間值；只有 null 或省略才是缺失。"/><Stat label="整體作答幅度" value={num(d.response_amplitude)} note="離中間值的均方根距離，範圍 0 至 1；代表選擇幅度，不是肯定程度或可信度。"/></div>
  {Object.entries(d.item_dropout_robustness?.by_k??{}).map(([k,v])=><p key={k}>省略 {k} 題：共 {v.scenario_count.toLocaleString()} 個組合，{v.flip_count.toLocaleString()} 個改變第一名或無足夠訊號。</p>)}
  </section>
  <section className="pair-band"><h3>哪些回答把兩者拉開？</h3><p>以下數字是回答對「第一名相對第二名」的分離方向貢獻，正數支持第一名，負數支持第二名；不是單題分數或身份比例。</p>{[d.separator_contributions.supports_primary,d.separator_contributions.supports_runner_up].map((items,i)=><div key={i}><h4>{i?'較支持第二名的回答':'較支持第一名的回答'}</h4>{items.map(x=><p key={x.item}>{questions.find(q=>q.id===x.item)?.stem} <strong>{x.contribution>0?'+':''}{num(x.contribution)}</strong></p>)}</div>)}</section>
  <p className="chart-note">{ui.generic_ui_copy.technical_disclaimer}</p>
 </section></details>;
}
