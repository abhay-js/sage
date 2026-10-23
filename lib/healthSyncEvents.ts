const listeners=new Set<(userId:string)=>void>();
export function notifyHealthImport(userId:string){listeners.forEach(listener=>listener(userId));}
export function subscribeHealthImport(listener:(userId:string)=>void){listeners.add(listener);return()=>{listeners.delete(listener);};}
