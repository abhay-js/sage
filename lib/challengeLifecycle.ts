import type { AroundMe, BoardAthlete, ProductChallenge } from '../types/product';
export function challengeCountdown(start:string,now=Date.now()) {
 const total=Math.max(0,Math.floor((Date.parse(start)-now)/1000));
 return {days:Math.floor(total/86400),hours:Math.floor(total/3600)%24,minutes:Math.floor(total/60)%60,seconds:total%60};
}
export function resultPodium(athletes:BoardAthlete[]) {
 return [...new Map(athletes.filter(a=>a.rank>0&&a.rank<=3).map(a=>[a.user_id,a])).values()].sort((a,b)=>a.rank-b.rank);
}
export function resultSummary(challenge:ProductChallenge,around:AroundMe|null|undefined,rows:BoardAthlete[]) {
 const podium=resultPodium(around?.summit??rows),me=around?.current,total=around?.total??challenge.participant_count;
 const complete=challenge.status==='closed';
 const winners=podium.filter(a=>a.rank===1);
 const sessions=rows.length===total?rows.reduce((sum,a)=>sum+a.sessions,0):null;
 return {podium,me,total,complete,winners,sessions,topTen:!!me&&total>=10&&me.rank/total<=.1,finisher:challenge.joined&&!!me&&me.sessions>0,
 champion:winners.length>1?(complete?'Joint champions':'Joint leaders'):winners[0]?`${complete?'Champion':'Leader'} · ${winners[0].user.name}`:'Standings will appear here'};
}
const escapeCalendar=(value:string)=>value.replace(/\\/g,'\\\\').replace(/\r\n|\r|\n/g,'\\n').replace(/;/g,'\\;').replace(/,/g,'\\,');
export function challengeCalendar(challenge:ProductChallenge,now=new Date()) {
 const start=new Date(challenge.challenge_start);if(!Number.isFinite(start.getTime()))throw new Error('The challenge start time is unavailable.');
 const stamp=(date:Date)=>date.toISOString().replace(/[-:]/g,'').replace(/\.\d{3}Z$/,'Z');
 return ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Sage//Challenge starts//EN','BEGIN:VEVENT',`UID:${encodeURIComponent(challenge.id)}@trainsage.fit`,`DTSTAMP:${stamp(now)}`,`DTSTART:${stamp(start)}`,`DTEND:${stamp(new Date(start.getTime()+30*60000))}`,`SUMMARY:${escapeCalendar(challenge.name+' starts')}`,`DESCRIPTION:${escapeCalendar('Your Sage challenge starts. View rules and your base camp: https://trainsage.fit/ranks?raceId='+encodeURIComponent(challenge.id))}`,'BEGIN:VALARM','ACTION:DISPLAY','DESCRIPTION:Your Sage challenge starts soon','TRIGGER:-PT15M','END:VALARM','END:VEVENT','END:VCALENDAR',''].join('\r\n');
}
