import type {LineageResolution} from '../shared/lineage-locator';

type NodeProps={code:string;label:string;detail?:string;active:Set<string>;final:string};
function Node({code,label,detail,active,final}:NodeProps){
 const isActive=active.has(code),isFinal=final===code;
 return <div className={`lineage-node${isActive?' is-active':''}${isFinal?' is-final':''}`} data-code={code}><strong>{label}</strong>{detail&&<small>{detail}</small>}</div>;
}
function Link({active}:{active:boolean}){return <span className={`lineage-link${active?' is-active':''}`} aria-hidden="true"/>;}
function ConnectedNode({code,label,detail,active,final,parent}:{code:string;label:string;detail?:string;active:Set<string>;final:string;parent:string}){return <div className="lineage-connected"><Link active={active.has(parent)&&active.has(code)}/><Node {...{code,label,detail,active,final}}/></div>;}

export function treeHighlightCodes(resolution:LineageResolution){
 const codes=[...resolution.canonicalLineagePath];
 if(codes.some(code=>code==='LY'||['AR','AD','PO','BA','VE'].includes(code)))codes.unshift('SOURCE');
 return codes;
}

export default function CivilizationLineageTree({resolution}:{resolution:LineageResolution}){
 const active=new Set(treeHighlightCodes(resolution)),final=resolution.lineageResult;
 const lyranActive=active.has('LY'),parallelActive=['AR','AD','PO','BA','VE'].some(code=>active.has(code));
 const reptilianActive=active.has('RE')||active.has('DR'),solarActive=['ML','MA','GA'].some(code=>active.has(code));
 return <section className="civilization-lineage-tree" aria-labelledby="lineage-tree-title">
  <div className="lineage-tree-heading"><p className="eyebrow">文明親緣樹</p><h2 id="lineage-tree-title">你的文明系譜</h2></div>
  <div className="lineage-tree-scroll" tabIndex={0} aria-label="文明親緣樹，可向右滑動查看完整關係">
   <div className="lineage-tree-canvas">
    <div className={`lineage-source${lyranActive||parallelActive?' is-active':''}`}><strong>【SOURCE / FOUNDERS】</strong><small>超級母源，不列入 21 族</small></div>
    <div className="lineage-source-stem"><Link active={lyranActive||parallelActive}/></div>
    <div className="lineage-main-groups">
     <section className={`lineage-group lineage-humanoid${lyranActive?' is-active':''}`}>
      <header><strong>【LYRAN / HUMANOID】</strong><span>古老類人祖系</span></header>
      <Node code="LY" label="5. Lyran" active={active} final={final}/>
      <div className="lineage-children four">
       <ConnectedNode parent="LY" code="FE" label="13. Feline" active={active} final={final}/>
       <ConnectedNode parent="LY" code="PL" label="1. Pleiadian" active={active} final={final}/>
       <div className="lineage-subtree"><ConnectedNode parent="LY" code="VG" label="12. Vegan" active={active} final={final}/><div className="lineage-children four compact"><ConnectedNode parent="VG" code="SI" label="3. Sirian" active={active} final={final}/><ConnectedNode parent="VG" code="AC" label="11. Alpha Centaurian" active={active} final={final}/><div className="lineage-subtree"><ConnectedNode parent="VG" code="APEX" label="[Apex civilization]" active={active} final={final}/><ConnectedNode parent="APEX" code="ZG" label="19. Zeta Grey" active={active} final={final}/></div><div className="lineage-subtree"><ConnectedNode parent="VG" code="OR" label="6. Orion" active={active} final={final}/><ConnectedNode parent="OR" code="MI" label="7. Mintakan" detail="Orion / Mintaka 子系統" active={active} final={final}/></div></div></div>
       <div className="lineage-subtree"><ConnectedNode parent="LY" code="OR" label="6. Orion" active={active} final={final}/><ConnectedNode parent="OR" code="MI" label="7. Mintakan" detail="Orion / Mintaka 子系統" active={active} final={final}/></div>
      </div>
     </section>
     <section className={`lineage-group lineage-parallel${parallelActive?' is-active':''}`}>
      <header><strong>【PARALLEL / OTHER】</strong><span>平行／獨立文明</span></header>
      <ConnectedNode parent="SOURCE" code="AR" label="2. Arcturian" active={active} final={final}/>
      <div className="lineage-related"><ConnectedNode parent="SOURCE" code="AD" label="4. Andromedan" detail="部分系統視為 Lyran diaspora" active={active} final={final}/><Link active={active.has('LY')&&active.has('AD')}/></div>
      <ConnectedNode parent="SOURCE" code="PO" label="10. Polarian" active={active} final={final}/>
      <ConnectedNode parent="SOURCE" code="BA" label="14. Blue Avian" active={active} final={final}/>
      <ConnectedNode parent="SOURCE" code="VE" label="8. Venusian" active={active} final={final}/>
     </section>
     <section className="lineage-group lineage-nonhuman">
      <header><strong>【NON-HUMANOID】</strong><span>非人形祖系</span></header>
      <Node code="RE" label="18. Reptilian" detail="廣義類型" active={active} final={final}/>
      <ConnectedNode parent="RE" code="DR" label="17. Draconian" detail="Draco / Alpha-Draco 特定支系" active={active} final={final}/>
      <div className={`lineage-anunnaki${active.has('NU')?' is-active':''}`}><Link active={reptilianActive&&active.has('NU')}/><Node code="NU" label="20. Anunnaki / Nibiruan" active={active} final={final}/><div className="lineage-lore-links"><span>Sirius系<br/>版本連結</span><span>Orion系<br/>版本連結</span><span>Draco系<br/>版本連結</span></div></div>
     </section>
    </div>
    <section className={`lineage-solar${solarActive?' is-active':''}`}>
     <header><strong>【SOL / EARTH STREAM】</strong></header>
     <div className="lineage-solar-flow"><div><Node code="ML" label="16. Maldekian" active={active} final={final}/><ConnectedNode parent="ML" code="MA" label="15. Martian" active={active} final={final}/></div><div><Node code="GA" label="21. Gaian" detail="Earth Native" active={active} final={final}/></div><div className="earth-humanity"><Link active={solarActive}/><strong>【EARTH HUMANITY】</strong><small>地球人類</small></div></div>
     <div className="lineage-earth-links"><span>[#1] Pleiadian</span><span>[#3] Sirian</span><span>[#6] Orion</span></div>
    </section>
   </div>
  </div>
 </section>;
}
