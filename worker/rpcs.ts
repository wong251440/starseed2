import {validateResponses,type Responses} from '../src/shared/questionnaire';
import {adaptResult} from '../src/shared/result';
import {scorePRCS,type PRCSAnswers} from './prcs';
export function score(responses:Responses){validateResponses(responses);return adaptResult(scorePRCS(responses as PRCSAnswers));}
