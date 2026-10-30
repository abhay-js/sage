const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
const box={exports:{}};vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/appNavigation.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,box);
const {appTabs,adminTabs,hiddenAppScreens,parentAppTab,parentAdminTab}=box.exports;
// Every file must be deliberately visible or hidden, preventing extra generated tabs.
const routes=fs.readdirSync('app/(app)').filter(n=>n.endsWith('.tsx')&&n!=='_layout.tsx').map(n=>n.slice(0,-4));
const registered=[...appTabs.map(t=>t.name),...hiddenAppScreens];assert.equal(new Set(registered).size,registered.length);assert.deepEqual([...registered].sort(),routes.sort());
assert.equal(appTabs.length,5);assert.equal(appTabs[2].name,'record-activity');assert.equal(appTabs[3].name,'challenges');assert.equal(parentAppTab('challenge-detail'),'challenges');assert.equal(parentAppTab('profile'),'log');
for(const name of registered)assert(appTabs.some(t=>t.name===parentAppTab(name)),`${name} must select its owning tab`);
for(const name of fs.readdirSync('app/(admin)').filter(n=>n.endsWith('.tsx')&&n!=='_layout.tsx').map(n=>n.slice(0,-4)))assert(adminTabs.some(t=>t.name===parentAdminTab(name)),`${name} must select its admin tab`);
function luminance(hex){const rgb=hex.slice(1).match(/../g).map(v=>parseInt(v,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722;}
function contrast(a,b){const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);}
const c=require('../lib/theme.cjs');
for(const palette of [c,c.adventure])for(const [fg,bg] of [['text','bg'],['muted','bg'],['text','surface'],['muted','surface'],['onAccent','primary'],['onAccent','green'],['green','pale'],['danger','peach'],['warning','warningBg'],['info','infoBg'],['purple','purpleBg']])assert(contrast(palette[fg],palette[bg])>=4.5,`${fg}/${bg} needs legible body text`);
for(const key of ['bg','surface','border','text','muted','primary','green','onAccent'])assert.equal(c[key],c.adventure[key]);
const config=require('../app.json').expo;assert.equal(config.userInterfaceStyle,'light');assert.equal(config.web.backgroundColor,c.bg);assert.equal(config.androidNavigationBar.backgroundColor,c.bg);
console.log('PASS: all athlete/admin routes have an intentional tab, five primary destinations, shared theme and legible text/button/status contrast.');
