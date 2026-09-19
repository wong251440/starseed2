import type {CSSProperties,ReactNode} from 'react';
import type {LineageResolution} from '../shared/lineage-locator';

const ICON_IDS:Record<string,number>={
 PL:1,AR:2,SI:3,AD:4,LY:5,OR:6,MI:7,VE:8,HA:9,PO:10,AC:11,
 VG:12,FE:13,BA:14,MA:15,ML:16,DR:17,RE:18,ZG:19,NU:20,GA:23,
};

const NODES=[
 ['LY','5. Lyran',250,240],['FE','13. Feline',70,450],['PL','1. Pleiadian',190,450],['VG','12. Vegan',340,450],
 ['SI','3. Sirian',220,660],['AC','11. Alpha Centaurian',350,660],['HA','9. Hadarian',350,850],['ZG','19. Zeta Grey',475,850],
 ['OR','6. Orion',600,660],['MI','7. Mintakan',600,850],
 ['AR','2. Arcturian',760,350],['AD','4. Andromedan',900,350],['PO','10. Polarian',1040,350],['BA','14. Blue Avian',1180,350],['VE','8. Venusian',1320,350],
 ['RE','18. Reptilian',1460,240],['DR','17. Draconian',1460,470],['NU','20. Anunnaki / Nibiruan',1460,700],
 ['ML','16. Maldekian',900,960],['MA','15. Martian',900,1140],['GA','21. Gaian',1110,960],
] as const;

type Connector={from:string;to:string;points:string};
const CONNECTORS:Connector[]=[
 {from:'SOURCE',to:'LY',points:'800,105 800,145 250,145 250,205'},
 {from:'SOURCE',to:'AR',points:'800,105 800,275 760,275 760,315'},
 {from:'SOURCE',to:'AD',points:'800,105 800,275 900,275 900,315'},
 {from:'SOURCE',to:'PO',points:'800,105 800,275 1040,275 1040,315'},
 {from:'SOURCE',to:'BA',points:'800,105 800,275 1180,275 1180,315'},
 {from:'SOURCE',to:'VE',points:'800,105 800,275 1320,275 1320,315'},
 {from:'SOURCE',to:'RE',points:'800,105 800,160 1460,160 1460,205'},
 {from:'SOURCE',to:'SOL',points:'800,105 800,810 1020,810 1020,875'},
 {from:'LY',to:'FE',points:'250,275 250,360 70,360 70,415'},
 {from:'LY',to:'PL',points:'250,275 250,360 190,360 190,415'},
 {from:'LY',to:'VG',points:'250,275 250,360 340,360 340,415'},
 {from:'LY',to:'AD',points:'250,275 250,310 900,310 900,315'},
 {from:'LY',to:'OR',points:'250,275 250,570 600,570 600,625'},
 {from:'VG',to:'SI',points:'340,485 340,570 220,570 220,625'},
 {from:'VG',to:'AC',points:'340,485 340,625'},
 {from:'AC',to:'HA',points:'350,695 350,815'},
 {from:'VG',to:'APEX',points:'340,485 340,570 475,570 475,625'},
 {from:'APEX',to:'ZG',points:'475,695 475,815'},
 {from:'VG',to:'OR',points:'340,485 340,570 600,570 600,625'},
 {from:'SI',to:'OR',points:'220,695 220,750 600,750 600,625'},
 {from:'OR',to:'MI',points:'600,695 600,815'},
 {from:'RE',to:'DR',points:'1460,275 1460,435'},
 {from:'DR',to:'NU',points:'1460,505 1460,665'},
 {from:'SI',to:'NU',points:'220,695 220,770 1380,770 1460,735'},
 {from:'OR',to:'NU',points:'600,695 600,750 1380,750 1460,735'},
 {from:'SOL',to:'ML',points:'1020,875 1020,900 900,900 900,925'},
 {from:'SOL',to:'GA',points:'1020,875 1020,900 1110,900 1110,925'},
 {from:'ML',to:'MA',points:'900,995 900,1105'},
 {from:'MA',to:'EARTH',points:'900,1175 900,1190 1225,1190'},
 {from:'GA',to:'EARTH',points:'1110,995 1110,1100 1225,1100 1225,1190'},
 {from:'PL',to:'EARTH',points:'190,485 190,1215 1225,1215 1225,1190'},
 {from:'SI',to:'EARTH',points:'220,695 220,1215 1225,1215 1225,1190'},
 {from:'OR',to:'EARTH',points:'600,695 600,1215 1225,1215 1225,1190'},
];

export function treeHighlightCodes(resolution:LineageResolution){
 const codes=[...resolution.canonicalLineagePath];
 if(codes.some(code=>code==='LY'||['AR','AD','PO','BA','VE'].includes(code)))codes.unshift('SOURCE');
 return codes;
}

function IconNode({code,label,x,y,active,final}:{code:string;label:string;x:number;y:number;active:Set<string>;final:string}){
 const isActive=active.has(code),isFinal=final===code,id=ICON_IDS[code];
 const style={left:`${x/16}%`,top:`${y/12.5}%`} as CSSProperties;
 return <div className={`lineage-icon-node${isActive?' is-active':''}${isFinal?' is-final':''}`} style={style} data-code={code}>
  <span className="lineage-icon-ring"><img src={`/icons/${id}-small.webp`} alt={`${label} 文明圖示`} width="160" height="160" loading="lazy"/></span>
  <span className="lineage-icon-label">{label}</span>
 </div>;
}

function Label({className,children}:{className:string;children:ReactNode}){return <span className={className}>{children}</span>;}

export default function CivilizationLineageTree({resolution}:{resolution:LineageResolution}){
 const active=new Set(treeHighlightCodes(resolution)),final=resolution.lineageResult;
 const isActive=(from:string,to:string)=>active.has(from)&&active.has(to);
 return <section className="civilization-lineage-tree" aria-labelledby="lineage-tree-title">
  <div className="lineage-tree-heading"><p className="eyebrow">文明親緣樹</p><h2 id="lineage-tree-title">你的文明系譜</h2></div>
  <div className="lineage-tree-scroll" tabIndex={0} aria-label="文明親緣樹，可向右滑動查看完整關係">
   <div className="lineage-unified-canvas">
    <svg className="lineage-connectors" viewBox="0 0 1600 1250" aria-hidden="true">
     {CONNECTORS.map(link=><polyline key={`${link.from}-${link.to}`} points={link.points} className={`lineage-connector${isActive(link.from,link.to)?' is-active':''}`}/>) }
    </svg>
    <div className={`lineage-source-orbit${active.has('SOURCE')?' is-active':''}`}><i>✦</i><strong>SOURCE / FOUNDERS</strong><small>超級母源，不列入 21 族</small></div>
    <Label className="lineage-branch-label humanoid">LYRAN / HUMANOID<br/><small>古老類人祖系</small></Label>
    <Label className="lineage-branch-label parallel">PARALLEL / OTHER<br/><small>平行／獨立文明</small></Label>
    <Label className="lineage-branch-label reptilian">REPTILIAN / DRACO COMPLEX<br/><small>非人形祖系</small></Label>
    <Label className="lineage-branch-label solar">SOL / EARTH STREAM</Label>
    <div className={`lineage-apex${active.has('APEX')?' is-active':''}`} aria-label="Apex civilization helper node"><span>Apex</span></div>
    {NODES.map(([code,label,x,y])=><IconNode key={code} code={code} label={label} x={x} y={y} active={active} final={final}/>) }
    <div className="lineage-earth-humanity"><i>✦</i><strong>EARTH HUMANITY</strong><small>地球人類</small></div>
   </div>
  </div>
 </section>;
}
