import type {ActivityLog} from '../types';
// The welcome design defines one training hour as 100 virtual metres.
// This is a derived journey over approved workouts, independent of challenge points.
// Peak catalogue: https://www.theuiaa.org/8000m-peaks/
// Heights: https://www.theoutdoorpirate.com/14x8000m (Everest rounded to 8,849 m).
export const homeGiants=[
 {name:'Shishapangma',height:8027},{name:'Gasherbrum II',height:8035},{name:'Broad Peak',height:8051},
 {name:'Gasherbrum I',height:8080},{name:'Annapurna I',height:8091},{name:'Nanga Parbat',height:8126},
 {name:'Manaslu',height:8163},{name:'Dhaulagiri I',height:8167},{name:'Cho Oyu',height:8188},
 {name:'Makalu',height:8485},{name:'Lhotse',height:8516},{name:'Kangchenjunga',height:8586},
 {name:'K2',height:8611},{name:'Everest',height:8849},
] as const;
export function homeSummits(activities:ActivityLog[]){
 const unique=[...new Map(activities.map(a=>[a.id,a])).values()].filter(a=>a.review_status!=='rejected'&&a.review_status!=='pending');
 const seconds=unique.reduce((sum,a)=>sum+(Number.isFinite(a.moving_time_secs)?Math.max(0,a.moving_time_secs):0),0);
 const totalMetres=Math.floor(seconds/36);let left=totalMetres,completed=0;
 for(const peak of homeGiants){if(left<peak.height)break;left-=peak.height;completed++;}
 const peak=homeGiants[Math.min(completed,homeGiants.length-1)],finished=completed===homeGiants.length;
 const metres=finished?peak.height:left;
 return {totalMetres,completed,peak,metres,finished,hoursLeft:Math.ceil((peak.height-metres)/100),progress:metres/peak.height};
}
