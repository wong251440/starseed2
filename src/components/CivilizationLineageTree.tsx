import type {CSSProperties} from 'react';
import type {LineageResolution} from '../shared/lineage-locator';

const WIDTH=940;
const HEIGHT=1960;

const ICON_IDS:Record<string,number>={
 PL:1,AR:2,SI:3,AD:4,LY:5,OR:6,MI:7,VE:8,HA:9,PO:10,AC:11,
 VG:12,FE:13,BA:14,MA:15,ML:16,DR:17,RE:18,ZG:19,NU:20,GA:23,
};

const NODES=[
 ['LY','5. 天琴座人',90,210],['RE','18. 爬蟲族',350,210],['AR','2. 大角星人',610,210],
 ['DR','17. 天龍座人',350,370],['PO','10. 北極星人',555,370],['BA','14. 藍鳥人',675,370],
 ['VE','8. 金星人',790,370],['ML','16. 馬爾德克人',885,525],
 ['FE','13. 貓科星族',90,420],['PL','1. 昴宿星人',90,575],['AD','4. 仙女座人',90,730],
 ['VG','12. 織女星人',90,885],['AC','11. 半人馬座α星人',220,1035],
 ['HA','9. 哈達爾星人',340,1155],['ZG','19. 澤塔灰人',220,1205],['SI','3. 天狼星人',220,1360],
 ['OR','6. 獵戶座人',500,1420],['MI','7. 明塔卡星人',500,1570],
 ['NU','20. 阿努納奇／尼比魯人',690,1595],['MA','15. 火星人',745,1750],
 ['GA','21. 蓋亞人（地球原生）',865,1900],
] as const;

type Connector={from:string;to:string;points:string;label?:string;labelX?:number;labelY?:number;labelAnchor?:'start'|'middle'|'end'};

const CONNECTORS:Connector[]=[
 {from:'SOURCE',to:'LY',points:'470,85 470,125 90,125 90,170'},
 {from:'SOURCE',to:'RE',points:'470,85 470,125 350,125 350,170'},
 {from:'SOURCE',to:'AR',points:'470,85 470,125 610,125 610,170'},
 {from:'SOURCE',to:'SOL',points:'470,85 470,125 845,125 845,170'},

 {from:'LY',to:'FE',points:'55,210 30,210 30,420 55,420'},
 {from:'LY',to:'PL',points:'55,210 30,210 30,575 55,575'},
 {from:'LY',to:'AD',points:'55,210 30,210 30,730 55,730'},
 {from:'LY',to:'VG',points:'55,210 30,210 30,885 55,885'},

 {from:'RE',to:'DR',points:'350,250 350,330'},
 {from:'AR',to:'PO',points:'610,250 610,290 555,290 555,330'},
 {from:'AR',to:'BA',points:'610,250 610,290 675,290 675,330'},
 {from:'SOL',to:'VE',points:'845,245 845,290 790,290 790,330'},
 {from:'SOL',to:'ML',points:'845,245 845,445 885,445 885,485'},

 {from:'VG',to:'AC',points:'125,885 165,885 165,1035 185,1035'},
 {from:'VG',to:'ZG',points:'125,885 165,885 165,1205 185,1205'},
 {from:'VG',to:'SI',points:'125,885 165,885 165,1360 185,1360'},
 {from:'AC',to:'HA',points:'255,1035 290,1035 290,1155 305,1155'},

 {from:'LY',to:'OR',points:'55,210 12,210 12,1265 450,1265 480,1380',label:'5. 天琴座人的主幹',labelX:185,labelY:1251},
 {from:'VG',to:'OR',points:'125,885 145,885 145,1310 430,1310 480,1385',label:'12. 織女星人的支流',labelX:260,labelY:1296},
 {from:'SI',to:'OR',points:'255,1360 420,1360 465,1400'},
 {from:'OR',to:'MI',points:'500,1460 500,1530'},

 {from:'SI',to:'NU',points:'255,1335 585,1335 585,1580 655,1580',label:'3. 天狼星人的另一支流',labelX:410,labelY:1321},
 {from:'DR',to:'NU',points:'385,370 410,370 410,1485 655,1485 675,1555',label:'17. 天龍座人的另一支流',labelX:525,labelY:1471},
 {from:'OR',to:'NU',points:'535,1420 615,1420 615,1545 655,1570'},

 {from:'PL',to:'GA',points:'125,575 815,575 815,1865 830,1885'},
 {from:'NU',to:'GA',points:'725,1595 850,1595 850,1860'},
 {from:'ML',to:'MA',points:'885,565 885,1670 745,1670 745,1710',label:'16. 馬爾德克人的延伸',labelX:765,labelY:1656},
 {from:'MA',to:'GA',points:'780,1750 805,1750 805,1900 830,1900'},
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
       {link.label&&<text x={link.labelX} y={link.labelY} textAnchor={link.labelAnchor??'middle'} className={`genealogy-route-label${isActive?' is-active':''}`}>{link.label}</text>}
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
