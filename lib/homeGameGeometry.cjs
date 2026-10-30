// Static panorama paths from the Home D7 reference.
exports.homeGameGeometry=function(){
    let stars = ''; for (let i = 0; i < 30; i++) { const x = (i * 53) % 1560, y = 20 + (i * 37) % 120; stars += 'M' + x + ' ' + y + ' a1.1 1.1 0 1 0 2.2 0 a1.1 1.1 0 1 0 -2.2 0 Z '; }
    let clouds = ''; [[60, 210], [440, 250], [700, 200], [1040, 230], [1380, 190]].forEach(c => { const [x, y] = c; clouds += 'M' + (x - 18) + ' ' + y + ' a18 18 0 1 0 36 0 a18 18 0 1 0 -36 0 Z M' + (x + 2) + ' ' + (y - 10) + ' a24 24 0 1 0 48 0 a24 24 0 1 0 -48 0 Z M' + (x + 34) + ' ' + (y + 2) + ' a16 16 0 1 0 32 0 a16 16 0 1 0 -32 0 Z M' + (x - 20) + ' ' + y + ' v16 h92 v-16 Z '; });
    const ridge = (base, amp, step, seed) => { let d = 'M0 ' + (base + 60); for (let x = 0; x <= 1560; x += step) { const h = amp * (0.5 + 0.5 * Math.sin(x * 0.013 + seed) * Math.cos(x * 0.007 + seed * 2)); d += ' L' + x + ' ' + Math.round(base - h); } return d + ' L1560 ' + (base + 200) + ' L0 ' + (base + 200) + ' Z'; };
    const rangeFar = ridge(450, 80, 44, 1.2), rangeMid = ridge(540, 60, 52, 2.4), rangeNear = ridge(610, 40, 60, 3.1);
    let snow = ''; for (let x = 0; x <= 1560; x += 44) { const h = 80 * (0.5 + 0.5 * Math.sin(x * 0.013 + 1.2) * Math.cos(x * 0.007 + 2.4)); if (h > 62) { const y = Math.round(450 - h); snow += 'M' + x + ' ' + y + ' l9 12 l-5 -1 l-4 7 l-4 -7 l-5 1 Z '; } }
    let forest = ''; for (let i = 0; i < 80; i++) { const x = i * 20 - 4, h = 22 + (i % 3) * 8, b = 650 - (i % 2) * 4; if (x > 970 && x < 1180) continue; forest += 'M' + x + ' ' + b + ' L' + (x + 9) + ' ' + (b - h) + ' L' + (x + 18) + ' ' + b + ' Z '; }
    // wall flags (local coords inside translate(790 0))
    const F = { clash: [282, 254], run: [270, 346], duel: [254, 460] };
    const flag = (x, y) => 'M' + (x + 1) + ' ' + (y - 34) + ' L' + (x + 20) + ' ' + (y - 29) + ' L' + (x + 1) + ' ' + (y - 23) + ' Z';
    const ledge = (x, y) => 'M' + (x - 14) + ' ' + y + ' L' + (x + 22) + ' ' + y + ' L' + (x + 18) + ' ' + (y + 6) + ' L' + (x - 10) + ' ' + (y + 6) + ' Z';
    const lsh = (x, y) => 'M' + (x - 10) + ' ' + (y + 6) + ' L' + (x + 18) + ' ' + (y + 6) + ' L' + (x + 12) + ' ' + (y + 12) + ' L' + (x - 6) + ' ' + (y + 12) + ' Z';
    const keys = Object.keys(F);
    const ledges = keys.map(k => ledge(F[k][0], F[k][1])).join(' ');
    const ledgeShadow = keys.map(k => lsh(F[k][0], F[k][1])).join(' ');
    const moss = keys.map(k => 'M' + (F[k][0] - 10) + ' ' + F[k][1] + ' a5 2.4 0 1 0 10 0 a5 2.4 0 1 0 -10 0 Z').join(' ');
    const poles = keys.map(k => 'M' + (F[k][0] + 1) + ' ' + F[k][1] + ' L' + (F[k][0] + 1) + ' ' + (F[k][1] - 36)).join(' ');
    const ropes = 'M206 650 C226 610 240 540 254 460 C262 410 266 380 270 346 C274 310 278 280 282 254';
    // campfire: full fire today (2 of 2)
    const fireX = 390 + 222;
    const fireStones = [-24, -12, 12, 24].map((d, i) => 'M' + (fireX + d - 6) + ' ' + (729 + (i === 1 || i === 2 ? 4 : 0)) + ' a6 4 0 1 0 12 0 a6 4 0 1 0 -12 0 Z').join(' ');
    const fireLogs = 'M' + (fireX - 20) + ' 728 L' + (fireX + 20) + ' 716 M' + (fireX - 20) + ' 716 L' + (fireX + 20) + ' 728';
    const benches = 'M410 704 L470 704 M516 708 L576 708 M662 704 L722 704 M728 704 L766 704';

return {stars,clouds,rangeFar,rangeMid,rangeNear,snow,forest,ledgeShadow,ledges,moss,ropes,poles,flagClash:flag(F.clash[0],F.clash[1]),flagRun:flag(F.run[0],F.run[1]),flagDuel:flag(F.duel[0],F.duel[1]),fireX,fireStones,fireLogs,benches,fireGlowR:104,fireT:'translate('+fireX+' 722) scale(1.2)',smokeX:fireX};
};
