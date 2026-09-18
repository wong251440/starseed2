import {describe,expect,it} from 'vitest';
import config from '../models/prcs-production-calibration-v0.4.json';
import full from '../models/full54.json';
import quick from '../models/quick24.json';
import changes from '../models/prcs-wording-changes-v2.json';
import {CALIBRATION_VERSION,calibratedResponse,empiricalOffset,empiricalWeight} from '../worker/prcs-calibration';
import {scorePRCS} from '../worker/prcs';
import demo from '../src/data/demo-responses.json';

describe('production weighted calibration',()=>{
 it('uses the supplied versioned offsets and frozen weights without clipping',()=>{
  expect(CALIBRATION_VERSION).toBe(config.release_id);
  expect(Object.values(config.items)).toHaveLength(56);
  expect(new Set([...full.items,...quick.items].map(item=>`${item.uid}@v${item.wording_version??1}`))).toEqual(new Set(Object.keys(config.items)));
  expect(Math.min(...Object.values(config.items).map(item=>item.weight))).toBe(.8);
  expect(Math.max(...Object.values(config.items).map(item=>item.weight))).toBe(1.25);
  expect(empiricalOffset('D-34',1)).toBe(config.items['D-34@v1'].active_offset);
  expect(empiricalWeight('D-34',1)).toBe(config.items['D-34@v1'].weight);
  expect(calibratedResponse('D-34',1,1)).toBeCloseTo(-1-config.items['D-34@v1'].active_offset,12);
  expect(calibratedResponse('A-06',2,1)).toBeCloseTo(-1-config.items['A-06@v2'].active_offset,12);
  expect(calibratedResponse('A-06',2,null)).toBe(0);
 });
 it('activates exact v2 wording and uses the matching entry for each item',()=>{
  for(const change of changes.changes){
   for(const model of [full,quick]){
    const item=model.items.find(item=>item.uid===change.uid);
    if(!item)continue;
    expect(item.wording_version).toBe(2);
    expect(item.prompt).toBe(change.v2.prompt);
    expect(item.left_text).toBe(change.v2.left_text);
    expect(item.right_text).toBe(change.v2.right_text);
   }
   expect(empiricalOffset(change.uid,2)).toBe(config.items[`${change.uid}@v2`].active_offset);
   expect(empiricalWeight(change.uid,2)).toBe(config.items[`${change.uid}@v2`].weight);
  }
 for(const uid of ['B-Q43','B-Q04','C-Q03','C-Q40'])expect(config.items[`${uid}@v2`]).toMatchObject({active_offset:0,weight:1});
 });
 it('uses the configured weighted-cosine formula for every lineage ranking',()=>{
  const {goals,operations,scopes}=full.dimensions,base=goals.length+operations.length+scopes.length;
  const sum=(values:number[])=>values.reduce((total,value)=>total+value,0);
  const dot=(left:number[],right:number[])=>sum(left.map((value,index)=>value*right[index]));
  const norm=(values:number[])=>Math.sqrt(dot(values,values));
  const phi=(fragment:string[])=>{const [goal,operation,scope]=fragment,vector=Array(base+goals.length*operations.length).fill(0) as number[];vector[goals.indexOf(goal)]=1;vector[goals.length+operations.indexOf(operation)]=1;vector[goals.length+operations.length+scopes.indexOf(scope)]=1;vector[base+goals.indexOf(goal)*operations.length+operations.indexOf(operation)]=1;return vector;};
  const axes=full.items.map(item=>{const left=phi(item.left),right=phi(item.right),difference=right.map((value,index)=>value-left[index]);return difference.map(value=>value/norm(difference));});
  const scenario=full.prototype_weight_scenarios.nominal;
  const prototypes=full.lineages.map(lineage=>{const fragments=lineage.prototype_fragments.map(phi);return fragments[0].map((_,index)=>sum(scenario.map((weight,item)=>weight*fragments[item][index]))/sum(scenario));});
  const mean=prototypes[0].map((_,index)=>sum(prototypes.map(prototype=>prototype[index]))/prototypes.length);
  const codes=prototypes.map(prototype=>axes.map(axis=>dot(prototype.map((value,index)=>value-mean[index]),axis)));
  const y=full.items.map(item=>calibratedResponse(item.uid,item.wording_version??1,demo.responses[item.uid]));
  const weights=full.items.map(item=>empiricalWeight(item.uid,item.wording_version??1));
  const weightedDot=(left:number[],right:number[])=>sum(left.map((value,index)=>weights[index]*value*right[index]));
  const expected=codes.map((code,index)=>({lineage:full.lineages[index].code,similarity:weightedDot(y,code)/Math.sqrt(weightedDot(y,y)*weightedDot(code,code))}));
  const raw=scorePRCS(demo.responses);
  if(raw.status==='INSUFFICIENT_SIGNAL')throw Error('Expected a classified result');
  for(const row of raw.ranking)expect(row.similarity).toBeCloseTo(expected.find(value=>value.lineage===row.lineage)!.similarity,12);
 });
});
