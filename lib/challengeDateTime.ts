// Convert between a real instant and the wall-clock value shown by native date pickers.
function parts(instant: Date, timeZone: string) {
  const fields = new Intl.DateTimeFormat('en-GB', {timeZone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(instant);
  const get = (key: string) => Number(fields.find(part => part.type === key)?.value);
  return {year:get('year'),month:get('month'),day:get('day'),hour:get('hour'),minute:get('minute')};
}
export function challengePickerDate(value: string, timeZone: string): Date | null {
  const instant = new Date(value);
  if (!Number.isFinite(instant.getTime())) return null;
  try { const p=parts(instant,timeZone); return new Date(p.year,p.month-1,p.day,p.hour,p.minute); } catch { return null; }
}
export function challengePickerInstant(value: Date, timeZone: string): string | null {
  try {
    const target=Date.UTC(value.getFullYear(),value.getMonth(),value.getDate(),value.getHours(),value.getMinutes());
    let guess=target;
    for(let i=0;i<4;i++) {const p=parts(new Date(guess),timeZone);const represented=Date.UTC(p.year,p.month-1,p.day,p.hour,p.minute);const delta=target-represented;if(!delta)break;guess+=delta;}
    const p=parts(new Date(guess),timeZone);
    if(Date.UTC(p.year,p.month-1,p.day,p.hour,p.minute)!==target)return null;
    return new Date(guess).toISOString();
  } catch { return null; }
}
