// Pure SVG geometry ported from the supplied AvatarMe design.
const {art}=require('./avatarBuilderPalette.cjs');
exports.avatarGeometry = function(p={},idPrefix='athlete'){

    const g = (k, d) => (p[k] == null || p[k] === '' ? d : String(p[k]));
    const f1 = (n) => Math.round(n * 10) / 10;
    const dk = (h, f) => { const n = parseInt(h.slice(1), 16); return '#' + [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(v => Math.max(0, Math.min(255, Math.round(f > 1 ? v + (255 - v) * (f - 1) : v * f))).toString(16).padStart(2, '0')).join(''); };
    const mid = (a, b, t) => a + (b - a) * t;
    const ell = (x, y, rx, ry) => 'M' + f1(x - rx) + ' ' + f1(y) + ' a' + f1(rx) + ' ' + f1(ry) + ' 0 1 0 ' + f1(2 * rx) + ' 0 a' + f1(rx) + ' ' + f1(ry) + ' 0 1 0 ' + f1(-2 * rx) + ' 0 Z';
    const circ = (x, y, r) => ell(x, y, r, r);
    const P = (pts) => 'M' + pts.map(q => f1(q[0]) + ' ' + f1(q[1])).join(' L');
    const along = (pts, t0, t1) => {
      const seg = []; let tot = 0;
      for (let i = 1; i < pts.length; i++) { const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); seg.push(d); tot += d; }
      const at = (t) => { let d = t * tot; for (let i = 0; i < seg.length; i++) { if (d <= seg[i] || i === seg.length - 1) { const r = Math.min(1, d / seg[i]); return [mid(pts[i][0], pts[i + 1][0], r), mid(pts[i][1], pts[i + 1][1], r)]; } d -= seg[i]; } return pts[pts.length - 1]; };
      const out = [at(t0)]; let acc = 0;
      for (let i = 0; i < seg.length; i++) { acc += seg[i]; const tt = acc / tot; if (tt > t0 && tt < t1) out.push(pts[i + 1]); }
      out.push(at(t1));
      return P(out);
    };

    const SK = { t1: art.c54, t2: art.c52, t3: art.c45, t4: art.c40, t5: art.c38, t6: art.c33, t7: art.c30, t8: art.c26, t9: art.c20, t10: art.c15 };
    const HC = { black: art.c5, darkbrown: art.c9, brown: art.c16, chestnut: art.c21, auburn: art.c28, ginger: art.c36, blonde: art.c42, platinum: art.c50, grey: art.c31, white: art.c49, blue: art.c12, pink: art.c41, green: art.c10 };
    const KC = { ink: art.c2, charcoal: art.c11, white: art.c51, sage: art.c10, mint: art.c27, gold: art.c46, orange: art.c43, red: art.c37, pink: art.c44, purple: art.c22, sky: art.c17, navy: art.c7 };
    const IC = { brown: art.c19, dark: art.c8, hazel: art.c25, green: art.c14, blue: art.c13, grey: art.c24 };
    const light = (k) => k === 'white' || k === 'gold' || k === 'mint';

    const skin = SK[g('skin', 't5')] || SK.t5, shade = dk(skin, 0.84), deep = dk(skin, 0.6);
    const hairK = g('hairColor', 'black'), hairCol = HC[hairK] || HC.black;
    const topK = g('topColor', 'sage'), topCol = KC[topK] || KC.sage, topDark = dk(topCol, 0.72);
    const botK = g('bottomColor', 'ink');
    const accent = light(topK) ? art.c2 : (topK === 'ink' || topK === 'navy' || topK === 'charcoal' ? art.c55 : art.c56);
    const shoeK = g('shoeColor', 'white'), shoeCol = KC[shoeK] || KC.white;

    const B = { lean: { sw: 70, ww: 44, hw: 52, arm: 12, leg: 17, nk: 16 }, athletic: { sw: 84, ww: 52, hw: 58, arm: 15, leg: 20, nk: 19 }, strong: { sw: 102, ww: 62, hw: 64, arm: 20, leg: 24, nk: 24 }, solid: { sw: 96, ww: 74, hw: 78, arm: 19, leg: 26, nk: 23 }, curvy: { sw: 78, ww: 50, hw: 76, arm: 14, leg: 23, nk: 18 } }[g('build', 'athletic')] || { sw: 84, ww: 52, hw: 58, arm: 15, leg: 20, nk: 19 };
    const { sw, ww, hw, arm, leg, nk } = B;
    const dy = { short: 14, medium: 0, tall: -12 }[g('height', 'medium')] || 0;
    const L = 100 - sw / 2, R = 100 + sw / 2;

    // torso
    const halfAt = (y) => y <= 142 ? sw / 2 : (y <= 212 ? mid(sw / 2, ww / 2, (y - 142) / 70) : mid(ww / 2, hw / 2, (y - 212) / 26));
    const lower = 'L' + (100 + ww / 2) + ' 212 L' + (100 + hw / 2) + ' 238 L' + (100 - hw / 2) + ' 238 L' + (100 - ww / 2) + ' 212 Z';
    const torso = 'M' + L + ' 142 Q' + L + ' 131 ' + (L + 14) + ' 130 L' + (R - 14) + ' 130 Q' + R + ' 131 ' + R + ' 142 ' + lower;
    const tank = 'M' + (L + 10) + ' 131 L87 131 Q100 150 113 131 L' + (R - 10) + ' 131 L' + (R - 3) + ' 158 ' + lower.replace(' Z', '') + ' L' + (L + 3) + ' 158 Z';
    const tee = (w) => 'M' + (L - w) + ' 142 Q' + (L - w) + ' 130 ' + (L + 14) + ' 129 L88 129 Q100 141 112 129 L' + (R - 14) + ' 129 Q' + (R + w) + ' 130 ' + (R + w) + ' 142 ' + 'L' + (100 + ww / 2 + w) + ' 212 L' + (100 + hw / 2 + w) + ' 240 L' + (100 - hw / 2 - w) + ' 240 L' + (100 - ww / 2 - w) + ' 212 Z';
    const cropAt = (y) => 'M' + (L + 10) + ' 131 L87 131 Q100 150 113 131 L' + (R - 10) + ' 131 L' + (R - 3) + ' 158 L' + f1(100 + halfAt(y)) + ' ' + y + ' L' + f1(100 - halfAt(y)) + ' ' + y + ' L' + (L + 3) + ' 158 Z';
    const bra = 'M' + (L + 13) + ' 131 L' + (L + 20) + ' 131 Q100 168 ' + (R - 20) + ' 131 L' + (R - 13) + ' 131 L' + (R - 3) + ' 158 L' + f1(100 + halfAt(188)) + ' 188 L' + f1(100 - halfAt(188)) + ' 188 L' + (L + 3) + ' 158 Z';

    const topK2 = g('top', 'singlet');
    const topShapes = { singlet: tank, tee: tee(0), longsleeve: tee(0), jersey: tee(0), bra, crop: cropAt(204), hoodie: tee(3), compression: tee(0), trisuit: tank, teamjersey: tee(1) };
    const top = topShapes[topK2] || tank;
    const sleeveT = { tee: 0.32, longsleeve: 0.93, jersey: 0.34, hoodie: 0.95, compression: 0.95, teamjersey: 0.34 }[topK2] || 0;
    const sleeveExtra = { tee: 6, longsleeve: 4, jersey: 5, hoodie: 9, compression: 2, teamjersey: 7 }[topK2] || 0;
    const topBottom = topK2 === 'bra' ? 188 : (topK2 === 'crop' ? 204 : 238);
    const topShade = (topK2 === 'bra') ? '' : ('M' + f1(100 + ww / 2 - 14) + ' 150 L' + (R - 3) + ' 150 L' + f1(100 + halfAt(Math.min(topBottom, 212))) + ' ' + Math.min(topBottom, 212) + (topBottom > 212 ? ' L' + (100 + hw / 2) + ' 238 L' + (100 + hw / 2 - 12) + ' 238' : ' L' + f1(100 + halfAt(topBottom) - 12) + ' ' + topBottom) + ' Z');

    // pose
    const pose = g('pose', 'stand');
    const sy = 142, sxL = L + arm / 2, sxR = R - arm / 2;
    let eL = [L - 18, 186], hL = [100 - ww / 2 - 3, 214], eR = [R + 18, 186], hR = [100 + ww / 2 + 3, 214];
    const xl = 100 - hw / 4 - 2, xr = 100 + hw / 4 + 2;
    let kL = [xl - 6, 300], aL = [xl - 8, 358], kR = [xr + 6, 300], aR = [xr + 8, 358];
    let handR = 1;
    if (pose === 'step') { eL = [L - 12, 188]; hL = [L - 6, 230]; eR = [R + 22, 106]; hR = [R + 30, 60]; kR = [xr + 16, 262]; aR = [xr + 12, 318]; handR = 1.12; }
    if (pose === 'reach') { eL = [L - 24, 108]; hL = [L - 36, 64]; eR = [R + 24, 108]; hR = [R + 36, 64]; kL = [xl - 10, 296]; aL = [xl - 14, 356]; kR = [xr + 10, 296]; aR = [xr + 14, 356]; }
    if (pose === 'flex') { eL = [L - 30, 152]; hL = [L - 20, 110]; eR = [R + 30, 152]; hR = [R + 20, 110]; kL = [xl - 10, 298]; aL = [xl - 14, 356]; kR = [xr + 10, 298]; aR = [xr + 14, 356]; handR = 1.15; }
    if (pose === 'wave') { eR = [R + 24, 116]; hR = [R + 30, 70]; handR = 1.2; }
    const hipY = 232 + dy;
    const ly = (y) => hipY + (y - 232) * (358 - hipY) / 126;
    kL = [kL[0], ly(kL[1])]; kR = [kR[0], ly(kR[1])]; aL = [aL[0], aL[1] === 358 ? 358 : ly(aL[1])]; aR = [aR[0], aR[1] === 358 ? 358 : ly(aR[1])];
    const armLp = [[sxL, sy], eL, hL], armRp = [[sxR, sy], eR, hR];
    const legLp = [[xl, hipY], kL, aL], legRp = [[xr, hipY], kR, aR];

    const sleeves = sleeveT ? (along(armLp, 0, sleeveT) + ' ' + along(armRp, 0, sleeveT)) : '';
    const cuffs = (topK2 === 'jersey' || topK2 === 'teamjersey') ? (along(armLp, sleeveT - 0.05, sleeveT) + ' ' + along(armRp, sleeveT - 0.05, sleeveT)) : '';
    const sleeveCaps = sleeveT ? (circ(sxL, sy, (arm + sleeveExtra) / 2) + ' ' + circ(sxR, sy, (arm + sleeveExtra) / 2)) : '';

    // bottoms
    const botT = { split: 0.22, shorts: 0.34, longshorts: 0.5, tights: 0.95, capri: 0.72, bib: 0.46, trackpants: 1, skort: 0.26 };
    const botX = { split: 8, shorts: 8, longshorts: 9, tights: 1.5, capri: 1.5, bib: 2, trackpants: 10, skort: 4 };
    let botKey = g('bottom', 'shorts');
    if (topK2 === 'trisuit') botKey = 'tri';
    const bt = botKey === 'tri' ? 0.3 : (botT[botKey] || 0.34), bx = botKey === 'tri' ? 2 : (botX[botKey] || 8);
    const bottomCol = botKey === 'tri' ? topCol : (KC[botK] || KC.ink);
    const legWear = along(legLp, 0, bt) + ' ' + along(legRp, 0, bt);
    const hipWear = (botKey === 'skort') ? ('M' + (100 - hw / 2) + ' 224 L' + (100 + hw / 2) + ' 224 L' + (100 + hw / 2 + 14) + ' 264 L' + (100 - hw / 2 - 14) + ' 264 Z') : ('M' + (100 - hw / 2 - 1) + ' 224 L' + (100 + hw / 2 + 1) + ' 224 L' + (100 + hw / 2 + 3) + ' 244 L' + (100 - hw / 2 - 3) + ' 244 Z');
    const legStripe = botKey === 'trackpants' ? (along([[xl - leg / 2 - 4, hipY], [kL[0] - leg / 2 - 4, kL[1]], [aL[0] - leg / 2 - 4, aL[1] - 4]], 0, 1) + ' ' + along([[xr + leg / 2 + 4, hipY], [kR[0] + leg / 2 + 4, kR[1]], [aR[0] + leg / 2 + 4, aR[1] - 4]], 0, 1)) : '';
    const bibStraps = botKey === 'bib' ? ('M' + (100 - ww / 2 + 8) + ' 228 L' + (L + 18) + ' 132 M' + (100 + ww / 2 - 8) + ' 228 L' + (R - 18) + ' 132') : '';

    const sk = g('socks', 'ankle');
    const sr = { none: null, ankle: [0.92, 0.985], crew: [0.8, 0.985], knee: [0.56, 0.985] }[sk];
    const sockCol = { white: art.c53, ink: art.c6, match: topCol }[g('sockColor', 'white')] || art.c53;
    const socks = sr && botKey !== 'trackpants' ? (along(legLp, sr[0], sr[1]) + ' ' + along(legRp, sr[0], sr[1])) : '';

    // shoes
    const shoeType = g('shoes', 'runner');
    const dyL = aL[1] - 358, dyR = aR[1] - 358;
    const shoe = (ax, d, dy2) => {
      const Y = (v) => f1(v + dy2), X = (v) => f1(ax + d * v);
      if (shoeType === 'hightop') return 'M' + X(13) + ' ' + Y(380) + ' L' + X(-27) + ' ' + Y(380) + ' Q' + X(-32) + ' ' + Y(380) + ' ' + X(-30) + ' ' + Y(370) + ' Q' + X(-24) + ' ' + Y(358) + ' ' + X(-11) + ' ' + Y(354) + ' L' + X(-10) + ' ' + Y(340) + ' L' + X(11) + ' ' + Y(340) + ' Q' + X(14) + ' ' + Y(360) + ' ' + X(13) + ' ' + Y(380) + ' Z';
      if (shoeType === 'cycling') return 'M' + X(11) + ' ' + Y(378) + ' L' + X(-28) + ' ' + Y(378) + ' Q' + X(-33) + ' ' + Y(376) + ' ' + X(-28) + ' ' + Y(368) + ' Q' + X(-20) + ' ' + Y(360) + ' ' + X(-8) + ' ' + Y(356) + ' L' + X(8) + ' ' + Y(354) + ' Q' + X(12) + ' ' + Y(362) + ' ' + X(11) + ' ' + Y(378) + ' Z';
      if (shoeType === 'trainer') return 'M' + X(13) + ' ' + Y(380) + ' L' + X(-25) + ' ' + Y(380) + ' Q' + X(-31) + ' ' + Y(380) + ' ' + X(-29) + ' ' + Y(368) + ' Q' + X(-24) + ' ' + Y(354) + ' ' + X(-8) + ' ' + Y(352) + ' L' + X(9) + ' ' + Y(350) + ' Q' + X(14) + ' ' + Y(360) + ' ' + X(13) + ' ' + Y(380) + ' Z';
      return 'M' + X(12) + ' ' + Y(380) + ' L' + X(-26) + ' ' + Y(380) + ' Q' + X(-31) + ' ' + Y(380) + ' ' + X(-29) + ' ' + Y(371) + ' Q' + X(-24) + ' ' + Y(359) + ' ' + X(-8) + ' ' + Y(355) + ' L' + X(8) + ' ' + Y(353) + ' Q' + X(13) + ' ' + Y(362) + ' ' + X(12) + ' ' + Y(380) + ' Z';
    };
    const sole = (ax, d, dy2) => { const Y = (v) => f1(v + dy2), X = (v) => f1(ax + d * v); const th = shoeType === 'cycling' ? 4 : (shoeType === 'trainer' ? 6 : 8); return 'M' + X(13) + ' ' + Y(384 - th) + ' L' + X(-30) + ' ' + Y(384 - th) + ' Q' + X(-31) + ' ' + Y(383) + ' ' + X(-24) + ' ' + Y(384) + ' L' + X(13) + ' ' + Y(384) + ' Z'; };
    const shoeDet = (ax, d, dy2) => { const Y = (v) => f1(v + dy2), X = (v) => f1(ax + d * v); if (shoeType === 'cycling') return 'M' + X(-18) + ' ' + Y(362) + ' L' + X(6) + ' ' + Y(358) + ' M' + X(-12) + ' ' + Y(370) + ' L' + X(8) + ' ' + Y(366); if (shoeType === 'hightop') return 'M' + X(-6) + ' ' + Y(346) + ' L' + X(8) + ' ' + Y(346) + ' M' + X(-22) + ' ' + Y(370) + ' L' + X(4) + ' ' + Y(362); return 'M' + X(-21) + ' ' + Y(370) + ' L' + X(3) + ' ' + Y(361); };
    const shoes = shoe(aL[0], 1, dyL) + ' ' + shoe(aR[0], -1, dyR);
    const soles = sole(aL[0], 1, dyL) + ' ' + sole(aR[0], -1, dyR);
    const shoeDetail = shoeDet(aL[0], 1, dyL) + ' ' + shoeDet(aR[0], -1, dyR);

    // head
    const face = g('face', 'oval');
    const heads = {
      oval: 'M63 66 C63 40 80 28 100 28 C120 28 137 40 137 66 C137 92 126 112 112 119 Q100 124 88 119 C74 112 63 92 63 66 Z',
      round: 'M62 68 C62 42 80 28 100 28 C120 28 138 42 138 68 C138 96 122 116 100 116 C78 116 62 96 62 68 Z',
      angular: 'M63 64 C63 40 80 28 100 28 C120 28 137 40 137 64 C137 84 132 98 122 108 L106 118 Q100 121 94 118 L78 108 C68 98 63 84 63 64 Z',
      square: 'M63 62 C63 38 80 28 100 28 C120 28 137 38 137 62 L137 92 C137 106 128 116 114 119 L86 119 C72 116 63 106 63 92 Z',
      long: 'M65 64 C65 38 80 26 100 26 C120 26 135 38 135 64 C135 92 128 110 116 118 Q108 124 100 124 Q92 124 84 118 C72 110 65 92 65 64 Z',
      heart: 'M61 62 C61 38 80 27 100 27 C120 27 139 38 139 62 C139 82 130 98 116 110 L104 120 Q100 123 96 120 L84 110 C70 98 61 82 61 62 Z'
    };
    const head = heads[face] || heads.oval;
    const es = { small: 0.78, medium: 1, large: 1.3 }[g('ears', 'medium')] || 1;
    const hijabOn = g('headwear', 'none') === 'hijab';
    const ears = hijabOn ? '' : circ(63, 80, 7 * es) + ' ' + circ(137, 80, 7 * es);
    const earsIn = hijabOn ? '' : ell(63, 80, 3 * es, 3.4 * es) + ' ' + ell(137, 80, 3 * es, 3.4 * es);
    const neck = 'M' + (100 - nk / 2) + ' 106 L' + (100 - nk / 2) + ' 134 Q100 142 ' + (100 + nk / 2) + ' 134 L' + (100 + nk / 2) + ' 106 Z';
    const neckShade = 'M' + (100 - nk / 2) + ' 110 Q100 126 ' + (100 + nk / 2) + ' 110 L' + (100 + nk / 2) + ' 120 Q100 134 ' + (100 - nk / 2) + ' 120 Z';

    // eyes
    const eyes = g('eyes', 'focused');
    const E = { big: { rx: 8.5, ry: 11, k: 0.78, tl: 0 }, round: { rx: 9, ry: 10, k: 0.92, tl: 0 }, almond: { rx: 9.5, ry: 7.5, k: 0.62, tl: -1.4 }, focused: { rx: 8.5, ry: 9, k: 0.5, tl: 1.6 }, sharp: { rx: 8.5, ry: 7, k: 0.3, tl: 2.6 }, hooded: { rx: 9, ry: 8, k: 0.3, tl: 0 } }[eyes] || { rx: 8.5, ry: 9, k: 0.5, tl: 1.6 };
    const cy = 76, ex = [86, 114];
    const whites = ex.map(x => ell(x, cy, E.rx, E.ry)).join(' ');
    const ir = Math.min(6.6, E.ry - 1.2);
    const iris = ex.map(x => ell(x + 1, cy + 1, Math.min(5.2, E.rx - 2.6), ir)).join(' ');
    const pupil = ex.map(x => ell(x + 1, cy + 1.5, 2.3, Math.min(3, ir - 1))).join(' ');
    const shine = ex.map(x => circ(x + 3, cy - 2, 1.6)).join(' ');
    let lidFill = '', lids = '', lashes = '';
    ex.forEach((x, i) => {
      const inner = i === 0 ? 1 : -1;
      const base = cy - E.ry * E.k; const yIn = base + E.tl, yOut = base - E.tl * 0.5;
      const yL = inner > 0 ? yOut : yIn, yR = inner > 0 ? yIn : yOut, c = base - E.ry * 0.28;
      const a = x - E.rx - 1.5, b = x + E.rx + 1.5;
      lidFill += 'M' + a + ' ' + (cy - E.ry - 2) + ' L' + b + ' ' + (cy - E.ry - 2) + ' L' + b + ' ' + f1(yR) + ' Q' + x + ' ' + f1(c) + ' ' + a + ' ' + f1(yL) + ' Z ';
      lids += 'M' + (a - 0.5) + ' ' + f1(yL + 0.5) + ' Q' + x + ' ' + f1(c) + ' ' + (b + 0.5) + ' ' + f1(yR + 0.5) + ' ';
      const lk = g('lashes', 'none');
      if (lk !== 'none') {
        const ox = inner > 0 ? a : b, oy = inner > 0 ? yL : yR, s = inner > 0 ? -1 : 1;
        lashes += 'M' + ox + ' ' + f1(oy) + ' l' + (s * 4) + ' -3 ';
        if (lk === 'long') lashes += 'M' + f1(ox - s * 3) + ' ' + f1(oy - 3) + ' l' + (s * 3) + ' -4 M' + f1(ox - s * 7) + ' ' + f1(oy - 5) + ' l' + (s * 2) + ' -4 ';
      }
    });
    const bk = g('brows', 'angled');
    const by = cy - E.ry - 7;
    const BW = { straight: 4.4, arched: 4, angled: 4.6, thick: 6.4, thin: 2.6, bushy: 7.2 }[bk] || 4.6;
    let brows = '';
    ex.forEach((x, i) => {
      const s = i === 0 ? 1 : -1, o = x - s * 10, inn = x + s * 9;
      if (bk === 'arched') brows += 'M' + o + ' ' + (by + 1) + ' Q' + x + ' ' + (by - 6) + ' ' + inn + ' ' + (by + 1) + ' ';
      else if (bk === 'straight' || bk === 'thick' || bk === 'thin') brows += 'M' + o + ' ' + by + ' L' + inn + ' ' + (by + 0.5) + ' ';
      else if (bk === 'bushy') brows += 'M' + o + ' ' + (by - 1) + ' Q' + x + ' ' + (by - 4) + ' ' + inn + ' ' + (by + 2) + ' ';
      else brows += 'M' + o + ' ' + (by - 2.6) + ' L' + inn + ' ' + (by + 2.6) + ' ';
    });
    const browCol = hairK === 'blonde' || hairK === 'platinum' ? art.c29 : (hairK === 'grey' || hairK === 'white' ? art.c23 : (hairK === 'blue' || hairK === 'pink' || hairK === 'green' ? art.c9 : hairCol));

    const noses = { button: 'M97 92 Q100 96 103 92', small: 'M101 86 Q96.5 95 102 96', round: 'M98 84 Q95 94 99 96 Q101 97.5 103 96 M95 95 Q96 97 98 96.5 M105 95 Q104 97 102 96.5', long: 'M101 80 L97 95 Q100 97.5 104 95', wide: 'M101 86 L100 92 M92 93 Q95 98 100 96.5 Q105 98 108 93', pointed: 'M102 82 L95 95 L102 96' };
    const nose = noses[g('nose', 'small')] || noses.small;

    const mk = g('mouth', 'smile');
    let mouthFill = '', teeth = '', mouthLine = '';
    if (mk === 'smile') mouthLine = 'M91 104 Q100 110.5 109 103';
    if (mk === 'grin') { mouthFill = 'M89 102 Q100 118 111 102 Q100 105 89 102 Z'; teeth = 'M91 102.6 Q100 105.5 109 102.6 L108 105.5 Q100 108 92 105.5 Z'; }
    if (mk === 'teeth') { mouthFill = 'M90 103 Q100 112 110 103 Q100 105 90 103 Z'; teeth = 'M91 103.4 Q100 105.6 109 103.4 L107.5 106.5 Q100 109.5 92.5 106.5 Z'; }
    if (mk === 'smirk') mouthLine = 'M93 105 Q102 108 110 101';
    if (mk === 'open') mouthFill = ell(100, 106, 6, 7);
    if (mk === 'serious') mouthLine = 'M93 105 L107 105';

    const fk = g('facial', 'none');
    const FF = {
      stubble: 'M68 90 C72 104 86 115 100 116 C114 115 128 104 132 90 C128 100 120 106 112 107 Q100 101 88 107 C80 106 72 100 68 90 Z',
      moustache: 'M88 99.5 Q100 93 112 99.5 Q107 103.5 100 101.5 Q93 103.5 88 99.5 Z',
      goatee: 'M88 99.5 Q100 93 112 99.5 Q107 103.5 100 101.5 Q93 103.5 88 99.5 Z M92 110 Q100 108 108 110 L106 121 Q100 125 94 121 Z',
      beard: 'M64 82 C64 106 82 124 100 126 C118 124 136 106 136 82 C132 96 125 104 116 104 Q100 97 84 104 C75 104 68 96 64 82 Z',
      fullbeard: 'M62 78 C60 112 80 138 100 140 C120 138 140 112 138 78 C134 96 126 104 116 104 Q100 96 84 104 C74 104 66 96 62 78 Z'
    };
    const facialFill = FF[fk] || '';
    const facialLine = fk === 'chinstrap' ? 'M64 82 C66 104 84 122 100 124 C116 122 134 104 136 82' : '';
    const mouthCol = (fk === 'beard' || fk === 'fullbeard') ? art.c48 : deep;

    // hair
    const hk = g('hair', 'crop');
    const HF = {
      spiky: 'M60 70 C56 40 70 22 92 20 L86 6 L106 15 L113 0 L122 17 L141 10 L135 29 L150 33 L139 47 C141 55 141 63 139 70 C133 52 119 44 100 44 C84 44 70 52 62 70 Z',
      crop: 'M62 64 C60 36 78 22 100 22 C124 22 141 36 138 64 C134 50 122 40 104 40 L98 46 L94 40 C80 42 66 50 62 64 Z',
      sidepart: 'M62 68 C58 38 78 22 104 22 C126 22 142 38 138 66 C134 52 126 44 114 40 C100 47 80 45 72 51 C66 55 63 61 62 68 Z',
      quiff: 'M62 66 C58 40 70 26 84 22 C92 4 122 0 138 14 C128 14 124 18 127 23 C137 30 141 45 138 66 C134 52 122 42 104 42 C86 42 70 50 62 66 Z',
      curly: 'M59 68 C50 58 55 40 66 40 C62 27 78 17 89 24 C93 13 109 13 113 23 C124 16 140 26 135 39 C147 42 150 58 141 68 C136 54 122 44 100 44 C79 44 65 54 59 68 Z',
      afro: 'M56 92 C40 84 40 62 50 52 C44 32 62 12 82 14 C90 2 112 2 120 14 C140 12 158 32 150 52 C160 62 160 84 144 92 C142 70 130 50 100 50 C70 50 58 70 56 92 Z',
      buzz: 'M64 60 C64 36 80 27 100 27 C120 27 136 36 136 60 C130 48 118 42 100 42 C82 42 70 48 64 60 Z',
      bald: '',
      mohawk: 'M90 44 L88 12 L95 20 L98 2 L103 18 L108 4 L111 20 L112 44 Q100 38 90 44 Z',
      manbun: 'M62 62 C60 36 78 24 100 24 C122 24 140 36 138 62 C130 46 116 40 100 40 C84 40 70 46 62 62 Z',
      bun: 'M62 64 C60 36 78 24 100 24 C122 24 140 36 138 64 C132 50 120 42 100 42 C80 42 68 50 62 64 Z',
      ponytail: 'M62 70 C58 40 78 24 102 24 C124 24 142 40 138 70 C134 56 126 48 116 44 C108 52 92 56 74 56 C68 60 64 64 62 70 Z',
      highpony: 'M62 64 C60 36 78 24 100 24 C122 24 140 36 138 64 C132 50 120 42 100 42 C80 42 68 50 62 64 Z',
      braids: 'M62 70 C58 38 78 24 100 24 C122 24 142 38 138 70 C134 54 122 44 102 42 L100 46 L98 42 C78 44 66 54 62 70 Z',
      long: 'M62 72 C58 40 78 24 102 24 C124 24 142 40 138 72 C134 56 126 48 116 44 C108 52 92 56 74 56 C68 60 64 64 62 72 Z',
      bob: 'M60 74 C56 40 78 24 100 24 C122 24 144 40 140 74 C138 62 134 56 130 54 L70 54 C66 56 62 62 60 74 Z'
    };
    const HB = {
      ponytail: 'M110 30 C140 18 166 40 158 76 C154 98 140 110 146 130 C126 118 128 94 132 74 C134 58 126 44 112 40 Z',
      long: 'M58 70 C54 34 80 22 100 22 C122 22 146 34 142 70 L148 142 C130 148 118 140 116 118 L84 118 C82 140 70 148 52 142 Z',
      bob: 'M58 70 C54 34 80 22 100 22 C122 22 146 34 142 70 L144 112 C132 116 126 112 124 104 L76 104 C74 112 68 116 56 112 Z',
      highpony: 'M104 22 C130 0 162 10 158 42 C154 64 140 74 144 98 C124 86 128 60 132 44 C134 30 122 24 110 30 Z',
      afro: 'M50 60 C44 22 70 2 100 2 C130 2 156 22 150 60 C156 80 150 98 140 104 L60 104 C50 98 44 80 50 60 Z'
    };
    const HI = { spiky: 'M90 30 L104 22 M116 27 L130 22', crop: 'M84 30 Q100 25 118 30', sidepart: 'M110 30 Q124 30 132 40', quiff: 'M92 16 Q110 6 126 12', curly: 'M80 30 Q90 26 98 28', afro: 'M70 26 Q84 14 100 14', bun: 'M84 32 Q100 27 116 32', manbun: 'M84 32 Q100 27 116 32', highpony: 'M84 32 Q100 27 116 32', ponytail: 'M86 32 Q100 27 116 32', long: 'M86 32 Q100 27 116 32', bob: 'M84 32 Q100 27 116 32', braids: 'M84 32 Q96 28 98 30' };
    const hw2 = g('headwear', 'none');
    const fullHat = hw2 === 'cap' || hw2 === 'beanie' || hw2 === 'helmet' || hw2 === 'swimcap' || hw2 === 'backcap' || hw2 === 'patka' || hw2 === 'hijab';
    let hairFront = HF[hk] || '', hairBack = HB[hk] || '';
    let hairFade = hk === 'mohawk' ? HF.buzz : '';
    let hairLine = hk === 'sidepart' ? 'M114 40 Q112 32 110 24' : (hk === 'braids' ? 'M100 24 L100 44' : '');
    let bunTop = hk === 'bun' ? ell(100, 18, 14, 13) : (hk === 'manbun' ? ell(100, 18, 11, 10) : '');
    const braids = hk === 'braids' && !['swimcap','patka','hijab'].includes(hw2) ? 'M66 66 C60 92 62 120 58 158 M134 66 C140 92 138 120 142 158' : '';
    if (fullHat) { hairFront = ''; hairFade = ''; hairLine = ''; bunTop = hw2 === 'swimcap' ? '' : bunTop; if (hw2 === 'swimcap' || hw2 === 'hijab' || hw2 === 'patka') hairBack = ''; }
    if (hw2 === 'swimcap' || hw2 === 'helmet' || hw2 === 'patka' || hw2 === 'hijab') bunTop = '';
    const baldHi = hk === 'bald' && !fullHat ? ell(88, 40, 14, 6) : '';

    // headwear
    let hatMain = '', hatDark = '', hatLine = '', hatStrap = '', hatBack = '';
    const hatCol = hw2 === 'swimcap' ? KC.sky : (hw2 === 'helmet' ? KC.white : (hw2 === 'headband' ? art.c53 : (hw2 === 'hijab' || hw2 === 'patka' ? (topK === 'ink' ? KC.charcoal : topDark) : topCol)));
    const hatDarkCol = dk(hatCol, 0.7);
    const hatLineCol = hw2 === 'helmet' ? art.c4 : dk(hatCol, 0.6);
    if (hw2 === 'headband') { hatMain = 'M63 50 C80 42 120 42 137 50 L137 58 C120 50 80 50 63 58 Z'; }
    if (hw2 === 'cap') { hatMain = 'M62 58 C62 30 80 19 100 19 C120 19 138 30 138 58 Z'; hatDark = 'M55 58 Q100 47 145 58 Q150 66 141 68 Q100 60 59 68 Q50 66 55 58 Z'; hatLine = 'M100 19 L100 56'; }
    if (hw2 === 'backcap') { hatMain = 'M62 60 C62 30 80 19 100 19 C120 19 138 30 138 60 Q100 52 62 60 Z'; hatDark = 'M84 16 Q100 6 116 16 L114 22 Q100 16 86 22 Z'; hatLine = 'M90 56 Q100 52 110 56'; }
    if (hw2 === 'visor') { hatMain = 'M63 50 C80 42 120 42 137 50 L137 58 C120 50 80 50 63 58 Z'; hatDark = 'M60 56 Q100 46 140 56 Q146 64 138 66 Q100 58 62 66 Q54 64 60 56 Z'; }
    if (hw2 === 'beanie') { hatMain = 'M60 60 C58 26 80 12 100 12 C120 12 142 26 140 60 Z'; hatDark = 'M58 52 Q100 42 142 52 L142 64 Q100 54 58 64 Z ' + ell(100, 9, 9, 8); hatLine = 'M76 26 L76 46 M88 20 L88 44 M100 18 L100 44 M112 20 L112 44 M124 26 L124 46'; }
    if (hw2 === 'helmet') { hatMain = 'M56 62 C52 28 78 10 102 10 C130 10 152 30 146 64 Q100 52 56 62 Z'; hatDark = 'M56 62 Q100 52 146 64 L146 70 Q100 58 56 68 Z'; hatLine = 'M80 18 Q78 34 82 50 M100 14 L100 52 M120 18 Q122 34 118 50'; hatStrap = 'M62 66 L70 104 Q80 116 94 118 M138 66 L130 104 Q120 116 106 118'; }
    if (hw2 === 'patka') { hatMain = 'M60 64 C58 28 80 14 100 14 C120 14 142 28 140 64 Q100 50 60 64 Z'; hatDark = ell(100, 16, 10, 9); hatLine = 'M70 40 Q100 30 130 40 M66 52 Q100 42 134 52'; }
    if (hw2 === 'hijab') { hatBack = 'M54 80 C48 28 78 10 100 10 C122 10 152 28 146 80 C148 108 138 128 146 150 L54 150 C62 128 52 108 54 80 Z'; hatMain = 'M62 62 C62 34 80 22 100 22 C120 22 138 34 138 62 C130 48 116 42 100 42 C84 42 70 48 62 62 Z'; hatLine = 'M70 124 Q100 140 130 124'; }
    if (hw2 === 'swimcap') { hatMain = 'M60 70 C56 30 78 16 100 16 C122 16 144 30 140 70 Q138 62 134 58 Q100 50 66 58 Q62 62 60 70 Z'; hatLine = 'M74 30 Q100 20 126 30'; }

    // eyewear
    const ew = g('eyewear', 'none');
    let eyewearFill = '', eyewearLine = '', eyewearShine = '', eyewearCol = art.c4, eyewearOp = 1;
    if (ew === 'shades') { eyewearFill = 'M70 70 Q85 63 98 69 L100 73 L102 69 Q115 63 130 70 Q131 83 118 85 Q106 85 102 76 L98 76 Q94 85 82 85 Q69 83 70 70 Z'; eyewearShine = 'M76 72 L86 69.5 M106 72 L116 69.5'; }
    if (ew === 'round') { eyewearFill = circ(86, 76, 11) + ' ' + circ(114, 76, 11); eyewearCol = art.c35; eyewearOp = 0.25; eyewearLine = circ(86, 76, 11) + ' ' + circ(114, 76, 11) + ' M97 74 Q100 71 103 74 M75 74 L64 72 M125 74 L136 72'; }
    if (ew === 'square') { eyewearFill = 'M73 67 L99 67 L98 84 Q86 87 74 84 Z M101 67 L127 67 L126 84 Q114 87 102 84 Z'; eyewearCol = art.c35; eyewearOp = 0.25; eyewearLine = 'M73 67 L99 67 L98 84 Q86 87 74 84 Z M101 67 L127 67 L126 84 Q114 87 102 84 Z M73 69 L64 71 M127 69 L136 71'; }
    if (ew === 'goggles') { eyewearFill = ell(86, 76, 12, 9) + ' ' + ell(114, 76, 12, 9); eyewearCol = art.c13; eyewearOp = 0.55; eyewearLine = ell(86, 76, 12, 9) + ' ' + ell(114, 76, 12, 9) + ' M98 76 L102 76 M74 76 L62 74 M126 76 L138 74'; eyewearShine = 'M80 72 L86 70 M108 72 L114 70'; }
    const eyesShow = ew === 'shades' ? 'none' : 'inline';

    // ears
    const ewr = g('earwear', 'none');
    let earFill = '', phonesBand = '', earCol = art.c53;
    if (ewr === 'earbuds') earFill = circ(63.5, 82, 4.5) + ' ' + circ(136.5, 82, 4.5);
    if (ewr === 'headphones') { phonesBand = 'M58 78 C54 30 78 14 100 14 C122 14 146 30 142 78'; earFill = ell(60, 82, 8, 12) + ' ' + ell(140, 82, 8, 12); earCol = art.c4; }

    // neck, wrist, hands, back
    const nw = g('neckwear', 'none');
    const medalRibbon = nw === 'medal' ? 'M' + (100 - nk / 2 - 2) + ' 132 L100 172 L' + (100 + nk / 2 + 2) + ' 132' : '';
    const medal = nw === 'medal' ? circ(100, 180, 9) : '';
    const towel = nw === 'towel' ? ('M' + (100 - nk / 2 - 16) + ' 128 Q100 146 ' + (100 + nk / 2 + 16) + ' 128 L' + (100 + nk / 2 + 18) + ' 136 L' + (100 + nk / 2 + 12) + ' 186 L' + (100 + nk / 2 - 2) + ' 186 L' + (100 + nk / 2 + 2) + ' 142 Q100 154 ' + (100 - nk / 2 - 2) + ' 142 L' + (100 - nk / 2 + 2) + ' 176 L' + (100 - nk / 2 - 12) + ' 176 L' + (100 - nk / 2 - 18) + ' 136 Z') : '';
    const towelLine = nw === 'towel' ? ('M' + (100 + nk / 2 + 1) + ' 178 L' + (100 + nk / 2 + 12) + ' 178 M' + (100 - nk / 2 - 11) + ' 168 L' + (100 - nk / 2 + 1) + ' 168') : '';
    const wk = g('wrist', 'none');
    const segAt = (pts, t0, t1) => along(pts, t0, t1);
    const wristBands = wk === 'sweatbands' ? (segAt(armLp, 0.8, 0.9) + ' ' + segAt(armRp, 0.8, 0.9)) : '';
    const watch = wk === 'watch' ? segAt(armLp, 0.84, 0.92) : '';
    const wpt = (() => { const t = 0.88; const a = armLp; const d1 = Math.hypot(a[1][0] - a[0][0], a[1][1] - a[0][1]), d2 = Math.hypot(a[2][0] - a[1][0], a[2][1] - a[1][1]); const d = t * (d1 + d2) - d1; const r = d / d2; return [mid(a[1][0], a[2][0], r), mid(a[1][1], a[2][1], r)]; })();
    const watchFace = wk === 'watch' ? circ(wpt[0], wpt[1], arm * 0.42) : '';
    const hk2 = g('hands', 'none');
    const handCol = hk2 === 'gloves' ? art.c6 : skin;
    const hr = arm * 0.62 * (hk2 === 'gloves' ? 1.12 : 1);
    const hands = circ(hL[0], hL[1], hr) + ' ' + circ(hR[0], hR[1], hr * handR);
    const bottle = hk2 === 'bottle' ? ('M' + (hR[0] - 6) + ' ' + (hR[1] - 22) + ' L' + (hR[0] + 6) + ' ' + (hR[1] - 22) + ' L' + (hR[0] + 7) + ' ' + (hR[1] + 16) + ' Q' + hR[0] + ' ' + (hR[1] + 20) + ' ' + (hR[0] - 7) + ' ' + (hR[1] + 16) + ' Z') : '';
    const bottleCap = hk2 === 'bottle' ? ('M' + (hR[0] - 4) + ' ' + (hR[1] - 28) + ' L' + (hR[0] + 4) + ' ' + (hR[1] - 28) + ' L' + (hR[0] + 5) + ' ' + (hR[1] - 22) + ' L' + (hR[0] - 5) + ' ' + (hR[1] - 22) + ' Z') : '';
    const vestOn = g('back', 'none') === 'vest';
    const vestCol = topK === 'ink' || topK === 'charcoal' || topK === 'navy' ? art.c46 : art.c2;
    const vest = vestOn ? ('M' + (L + 14) + ' 132 L' + (100 - ww / 2 + 4) + ' 196 M' + (R - 14) + ' 132 L' + (100 + ww / 2 - 4) + ' 196 M' + (100 - ww / 2 + 4) + ' 190 L' + (100 + ww / 2 - 4) + ' 190') : '';
    const vestPockets = vestOn ? ('M' + (L + 10) + ' 150 L' + (L + 26) + ' 150 L' + (L + 26) + ' 176 L' + (L + 12) + ' 176 Z M' + (R - 26) + ' 150 L' + (R - 10) + ' 150 L' + (R - 12) + ' 176 L' + (R - 26) + ' 176 Z') : '';

    // pattern
    const pat = g('pattern', 'plain');
    let patternFill = '', patternLine = '', numShow = 'none';
    const pTop = topK2 === 'bra' ? 0 : 1;
    if (pTop && pat === 'stripe') { const y1 = 168, y2 = 180; patternFill = 'M' + f1(100 - halfAt(y1)) + ' ' + y1 + ' L' + f1(100 + halfAt(y1)) + ' ' + y1 + ' L' + f1(100 + halfAt(y2)) + ' ' + y2 + ' L' + f1(100 - halfAt(y2)) + ' ' + y2 + ' Z'; }
    if (pTop && pat === 'chevron') patternLine = 'M' + (100 - ww / 2 + 3) + ' 186 L100 172 L' + (100 + ww / 2 - 3) + ' 186';
    if (pTop && pat === 'panel') { patternFill = 'M' + f1(100 - halfAt(150) + 1) + ' 150 L' + f1(100 - halfAt(150) + 9) + ' 150 L' + f1(100 - halfAt(Math.min(topBottom, 236)) + 8) + ' ' + Math.min(topBottom, 236) + ' L' + f1(100 - halfAt(Math.min(topBottom, 236)) + 1) + ' ' + Math.min(topBottom, 236) + ' Z M' + f1(100 + halfAt(150) - 9) + ' 150 L' + f1(100 + halfAt(150) - 1) + ' 150 L' + f1(100 + halfAt(Math.min(topBottom, 236)) - 1) + ' ' + Math.min(topBottom, 236) + ' L' + f1(100 + halfAt(Math.min(topBottom, 236)) - 8) + ' ' + Math.min(topBottom, 236) + ' Z'; }
    if (pTop && (pat === 'number' || topK2 === 'teamjersey')) numShow = 'inline';
    let topDetail = '';
    if (topK2 === 'jersey') topDetail = 'M100 136 L100 208';
    if (topK2 === 'hoodie') topDetail = 'M' + (100 - 16) + ' 196 L' + (100 + 16) + ' 196 L' + (100 + 20) + ' 222 L' + (100 - 20) + ' 222 Z M94 140 L93 160 M106 140 L107 160';
    if (topK2 === 'compression') topDetail = 'M' + (100 - ww / 2 + 6) + ' 150 Q100 170 ' + (100 + ww / 2 - 6) + ' 150';
    const hood = topK2 === 'hoodie' ? ('M' + (100 - nk / 2 - 16) + ' 134 Q100 104 ' + (100 + nk / 2 + 16) + ' 134 L' + (100 + nk / 2 + 22) + ' 142 Q100 152 ' + (100 - nk / 2 - 22) + ' 142 Z') : '';

    // details
    const dt = g('details', 'none');
    const blush = dt === 'blush' ? (ell(78, 92, 8, 4.5) + ' ' + ell(122, 92, 8, 4.5)) : '';
    const freckles = dt === 'freckles' ? [[76, 88], [81, 91], [86, 88], [114, 88], [119, 91], [124, 88], [79, 94], [121, 94]].map(q => circ(q[0], q[1], 1.1)).join(' ') : (dt === 'mole' ? circ(117, 98, 1.6) : '');
    const faceLines = dt === 'dimples' ? 'M86 104 Q85 107 87 109 M114 104 Q115 107 113 109' : (dt === 'lines' ? 'M84 96 Q82 103 86 108 M116 96 Q118 103 114 108 M74 70 L70 72 M126 70 L130 72' : '');

    // crop / framing
    const crop = g('crop', 'full');
    const size = Number(g('size', 160)) || 160;
    const vb = crop === 'head' ? ('30 ' + (dy - 10) + ' 140 140') : '0 0 200 400';
    const kStroke = { singlet: 1, trisuit: 1 }[topK2] ? 0 : 0;
    return {
      svgStyle: 'display: block; overflow: ' + (crop === 'head' ? 'hidden' : 'visible'), vb, w: size, h: crop === 'head' ? size : size * 2, label: 'Athlete avatar',
      groundOp: crop === 'head' ? '0' : '.18', upT: 'translate(0 ' + dy + ')',
      clipId: idPrefix + '-' + face, clipUrl: 'url(#' + idPrefix + '-' + face + ')',
      skin, shade, deep, hairCol, topCol, topDark, accent, bottomCol, sockCol, shoeCol,
      soleCol: shoeK === 'white' ? art.c39 : art.c53, shoeDetailCol: shoeK === 'white' ? art.c10 : art.c53,
      hairBack, braids, hood,
      legL: P(legLp), legR: P(legRp), legW: leg, legShade: along([[xr + leg * 0.28, mid(hipY, kR[1], 0.4)], [kR[0] + leg * 0.28, kR[1]], [aR[0] + leg * 0.28, aR[1] - 8]], 0, 1), legShadeW: Math.max(3, leg * 0.3),
      legWear, legWearW: leg + bx, legStripe, socks, sockW: leg + 1,
      shoes, soles, shoeDetail,
      hipWear, neck, neckShade, torso, bibStraps, top, topShade: light(topK) ? '' : topShade, patternFill, patternLine, topDetail,
      numShow, numY: topK2 === 'crop' ? 192 : 198, numSize: topK2 === 'teamjersey' ? 34 : 24,
      vest, vestPockets, vestCol, towel, towelLine, medalRibbon, medal,
      armL: P(armLp), armR: P(armRp), armW: arm, sleeves, cuffs, sleeveW: arm + sleeveExtra, sleeveCaps,
      wristBands, watch, wristW: arm + 3, watchFace, bottle, bottleCap, hands, handCol,
      ears, earsIn, head, baldHi, blush, freckles, faceLines,
      eyesShow, whites, iris, irisCol: IC[g('eyeColor', 'brown')] || IC.brown, pupil, shine, lidFill, lids, lashes,
      brows, browW: BW, browCol, nose, facialFill, facialOp: fk === 'stubble' ? 0.3 : 1, facialLine,
      mouthFill, teeth, mouthLine, mouthCol,
      hairFront, hairFade, hairLine, hairHi: fullHat ? '' : (HI[hk] || ''), bunTop,
      hatBack, hatMain, hatDark, hatLine, hatStrap, hatCol, hatDarkCol, hatLineCol,
      eyewearFill, eyewearLine, eyewearShine, eyewearCol, eyewearOp,
      phonesBand, earFill, earCol
    };
};
