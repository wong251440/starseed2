import config from '../models/prcs-empirical-calibration-v0.3.json';

type CalibrationItem={
 uid:string;
 wording_version:number;
 item_key:string;
 status:'calibrated'|'collecting_v2';
 active_offset:number;
 weight:number;
};

const items=config.items as Record<string,CalibrationItem>;
export const CALIBRATION_VERSION=config.calibration_version;

function entry(uid:string,wordingVersion:number){
 const item=items[`${uid}@v${wordingVersion}`];
 if(!item)throw Error(`Missing empirical calibration entry for ${uid}@v${wordingVersion}`);
 if(item.uid!==uid||item.wording_version!==wordingVersion||item.item_key!==`${uid}@v${wordingVersion}`||item.weight!==1)throw Error(`Invalid empirical calibration entry for ${uid}@v${wordingVersion}`);
 return item;
}

export function empiricalOffset(uid:string,wordingVersion=1){
 return entry(uid,wordingVersion).active_offset;
}

export function calibratedResponse(uid:string,wordingVersion:number,answer:number|null|undefined){
 return answer==null?0:(answer-4)/3-empiricalOffset(uid,wordingVersion);
}
