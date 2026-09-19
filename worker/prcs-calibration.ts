import config from '../models/prcs-production-calibration-v0.5.json';

type CalibrationItem={
 uid:string;
 wording_version:number;
 item_key:string;
 status:'calibrated'|'collecting_v2';
 active_offset:number;
 weight:number;
};

const items=config.items as Record<string,CalibrationItem>;
export const CALIBRATION_VERSION=config.release_id;

function entry(uid:string,wordingVersion:number){
 const item=items[`${uid}@v${wordingVersion}`];
 if(!item)throw Error(`Missing empirical calibration entry for ${uid}@v${wordingVersion}`);
 if(item.uid!==uid||item.wording_version!==wordingVersion||item.item_key!==`${uid}@v${wordingVersion}`||!Number.isFinite(item.active_offset)||!Number.isFinite(item.weight)||item.weight<=0)throw Error(`Invalid empirical calibration entry for ${uid}@v${wordingVersion}`);
 return item;
}

export function empiricalOffset(uid:string,wordingVersion=1){
 return entry(uid,wordingVersion).active_offset;
}

export function empiricalWeight(uid:string,wordingVersion=1){
 return entry(uid,wordingVersion).weight;
}

export function calibratedResponse(uid:string,wordingVersion:number,answer:number|null|undefined){
 return answer==null?0:(answer-4)/3-empiricalOffset(uid,wordingVersion);
}
