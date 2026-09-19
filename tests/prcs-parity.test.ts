import {describe,expect,it} from 'vitest';
import {scorePRCS} from '../worker/prcs';
import demo from '../src/data/demo-responses.json';

describe('current full PRCS scorer',()=>{
 it('is deterministic for the active 54-item model and empirical calibration',()=>{
  const first=scorePRCS(demo.responses),second=scorePRCS(demo.responses);
  expect(first).toEqual(second);
  expect(first).toMatchObject({model_version:'PRCS-v2.0',selection_version:'V4-RPCB-FULL54',calibration_version:'PRCS-EMP-v0.5-N518-20260919',total_items:54,primary:'PL'});
 });
});
