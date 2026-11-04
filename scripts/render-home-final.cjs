// Render the supplied vector landscape with its authored SVG filters intact.
// Usage: node scripts/render-home-final.cjs [output directory]
// Capture each generated page at 1170 × 2532 using Chromium, which supports all source filters.
const fs = require('fs');
const path = require('path');

const { homeGameGeometry } = require('../lib/homeGameGeometry.cjs');
const dir = path.join(__dirname, '../assets/home-final');
const template = fs.readFileSync(path.join(dir, 'panorama.svg'), 'utf8');
const fireX=680;
const geometry={...homeGameGeometry(),fireX,fireGlowR:100,fireT:`translate(${fireX} 722) scale(1.34)`,smokeX:fireX,
 fireStones:[-24,-12,12,24].map((d,i)=>`M${fireX+d-6} ${729+(i===1||i===2?4:0)} a6 4 0 1 0 12 0 a6 4 0 1 0 -12 0 Z`).join(' '),
 fireLogs:`M${fireX-20} 728 L${fireX+20} 716 M${fireX-20} 716 L${fireX+20} 728`,benches:'M612 730 L650 730 M712 730 L750 730'};
for(let zone=0;zone<4;zone++) {
 const scope={...geometry,...Object.fromEntries([['Far',.34],['Mid',.24],['Near',.14],['Hill',.07]].map(([name,rate])=>['px'+name,`translate(${(zone*390*rate).toFixed(1)} 0)`]))};
 let svg=template.replace(/\{\{([^}]+)\}\}/g,(_,key)=>scope[key]??'')
  .replace(/\sref="[^"]*"/g,'')
  .replace(/<path\b[^>]*class="ex-flick"[^>]*>\s*<\/path>/g,'')
  .replace('viewBox="0 0 1560 844"',`viewBox="${zone*390} 0 390 844"`)
  .replace('width="1560" height="844"','width="390" height="844"')
  .replace('<svg ','<svg xmlns="http://www.w3.org/2000/svg" ');
 if(/\{\{/.test(svg))throw new Error('Unresolved landscape expression');
 const output=process.argv[2] || '/private/tmp/sage-home-reference';
 fs.mkdirSync(output,{recursive:true});
 fs.writeFileSync(path.join(output,`${['summits','campfire','climbs','next'][zone]}-art.html`),`<!doctype html><style>html,body{margin:0;width:1170px;height:2532px;overflow:hidden}svg{width:1170px;height:2532px}*{animation:none!important}</style>${svg}`);
}
