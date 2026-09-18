import {describe,expect,it} from 'vitest';
import config from '../models/prcs-empirical-calibration-v0.3.json';
import full from '../models/full54.json';
import quick from '../models/quick24.json';
import changes from '../calibrate/PRCS_EMPIRICAL_ITEM_LAYER_v0.3_MIN_2026-09-18/wording_changes_v2.json';
import {CALIBRATION_VERSION,calibratedResponse,empiricalOffset} from '../worker/prcs-calibration';

describe('empirical intercept-only calibration',()=>{
 it('uses the supplied offsets without clipping or weighting',()=>{
  expect(CALIBRATION_VERSION).toBe(config.calibration_version);
  expect(Object.values(config.items)).toHaveLength(56);
  expect(Object.values(config.items).every(item=>item.weight===1)).toBe(true);
  expect(empiricalOffset('D-34',1)).toBe(config.items['D-34@v1'].active_offset);
  expect(calibratedResponse('D-34',1,1)).toBeCloseTo(-1-config.items['D-34@v1'].active_offset,12);
  expect(calibratedResponse('A-06',2,1)).toBe(-1);
  expect(calibratedResponse('A-06',2,null)).toBe(0);
 });
 it('activates the exact v2 wording and keeps rewritten items at zero offset',()=>{
  for(const change of changes.changes){
   for(const model of [full,quick]){
    const item=model.items.find(item=>item.uid===change.uid);
    if(!item)continue;
    expect(item.wording_version).toBe(2);
    expect(item.prompt).toBe(change.v2.prompt);
    expect(item.left_text).toBe(change.v2.left_text);
    expect(item.right_text).toBe(change.v2.right_text);
   }
   expect(empiricalOffset(change.uid,2)).toBe(0);
  }
 });
});
