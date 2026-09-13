import {Link} from 'react-router-dom';
import {ArrowUpRight} from 'lucide-react';
import {Icon} from '../App';
import civs from '../data/civilizations.json';
import copy from '../../starseed_s4_rpd_web_handoff_v4_1_min/result_copy.zh-Hant.json';
import type {ScoringResult} from '../shared/result';
type ClassifiedResult=Extract<ScoringResult,{public:{status:'classified'}}>;
const num=(v:number,n=2)=>v.toFixed(n);
const signed=(v:number)=>`${v>0?'+':''}${num(v,4)}`;
const settings:Record<string,string>={nominal:'原本設定','w-secondary-soft':'稍微降低第二層特質的比重','w-balanced':'稍微平衡前兩層特質的比重','w-primary-heavy':'稍微加重核心特質','w-tertiary-heavier':'稍微加重第三層特質','cf-kappa-low':'降低情境切換的影響','cf-kappa-high':'提高情境切換的影響'};
function Stat({label,value,note}:{label:string;value:string;note:string}){return <div className="pair-stat"><span>{label}</span><strong>{value}</strong><p>{note}</p></div>;}
export default function PairComparison({result:r}:{result:ClassifiedResult}){
 const d=r.diagnostic,rob=d.robustness,[primary,runner]=d.ranking;
 const p=civs.find(c=>c.lineageId===primary.id)!,ru=civs.find(c=>c.lineageId===runner.id)!;
 const gap=primary.score-runner.score;
 return <section className="pair-lab" id="boundary" aria-labelledby="pair-title">
  <header className="pair-intro"><div><p className="eyebrow">02 / 第一名與第二名 · 深入比較</p><h2 id="pair-title">同一份答案，<br/>兩個值得認識的你。</h2><p>「{p.name}」最接近你本次的選擇，「{ru.name}」緊隨其後。一起看看兩者的差距，以及改變設定後是否仍是同樣的結果。</p></div><div className="pair-lead"><span>本次匹配指數差距</span><strong>{num(gap)}<small> 分</small></strong><p>這是全排行第一名與第二名的指數相減，並非身份比例。</p></div></header>
  <div className="pair-profiles">{[primary,runner].map((row,i)=>{const c=i===0?p:ru;return <article className={`pair-profile ${i?'is-runner':''}`} key={c.id}><div className="pair-profile-top"><Icon id={c.id}/><div><span>{i?'RUNNER-UP / 第二名':'PRIMARY / 第一名'}</span><h3>{c.name}</h3><p>{c.english}</p></div><strong>{num(row.score,1)}<small>匹配指數</small></strong></div><p className="pair-profile-copy">{copy.lineages[c.lineageId as keyof typeof copy.lineages].short}</p><div className="pair-stat-grid"><Stat label="原始匹配值" value={signed(row.rawFit)} note="範圍 −1 至 1；換成匹配指數的方式是 (原始值 + 1) × 50。"/><Stat label="這個文明的回答覆蓋度" value={`${num(row.coverage*100,1)}%`} note="模型可用來比較這個文明的題目訊號，有多少已被回答涵蓋。完整作答通常是 100%，不代表答案更符合。"/></div><Link className="text-button" to={`/civilizations/${c.id}`}>閱讀{c.name}的完整故事 <ArrowUpRight size={16}/></Link></article>;})}</div>
  <section className="pair-band"><div className="pair-band-heading"><h3>只看這兩個文明，答案更偏向誰？</h3></div><div className="pair-stat-grid"><Stat label="兩者專屬比較值" value={signed(d.pairwise.nominalMargin)} note={`−1 至 1；正數偏向「${p.name}」，負數偏向「${ru.name}」。它只看區分這兩者的方向，與全排行分差是不同計算，方向可能不一致。`}/><Stat label="兩者比較的回答覆蓋度" value={`${num(d.pairwise.coverage*100,1)}%`} note="用來分辨這兩個文明的題目訊號，有多少已被這份回答涵蓋；它不是兩者相似度。"/></div></section>
  <section className="pair-band"><div className="pair-band-heading"><h3>換 7 種設定，第一名還一樣嗎？</h3></div><p className="pair-description">每列都使用同一份答案。「指數差距」始終比較本次的第一名與第二名；該列的全排行第一名也可能是其他文明。正數表示本次第一名領先，負數表示本次第二名領先。</p><div className="rpcs-scenarios">{rob.scenarios.map(s=><article key={s.scenario}><h4>{settings[s.scenario]??s.scenario}</h4><p>此設定第一名：<b>{civs.find(c=>c.lineageId===s.winner)!.name}</b></p><div><span>兩者匹配指數差距 <b>{signed(s.top1Gap*50)} 分</b></span><span>兩者專屬比較值 <b>{signed(s.pairMargin)}</b></span></div></article>)}</div><div className="pair-stat-grid"><Stat label="7 種設定中，兩者最小指數差距" value={`${signed(rob.robustGlobalMinGap*50)} 分`} note="固定比較原本第一、第二名。正數代表每種設定都仍領先這個第二名，但不保證沒有第三個文明超前。"/><Stat label="7 種設定中，最小專屬比較值" value={signed(rob.robustPairMinMargin)} note="固定只看區分這兩者的方向。負數表示至少一種設定偏向原本第二名。"/></div></section>
  <section className="pair-band"><div className="pair-band-heading"><h3>這份答案的選擇幅度</h3></div><div className="pair-stat-grid"><Stat label="平均作答幅度" value={num(d.responseAmplitude,4)} note="介於 0 至 1。模型中每個回答離該題中心的距離，除以該題最大距離後取平均。它受題型影響，不代表你有多肯定，也不是結果可靠度。"/><Stat label="結果穩定度" value={`${num(r.public.stability.index,1)} / 100`} note={`${rob.scenarios.filter(s=>s.winner===primary.id).length} / ${rob.scenarioCount} 種設定維持本次第一名。這是設定檢查的比例，不是結果正確率或身份機率。`}/></div></section>
 </section>;
}
