import {useEffect,useRef} from 'react';
import type {LineageResolution} from '../shared/lineage-locator';

const ICON_IDS:Record<string,number>={
 PL:1,AR:2,SI:3,AD:4,LY:5,OR:6,MI:7,VE:8,HA:9,PO:10,AC:11,
 VG:12,FE:13,BA:14,MA:15,ML:16,DR:17,RE:18,ZG:19,NU:20,GA:23,
};

const LYRAN_CODES=['LY','FE','PL','VG','SI','AC','ZG','OR','MI'] as const;
const REPTILIAN_CODES=['RE','DR'] as const;
type GraphKind='lyran'|'reptilian';
type Node={code:string;label:string;children?:Node[]};

const labels:Record<string,string>={
 LY:'5. 天琴座人',FE:'13. 貓科星族',PL:'1. 昴宿星人',VG:'12. 織女星人',
 SI:'3. 天狼星人',AC:'11. 半人馬座阿爾法星人',ZG:'19. 澤塔灰人',
 OR:'6. 獵戶座人',MI:'7. 明塔卡星人',RE:'18. 爬蟲族',DR:'17. 天龍座人',
};

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

function lyraTree(path:string[]):Node{
 const orNode:Node={code:'OR',label:labels.OR,children:[{code:'MI',label:labels.MI}]};
 const vgNode:Node={code:'VG',label:labels.VG,children:[
  {code:'SI',label:labels.SI},
  {code:'AC',label:labels.AC},
  {code:'ZG',label:labels.ZG},
 ]};
 const siNode=vgNode.children![0];
 if(path.includes('VG')&&path.includes('OR'))vgNode.children!.push(orNode);
 else if(path.includes('SI')&&path.includes('OR'))siNode.children=[orNode];
 return {code:'LY',label:labels.LY,children:[
  {code:'FE',label:labels.FE},
  {code:'PL',label:labels.PL},
  vgNode,
  ...(path.includes('VG')&&path.includes('OR')||path.includes('SI')&&path.includes('OR')?[]:[orNode]),
 ]};
}

function treeFor(kind:GraphKind,path:string[]):Node{
 return kind==='reptilian'
  ? {code:'RE',label:labels.RE,children:[{code:'DR',label:labels.DR}]}
  : lyraTree(path);
}

function TreeNode({node,active,final}:{node:Node;active:Set<string>;final:string}){
 const isActive=active.has(node.code),isFinal=final===node.code,id=ICON_IDS[node.code];
 return <li className={`decision-tree-item${isActive?' is-active':''}${isFinal?' is-final':''}`} data-code={node.code}>
  <div className="decision-tree-node">
   <span className="lineage-icon-ring"><img src={`/icons/${id}-small.webp`} alt={`${node.label}文明圖示`} width="160" height="160" loading="lazy"/></span>
   <span className="lineage-icon-label">{node.label}</span>
  </div>
  {node.children?.length?<ul className="decision-tree-children">{node.children.map(child=><TreeNode key={child.code} node={child} active={active} final={final}/>)}</ul>:null}
 </li>;
}

export default function CivilizationLineageTree({resolution}:{resolution:LineageResolution}){
 const kind=graphKindFor(resolution.lineageResult);
 const scrollRef=useRef<HTMLDivElement>(null);
 const highlighted=treeHighlightCodes(resolution);
 const active=new Set(highlighted);
 useEffect(()=>{
  const scroll=scrollRef.current,node=scroll?.querySelector<HTMLElement>(`[data-code="${resolution.lineageResult}"]`);
  if(scroll&&node&&scroll.scrollWidth>scroll.clientWidth)scroll.scrollLeft=Math.max(0,node.offsetLeft-scroll.clientWidth/2);
 },[resolution.lineageResult]);
 if(!kind)return null;

 return <section className="civilization-lineage-tree civilization-decision-tree" aria-labelledby="lineage-tree-title">
  <div className="lineage-tree-heading"><p className="eyebrow">文明親緣樹</p><h2 id="lineage-tree-title">你的文明系譜</h2></div>
  <div ref={scrollRef} className="lineage-tree-scroll" tabIndex={0} aria-label="文明親緣樹，可左右滑動查看完整圖表">
   <div className={`decision-html-tree is-${kind}`}>
    <ul className="decision-tree-root"><TreeNode node={treeFor(kind,highlighted)} active={active} final={resolution.lineageResult}/></ul>
   </div>
  </div>
 </section>;
}
