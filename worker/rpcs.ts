import {validateResponses,responseMode,type Responses} from '../src/shared/questionnaire';
import {adaptResult} from '../src/shared/result';
import {scorePRCS,type PRCSAnswers} from './prcs';
import {scoreQuick} from './prcs-quick';
export function score(responses:Responses,mode=responseMode(responses)){validateResponses(responses,mode);return adaptResult((mode==='quick'?scoreQuick:scorePRCS)(responses as PRCSAnswers),mode);}
