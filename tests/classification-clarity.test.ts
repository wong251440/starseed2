import {describe,expect,it} from 'vitest';
import {classifyClarity} from '../src/shared/classification-clarity';

const clarity=(form:'quick'|'full',marginRaw:number,prototypeStable=true)=>classifyClarity({form,primary:'PL',runnerUp:'AR',marginRaw,prototypeStable});

describe('classification clarity layer',()=>{
 it.each([
  ['full',.019,'very_close'],['full',.02,'close'],['full',.049,'close'],['full',.05,'clear'],['full',.099,'clear'],['full',.10,'very_clear'],
  ['quick',.049,'very_close'],['quick',.05,'close'],['quick',.119,'close'],['quick',.12,'clear'],['quick',.199,'clear'],['quick',.20,'very_clear'],
 ] as const)('uses %s threshold boundaries at raw margin %f', (form,marginRaw,tier)=>{
  expect(clarity(form,marginRaw)).toMatchObject({form,primary:'PL',runnerUp:'AR',marginRaw,baseTier:tier,tier,prototypeStable:true});
 });
 it('caps only an unstable very-clear result at clear',()=>{
  expect(clarity('full',.10,false)).toMatchObject({baseTier:'very_clear',prototypeStable:false,tier:'clear'});
  expect(clarity('quick',.20,false)).toMatchObject({baseTier:'very_clear',prototypeStable:false,tier:'clear'});
  expect(clarity('full',.05,false)).toMatchObject({baseTier:'clear',tier:'clear'});
 });
});
