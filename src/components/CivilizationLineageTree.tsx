import type {CSSProperties} from 'react';
import type {LineageResolution} from '../shared/lineage-locator';

const WIDTH=1000,HEIGHT=1840;
const ICON_IDS:Record<string,number>={PL:1,AR:2,SI:3,AD:4,LY:5,OR:6,MI:7,VE:8,HA:9,PO:10,AC:11,VG:12,FE:13,BA:14,MA:15,ML:16,DR:17,RE:18,ZG:19,NU:20,GA:23};
const NODES=[
 ['LY','天琴座人',120,200],['AR','大角星人',500,200],['RE','爬蟲族',880,200],
 ['BA','藍鳥人',430,360],['AD','仙女座人',570,360],['DR','天龍座人',880,360],
 ['FE','貓科星族',120,500],['PL','昴宿星人',120,650],['VG','織女星人',120,800],
 ['SI','天狼星人',260,950],['OR','獵戶座人',500,1100],['AC','半人馬座阿爾法星人',180,1120],
 ['HA','哈達爾星人',315,1250],['MI','明塔卡星人',500,1260],['ZG','澤塔灰人',275,1450],['NU','阿努納奇／尼比魯人',720,1450],
 ['PO','北極星人',120,1590],['VE','金星人',315,1590],['ML','馬爾德克人',535,1590],
 ['MA','火星人',535,1740],['GA','蓋亞人（地球原生）',850,1740],
] as const;

type RelationKind='lineage'|'collaboration'|'conflict'|'migration'|'gaia';
type Connector={from:string;to:string;kind:RelationKind;points:string;label?:string;labelX?:number;labelY?:number};
const CONNECTORS:Connector[]=[
 {from:'SOURCE',to:'LY',kind:'lineage',points:'500,100 500,125 120,125 120,165'},
 {from:'SOURCE',to:'AR',kind:'lineage',points:'500,100 500,165'},
 {from:'SOURCE',to:'RE',kind:'lineage',points:'500,100 500,125 880,125 880,165'},

 {from:'AR',to:'BA',kind:'collaboration',points:'500,235 500,290 430,290 430,325',label:'多維科技／療癒',labelX:350,labelY:280},
 {from:'AR',to:'AD',kind:'collaboration',points:'500,235 500,290 570,290 570,325',label:'升維／能量協作',labelX:570,labelY:280},
 {from:'AR',to:'GA',kind:'gaia',points:'500,235 500,400 925,400 955,430',label:'能量療癒／升維',labelX:650,labelY:388},
 {from:'BA',to:'GA',kind:'gaia',points:'430,395 430,440 925,440 955,470',label:'升維／訊息',labelX:650,labelY:428},
 {from:'AD',to:'GA',kind:'gaia',points:'570,395 570,480 925,480 955,510',label:'自由／主權',labelX:760,labelY:468},

 {from:'RE',to:'DR',kind:'lineage',points:'880,235 880,325'},
 {from:'RE',to:'GA',kind:'gaia',points:'915,200 955,200',label:'權力／生存課題',labelX:775,labelY:245},
 {from:'DR',to:'OR',kind:'conflict',points:'845,360 800,360 800,1065 535,1065',label:'⚔ 古代主權／控制衝突',labelX:600,labelY:1052},
 {from:'DR',to:'NU',kind:'collaboration',points:'880,395 880,1385 755,1415',label:'混血／政治聯姻',labelX:760,labelY:1372},

 {from:'LY',to:'FE',kind:'lineage',points:'120,235 65,235 65,500 85,500'},
 {from:'LY',to:'PL',kind:'lineage',points:'120,235 65,235 65,650 85,650'},
 {from:'LY',to:'VG',kind:'lineage',points:'120,235 65,235 65,800 85,800'},
 {from:'FE',to:'GA',kind:'gaia',points:'155,500 155,540 925,540 955,570',label:'本能／守護／古老記憶',labelX:350,labelY:528},
 {from:'PL',to:'OR',kind:'collaboration',points:'155,650 390,650 390,1035 465,1065',label:'心性療癒／和解',labelX:245,labelY:638},
 {from:'PL',to:'GA',kind:'gaia',points:'155,680 925,680 955,710',label:'愛、療癒、覺醒',labelX:430,labelY:668},

 {from:'VG',to:'SI',kind:'lineage',points:'155,800 260,800 260,915',label:'古老知識／療癒',labelX:195,labelY:790},
 {from:'SI',to:'OR',kind:'collaboration',points:'295,950 465,950 500,1065',label:'三系融合／極性整合',labelX:365,labelY:938},
 {from:'SI',to:'GA',kind:'gaia',points:'295,980 925,980 955,1010',label:'守護／知識／水元素',labelX:590,labelY:968},
 {from:'BA',to:'OR',kind:'collaboration',points:'430,395 430,900 485,1065',label:'多維文明協作',labelX:445,labelY:885},
 {from:'AD',to:'OR',kind:'collaboration',points:'570,395 570,900 515,1065'},
 {from:'VG',to:'OR',kind:'lineage',points:'155,800 350,800 350,1020 465,1065'},
 {from:'OR',to:'MI',kind:'lineage',points:'500,1135 500,1225',label:'水世界／家園記憶',labelX:520,labelY:1190},
 {from:'OR',to:'NU',kind:'conflict',points:'535,1100 690,1100 690,1415',label:'⚔ 權力／軍事糾葛',labelX:570,labelY:1088},
 {from:'OR',to:'GA',kind:'gaia',points:'535,1130 925,1130 955,1160',label:'極性／權力整合',labelX:700,labelY:1118},

 {from:'VG',to:'AC',kind:'lineage',points:'120,835 120,1050 180,1050 180,1085'},
 {from:'AC',to:'HA',kind:'collaboration',points:'215,1120 315,1120 315,1215',label:'鄰系交流',labelX:245,labelY:1108},
 {from:'AC',to:'GA',kind:'gaia',points:'215,1150 925,1150 955,1180',label:'科技／醫療',labelX:430,labelY:1138},
 {from:'HA',to:'GA',kind:'gaia',points:'350,1250 925,1250 955,1280',label:'愛／情感療癒',labelX:565,labelY:1238},
 {from:'VG',to:'APEX',kind:'lineage',points:'120,835 120,1360 205,1360',label:'阿佩克斯演化',labelX:125,labelY:1348},
 {from:'APEX',to:'ZG',kind:'lineage',points:'255,1360 275,1360 275,1415'},
 {from:'ZG',to:'GA',kind:'gaia',points:'310,1450 925,1450 955,1480',label:'基因／混種',labelX:525,labelY:1438},

 {from:'SI',to:'NU',kind:'collaboration',points:'295,950 650,950 650,1415 685,1415',label:'天狼智慧／王權',labelX:655,labelY:1338},
 {from:'NU',to:'GA',kind:'gaia',points:'755,1450 925,1450 955,1480',label:'基因／文明塑形',labelX:775,labelY:1438},
 {from:'PO',to:'GA',kind:'gaia',points:'155,1590 925,1590 955,1620',label:'穩定／方向／群體整合',labelX:420,labelY:1578},
 {from:'VE',to:'GA',kind:'gaia',points:'350,1620 925,1620 955,1650',label:'愛／和諧／一體意識',labelX:590,labelY:1608},
 {from:'ML',to:'GA',kind:'gaia',points:'570,1590 925,1590 955,1620',label:'災變記憶／投生',labelX:715,labelY:1578},
 {from:'ML',to:'MA',kind:'migration',points:'535,1625 535,1705'},
 {from:'MA',to:'GA',kind:'migration',points:'570,1740 815,1740',label:'靈魂遷徙',labelX:680,labelY:1728},
 {from:'GAIA_BUS',to:'GA',kind:'gaia',points:'955,390 955,1740 885,1740'},
];

export function treeHighlightCodes(resolution:LineageResolution){
 const codes=[...resolution.canonicalLineagePath];
 if(codes.some(code=>code==='LY'||['AR','AD','PO','BA','VE'].includes(code)))codes.unshift('SOURCE');
 return codes;
}

function IconNode({code,label,x,y,active,final}:{code:string;label:string;x:number;y:number;active:Set<string>;final:string}){
 const isActive=active.has(code),isFinal=final===code,id=ICON_IDS[code];
 const style={left:`${x/WIDTH*100}%`,top:`${y/HEIGHT*100}%`} as CSSProperties;
 return <div className={`lineage-icon-node${isActive?' is-active':''}${isFinal?' is-final':''}`} style={style} data-code={code}>
  <span className="lineage-icon-ring"><img src={`/icons/${id}-small.webp`} alt={`${label}文明圖示`} width="160" height="160" loading="lazy"/></span>
  <span className="lineage-icon-label">{label}</span>
 </div>;
}

function markerId(kind:RelationKind,active:boolean){return active?'active-arrow':`${kind}-arrow`;}

export default function CivilizationLineageTree({resolution}:{resolution:LineageResolution}){
 const active=new Set(treeHighlightCodes(resolution)),final=resolution.lineageResult;
 const isActive=(from:string,to:string)=>active.has(from)&&active.has(to);
 return <section className="civilization-lineage-tree" aria-labelledby="lineage-tree-title">
  <div className="lineage-tree-heading"><p className="eyebrow">文明親緣樹</p><h2 id="lineage-tree-title">你的文明系譜</h2></div>
  <div className="lineage-relation-legend" aria-label="文明關係圖例"><span className="lineage"><i/>血統／文明分支</span><span className="collaboration"><i/>合作／交流／指導</span><span className="conflict"><i>⚔</i>衝突／對立</span><span className="migration"><i>⇢</i>靈魂遷徙／投生</span><span className="gaia"><i/>直接作用、投生或影響蓋亞</span></div>
  <div className="lineage-tree-scroll" tabIndex={0} aria-label="文明親緣樹，可向右滑動查看完整關係">
   <div className="lineage-unified-canvas lineage-portrait-canvas">
    <svg className="lineage-connectors" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} aria-hidden="true">
     <defs><marker id="lineage-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0 8 4 0 8z" fill="#c19d59"/></marker><marker id="collaboration-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0 8 4 0 8z" fill="#74c9a1"/></marker><marker id="conflict-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0 8 4 0 8z" fill="#e26d75"/></marker><marker id="migration-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0 8 4 0 8z" fill="#8da8dc"/></marker><marker id="gaia-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0 8 4 0 8z" fill="#b792d7"/></marker><marker id="active-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0 8 4 0 8z" fill="#e7c65c"/></marker></defs>
     {CONNECTORS.map((link,index)=>{const activeLink=isActive(link.from,link.to);return <g key={`${link.from}-${link.to}-${index}`}><polyline points={link.points} markerEnd={`url(#${markerId(link.kind,activeLink)})`} className={`lineage-connector type-${link.kind}${activeLink?' is-active':''}`}/>{link.label&&<text x={link.labelX} y={link.labelY} className={`lineage-connector-label type-${link.kind}${activeLink?' is-active':''}`}>{link.label}</text>}</g>})}
    </svg>
    <div className={`lineage-source-orbit${active.has('SOURCE')?' is-active':''}`}><i>✦</i><strong>源頭／宇宙意識</strong></div>
    <div className={`lineage-apex${active.has('APEX')?' is-active':''}`} aria-label="頂點演化輔助節點"><span>頂點</span></div>
    {NODES.map(([code,label,x,y])=><IconNode key={code} code={code} label={label} x={x} y={y} active={active} final={final}/>) }
   </div>
  </div>
 </section>;
}
