// react-native-health 1.13.6 omits HKWorkout.duration from its getSamples result.
// Include active duration (paused time excluded) and retain this patch after installs.
const fs=require('node:fs'),path=require('node:path');
const file=path.join(__dirname,'../node_modules/react-native-health/RCTAppleHealthKit/RCTAppleHealthKit+Queries.m');
if(!fs.existsSync(file))process.exit(0);
let text=fs.readFileSync(file,'utf8');
const marker=/(@"activityId"\s*:\s*\[NSNumber numberWithInt:\[sample workoutActivityType\]\],)(?!\s*@"duration")/g;
text=text.replace(marker,'$1\n                                                   @"duration" : @([sample duration]),');
if((text.match(/@"duration" : @\(\[sample duration\]\)/g)||[]).length!==2)throw new Error('HealthKit source changed; review the duration patch.');
fs.writeFileSync(file,text);
