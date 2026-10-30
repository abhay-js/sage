import type {SageIconName} from '../components/ui/SageIcon';
export interface NavigationItem {name:string;title:string;icon:SageIconName}
export const appTabs:NavigationItem[]=[
 {name:'home',title:'Home',icon:'home'},
 {name:'ranks',title:'Climb',icon:'mountain'},
 {name:'record-activity',title:'Add',icon:'plus'},
 {name:'challenges',title:'Challenges',icon:'flag'},
 {name:'log',title:'You',icon:'user'},
];
export const adminTabs:NavigationItem[]=[
 {name:'dashboard',title:'Overview',icon:'home'},
 {name:'payments',title:'Payments',icon:'gift'},
 {name:'races',title:'Clashes',icon:'flag'},
 {name:'workouts',title:'Workouts',icon:'activity'},
 {name:'athletes',title:'Athletes',icon:'users'},
];
export function parentAdminTab(route:string){
 if(['challenge-editor','race-management','results','partners'].includes(route))return 'races';
 if(route==='flags')return 'workouts';
 if(route==='settings')return 'dashboard';
 if(['athlete-management','athlete-detail'].includes(route))return 'athletes';
 if(route==='submissions')return 'workouts';
 return route;
}
export const hiddenAppScreens=['sessions','profile','health-connect','garmin','submit-activity','village','profile-details','profile-edit','workout-result','challenge-detail','challenge-rules','race-detail','session-detail','session-create','session-edit'];
export function parentAppTab(route:string){
 if(['challenge-detail','challenge-rules','race-detail'].includes(route))return 'challenges';
 if(['sessions','session-detail','session-create','session-edit','village'].includes(route))return 'challenges';
 if(route==='submit-activity')return 'record-activity';
 if(['profile','profile-details','profile-edit','health-connect','garmin','workout-result'].includes(route))return 'log';
 return route;
}
