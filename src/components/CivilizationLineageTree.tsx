import {useEffect,useRef,type CSSProperties} from 'react';
import type {LineageResolution} from '../shared/lineage-locator';

const WIDTH=980;
const HEIGHT=520;

const ICON_IDS:Record<string,number>={
 PL:1,AR:2,SI:3,AD:4,LY:5,OR:6,MI:7,VE:8,HA:9,PO:10,AC:11,
 VG:12,FE:13,BA:14,MA:15,ML:16,DR:17,RE:18,ZG:19,NU:20,GA:23,
};

const LYRAN_CODES=['LY','FE','PL','VG','SI','AC','ZG','OR','MI'] as const;
const REPTILIAN_CODES=['RE','DR'] as const;
type GraphKind='lyran'|'reptilian';
type Node={code:string;label:string;x:number;y:number};
type Connector={from:string;to:string;points:string};

const LYRAN_NODES:Node[]=[
 {code:'LY',label:'5. 天琴座人',x:135,y:260},
 {code:'FE',label:'13. 貓科星族',x:365,y:90},{code:'PL',label:'1. 昴宿星人',x:365,y:190},
 {code:'VG',label:'12. 織女星人',x:365,y:300},{code:'OR',label:'6. 獵戶座人',x:365,y:430},
 {code:'SI',label:'3. 天狼星人',x:635,y:190},{code:'AC',label:'11. 半人馬座阿爾法星人',x:635,y:300},
 {code:'ZG',label:'19. 澤塔灰人',x:635,y:410},{code:'MI',label:'7. 明塔卡星人',x:855,y:430},
];
const LYRAN_CONNECTORS:Connector[]=[
 {from:'LY',to:'FE',points:'170,260 250,260 250,90 300,90'},
 {from:'LY',to:'PL',points:'170,260 250,260 250,190 300,190'},
 {from:'LY',to:'VG',points:'170,260 250,260 250,300 300,300'},
 {from:'LY',to:'OR',points:'170,260 250,260 250,430 300,430'},
 {from:'VG',to:'SI',points:'400,300 490,300 490,190 570,190'},
 {from:'VG',to:'AC',points:'400,300 570,300'},
 {from:'VG',to:'ZG',points:'400,300 490,300 490,410 570,410'},
 {from:'OR',to:'MI',points:'400,430 790,430'},
];
const REPTILIAN_NODES:Node[]=[{code:'RE',label:'18. 爬蟲族',x:270,y:260},{code:'DR',label:'17. 天龍座人',x:700,y:260}];
const REPTILIAN_CONNECTORS:Connector[]=[{from:'RE',to:'DR',points:'305,260 650,260'}];

function graphKindFor(result:string):GraphKind|null{
 if((LYRAN_CODES as readonly string[]).includes(result))return 'lyran';
 if((REPTILIAN_CODES as readonly string[]).includes(result))return 'reptilian';
 return null;
}
export function treeHighlightCodes(resolution:LineageResolution){
 const kind=graphKindFor(resolution.lineageResult);
 if(!kind)return [];
 const allowed=kind==='lyran'?LYRAN_CODES:REPTILIAN_CODES;
 return resolution.canonicalLineagePath.filter(code=>(allowed as readonly string[]).includes(code));
}
export function shouldRenderDecisionTree(resolution:LineageResolution){return Boolean(graphKindFor(resolution.lineageResult));}

function IconNode({node,active,final}:{node:Node;active:Set<string>;final:string}){
 const isActive=active.has(node.code),isFinal=final===node.code,id=ICON_IDS[node.code];
 const style={left:`${node.x/WIDTH*100}%`,top:`${node.y/HEIGHT*100}%`} as CSSProperties;
 return <div className={`lineage-icon-node${isActive?' is-active':''}${isFinal?' is-final':''}`} style={style} data-code={node.code}>
  <span className="lineage-icon-ring"><img src={`/icons/${id}-small.webp`} alt={`${node.label}文明圖示`} width="160" height="160" loading="lazy"/></span>
  <span className="lineage-icon-label">{node.label}</span>
 </div>;
}

export default function CivilizationLineageTree({resolution}:{resolution:LineageResolution}){
 const kind=graphKindFor(resolution.lineageResult),scrollRef=useRef<HTMLDivElement>(null),highlighted=treeHighlightCodes(resolution),active=new Set(highlighted),activeEdges=new Set(highlighted.slice(0,-1).map((code,index)=>`${code}>${highlighted[index+1]}`));
 useEffect(()=>{const scroll=scrollRef.current,node=scroll?.querySelector<HTMLElement>(`[data-code="${resolution.lineageResult}"]`);if(scroll&&node&&scroll.scrollWidth>scroll.clientWidth)scroll.scrollLeft=Math.max(0,node.offsetLeft-scroll.clientWidth/2);},[resolution.lineageResult]);
 if(!kind)return null;
 const nodes=kind==='lyran'?LYRAN_NODES:REPTILIAN_NODES,connectors=kind==='lyran'?LYRAN_CONNECTORS:REPTILIAN_CONNECTORS;
 const optional:Connector[]=[];
 if(kind==='lyran'&&activeEdges.has('VG>OR'))optional.push({from:'VG',to:'OR',points:'400,300 460,300 460,390 365,390'});
 if(kind==='lyran'&&activeEdges.has('SI>OR'))optional.push({from:'SI',to:'OR',points:'670,190 745,190 745,390 400,390'});
 return <section className="civilization-lineage-tree civilization-decision-tree" aria-labelledby="lineage-tree-title">
  <div className="lineage-tree-heading"><p className="eyebrow">文明親緣樹</p><h2 id="lineage-tree-title">你的文明系譜</h2></div>
  <div ref={scrollRef} className="lineage-tree-scroll" tabIndex={0} aria-label="文明親緣樹，可左右滑動查看完整圖表">
   <div className={`lineage-decision-canvas is-${kind}`}>
    <svg className="lineage-connectors" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} aria-hidden="true"><defs><marker id="decision-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 0 8 4 0 8z" fill="#6f8098"/></marker><marker id="decision-active-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 0 8 4 0 8z" fill="#e7c65c"/></marker></defs>{[...connectors,...optional].map(link=>{const isActive=activeEdges.has(`${link.from}>${link.to}`);return <polyline key={`${link.from}-${link.to}`} points={link.points} markerEnd={`url(#decision-${isActive?'active-':''}arrow)`} className={`decision-connector${isActive?' is-active':''}`}/>;})}</svg>
    {nodes.map(node=><IconNode key={node.code} node={node} active={active} final={resolution.lineageResult}/>)}</div>
  </div>
 </section>;
}
