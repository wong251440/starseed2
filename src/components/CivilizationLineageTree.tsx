import type {CSSProperties,ReactNode} from 'react';
import type {LineageResolution} from '../shared/lineage-locator';

const ICON_IDS:Record<string,number>={
 PL:1,AR:2,SI:3,AD:4,LY:5,OR:6,MI:7,VE:8,HA:9,PO:10,AC:11,
 VG:12,FE:13,BA:14,MA:15,ML:16,DR:17,RE:18,ZG:19,NU:20,GA:23,
};

const NODES=[
 ['LY','5. 天琴座',200,155],['FE','13. 貓科星族',65,295],['PL','1. 昴宿星',170,295],['VG','12. 織女星',300,295],
 ['SI','3. 天狼星',165,440],['AC','11. 半人馬座α星',295,440],['HA','9. 哈達爾星',295,560],['ZG','19. 澤塔灰人',415,560],
 ['OR','6. 獵戶座',535,440],['MI','7. 明塔卡',535,560],
 ['AR','2. 大角星',690,250],['AD','4. 仙女座',815,250],['PO','10. 北極星',940,250],['BA','14. 藍鳥人',1065,250],['VE','8. 金星',1190,250],
 ['RE','18. 爬蟲族',1320,155],['DR','17. 天龍座',1320,340],['NU','20. 阿努納奇／尼比魯人',1320,520],
 ['ML','16. 馬爾德克人',830,650],['MA','15. 火星',830,770],['GA','21. 蓋亞人（地球原生）',1060,650],
] as const;

type Connector={from:string;to:string;points:string};
const CONNECTORS:Connector[]=[
 {from:'SOURCE',to:'LY',points:'700,95 700,105 200,105 200,120'},
 {from:'SOURCE',to:'AR',points:'700,95 700,190 690,190 690,215'},
 {from:'SOURCE',to:'AD',points:'700,95 700,190 815,190 815,215'},
 {from:'SOURCE',to:'PO',points:'700,95 700,190 940,190 940,215'},
 {from:'SOURCE',to:'BA',points:'700,95 700,190 1065,190 1065,215'},
 {from:'SOURCE',to:'VE',points:'700,95 700,190 1190,190 1190,215'},
 {from:'SOURCE',to:'RE',points:'700,95 700,115 1320,115 1320,120'},
 {from:'SOURCE',to:'SOL',points:'700,95 700,585 945,585 945,600'},
 {from:'LY',to:'FE',points:'200,190 200,230 65,230 65,260'},
 {from:'LY',to:'PL',points:'200,190 200,230 170,230 170,260'},
 {from:'LY',to:'VG',points:'200,190 200,230 300,230 300,260'},
 {from:'LY',to:'AD',points:'200,190 200,210 815,210 815,215'},
 {from:'LY',to:'OR',points:'200,190 200,380 535,380 535,405'},
 {from:'VG',to:'SI',points:'300,330 300,380 165,380 165,405'},
 {from:'VG',to:'AC',points:'300,330 300,405'},
 {from:'AC',to:'HA',points:'295,475 295,525'},
 {from:'VG',to:'APEX',points:'300,330 300,380 415,380 415,405'},
 {from:'APEX',to:'ZG',points:'415,475 415,525'},
 {from:'VG',to:'OR',points:'300,330 300,380 535,380 535,405'},
 {from:'SI',to:'OR',points:'165,475 165,500 535,500 535,405'},
 {from:'OR',to:'MI',points:'535,475 535,525'},
 {from:'RE',to:'DR',points:'1320,190 1320,305'},
 {from:'DR',to:'NU',points:'1320,375 1320,485'},
 {from:'SI',to:'NU',points:'165,475 165,545 1250,545 1320,555'},
 {from:'OR',to:'NU',points:'535,475 535,530 1250,530 1320,555'},
 {from:'SOL',to:'ML',points:'945,600 945,610 830,610 830,615'},
 {from:'SOL',to:'GA',points:'945,600 945,610 1060,610 1060,615'},
 {from:'ML',to:'MA',points:'830,685 830,735'},
 {from:'MA',to:'EARTH',points:'830,805 830,815 1165,815'},
 {from:'GA',to:'EARTH',points:'1060,685 1060,770 1165,770 1165,815'},
 {from:'PL',to:'EARTH',points:'170,330 170,830 1165,830 1165,815'},
 {from:'SI',to:'EARTH',points:'165,475 165,830 1165,830 1165,815'},
 {from:'OR',to:'EARTH',points:'535,475 535,830 1165,830 1165,815'},
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
    <svg className="lineage-connectors" viewBox="0 0 1400 850" aria-hidden="true">
     {CONNECTORS.map(link=><polyline key={`${link.from}-${link.to}`} points={link.points} className={`lineage-connector${isActive(link.from,link.to)?' is-active':''}`}/>) }
    </svg>
    <div className={`lineage-source-orbit${active.has('SOURCE')?' is-active':''}`}><i>✦</i><strong>源頭／始源者</strong><small>超級母源，不列入 21 族</small></div>
    <Label className="lineage-branch-label humanoid">天琴座／類人祖系<br/><small>古老類人祖系</small></Label>
    <Label className="lineage-branch-label parallel">平行／獨立文明</Label>
    <Label className="lineage-branch-label reptilian">爬蟲／天龍複合系<br/><small>非人形祖系</small></Label>
    <Label className="lineage-branch-label solar">太陽系／地球支流</Label>
    <div className={`lineage-apex${active.has('APEX')?' is-active':''}`} aria-label="頂點文明輔助節點"><span>頂點</span></div>
    {NODES.map(([code,label,x,y])=><IconNode key={code} code={code} label={label} x={x} y={y} active={active} final={final}/>) }
    <div className="lineage-earth-humanity"><i>✦</i><strong>地球人類</strong></div>
   </div>
  </div>
 </section>;
}
