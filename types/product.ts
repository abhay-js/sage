import { ActivityLog } from './index';
export type AthleteSport = 'RUN'|'RIDE'|'SWIM'|'TRIATHLON'|'HYROX'|'STRENGTH'|'OTHER';
export interface AthleteProfile {
  user_id:string; full_name:string; profile_image_url?:string|null; gender?:string|null; date_of_birth?:string|null;
  city?:string; country?:string; sports:AthleteSport[]; primary_sport?:AthleteSport;
  events:string[]; goal_name?:string; goal_date?:string|null; goal_target?:string;
  weekly_sessions?:string; weekly_hours?:string; running_volume?:string; cycling_volume?:string; swimming_volume?:string; strength_sessions?:string;
  onboarding_completed:boolean; updated_at?:string;
}
export interface LevelDefinition {id:number;name:string;description:string}
export interface ScoringRule {id:string;sport:string;threshold:number;unit:'KM'|'MINUTES'|'METERS'|'SESSION';points:number;order:number}
export type BonusType='EARLY_BIRD'|'STREAK'|'OUTDOOR'|'BRICK'|'ELEVATION'|'CUSTOM';
export interface BonusMission {id:string;type:BonusType;title:string;description:string;points:number;maxUses?:number;metadata:{hour?:number;days?:number;elevation?:number;gapMinutes?:number;activityIds?:string[]}}
export interface RuleCopy {id:string;title:string;description:string;order:number}
export interface Reward {id:string;rank:number;title:string;description:string;imageUrl?:string;sponsor?:string;terms?:string}
export interface ChallengeConfiguration {
  description:string;challengeType:string;coverImageUrl?:string;timezone:string;maxWorkoutsPerDay:number|null;
  scoringMode:'LEGACY'|'THRESHOLD';scoringRules:ScoringRule[];bonuses:BonusMission[];rules:RuleCopy[];rewards:Reward[];
  legacy:{sessionPoints:number;hourPoints:number;streak7:number;streak30:number};
}
export interface ProductChallenge {
  id:string;name:string;city:string|null;sport_types:string[];challenge_start:string;challenge_end:string;race_date:string;status:'draft'|'open'|'closed';
  config:ChallengeConfiguration;eligible_levels:number[];participant_count:number;joined:boolean;level_at_join:number|null;
  eligibility:'ELIGIBLE'|'NOT_ELIGIBLE'|'PENDING_LEVEL_REVIEW';sage_score:number;rank:number|null;revision:number;
}
export interface BoardAthlete {id:string;user_id:string;sage_score:number;rank:number;level:number|null;user:{name:string;avatarUrl?:string|null};sessions:number;streak:number;total_hours:number}
export interface AroundMe {current:BoardAthlete|null;above:BoardAthlete[];below:BoardAthlete[];summit:BoardAthlete[];total:number;nextGap:number|null}
export interface ScoreAudit {activity_id:string;race_id:string;race_name?:string;base_points:number;bonus_points:number;total_points:number;status:'COUNTED'|'PENDING'|'REJECTED'|'DAILY_CAP'|'BELOW_THRESHOLD';bonuses:{id:string;label:string;points:number}[]}
export interface SyncResult {imported:number;challenges:{id:string;name:string;beforePoints:number;afterPoints:number;beforeRank:number|null;afterRank:number|null;passed:number;nextGap:number|null}[]}
export interface TrainingAnalysis {profile:AthleteProfile|null;level:number|null;workouts:ActivityLog[];summary:{count:number;hours:number;weeks:number;activeWeeks:number;workoutsPerWeek:number;hoursPerWeek:number;averageMinutes:number;start:string|null;end:string|null};sports:{sport:string;count:number;distance:number;longest:number;hours:number;elevation:number;indoor:number;outdoor:number;unknown:number;longestMinutes:number;paceMinutesPerKm:number|null}[];weekly:{week:string;count:number;hours:number}[];suggestion:{level:number|null;reasons:string[]};history:{previous_level:number|null;new_level:number|null;reason:string|null;updated_by:string;updated_at:string}[]}
