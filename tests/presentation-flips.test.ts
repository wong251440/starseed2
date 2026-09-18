import {describe,expect,it} from 'vitest';
import {canonicalResponseForDisplay,displayResponseForCanonical,hasPresentationFlips,questionsForMode} from '../src/shared/questionnaire';
import {freshDraft} from '../src/shared/session';
import {scorePRCS} from '../worker/prcs';
import demo from '../src/data/demo-responses.json';

describe('BIP presentation flips',()=>{
 it('reverses the complete 1–7 display scale and is its own inverse',()=>{
  expect([1,2,3,4,5,6,7].map(value=>canonicalResponseForDisplay(value,true))).toEqual([7,6,5,4,3,2,1]);
  for(const value of [1,2,3,4,5,6,7])expect(displayResponseForCanonical(canonicalResponseForDisplay(value,true),true)).toBe(value);
 });
 it('creates and persists one boolean orientation for every item in a new form',()=>{
 for(const mode of ['quick','full'] as const){const draft=freshDraft(mode);expect(hasPresentationFlips(draft.presentationFlips,mode)).toBe(true);expect(Object.keys(draft.presentationFlips)).toEqual(questionsForMode(mode).map(question=>question.id));}
 });
 it('keeps the score identical when the same canonical answers came from flipped displays',()=>{
  const flips=Object.fromEntries(questionsForMode('full').map((question,index)=>[question.id,index%2===0]));
  const reconstructed=Object.fromEntries(questionsForMode('full').map(question=>{const canonical=demo.responses[question.id],displayed=displayResponseForCanonical(canonical,flips[question.id]);return [question.id,canonicalResponseForDisplay(displayed,flips[question.id])];}));
  expect(scorePRCS(reconstructed)).toEqual(scorePRCS(demo.responses));
 });
});
