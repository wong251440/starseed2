import type {QuizMode} from './questionnaire';

export const CLASSIFICATION_CLARITY_THRESHOLDS={
 quick:{veryClose:0.05,close:0.12,clear:0.20},
 full:{veryClose:0.02,close:0.05,clear:0.10},
} as const;

export type ClassificationClarityTier='very_close'|'close'|'clear'|'very_clear';
export interface ClassificationClarity {
 form:QuizMode;
 primary:string;
 runnerUp:string;
 marginRaw:number;
 baseTier:ClassificationClarityTier;
 prototypeStable:boolean;
 tier:ClassificationClarityTier;
}

export function classifyClarity({form,primary,runnerUp,marginRaw,prototypeStable}:{form:QuizMode;primary:string;runnerUp:string;marginRaw:number;prototypeStable:boolean}):ClassificationClarity{
 const thresholds=CLASSIFICATION_CLARITY_THRESHOLDS[form];
 const baseTier:ClassificationClarityTier=marginRaw<thresholds.veryClose?'very_close':marginRaw<thresholds.close?'close':marginRaw<thresholds.clear?'clear':'very_clear';
 return {form,primary,runnerUp,marginRaw,baseTier,prototypeStable,tier:baseTier};
}
