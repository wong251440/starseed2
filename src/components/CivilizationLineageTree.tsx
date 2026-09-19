import type {CSSProperties} from 'react';
import type {LineageResolution} from '../shared/lineage-locator';

const ICON_IDS:Record<string,number>={PL:1,AR:2,SI:3,AD:4,LY:5,OR:6,MI:7,VE:8,HA:9,PO:10,AC:11,VG:12,FE:13,BA:14,MA:15,ML:16,DR:17,RE:18,ZG:19,NU:20,GA:23};
const NODES=[
 ['LY','天琴座人',160,145],['AR','大角星人',660,145],['RE','爬蟲族',1180,145],
 ['FE','貓科星族',45,280],['PL','昴宿星人',150,280],['VG','織女星人',280,280],['BA','藍鳥人',575,280],['AD','仙女座人',735,280],['DR','天龍座人',1180,280],
 ['SI','天狼星人',185,420],['AC','半人馬座阿爾法星人',340,420],['OR','獵戶座人',560,500],['PO','北極星人',880,505],['VE','金星人',1000,505],['HA','哈達爾星人',410,555],['ZG','澤塔灰人',310,570],['NU','阿努納奇／尼比魯人',1180,495],
 ['MI','明塔卡星人',570,650],['ML','馬爾德克人',800,660],['MA','火星人',800,790],['GA','蓋亞人（地球原生）',1180,785],
] as const;

type Connector={from:string;to:string;points:string;label?:string;labelX?:number;labelY?:number};
const CONNECTORS:Connector[]=[
 {from:'SOURCE',to:'LY',points:'700,96 700,108 160,108 160,110'},
 {from:'SOURCE',to:'AR',points:'700,96 700,110 660,110'},
 {from:'SOURCE',to:'RE',points:'700,96 700,108 1180,108 1180,110'},
 {from:'LY',to:'FE',points:'160,180 160,215 45,215 45,245',label:'本能／守護／古老記憶',labelX:57,labelY:205},
 {from:'LY',to:'PL',points:'160,180 160,245',label:'心性療癒／和解',labelX:182,labelY:210},
 {from:'LY',to:'VG',points:'160,180 160,215 280,215 280,245',label:'愛、療癒、覺醒',labelX:262,labelY:202},
 {from:'AR',to:'BA',points:'660,180 660,215 575,215 575,245',label:'升維／訊息',labelX:578,labelY:205},
 {from:'AR',to:'AD',points:'660,180 660,215 735,215 735,245',label:'自由／主權',labelX:724,labelY:202},
 {from:'RE',to:'DR',points:'1180,180 1180,245',label:'權力／生存課題',labelX:1260,labelY:215},
 {from:'DR',to:'NU',points:'1180,315 1180,460',label:'天龍權力／階序',labelX:1260,labelY:387},
 {from:'VG',to:'SI',points:'280,315 280,355 185,355 185,385',label:'古老知識／療癒',labelX:212,labelY:345},
 {from:'VG',to:'AC',points:'280,315 280,355 340,355 340,385',label:'鄰系交流',labelX:342,labelY:345},
 {from:'AC',to:'HA',points:'340,455 340,495 410,495 410,520',label:'愛／情感療癒',labelX:422,labelY:486},
 {from:'VG',to:'APEX',points:'280,315 280,355 430,355 430,385',label:'阿佩克斯演化',labelX:417,labelY:343},
 {from:'APEX',to:'ZG',points:'430,445 430,495 310,495 310,535',label:'基因／混種',labelX:325,labelY:487},
 {from:'VG',to:'OR',points:'280,315 280,370 560,370 560,465'},
 {from:'SI',to:'OR',points:'185,455 185,475 560,475 560,465',label:'守護／知識／水元素',labelX:332,labelY:466},
 {from:'BA',to:'OR',points:'575,315 575,465',label:'多維科技／療癒',labelX:645,labelY:385},
 {from:'AD',to:'OR',points:'735,315 735,390 620,390 560,465',label:'升維／能量協作',labelX:708,labelY:378},
 {from:'OR',to:'MI',points:'560,535 560,615 570,615',label:'水世界／家園記憶',labelX:640,labelY:592},
 {from:'OR',to:'NU',points:'595,500 745,500 745,450 1145,450',label:'權力／軍事糾葛',labelX:875,labelY:440},
 {from:'SI',to:'NU',points:'185,455 185,600 1090,600 1145,530',label:'天狼智慧／王權',labelX:840,labelY:588},
 {from:'PO',to:'GA',points:'880,540 880,710 1145,710 1180,750',label:'穩定／方向／群體整合',labelX:940,labelY:700},
 {from:'VE',to:'GA',points:'1000,540 1000,690 1145,690 1180,750',label:'愛／和諧／一體意識',labelX:1045,labelY:680},
 {from:'ML',to:'MA',points:'800,695 800,755',label:'災變記憶／投生',labelX:887,labelY:735},
 {from:'MA',to:'GA',points:'835,790 990,790 990,820 1145,820',label:'靈魂遷徙',labelX:975,labelY:780},
 {from:'NU',to:'GA',points:'1180,530 1180,750',label:'基因／文明塑形',labelX:1260,labelY:650},
 {from:'PL',to:'GA',points:'150,315 150,730 1145,730 1180,750'},
];

export function treeHighlightCodes(resolution:LineageResolution){
 const codes=[...resolution.canonicalLineagePath];
 if(codes.some(code=>code==='LY'||['AR','AD','PO','BA','VE'].includes(code)))codes.unshift('SOURCE');
 return codes;
}

function IconNode({code,label,x,y,active,final}:{code:string;label:string;x:number;y:number;active:Set<string>;final:string}){
 const isActive=active.has(code),isFinal=final===code,id=ICON_IDS[code];
 const style={left:`${x/14}%`,top:`${y/8.5}%`} as CSSProperties;
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
  <div className="lineage-tree-scroll" tabIndex={0} aria-label="文明親緣樹，可向右滑動查看完整關係">
   <div className="lineage-unified-canvas lineage-network-canvas">
    <svg className="lineage-connectors" viewBox="0 0 1400 850" aria-hidden="true">
     {CONNECTORS.map(link=><g key={`${link.from}-${link.to}`}><polyline points={link.points} className={`lineage-connector${isActive(link.from,link.to)?' is-active':''}`}/>{link.label&&<text x={link.labelX} y={link.labelY} className={`lineage-connector-label${isActive(link.from,link.to)?' is-active':''}`}>{link.label}</text>}</g>)}
    </svg>
    <div className={`lineage-source-orbit${active.has('SOURCE')?' is-active':''}`}><i>✦</i><strong>源頭／宇宙意識</strong></div>
    <div className={`lineage-apex${active.has('APEX')?' is-active':''}`} aria-label="頂點演化輔助節點"><span>頂點</span></div>
    {NODES.map(([code,label,x,y])=><IconNode key={code} code={code} label={label} x={x} y={y} active={active} final={final}/>) }
   </div>
  </div>
 </section>;
}
