import {describe,it,expect} from 'vitest';
import {resolveLineage} from '../src/shared/lineage-locator';
import {shouldRenderDecisionTree,treeHighlightCodes} from '../src/components/CivilizationLineageTree';

const codes=['PL','AR','SI','AD','LY','OR','MI','VE','HA','PO','AC','VG','FE','BA','MA','ML','DR','RE','ZG','NU','GA'];
function ranking(values:Record<string,number>){return codes.map(lineage=>({lineage,similarity:values[lineage]??-1})).sort((a,b)=>b.similarity-a.similarity||codes.indexOf(a.lineage)-codes.indexOf(b.lineage));}

describe('Civilization Lineage Locator v1.1',()=>{
 it('does not cross from an unrelated raw anchor',()=>{
  const result=resolveLineage(ranking({VE:2,SI:1.9,LY:1.8}),'full');
  expect(result).toMatchObject({rawAnchor:'VE',lineageResult:'VE',refinementApplied:false,decisionPath:['VE']});
 });
 it('allows a strong grandchild to carry LY through a weak Vegan node to Alpha Centaurian',()=>{
  const result=resolveLineage(ranking({LY:2,AC:1.8,VG:-.2}),'full');
  expect(result).toMatchObject({rawAnchor:'LY',lineageResult:'AC',decisionPath:['LY','VG','AC'],canonicalLineagePath:['LY','VG','AC']});
 });
 it('allows a weak Lyra ancestor to resolve Vegan to Sirian',()=>{
  const result=resolveLineage(ranking({VG:2,SI:1.8,LY:-1.5}),'full');
  expect(result).toMatchObject({rawAnchor:'VG',lineageResult:'SI',decisionPath:['VG','SI']});
  expect(treeHighlightCodes(result)).toEqual(['LY','VG','SI']);
 });
 it('stops at Vegan when no descendant endpoint has enough evidence',()=>{
 const result=resolveLineage(ranking({VG:2}),'full');
  expect(result).toMatchObject({rawAnchor:'VG',lineageResult:'VG',refinementApplied:false});
  expect(shouldRenderDecisionTree(result)).toBe(false);
 });
 it('does not force a nearly tied Vegan branch selection',()=>{
  const result=resolveLineage(ranking({VG:2,SI:1.35,OR:1.34,MI:1.33}),'full');
  expect(result).toMatchObject({rawAnchor:'VG',lineageResult:'VG',refinementApplied:false});
 });
 it('uses the Orion single-child rule to resolve Mintakan',()=>{
  const result=resolveLineage(ranking({OR:2,MI:1.85}),'full');
  expect(result).toMatchObject({rawAnchor:'OR',lineageResult:'MI',decisionPath:['OR','MI']});
 });
 it('uses the Reptilian single-child rule to resolve Draconian',()=>{
  const result=resolveLineage(ranking({RE:2,DR:1.85}),'full');
  expect(result).toMatchObject({rawAnchor:'RE',lineageResult:'DR',decisionPath:['RE','DR']});
 });
 it('keeps direct Feline and Pleiadian anchors in place',()=>{
 expect(resolveLineage(ranking({FE:2,LY:-1}),'full').lineageResult).toBe('FE');
  expect(resolveLineage(ranking({PL:2,LY:-1}),'full').lineageResult).toBe('PL');
  expect(shouldRenderDecisionTree(resolveLineage(ranking({PL:2,LY:-1}),'full'))).toBe(false);
 });
 it('is deterministic and applies Quick thresholds independently',()=>{
  const values=ranking({LY:2,AC:1.8,VG:-.2});
  expect(resolveLineage(values,'full')).toEqual(resolveLineage(values,'full'));
  expect(resolveLineage(values,'quick')).toMatchObject({rawAnchor:'LY',lineageResult:'AC'});
 });
 it('highlights only the resolved graph route, never arbitrary high ranked civilizations',()=>{
 const result=resolveLineage(ranking({LY:2,AC:1.8,PL:1.3,VG:-.2}),'full');
  expect(treeHighlightCodes(result)).toEqual(['LY','VG','AC']);
  expect(shouldRenderDecisionTree(result)).toBe(true);
  expect(treeHighlightCodes(result)).not.toContain('PL');
 });
 it('does not render a decision tree for a civilization outside the formal graph',()=>{
  const result=resolveLineage(ranking({VE:2,SI:1.9,LY:1.8}),'full');
  expect(treeHighlightCodes(result)).toEqual([]);
 });
});
