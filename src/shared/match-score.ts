import type {QuizMode} from './questionnaire';

// Display-only calibration. PRCS ranking always uses the unmodified raw cosine.
export const MATCH_SCORE_CONSTANTS={
 quick:{rawCosineScale:0.204},
 full:{rawCosineScale:0.136},
 logisticScale:1.5,
} as const;

export interface MatchScore {
 rawCosine:number;
 zScore:number;
 matchScore:number;
}

export function toMatchScore(rawCosine:number,mode:QuizMode):MatchScore{
 const zScore=rawCosine/MATCH_SCORE_CONSTANTS[mode].rawCosineScale;
 const matchScore=100/(1+Math.exp(-(zScore/MATCH_SCORE_CONSTANTS.logisticScale)));
 return {rawCosine,zScore,matchScore};
}
