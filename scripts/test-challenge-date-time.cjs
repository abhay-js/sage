const fs=require('node:fs'),assert=require('node:assert/strict'),vm=require('node:vm'),ts=require('typescript');
const box={exports:{},Date,Intl};vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/challengeDateTime.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,box);
const {challengePickerDate:display,challengePickerInstant:save}=box.exports;
const ist=display('2026-11-01T18:30:00Z','Asia/Kolkata');assert.equal(ist.getDate(),2);assert.equal(ist.getHours(),0);assert.equal(save(ist,'Asia/Kolkata'),'2026-11-01T18:30:00.000Z');
const ny=display('2026-07-01T14:15:00Z','America/New_York');assert.equal(ny.getHours(),10);assert.equal(save(ny,'America/New_York'),'2026-07-01T14:15:00.000Z');
assert.equal(save(new Date(2026,2,8,2,30),'America/New_York'),null);assert.equal(display('invalid','Asia/Kolkata'),null);assert.equal(save(new Date(),'invalid/timezone'),null);
console.log('PASS: timezone-aware picker round trips, daylight-saving gap and invalid values');
