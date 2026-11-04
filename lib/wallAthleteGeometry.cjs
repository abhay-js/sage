// Vector construction from the supplied W7.4 AvatarPro / AvatarSide designs.
exports.avatarPro = function(props) {
    const p = props || {};
    const g = (k, d) => (p[k] == null || p[k] === '' ? d : String(p[k]));
    const build = g('build', 'athletic'), face = g('face', 'angular'), eyes = g('eyes', 'focused');
    const hair = g('hair', 'spiky'), facialK = g('facial', 'none'), sport = g('sport', 'run');
    const kitK = g('kit', 'sage'), shoeK = g('shoe', 'white'), extra = g('extra', 'none');
    const size = Number(g('size', 160)) || 160;
    const dk = (h, f) => { const n = parseInt(h.slice(1), 16); return '#' + [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(v => Math.round(v * f).toString(16).padStart(2, '0')).join(''); };
    const skins = { s1: '#F1C9A5', s2: '#E0AC82', s3: '#C68A60', s4: '#A86B45', s5: '#84502F', s6: '#5E3720' };
    const skin = skins[g('skin', 's3')] || skins.s3;
    const shade = dk(skin, 0.84), deep = dk(skin, 0.6);
    const hairs = { black: '#15181D', brown: '#4A2C1E', auburn: '#7A3B20', blonde: '#C9A050', grey: '#8E949B', green: '#2F6B57' };
    const hairCol = hairs[g('hairColor', 'black')] || hairs.black;
    const kits = { ink: '#0F1B24', sage: '#2F6B57', gold: '#E3B23C', sky: '#3E7CB1', red: '#B8433A', white: '#EEF2F5' };
    const kitCol = kits[kitK] || kits.sage;
    const accent = (kitK === 'gold' || kitK === 'white') ? '#0F1B24' : '#FFC94D';
    const shoes = { white: '#F4F6F8', ink: '#1A2630', gold: '#E3B23C', sage: '#3F8A70', red: '#C8473C' };
    const shoeCol = shoes[shoeK] || shoes.white;

    const B = { lean: { sw: 70, ww: 44, hw: 52, arm: 12, leg: 17, neck: 16 }, athletic: { sw: 84, ww: 52, hw: 58, arm: 15, leg: 20, neck: 19 }, strong: { sw: 102, ww: 62, hw: 64, arm: 20, leg: 24, neck: 24 }, solid: { sw: 96, ww: 74, hw: 78, arm: 19, leg: 26, neck: 23 } }[build] || { sw: 84, ww: 52, hw: 58, arm: 15, leg: 20, neck: 19 };
    const { sw, ww, hw, arm, leg, neck: nk } = B;
    const L = 100 - sw / 2, R = 100 + sw / 2;
    const lower = 'L' + (100 + ww / 2) + ' 212 L' + (100 + hw / 2) + ' 238 L' + (100 - hw / 2) + ' 238 L' + (100 - ww / 2) + ' 212 Z';
    const torso = 'M' + L + ' 142 Q' + L + ' 131 ' + (L + 14) + ' 130 L' + (R - 14) + ' 130 Q' + R + ' 131 ' + R + ' 142 ' + lower;
    const tank = 'M' + (L + 10) + ' 131 L87 131 Q100 150 113 131 L' + (R - 10) + ' 131 L' + (R - 3) + ' 158 ' + lower.replace(' Z', '') + ' L' + (L + 3) + ' 158 Z';
    const tee = 'M' + L + ' 142 Q' + L + ' 131 ' + (L + 14) + ' 130 L88 130 Q100 142 112 130 L' + (R - 14) + ' 130 Q' + R + ' 131 ' + R + ' 142 ' + lower;
    const isTee = sport === 'ride' || sport === 'lift';
    const top = isTee ? tee : tank;
    const topShade = 'M' + (100 + ww / 2 - 14) + ' 150 L' + (R - 3) + ' 150 L' + (100 + ww / 2) + ' 212 L' + (100 + hw / 2) + ' 238 L' + (100 + hw / 2 - 12) + ' 238 Z';

    const pose = g('pose', 'stand');
    const sy = 142, sxL = L + arm / 2, sxR = R - arm / 2;
    const xl = 100 - hw / 4 - 2, xr = 100 + hw / 4 + 2;
    // arms: elbow + hand per side, legs: knee + ankle per side
    let eL = [L - 18, 186], hL = [100 - ww / 2 - 3, 214], eR = [R + 18, 186], hR = [100 + ww / 2 + 3, 214];
    let kL = [xl - 6, 300], aL = [xl - 8, 358], kR = [xr + 6, 300], aR = [xr + 8, 358];
    if (pose === 'step') {
      eL = [L - 12, 188]; hL = [L - 6, 230];
      eR = [R + 22, 106]; hR = [R + 30, 60];
      kR = [xr + 16, 262]; aR = [xr + 12, 318];
    }
    if (pose === 'reach') {
      eL = [L - 24, 108]; hL = [L - 36, 64];
      eR = [R + 24, 108]; hR = [R + 36, 64];
      kL = [xl - 10, 296]; aL = [xl - 14, 356];
      kR = [xr + 10, 296]; aR = [xr + 14, 356];
    }
    const armL = 'M' + sxL + ' ' + sy + ' L' + eL[0] + ' ' + eL[1] + ' L' + hL[0] + ' ' + hL[1];
    const armR = 'M' + sxR + ' ' + sy + ' L' + eR[0] + ' ' + eR[1] + ' L' + hR[0] + ' ' + hR[1];
    const mid = (a, b, t) => a + (b - a) * t;
    const sleeves = isTee ? ('M' + sxL + ' ' + sy + ' L' + mid(sxL, eL[0], 0.5) + ' ' + mid(sy, eL[1], 0.5) + ' M' + sxR + ' ' + sy + ' L' + mid(sxR, eR[0], 0.5) + ' ' + mid(sy, eR[1], 0.5)) : '';
    const hr = arm * 0.62;
    const circ = (x, y, r) => 'M' + (x - r) + ' ' + y + ' a' + r + ' ' + r + ' 0 1 0 ' + (2 * r) + ' 0 a' + r + ' ' + r + ' 0 1 0 ' + (-2 * r) + ' 0 Z';
    const hands = circ(hL[0], hL[1], hr) + ' ' + circ(hR[0], hR[1], hr * (pose === 'step' ? 1.12 : 1));
    const seg = (e, h) => 'M' + mid(e[0], h[0], 0.62) + ' ' + mid(e[1], h[1], 0.62) + ' L' + mid(e[0], h[0], 0.78) + ' ' + mid(e[1], h[1], 0.78);
    const wrist = seg(eL, hL) + ' ' + seg(eR, hR);

    const axL = aL[0], axR = aR[0];
    const legL = 'M' + xl + ' 232 L' + kL[0] + ' ' + kL[1] + ' L' + aL[0] + ' ' + aL[1];
    const legR = 'M' + xr + ' 232 L' + kR[0] + ' ' + kR[1] + ' L' + aR[0] + ' ' + aR[1];
    const o = leg * 0.28;
    const legShade = 'M' + (mid(xr, kR[0], 0.45) + o) + ' ' + mid(232, kR[1], 0.45) + ' L' + (kR[0] + o) + ' ' + kR[1] + ' L' + (aR[0] + o) + ' ' + (aR[1] - 8);
    const sockOn = sport === 'run' || sport === 'hyrox' || sport === 'lift';
    const socks = sockOn ? ('M' + mid(kL[0], aL[0], 0.72) + ' ' + mid(kL[1], aL[1], 0.72) + ' L' + aL[0] + ' ' + (aL[1] - 2) + ' M' + mid(kR[0], aR[0], 0.72) + ' ' + mid(kR[1], aR[1], 0.72) + ' L' + aR[0] + ' ' + (aR[1] - 2)) : '';
    const shoe = (ax, d, dy) => 'M' + (ax + d * 12) + ' ' + (380 + dy) + ' L' + (ax - d * 26) + ' ' + (380 + dy) + ' Q' + (ax - d * 31) + ' ' + (380 + dy) + ' ' + (ax - d * 29) + ' ' + (371 + dy) + ' Q' + (ax - d * 24) + ' ' + (359 + dy) + ' ' + (ax - d * 8) + ' ' + (355 + dy) + ' L' + (ax + d * 8) + ' ' + (353 + dy) + ' Q' + (ax + d * 13) + ' ' + (362 + dy) + ' ' + (ax + d * 12) + ' ' + (380 + dy) + ' Z';
    const sole = (ax, d, dy) => 'M' + (ax + d * 13) + ' ' + (375 + dy) + ' L' + (ax - d * 30) + ' ' + (375 + dy) + ' Q' + (ax - d * 31) + ' ' + (383 + dy) + ' ' + (ax - d * 24) + ' ' + (384 + dy) + ' L' + (ax + d * 13) + ' ' + (384 + dy) + ' Z';
    const stripe = (ax, d, dy) => 'M' + (ax - d * 21) + ' ' + (370 + dy) + ' L' + (ax + d * 3) + ' ' + (361 + dy);
    const dyL = aL[1] - 358, dyR = aR[1] - 358;

    const lens = { run: 264, ride: 300, lift: 278, tri: 262, hyrox: 272 };
    const len = lens[sport] || 268;
    const shorts = 'M' + (100 - hw / 2) + ' 228 L' + (100 + hw / 2) + ' 228 L' + (100 + hw / 2 + 5) + ' ' + len + ' L102 ' + len + ' L100 250 L98 ' + len + ' L' + (100 - hw / 2 - 5) + ' ' + len + ' Z';
    const shortsCol = sport === 'tri' ? kitCol : (sport === 'ride' ? '#121A22' : (kitK === 'ink' ? '#2F6B57' : '#121A22'));

    let trim = '';
    if (sport === 'lift' || sport === 'hyrox') trim = 'M' + (100 - ww / 2 + 3) + ' 198 L100 184 L' + (100 + ww / 2 - 3) + ' 198';
    if (sport === 'ride') trim = 'M100 140 L100 206';
    if (sport === 'tri') trim = 'M' + (100 - ww / 2 + 2) + ' 160 L' + (100 - ww / 2 + 1) + ' 232 M' + (100 + ww / 2 - 2) + ' 160 L' + (100 + ww / 2 - 1) + ' 232';
    const bib = sport === 'run' ? 'M85 164 L115 164 Q117 164 117 166 L117 184 Q117 186 115 186 L85 186 Q83 186 83 184 L83 166 Q83 164 85 164 Z' : '';

    const heads = {
      angular: 'M63 64 C63 40 80 28 100 28 C120 28 137 40 137 64 C137 84 132 98 122 108 L106 118 Q100 121 94 118 L78 108 C68 98 63 84 63 64 Z',
      round: 'M62 68 C62 42 80 28 100 28 C120 28 138 42 138 68 C138 96 122 116 100 116 C78 116 62 96 62 68 Z',
      long: 'M65 64 C65 38 80 26 100 26 C120 26 135 38 135 64 C135 92 128 110 116 118 Q108 124 100 124 Q92 124 84 118 C72 110 65 92 65 64 Z'
    };
    const head = heads[face] || heads.angular;
    const neckP = 'M' + (100 - nk / 2) + ' 106 L' + (100 - nk / 2) + ' 134 Q100 142 ' + (100 + nk / 2) + ' 134 L' + (100 + nk / 2) + ' 106 Z';
    const neckShade = 'M' + (100 - nk / 2) + ' 110 Q100 126 ' + (100 + nk / 2) + ' 110 L' + (100 + nk / 2) + ' 120 Q100 134 ' + (100 - nk / 2) + ' 120 Z';

    const ry = { big: 11, focused: 9, sharp: 7 }[eyes] || 9;
    const cy = 76, ex = [86, 114];
    const ell = (x, y, rx, r2) => 'M' + (x - rx) + ' ' + y + ' a' + rx + ' ' + r2 + ' 0 1 0 ' + (2 * rx) + ' 0 a' + rx + ' ' + r2 + ' 0 1 0 ' + (-2 * rx) + ' 0 Z';
    const whites = ex.map(x => ell(x, cy, 8.5, ry)).join(' ');
    const ir = Math.min(6.6, ry - 1.4);
    const iris = ex.map(x => ell(x + 1, cy + 1, 5, ir)).join(' ');
    const pupil = ex.map(x => ell(x + 1, cy + 1.5, 2.3, Math.min(3, ir - 1))).join(' ');
    const shine = ex.map(x => ell(x + 3, cy - 2, 1.6, 1.6)).join(' ');
    const kk = { big: 0.78, focused: 0.5, sharp: 0.3 }[eyes] || 0.5;
    const tl = { big: 0, focused: 1.6, sharp: 2.6 }[eyes] || 1.6;
    const lidEdge = (x, inner) => { const base = cy - ry * kk; const yIn = base + tl, yOut = base - tl * 0.5; const yL = inner > 0 ? yOut : yIn, yR = inner > 0 ? yIn : yOut; return { yL, yR, c: base - ry * 0.28 }; };
    const lidA = lidEdge(ex[0], 1), lidB = lidEdge(ex[1], -1);
    const lidFill = 'M' + (ex[0] - 10) + ' ' + (cy - ry - 2) + ' L' + (ex[0] + 10) + ' ' + (cy - ry - 2) + ' L' + (ex[0] + 10) + ' ' + lidA.yR + ' Q' + ex[0] + ' ' + lidA.c + ' ' + (ex[0] - 10) + ' ' + lidA.yL + ' Z M' + (ex[1] - 10) + ' ' + (cy - ry - 2) + ' L' + (ex[1] + 10) + ' ' + (cy - ry - 2) + ' L' + (ex[1] + 10) + ' ' + lidB.yR + ' Q' + ex[1] + ' ' + lidB.c + ' ' + (ex[1] - 10) + ' ' + lidB.yL + ' Z';
    const lids = 'M' + (ex[0] - 10.5) + ' ' + (lidA.yL + 0.5) + ' Q' + ex[0] + ' ' + lidA.c + ' ' + (ex[0] + 9.5) + ' ' + lidA.yR + ' M' + (ex[1] - 9.5) + ' ' + lidB.yL + ' Q' + ex[1] + ' ' + lidB.c + ' ' + (ex[1] + 10.5) + ' ' + (lidB.yR + 0.5);
    const by = cy - ry - 7;
    const tilt = eyes === 'big' ? 1 : 2.6;
    const brows = 'M' + (ex[0] - 10) + ' ' + (by - tilt) + ' L' + (ex[0] + 9) + ' ' + (by + tilt) + ' M' + (ex[1] - 9) + ' ' + (by + tilt) + ' L' + (ex[1] + 10) + ' ' + (by - tilt);

    const front = {
      spiky: 'M60 70 C56 40 70 22 92 20 L86 6 L106 15 L113 0 L122 17 L141 10 L135 29 L150 33 L139 47 C141 55 141 63 139 70 C133 52 119 44 100 44 C84 44 70 52 62 70 Z',
      crop: 'M62 64 C60 36 78 22 100 22 C124 22 141 36 138 64 C134 50 122 40 104 40 L98 46 L94 40 C80 42 66 50 62 64 Z',
      curly: 'M59 68 C50 58 55 40 66 40 C62 27 78 17 89 24 C93 13 109 13 113 23 C124 16 140 26 135 39 C147 42 150 58 141 68 C136 54 122 44 100 44 C79 44 65 54 59 68 Z',
      buzz: 'M64 60 C64 36 80 27 100 27 C120 27 136 36 136 60 C130 48 118 42 100 42 C82 42 70 48 64 60 Z',
      bun: 'M62 64 C60 36 78 24 100 24 C122 24 140 36 138 64 C132 50 120 42 100 42 C80 42 68 50 62 64 Z',
      ponytail: 'M62 70 C58 40 78 24 102 24 C124 24 142 40 138 70 C134 56 126 48 116 44 C108 52 92 56 74 56 C68 60 64 64 62 70 Z',
      long: 'M62 72 C58 40 78 24 102 24 C124 24 142 40 138 72 C134 56 126 48 116 44 C108 52 92 56 74 56 C68 60 64 64 62 72 Z'
    };
    const back = {
      ponytail: 'M110 30 C140 18 166 40 158 76 C154 98 140 110 146 130 C126 118 128 94 132 74 C134 58 126 44 112 40 Z',
      long: 'M58 70 C54 34 80 22 100 22 C122 22 146 34 142 70 L148 142 C130 148 118 140 116 118 L84 118 C82 140 70 148 52 142 Z'
    };
    const hi = { spiky: 'M90 30 L104 22 M116 27 L130 22', crop: 'M84 30 Q100 25 118 30', curly: 'M80 30 Q90 26 98 28', buzz: '', bun: 'M84 32 Q100 27 116 32', ponytail: 'M86 32 Q100 27 116 32', long: 'M86 32 Q100 27 116 32' };
    const cap = extra === 'cap';
    const facialP = { stubble: 'M68 90 C72 104 86 115 100 116 C114 115 128 104 132 90 C128 100 120 106 112 107 Q100 101 88 107 C80 106 72 100 68 90 Z', beard: 'M64 82 C64 106 82 124 100 126 C118 124 136 106 136 82 C132 96 125 104 116 104 Q100 97 84 104 C75 104 68 96 64 82 Z', moustache: 'M88 99.5 Q100 93 112 99.5 Q107 103.5 100 101.5 Q93 103.5 88 99.5 Z' };
    const clipId = 'ap-clip-' + face;
    const dd = g('look', 'clean') === 'doodle';
    const fx = { filter: dd ? 'url(#ap-rough)' : 'none', ink: dd ? '#2A2018' : 'none', w: dd ? 5 : 0, legW: dd ? leg + 5 : 0, armW: dd ? arm + 5 : 0, sleeveW: dd ? arm + 11 : 0, shadeOp: dd ? '0' : '.12', faceShadeOp: dd ? '.55' : '1' };
    const lightKit = kitK === 'white' || kitK === 'gold';
    return {
      w: size, h: size * 2, label: 'Athlete avatar', fx,
      clipId, clipUrl: 'url(#' + clipId + ')',
      skin, shade, deep, hairCol, kitCol, accent, shoeCol,
      soleCol: shoeK === 'white' ? '#C9D2D9' : '#F4F6F8', shoeStripeCol: shoeK === 'white' ? '#2F6B57' : '#F4F6F8',
      hairBack: back[hair] || '', bun: hair === 'bun' ? 'M86 22 a14 13 0 1 0 28 0 a14 13 0 1 0 -28 0 Z' : '',
      legL, legR, legW: leg, legShade, legShadeW: Math.max(3, leg * 0.3), socks, sockW: leg + 1,
      shoeL: shoe(axL, 1, dyL), shoeR: shoe(axR, -1, dyR), soles: sole(axL, 1, dyL) + ' ' + sole(axR, -1, dyR), shoeStripe: stripe(axL, 1, dyL) + ' ' + stripe(axR, -1, dyR),
      shorts, shortsCol, neck: neckP, neckShade, torso, top, topShade: lightKit ? '' : topShade, trim, bib, bibY: 180, bibShow: bib ? 'inline' : 'none',
      armL, armR, armW: arm, sleeves, sleeveW: arm + 6, sleeveCaps: isTee ? circ(sxL, sy, (arm + 6) / 2) + ' ' + circ(sxR, sy, (arm + 6) / 2) : '',
      lidFill, hands, wrist, wristW: arm + 3, wristShow: extra === 'wristband' ? 'inline' : 'none',
      head, whites, iris, pupil, shine, lids, brows, browCol: hair === 'blonde' ? '#7A5A2A' : (g('hairColor', 'black') === 'grey' ? '#55595E' : hairCol),
      eyesShow: extra === 'shades' ? 'none' : 'inline',
      facial: facialP[facialK] || '', facialOp: facialK === 'stubble' ? 0.32 : 1,
      mouthCol: facialK === 'beard' ? '#E9D6C8' : deep,
      hairFront: cap ? '' : (front[hair] || front.spiky), hairHi: cap ? '' : (hi[hair] || ''),
      bandShow: extra === 'headband' && !cap ? 'inline' : 'none', accentBand: kitK === 'white' ? '#2F6B57' : '#F4F6F8',
      capShow: cap ? 'inline' : 'none', capBrim: dk(kitCol, 0.7),
      shadesShow: extra === 'shades' ? 'inline' : 'none', budsShow: extra === 'earbuds' ? 'inline' : 'none'
    };
};
exports.avatarSide = function(props) {
    const p = props || {};
    const g = (k, d) => (p[k] == null || p[k] === '' ? d : String(p[k]));
    const build = g('build', 'athletic'), hair = g('hair', 'spiky'), facialK = g('facial', 'none'), sport = g('sport', 'run');
    const kitK = g('kit', 'sage'), shoeK = g('shoe', 'white'), extra = g('extra', 'none');
    const size = Number(g('size', 160)) || 160;
    const dk = (h, f) => { const n = parseInt(h.slice(1), 16); return '#' + [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(v => Math.round(v * f).toString(16).padStart(2, '0')).join(''); };
    const skins = { s1: '#F1C9A5', s2: '#E0AC82', s3: '#C68A60', s4: '#A86B45', s5: '#84502F', s6: '#5E3720' };
    const skin = skins[g('skin', 's3')] || skins.s3;
    const shade = dk(skin, 0.8), deep = dk(skin, 0.6);
    const hairs = { black: '#15181D', brown: '#4A2C1E', auburn: '#7A3B20', blonde: '#C9A050', grey: '#8E949B', green: '#2F6B57' };
    const hairCol = hairs[g('hairColor', 'black')] || hairs.black;
    const kits = { ink: '#0F1B24', sage: '#2F6B57', gold: '#E3B23C', sky: '#3E7CB1', red: '#B8433A', white: '#EEF2F5' };
    const kitCol = kits[kitK] || kits.sage;
    const accent = (kitK === 'gold' || kitK === 'white') ? '#0F1B24' : '#FFC94D';
    const shoes = { white: '#F4F6F8', ink: '#1A2630', gold: '#E3B23C', sage: '#3F8A70', red: '#C8473C' };
    const shoeCol = shoes[shoeK] || shoes.white;
    const B = { lean: { d: 34, arm: 12, leg: 17 }, athletic: { d: 40, arm: 15, leg: 20 }, strong: { d: 48, arm: 19, leg: 24 }, solid: { d: 52, arm: 19, leg: 26 } }[build] || { d: 40, arm: 15, leg: 20 };
    const { d, arm, leg } = B;

    // torso leans forward: shoulders ahead of hips
    const sx = 104, sy = 140, hx = 92, hy = 232;
    const torso = 'M' + (sx - d / 2) + ' ' + (sy + 4) + ' Q' + (sx - d / 2) + ' ' + (sy - 8) + ' ' + sx + ' ' + (sy - 8) + ' Q' + (sx + d / 2 + 2) + ' ' + (sy - 6) + ' ' + (sx + d / 2) + ' ' + (sy + 14) + ' L' + (hx + d / 2 + 2) + ' ' + (hy - 6) + ' L' + (hx - d / 2 - 1) + ' ' + (hy - 6) + ' Z';
    const torsoShade = 'M' + (sx - d / 2) + ' ' + (sy + 4) + ' L' + (sx - d / 2 + 9) + ' ' + (sy + 2) + ' L' + (hx - d / 2 + 9) + ' ' + (hy - 6) + ' L' + (hx - d / 2 - 1) + ' ' + (hy - 6) + ' Z';
    const hips = 'M' + (hx - d / 2 - 2) + ' ' + (hy - 12) + ' L' + (hx + d / 2 + 3) + ' ' + (hy - 12) + ' L' + (hx + d / 2 + 1) + ' ' + (hy + 12) + ' L' + (hx - d / 2) + ' ' + (hy + 12) + ' Z';
    const isTee = sport === 'ride' || sport === 'lift';
    const bib = sport === 'run' ? 'M' + (sx + d / 2 - 14) + ' 166 L' + (sx + d / 2 - 1) + ' 168 L' + (sx + d / 2 - 3) + ' 190 L' + (sx + d / 2 - 16) + ' 188 Z' : '';
    let trim = '';
    if (sport === 'ride') trim = 'M' + (sx + d / 2 - 6) + ' 146 L' + (hx + d / 2 - 4) + ' 210';
    if (sport === 'tri' || sport === 'lift' || sport === 'hyrox') trim = 'M' + (sx - d / 2 + 4) + ' 196 L' + (sx + d / 2 - 2) + ' 192';

    const mid = (a, b, t) => a + (b - a) * t;
    const L = (pts) => 'M' + pts.map(q => q[0].toFixed(1) + ' ' + q[1].toFixed(1)).join(' L');
    const circ = (x, y, r) => 'M' + (x - r) + ' ' + y + ' a' + r + ' ' + r + ' 0 1 0 ' + (2 * r) + ' 0 a' + r + ' ' + r + ' 0 1 0 ' + (-2 * r) + ' 0 Z';
    const shoe = (ax, ay, tilt) => {
      const c = Math.cos(tilt), s = Math.sin(tilt);
      const P = (x, y) => [ax + x * c - y * s, ay + x * s + y * c];
      const pts = [P(-12, -8), P(6, -10), P(24, 0), P(30, 8), P(26, 14), P(-14, 14), P(-15, 2)];
      return 'M' + pts.map(q => q[0].toFixed(1) + ' ' + q[1].toFixed(1)).join(' L') + ' Z';
    };
    const sole = (ax, ay, tilt) => {
      const c = Math.cos(tilt), s = Math.sin(tilt);
      const P = (x, y) => [ax + x * c - y * s, ay + x * s + y * c];
      const pts = [P(-14, 9), P(29, 9), P(26, 15), P(-14, 15)];
      return 'M' + pts.map(q => q[0].toFixed(1) + ' ' + q[1].toFixed(1)).join(' L') + ' Z';
    };
    const sh = [sx - 2, sy + 6], hp = [hx, hy];
    const shortLen = sport === 'ride' ? 0.62 : (sport === 'lift' ? 0.5 : 0.4);
    const sockOn = sport === 'run' || sport === 'hyrox' || sport === 'lift';
    const frame = (nk, na, nt, fk, fa, ft, ne, nh, fe, fh) => ({
      nearLeg: L([hp, nk, na]), farLeg: L([[hp[0] - 2, hp[1]], fk, fa]),
      nearShort: L([hp, [mid(hp[0], nk[0], shortLen), mid(hp[1], nk[1], shortLen)]]),
      farShort: L([[hp[0] - 2, hp[1]], [mid(hp[0], fk[0], shortLen), mid(hp[1], fk[1], shortLen)]]),
      nearSock: sockOn ? L([[mid(nk[0], na[0], 0.74), mid(nk[1], na[1], 0.74)], [mid(nk[0], na[0], 0.96), mid(nk[1], na[1], 0.96)]]) : '',
      nearShoe: shoe(na[0], na[1], nt), nearSole: sole(na[0], na[1], nt), farShoe: shoe(fa[0], fa[1], ft),
      nearArm: L([sh, ne, nh]), farArm: L([[sh[0] - 6, sh[1]], fe, fh]),
      sleeve: isTee ? L([sh, [mid(sh[0], ne[0], 0.45), mid(sh[1], ne[1], 0.45)]]) : '',
      hand: circ(nh[0], nh[1], arm * 0.62)
    });
    // A: near leg driving forward, far leg pushing off behind; arms opposite
    const a = frame([132, 286], [124, 348], 0.18, [78, 300], [50, 352], 0.55, [80, 196], [62, 172], [128, 186], [146, 160]);
    // B: near leg pushing off behind, far leg driving forward
    const b = frame([84, 302], [58, 360], 0.5, [126, 288], [118, 346], 0.2, [128, 188], [146, 162], [80, 196], [62, 172]);
    const still = g('motion', 'run') === 'still';
    const delay = Number(g('delay', 0)) || 0;

    const head = 'M104 26 C82 26 68 42 68 66 C68 88 78 104 92 114 L102 120 Q112 124 120 117 L126 109 Q130 105 127 101 L131 97 Q128 93 132 90 L138 84 Q139 79 133 76 L133 62 C133 40 124 26 104 26 Z';
    const front = {
      spiky: 'M66 72 C58 44 72 24 96 20 L92 6 L108 14 L116 2 L124 18 L140 16 L134 30 C138 38 136 46 133 52 C124 44 112 42 100 46 C96 52 94 58 96 66 C88 60 80 60 76 66 C72 70 70 72 66 72 Z',
      crop: 'M68 70 C62 40 80 24 104 24 C124 24 136 36 134 54 C124 46 112 44 100 46 C94 52 94 60 96 66 C88 62 80 62 76 66 C72 70 70 72 68 70 Z',
      curly: 'M66 72 C56 64 58 48 66 44 C64 30 78 20 90 26 C96 16 112 16 118 24 C130 20 142 32 136 44 C138 50 136 54 132 56 C124 46 112 44 100 46 C94 52 94 60 96 66 C88 62 80 62 76 66 C72 70 70 72 66 72 Z',
      buzz: 'M70 64 C68 40 84 28 104 28 C122 28 133 38 133 52 C124 46 112 44 100 46 C96 50 94 56 94 62 C86 58 76 60 70 64 Z',
      bun: 'M68 70 C62 40 80 26 104 26 C124 26 136 38 134 54 C124 46 112 44 100 46 C94 52 94 60 96 66 C88 62 80 62 76 66 C72 70 70 72 68 70 Z',
      ponytail: 'M68 72 C62 40 80 26 104 26 C124 26 136 38 134 54 C124 46 112 44 100 46 C94 52 94 60 96 66 C88 62 80 62 76 66 C72 70 70 74 68 72 Z',
      long: 'M68 72 C62 40 80 26 104 26 C124 26 136 38 134 54 C124 46 112 44 100 46 C94 52 94 60 96 66 C88 62 80 62 76 66 C72 70 70 74 68 72 Z'
    };
    const back = {
      ponytail: 'M74 40 C52 34 36 56 40 82 C42 98 36 110 26 118 C50 120 60 100 64 84 C66 72 70 62 76 56 Z',
      long: 'M70 46 C60 70 62 100 66 128 C76 134 88 132 92 124 C84 106 82 84 86 62 Z',
      bun: 'M60 40 a14 13 0 1 0 28 0 a14 13 0 1 0 -28 0 Z'
    };
    const hi = { spiky: 'M98 26 L110 20', crop: 'M90 32 Q104 27 118 31', curly: 'M86 32 Q96 27 104 29', buzz: '', bun: 'M90 33 Q104 28 118 32', ponytail: 'M90 33 Q104 28 118 32', long: 'M90 33 Q104 28 118 32' };
    const facialP = { stubble: 'M96 112 C104 120 114 124 122 116 L127 108 Q118 112 112 108 C106 104 100 104 96 112 Z', beard: 'M88 96 C88 112 100 124 112 124 Q122 122 128 110 Q130 104 126 101 Q114 106 104 98 C98 94 92 92 88 96 Z', moustache: 'M118 98 Q124 96 130 98 Q126 102 118 101 Z' };
    const cap = extra === 'cap';
    const lightKit = kitK === 'white' || kitK === 'gold';
    return {
      w: size, h: size * 2, label: 'Athlete, side view, running', a, b, arm, leg,
      animA: still ? '1;1' : '1;0', animB: still ? '0;0' : '0;1', begin: (-delay).toFixed(2) + 's',
      skin, shade, deep, hairCol, kitCol, accent, shoeCol, shoeDk: dk(shoeCol, 0.72),
      soleCol: shoeK === 'white' ? '#C9D2D9' : '#F4F6F8',
      shortsCol: sport === 'tri' ? kitCol : (kitK === 'ink' ? '#2F6B57' : '#121A22'),
      shortsDk: sport === 'tri' ? dk(kitCol, 0.7) : (kitK === 'ink' ? '#22503F' : '#0A1016'),
      shortW: leg + 7, sockW: leg + 1, sleeveW: arm + 6,
      torso, torsoShade, hips, trim, bib, shadeOp: lightKit ? '0' : '.14',
      head, hairBack: back[hair] || '', hairFront: cap ? '' : (front[hair] || front.spiky), hairHi: cap ? '' : (hi[hair] || ''),
      facial: facialP[facialK] || '', facialOp: facialK === 'stubble' ? 0.32 : 1,
      mouthCol: facialK === 'beard' ? '#E9D6C8' : deep,
      browCol: g('hairColor', 'black') === 'grey' ? '#55595E' : hairCol,
      eyesShow: extra === 'shades' ? 'none' : 'inline',
      bandShow: extra === 'headband' && !cap ? 'inline' : 'none', accentBand: kitK === 'white' ? '#2F6B57' : '#F4F6F8',
      capShow: cap ? 'inline' : 'none', capBrim: dk(kitCol, 0.7),
      shadesShow: extra === 'shades' ? 'inline' : 'none', budsShow: extra === 'earbuds' ? 'inline' : 'none'
    };
};