import {useEffect,useRef,type CSSProperties} from 'react';
import type {LineageResolution} from '../shared/lineage-locator';

const WIDTH=900;
const HEIGHT=1760;

const ICON_IDS:Record<string,number>={
 PL:1,AR:2,SI:3,AD:4,LY:5,OR:6,MI:7,VE:8,HA:9,PO:10,AC:11,
 VG:12,FE:13,BA:14,MA:15,ML:16,DR:17,RE:18,ZG:19,NU:20,GA:23,
};

const NODES=[
 ['LY','5. 天琴座人',260,235],
 ['FE','13. 貓科星族',135,360],['PL','1. 昴宿星人',350,360],
 ['AD','4. 仙女座人',135,500],['VG','12. 織女星人',350,500],
 ['AC','11. 半人馬座阿爾法星人',240,640],['ZG','19. 澤塔灰人',440,640],['SI','3. 天狼星人',635,640],
 ['OR','6. 獵戶座人',520,790],['MI','7. 明塔卡星人',725,790],

 ['AR','2. 大角星人',220,980],['HA','9. 哈達爾星人',405,980],
 ['PO','10. 北極星人',590,980],['BA','14. 藍鳥人',770,980],

 ['RE','18. 爬蟲族',250,1175],['DR','17. 天龍座人',465,1175],
 ['NU','20. 阿努納奇',675,1295],

 ['VE','8. 金星人',220,1450],['ML','16. 馬爾德克人',420,1450],
 ['MA','15. 火星人',575,1580],['GA','21. 蓋亞人',735,1450],
] as const;

const BRANCHES=[
 ['LY_GROUP','天琴人形主幹',125,135],
 ['INDEPENDENT','獨立高維支系',125,890],
 ['REPTILE','爬蟲龍族主幹',125,1085],
 ['SOL','太陽系主幹',125,1360],
] as const;

type Connector={from:string;to:string;points:string;arrow?:boolean};

const CONNECTORS:Connector[]=[
 {from:'SOURCE',to:'LY_GROUP',points:'450,86 55,86 55,135 82,135'},
 {from:'SOURCE',to:'INDEPENDENT',points:'55,135 55,890 82,890'},
 {from:'SOURCE',to:'REPTILE',points:'55,890 55,1085 82,1085'},
 {from:'SOURCE',to:'SOL',points:'55,1085 55,1360 82,1360'},

 {from:'LY_GROUP',to:'LY',points:'168,135 260,135 260,194'},
 {from:'LY',to:'FE',points:'225,235 90,235 90,360 100,360'},
 {from:'LY',to:'PL',points:'260,276 260,310 350,310 350,319'},
 {from:'LY',to:'AD',points:'225,235 90,235 90,500 100,500'},
 {from:'LY',to:'VG',points:'260,276 260,445 350,445 350,459'},
 {from:'VG',to:'AC',points:'350,541 350,575 240,575 240,599'},
 {from:'VG',to:'ZG',points:'350,541 350,575 440,575 440,599'},
 {from:'VG',to:'SI',points:'350,541 350,575 635,575 635,599'},
 {from:'LY',to:'OR',points:'295,235 485,235 485,735 520,749'},
 {from:'VG',to:'OR',points:'385,500 455,500 455,710 505,750'},
 {from:'SI',to:'OR',points:'635,681 635,715 545,715 525,749'},
 {from:'OR',to:'MI',points:'555,790 690,790'},

 {from:'INDEPENDENT',to:'AR',points:'168,890 220,890 220,939'},
 {from:'INDEPENDENT',to:'HA',points:'168,890 405,890 405,939'},
 {from:'INDEPENDENT',to:'PO',points:'168,890 590,890 590,939'},
 {from:'INDEPENDENT',to:'BA',points:'168,890 770,890 770,939'},

 {from:'REPTILE',to:'RE',points:'168,1085 250,1085 250,1134'},
 {from:'RE',to:'DR',points:'285,1175 430,1175'},
 {from:'SI',to:'NU',points:'670,640 705,640 705,1254 690,1254'},
 {from:'OR',to:'NU',points:'555,790 625,790 625,1240 660,1255'},
 {from:'DR',to:'NU',points:'500,1175 550,1175 550,1240 660,1270'},

 {from:'SOL',to:'VE',points:'168,1360 220,1360 220,1409'},
 {from:'SOL',to:'ML',points:'168,1360 420,1360 420,1409'},
 {from:'SOL',to:'GA',points:'168,1360 735,1360 735,1409'},
 {from:'ML',to:'MA',points:'420,1491 420,1530 575,1530 575,1539'},

 {from:'PL',to:'EARTH_BUS',points:'385,360 852,360',arrow:false},
 {from:'SI',to:'EARTH_BUS',points:'670,640 852,640',arrow:false},
 {from:'OR',to:'EARTH_BUS',points:'555,790 852,790',arrow:false},
 {from:'NU',to:'EARTH_BUS',points:'710,1295 852,1295',arrow:false},
 {from:'ML',to:'EARTH_BUS',points:'455,1450 852,1450',arrow:false},
 {from:'MA',to:'EARTH_BUS',points:'610,1580 852,1580',arrow:false},
 {from:'GA',to:'EARTH_BUS',points:'770,1450 852,1450',arrow:false},
 {from:'EARTH_BUS',to:'HUMAN',points:'852,360 852,1660 760,1660 760,1668'},
];

const DISPLAY_PATHS:Record<string,string[]>={
 LY:['SOURCE','LY_GROUP','LY'],FE:['SOURCE','LY_GROUP','LY','FE'],PL:['SOURCE','LY_GROUP','LY','PL'],
 AD:['SOURCE','LY_GROUP','LY','AD'],VG:['SOURCE','LY_GROUP','LY','VG'],
 AC:['SOURCE','LY_GROUP','LY','VG','AC'],ZG:['SOURCE','LY_GROUP','LY','VG','ZG'],
 SI:['SOURCE','LY_GROUP','LY','VG','SI'],
 AR:['SOURCE','INDEPENDENT','AR'],HA:['SOURCE','INDEPENDENT','HA'],
 PO:['SOURCE','INDEPENDENT','PO'],BA:['SOURCE','INDEPENDENT','BA'],
 RE:['SOURCE','REPTILE','RE'],DR:['SOURCE','REPTILE','RE','DR'],
 VE:['SOURCE','SOL','VE'],ML:['SOURCE','SOL','ML'],MA:['SOURCE','SOL','ML','MA'],GA:['SOURCE','SOL','GA'],
 OR:['OR'],MI:['OR','MI'],NU:['NU'],
};

export function treeHighlightCodes(resolution:LineageResolution){
 if(!resolution.refinementApplied)return [...(DISPLAY_PATHS[resolution.lineageResult]??[resolution.lineageResult])];
 const route=resolution.canonicalLineagePath.filter(code=>code!=='APEX');
 if(route[0]==='LY')route.unshift('SOURCE','LY_GROUP');
 else if(route[0]==='RE')route.unshift('SOURCE','REPTILE');
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
 const scrollRef=useRef<HTMLDivElement>(null);
 const highlighted=treeHighlightCodes(resolution);
 const active=new Set(highlighted);
 const activeEdges=new Set(highlighted.slice(0,-1).map((code,index)=>`${code}>${highlighted[index+1]}`));
 useEffect(()=>{
  const scroll=scrollRef.current,node=scroll?.querySelector<HTMLElement>(`[data-code="${resolution.lineageResult}"]`);
  if(scroll&&node&&scroll.scrollWidth>scroll.clientWidth)scroll.scrollLeft=Math.max(0,node.offsetLeft-scroll.clientWidth/2);
 },[resolution.lineageResult]);
 return <section className="civilization-lineage-tree" aria-labelledby="lineage-tree-title">
  <div className="lineage-tree-heading"><p className="eyebrow">文明親緣樹</p><h2 id="lineage-tree-title">你的文明系譜</h2></div>
  <div ref={scrollRef} className="lineage-tree-scroll" tabIndex={0} aria-label="文明親緣樹，可左右滑動查看完整圖表">
   <div className="lineage-unified-canvas lineage-genealogy-canvas">
    <svg className="lineage-connectors" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} aria-hidden="true">
     <defs>
      <marker id="genealogy-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 0 8 4 0 8z" fill="#6f8098"/></marker>
      <marker id="genealogy-active-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 0 8 4 0 8z" fill="#e7c65c"/></marker>
     </defs>
     {CONNECTORS.map((link,index)=>{
      const isActive=activeEdges.has(`${link.from}>${link.to}`);
      return <polyline key={`${link.from}-${link.to}-${index}`} points={link.points} markerEnd={link.arrow===false?undefined:`url(#genealogy-${isActive?'active-':''}arrow)`} className={`genealogy-connector${isActive?' is-active':''}`}/>;
     })}
    </svg>
    <div className={`lineage-source-orbit${active.has('SOURCE')?' is-active':''}`}><i>✦</i><strong>宇宙源頭</strong></div>
    {BRANCHES.map(([code,label,x,y])=><div key={code} className={`lineage-branch-hub${active.has(code)?' is-active':''}`} style={{left:`${x/WIDTH*100}%`,top:`${y/HEIGHT*100}%`}}><span>{label}</span></div>)}
    {NODES.map(([code,label,x,y])=><IconNode key={code} code={code} label={label} x={x} y={y} active={active} final={resolution.lineageResult}/>)}
    <div className="lineage-earth-humanity lineage-genealogy-humanity"><i>◉</i><strong>地球人類</strong></div>
   </div>
  </div>
 </section>;
}
