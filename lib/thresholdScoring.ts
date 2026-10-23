export function thresholdPoints(config:{scoringRules:{sport:string;unit:string;threshold:number;points:number}[]},sport:string,distance:number|null,seconds:number):number {
  return config.scoringRules.reduce((highest,r)=>{
    const measured=r.unit==='KM'?(distance??0)/1000:r.unit==='METERS'?(distance??0):r.unit==='MINUTES'?seconds/60:r.unit==='SESSION'?1:0;
    return r.sport===sport&&measured>=r.threshold?Math.max(highest,r.points):highest;
  },0);
}
