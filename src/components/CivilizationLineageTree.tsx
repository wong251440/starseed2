import type {CSSProperties} from 'react';
import type {LineageResolution} from '../shared/lineage-locator';

const WIDTH=940;
const HEIGHT=1700;

const ICON_IDS:Record<string,number>={
 PL:1,AR:2,SI:3,AD:4,LY:5,OR:6,MI:7,VE:8,HA:9,PO:10,AC:11,
 VG:12,FE:13,BA:14,MA:15,ML:16,DR:17,RE:18,ZG:19,NU:20,GA:23,
};

const NODES=[
 ['LY','5. 天琴座人',90,185],['RE','18. 爬蟲族',350,185],['AR','2. 大角星人',610,185],
 ['DR','17. 天龍座人',350,330],['PO','10. 北極星人',555,330],['BA','14. 藍鳥人',675,330],
 ['VE','8. 金星人',790,330],['ML','16. 馬爾德克人',885,460],
 ['FE','13. 貓科星族',90,335],['PL','1. 昴宿星人',90,470],['AD','4. 仙女座人',90,605],
 ['VG','12. 織女星人',90,740],['AC','11. 半人馬座α星人',215,865],
 ['HA','9. 哈達爾星人',330,985],['ZG','19. 澤塔灰人',215,1030],['SI','3. 天狼星人',215,1155],
 ['OR','6. 獵戶座人',500,1250],['MI','7. 明塔卡星人',500,1400],
 ['NU','20. 阿努納奇／尼比魯人',690,1410],['MA','15. 火星人',745,1530],
 ['GA','21. 蓋亞人（地球原生）',865,1630],
] as const;

type Connector={from:string;to:string;points:string;label?:string;labelX?:number;labelY?:number;labelAnchor?:'start'|'middle'|'end';labelTransform?:string};

const CONNECTORS:Connector[]=[
 {from:'SOURCE',to:'LY',points:'470,82 470,110 90,110 90,145'},
 {from:'SOURCE',to:'RE',points:'470,82 470,110 350,110 350,145'},
 {from:'SOURCE',to:'AR',points:'470,82 470,110 610,110 610,145'},
 {from:'SOURCE',to:'SOL',points:'470,82 470,110 845,110 845,145'},

 {from:'LY',to:'FE',points:'55,185 30,185 30,335 55,335'},
 {from:'LY',to:'PL',points:'55,185 30,185 30,470 55,470'},
 {from:'LY',to:'AD',points:'55,185 30,185 30,605 55,605'},
 {from:'LY',to:'VG',points:'55,185 30,185 30,740 55,740'},

 {from:'RE',to:'DR',points:'350,225 350,290'},
 {from:'AR',to:'PO',points:'610,225 610,265 555,265 555,290'},
 {from:'AR',to:'BA',points:'610,225 610,265 675,265 675,290'},
 {from:'SOL',to:'VE',points:'845,220 845,265 790,265 790,290'},
 {from:'SOL',to:'ML',points:'845,220 845,400 885,400 885,420'},

 {from:'VG',to:'AC',points:'125,740 160,740 160,865 180,865'},
 {from:'VG',to:'ZG',points:'125,740 160,740 160,1030 180,1030'},
 {from:'VG',to:'SI',points:'125,740 160,740 160,1155 180,1155'},
 {from:'AC',to:'HA',points:'250,865 285,865 285,985 295,985'},

 {from:'LY',to:'OR',points:'55,185 12,185 12,1080 440,1080 485,1210',label:'5. 天琴座人的主幹',labelX:505,labelY:1065},
 {from:'VG',to:'OR',points:'125,740 140,740 140,1120 420,1120 485,1215',label:'12. 織女星人的支流',labelX:385,labelY:1105},
 {from:'SI',to:'OR',points:'250,1155 420,1155 485,1220'},
 {from:'OR',to:'MI',points:'500,1290 500,1360'},

 {from:'SI',to:'NU',points:'250,1185 590,1185 590,1395 655,1395',label:'3. 天狼星人的另一支流',labelX:430,labelY:1170},
 {from:'DR',to:'NU',points:'385,330 420,330 420,1320 650,1320 680,1370',label:'17. 天龍座人的另一支流',labelX:435,labelY:805,labelAnchor:'middle',labelTransform:'rotate(-90 435 805)'},
 {from:'OR',to:'NU',points:'535,1250 620,1250 620,1360 655,1390'},

 {from:'PL',to:'GA',points:'125,470 805,470 805,1595 830,1615'},
 {from:'NU',to:'GA',points:'725,1410 850,1410 850,1590'},
 {from:'ML',to:'MA',points:'885,500 885,1450 745,1450 745,1490',label:'16. 馬爾德克人的延伸',labelX:900,labelY:940,labelAnchor:'middle',labelTransform:'rotate(-90 900 940)'},
 {from:'MA',to:'GA',points:'780,1530 815,1530 815,1630 830,1630'},
];

const DISPLAY_PATHS:Record<string,string[]>={
 LY:['SOURCE','LY'],FE:['SOURCE','LY','FE'],PL:['SOURCE','LY','PL'],AD:['SOURCE','LY','AD'],
 VG:['SOURCE','LY','VG'],AC:['SOURCE','LY','VG','AC'],HA:['SOURCE','LY','VG','AC','HA'],
 ZG:['SOURCE','LY','VG','ZG'],SI:['SOURCE','LY','VG','SI'],
 RE:['SOURCE','RE'],DR:['SOURCE','RE','DR'],AR:['SOURCE','AR'],PO:['SOURCE','AR','PO'],BA:['SOURCE','AR','BA'],
 VE:['SOURCE','SOL','VE'],ML:['SOURCE','SOL','ML'],MA:['SOURCE','SOL','ML','MA'],
 OR:['OR'],MI:['OR','MI'],NU:['NU'],GA:['GA'],
};

export function treeHighlightCodes(resolution:LineageResolution){
 if(!resolution.refinementApplied)return [...(DISPLAY_PATHS[resolution.lineageResult]??[resolution.lineageResult])];
 const route=resolution.canonicalLineagePath.filter(code=>code!=='APEX');
 if(route[0]==='LY'||route[0]==='RE')route.unshift('SOURCE');
 return route;
}

function IconNode({code,label,x,y,active,final}:{code:string;label:string;x:number;y:number;active:Set<string>;final:string}){
 const isActive=active.has(code),isFinal=final===code,id=ICON_IDS[code];
 const style={left:`${x/WIDTH*100}%`,top:`${y/HEIGHT*100}%`} as CSSProperties;
 return <div className={`lineage-icon-node${isActive?' is-active':''}${isFinal?' is-final':''}`} style={style} data-code={code}>
  <span className="lineage-icon-ring"><img src={`/icons/${id}-small.webp`} alt={`${label}文明圖示`} width="160" height="160" loading="lazy"/></span>
  <span className="lineage-icon-label">{label}</span>
 </div>;
}

export default function CivilizationLineageTree({resolution}:{resolution:LineageResolution}){
 const highlighted=treeHighlightCodes(resolution);
 const active=new Set(highlighted);
 const activeEdges=new Set(highlighted.slice(0,-1).map((code,index)=>`${code}>${highlighted[index+1]}`));
 return <section className="civilization-lineage-tree" aria-labelledby="lineage-tree-title">
  <div className="lineage-tree-heading"><p className="eyebrow">文明親緣樹</p><h2 id="lineage-tree-title">你的文明系譜</h2></div>
  <div className="lineage-tree-scroll" tabIndex={0} aria-label="文明親緣樹，可向右滑動查看完整圖表">
   <div className="lineage-unified-canvas lineage-genealogy-canvas">
    <svg className="lineage-connectors" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} aria-hidden="true">
     <defs>
      <marker id="genealogy-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0 8 4 0 8z" fill="#6f8098"/></marker>
      <marker id="genealogy-active-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0 8 4 0 8z" fill="#e7c65c"/></marker>
     </defs>
     {CONNECTORS.map((link,index)=>{
      const isActive=activeEdges.has(`${link.from}>${link.to}`);
      return <g key={`${link.from}-${link.to}-${index}`}>
       <polyline points={link.points} markerEnd={`url(#genealogy-${isActive?'active-':''}arrow)`} className={`genealogy-connector${isActive?' is-active':''}`}/>
       {link.label&&<text x={link.labelX} y={link.labelY} textAnchor={link.labelAnchor??'middle'} transform={link.labelTransform} className={`genealogy-route-label${isActive?' is-active':''}`}>{link.label}</text>}
      </g>;
     })}
    </svg>
    <div className={`lineage-source-orbit${active.has('SOURCE')?' is-active':''}`}><i>✦</i><strong>宇宙源頭</strong></div>
    <div className={`lineage-solar-hub${active.has('SOL')?' is-active':''}`}><i>☉</i><strong>太陽系文明</strong></div>
    {NODES.map(([code,label,x,y])=><IconNode key={code} code={code} label={label} x={x} y={y} active={active} final={resolution.lineageResult}/>) }
   </div>
  </div>
 </section>;
}
