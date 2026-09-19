import type {CSSProperties} from 'react';
import type {LineageResolution} from '../shared/lineage-locator';

const ICON_IDS:Record<string,number>={PL:1,AR:2,SI:3,AD:4,LY:5,OR:6,MI:7,VE:8,HA:9,PO:10,AC:11,VG:12,FE:13,BA:14,MA:15,ML:16,DR:17,RE:18,ZG:19,NU:20,GA:23};
const NODES=[
 ['LY','天琴座人',145,140],['AR','大角星人',585,140],['RE','爬蟲族',1080,140],
 ['FE','貓科星族',40,270],['PL','昴宿星人',140,270],['VG','織女星人',250,270],['BA','藍鳥人',500,270],['AD','仙女座人',650,270],['DR','天龍座人',1080,270],
 ['SI','天狼星人',160,405],['AC','半人馬座阿爾法星人',315,405],['OR','獵戶座人',520,540],['PO','北極星人',800,480],['VE','金星人',910,480],['HA','哈達爾星人',375,550],['ZG','澤塔灰人',290,550],['NU','阿努納奇／尼比魯人',1080,495],
 ['MI','明塔卡星人',530,690],['ML','馬爾德克人',740,660],['MA','火星人',740,790],['GA','蓋亞人（地球原生）',1080,790],
] as const;

type RelationKind='lineage'|'collaboration'|'conflict'|'migration'|'gaia';
type Connector={from:string;to:string;points:string;kind:RelationKind;label?:string;labelX?:number;labelY?:number};
const CONNECTORS:Connector[]=[
 {from:'SOURCE',to:'LY',kind:'lineage',points:'640,96 640,105 145,105'},
 {from:'SOURCE',to:'AR',kind:'lineage',points:'640,96 640,105 585,105'},
 {from:'SOURCE',to:'RE',kind:'lineage',points:'640,96 640,105 1080,105'},
 {from:'LY',to:'FE',kind:'lineage',points:'145,175 145,205 40,205 40,235',label:'本能／守護',labelX:40,labelY:195},
 {from:'LY',to:'PL',kind:'lineage',points:'145,175 145,235',label:'心性療癒／和解',labelX:151,labelY:205},
 {from:'LY',to:'VG',kind:'lineage',points:'145,175 145,225 250,225 250,235',label:'愛、療癒、覺醒',labelX:250,labelY:215},
 {from:'AR',to:'BA',kind:'collaboration',points:'585,175 585,210 500,210 500,235',label:'升維／訊息',labelX:493,labelY:200},
 {from:'AR',to:'AD',kind:'collaboration',points:'585,175 585,210 650,210 650,235',label:'自由／主權',labelX:635,labelY:200},
 {from:'RE',to:'DR',kind:'lineage',points:'1080,175 1080,235',label:'權力／生存課題',labelX:1135,labelY:205},
 {from:'DR',to:'NU',kind:'lineage',points:'1080,305 1080,460',label:'天龍權力／階序',labelX:1140,labelY:385},
 {from:'VG',to:'SI',kind:'lineage',points:'250,305 250,340 160,340 160,370',label:'古老知識',labelX:170,labelY:332},
 {from:'VG',to:'AC',kind:'lineage',points:'250,305 250,340 315,340 315,370',label:'鄰系交流',labelX:315,labelY:328},
 {from:'AC',to:'HA',kind:'collaboration',points:'315,440 315,480 375,480 375,515',label:'情感療癒',labelX:382,labelY:472},
 {from:'VG',to:'APEX',kind:'lineage',points:'250,305 250,365 400,365 400,370',label:'阿佩克斯演化',labelX:385,labelY:357},
 {from:'APEX',to:'ZG',kind:'lineage',points:'400,430 400,480 290,480 290,515',label:'基因／混種',labelX:292,labelY:472},
 {from:'VG',to:'OR',kind:'lineage',points:'250,305 250,470 520,470 520,505'},
 {from:'SI',to:'OR',kind:'collaboration',points:'160,440 160,485 520,485 520,505',label:'守護／知識／水元素',labelX:285,labelY:477},
 {from:'BA',to:'OR',kind:'collaboration',points:'500,305 500,455 520,455 520,505',label:'多維科技／療癒',labelX:535,labelY:385},
 {from:'AD',to:'OR',kind:'collaboration',points:'650,305 650,390 585,390 520,505',label:'升維／能量協作',labelX:625,labelY:378},
 {from:'OR',to:'MI',kind:'lineage',points:'520,575 520,650 530,650',label:'水世界／家園記憶',labelX:590,labelY:632},
 {from:'OR',to:'NU',kind:'conflict',points:'555,540 690,540 690,450 1045,450',label:'⚔ 權力／軍事糾葛',labelX:820,labelY:440},
 {from:'SI',to:'NU',kind:'collaboration',points:'160,440 160,605 990,605 1045,530',label:'天狼智慧／王權',labelX:835,labelY:595},
 {from:'PO',to:'GA',kind:'gaia',points:'800,515 800,700 1045,700 1080,755',label:'穩定／方向／整合',labelX:840,labelY:690},
 {from:'VE',to:'GA',kind:'gaia',points:'910,515 910,680 1045,680 1080,755',label:'愛／和諧／一體',labelX:930,labelY:670},
 {from:'ML',to:'MA',kind:'migration',points:'740,695 740,755',label:'災變記憶／投生',labelX:805,labelY:735},
 {from:'MA',to:'GA',kind:'migration',points:'775,790 925,790 925,820 1045,820',label:'靈魂遷徙',labelX:905,labelY:780},
 {from:'NU',to:'GA',kind:'gaia',points:'1080,530 1080,755',label:'基因／文明塑形',labelX:1135,labelY:650},
 {from:'PL',to:'GA',kind:'gaia',points:'140,305 140,730 1045,730 1080,755'},
];

export function treeHighlightCodes(resolution:LineageResolution){
 const codes=[...resolution.canonicalLineagePath];
 if(codes.some(code=>code==='LY'||['AR','AD','PO','BA','VE'].includes(code)))codes.unshift('SOURCE');
 return codes;
}

function IconNode({code,label,x,y,active,final}:{code:string;label:string;x:number;y:number;active:Set<string>;final:string}){
 const isActive=active.has(code),isFinal=final===code,id=ICON_IDS[code];
 const style={left:`${x/12.8}%`,top:`${y/8.6}%`} as CSSProperties;
 return <div className={`lineage-icon-node${isActive?' is-active':''}${isFinal?' is-final':''}`} style={style} data-code={code}>
  <span className="lineage-icon-ring"><img src={`/icons/${id}-small.webp`} alt={`${label}文明圖示`} width="160" height="160" loading="lazy"/></span>
  <span className="lineage-icon-label">{label}</span>
 </div>;
}

export default function CivilizationLineageTree({resolution}:{resolution:LineageResolution}){
 const active=new Set(treeHighlightCodes(resolution)),final=resolution.lineageResult;
 const isActive=(from:string,to:string)=>active.has(from)&&active.has(to);
 return <section className="civilization-lineage-tree" aria-labelledby="lineage-tree-title">
  <div className="lineage-tree-heading"><p className="eyebrow">文明親緣樹</p><h2 id="lineage-tree-title">你的文明系譜</h2></div>
  <div className="lineage-relation-legend" aria-label="文明關係圖例"><span className="lineage"><i/>血統／文明分支</span><span className="collaboration"><i/>合作／交流／指導</span><span className="conflict"><i>⚔</i>衝突／對立</span><span className="migration"><i/>靈魂遷徙／投生</span><span className="gaia"><i/>直接作用、投生或影響蓋亞</span></div>
  <div className="lineage-tree-scroll" tabIndex={0} aria-label="文明親緣樹，可向右滑動查看完整關係">
   <div className="lineage-unified-canvas lineage-network-canvas">
    <svg className="lineage-connectors" viewBox="0 0 1280 860" aria-hidden="true">
     <defs><marker id="lineage-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto"><path d="M 0 0 L 8 4 L 0 8 z" fill="#c19d59"/></marker><marker id="collaboration-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto"><path d="M 0 0 L 8 4 L 0 8 z" fill="#74c9a1"/></marker><marker id="conflict-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto"><path d="M 0 0 L 8 4 L 0 8 z" fill="#e26d75"/></marker><marker id="migration-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto"><path d="M 0 0 L 8 4 L 0 8 z" fill="#8da8dc"/></marker><marker id="gaia-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto"><path d="M 0 0 L 8 4 L 0 8 z" fill="#b792d7"/></marker><marker id="active-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto"><path d="M 0 0 L 8 4 L 0 8 z" fill="#e7c65c"/></marker></defs>
     {CONNECTORS.map(link=>{const activeLink=isActive(link.from,link.to),marker=activeLink?'active':link.kind;return <g key={`${link.from}-${link.to}`}><polyline points={link.points} markerEnd={`url(#${marker}-arrow)`} className={`lineage-connector type-${link.kind}${activeLink?' is-active':''}`}/>{link.label&&<text x={link.labelX} y={link.labelY} className={`lineage-connector-label type-${link.kind}${activeLink?' is-active':''}`}>{link.label}</text>}</g>})}
    </svg>
    <div className={`lineage-source-orbit${active.has('SOURCE')?' is-active':''}`}><i>✦</i><strong>源頭／宇宙意識</strong></div>
    <div className={`lineage-apex${active.has('APEX')?' is-active':''}`} aria-label="頂點演化輔助節點"><span>頂點</span></div>
    {NODES.map(([code,label,x,y])=><IconNode key={code} code={code} label={label} x={x} y={y} active={active} final={final}/>) }
   </div>
  </div>
 </section>;
}
