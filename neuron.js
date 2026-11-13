/* Neuron firing graphic.
   Usage: <canvas class="neuron" data-style="real|pixel|dexter" data-palette="lab|showtime"></canvas>
   A spike starts as small inputs on the dendrites (right), the cell body fires, the action potential
   jumps node to node down the myelinated axon (saltatory conduction), and the axon terminals (left)
   release neurotransmitter. Click the drawing to fire it by hand. */
(function () {
  "use strict";
  var W = 1000, H = 420, TAU = Math.PI * 2;

  function rng(seed) { return function () { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  function makePath(pts) {
    var cum = [0], i;
    for (i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y));
    var len = cum[cum.length - 1];
    for (i = 0; i < pts.length; i++) pts[i].s = cum[i] / len;
    return {
      pts: pts, len: len,
      at: function (s) {
        var d = clamp(s, 0, 1) * len, lo = 0, hi = cum.length - 1;
        while (hi - lo > 1) { var m = (lo + hi) >> 1; if (cum[m] <= d) lo = m; else hi = m; }
        var a = pts[lo], b = pts[hi], f = (d - cum[lo]) / ((cum[hi] - cum[lo]) || 1);
        return { x: lerp(a.x, b.x, f), y: lerp(a.y, b.y, f), a: Math.atan2(b.y - a.y, b.x - a.x) };
      }
    };
  }

  /* ---------------- geometry, in a 1000 x 420 drawing space ---------------- */
  var G = (function () {
    var R = rng(11), i;
    var soma = { x: 830, y: 205, r: 58 };
    var blob = [];
    for (i = 0; i < 60; i++) {
      var a = i / 60 * TAU, rr = soma.r * (1 + 0.06 * Math.sin(3 * a + 1) + 0.04 * Math.sin(5 * a + 2));
      blob.push({ x: soma.x + rr * Math.cos(a), y: soma.y + rr * Math.sin(a) * 0.94 });
    }
    var nucleus = { x: soma.x + 8, y: soma.y - 8, r: 21 };

    function curve(x0, y0, ang, len, bend, w0, w1, n) {
      var pts = [], dx = Math.cos(ang), dy = Math.sin(ang);
      for (var j = 0; j <= n; j++) {
        var u = j / n, b = bend * Math.sin(Math.PI * u);
        pts.push({ x: x0 + dx * len * u - dy * b, y: y0 + dy * len * u + dx * b, w: lerp(w0, w1, u) });
      }
      return pts;
    }
    function copy(p) { return p.map(function (q) { return { x: q.x, y: q.y, w: q.w }; }); }

    // dendrites: [angle in degrees, length]
    var defs = [[-92, 125], [-42, 125], [8, 92], [52, 115], [97, 120], [140, 112], [-142, 105]];
    var dendrites = [], leaves = [];
    defs.forEach(function (d) {
      var a = d[0] * Math.PI / 180, L = d[1];
      var bx = soma.x + Math.cos(a) * soma.r * 0.7, by = soma.y + Math.sin(a) * soma.r * 0.7;
      var trunk = curve(bx, by, a, soma.r * 0.3 + L * 0.55, (R() - 0.5) * 24, 18, 8, 10);
      var end = trunk[trunk.length - 1], prev = trunk[trunk.length - 2];
      var ea = Math.atan2(end.y - prev.y, end.x - prev.x), spread = 0.35 + R() * 0.2;
      var b1 = curve(end.x, end.y, ea - spread, L * 0.45, (R() - 0.5) * 16, 8, 2, 8);
      var b2 = curve(end.x, end.y, ea + spread, L * (0.35 + R() * 0.15), (R() - 0.5) * 16, 7, 2, 8);
      dendrites.push(trunk, b1, b2);
      leaves.push(makePath(copy(trunk).concat(copy(b1).slice(1))), makePath(copy(trunk).concat(copy(b2).slice(1))));
    });

    // dendritic spines (realistic style only)
    var spines = [];
    dendrites.forEach(function (p) {
      for (var j = 1; j < p.length; j++) {
        if (p[j].w > 10 || R() > 0.75) continue;
        var a0 = p[j - 1], b0 = p[j];
        var ang = Math.atan2(b0.y - a0.y, b0.x - a0.x) + (R() < 0.5 ? -1 : 1) * (Math.PI / 2 + (R() - 0.5) * 0.7);
        var l = 4 + R() * 5 + b0.w / 2;
        spines.push({ x: b0.x, y: b0.y, ex: b0.x + Math.cos(ang) * l, ey: b0.y + Math.sin(ang) * l });
      }
    });

    // axon: starts inside the soma (hillock), wavy, ends at x=215
    function axY(x) { return 228 + 14 * Math.sin((x - 215) / 90 + 0.6); }
    var apts = [];
    for (var x = 800; x >= 215; x -= 5) {
      var u = (800 - x) / 585;
      apts.push({ x: x, y: axY(x), w: u < 0.1 ? lerp(20, 4.5, u / 0.1) : 4.5 });
    }
    var axon = makePath(apts);

    // myelin sheaths and the sites that fire (initial segment, nodes of Ranvier, terminal)
    var M0 = 0.165, M1 = 0.965, N = 9, gap = 0.016, sl = (M1 - M0 - gap * (N - 1)) / N;
    var sheaths = [], sites = [{ s: 0.135 }];
    for (i = 0; i < N; i++) {
      var s0 = M0 + i * (sl + gap), s1 = s0 + sl, c = axon.at((s0 + s1) / 2);
      sheaths.push({ x: c.x, y: c.y, a: c.a, len: sl * axon.len, th: 28 });
      if (i > 0) sites.push({ s: s0 - gap / 2 });
    }
    sites.push({ s: 0.985 });
    sites.forEach(function (st) { var p = axon.at(st.s); st.x = p.x; st.y = p.y; });

    // axon terminals: curly cubic curves [end, control 1, control 2], plus a few side twigs
    var B = axon.at(1);
    function cubic(p0, c1, c2, p1, w0, w1) {
      var pts = [];
      for (var j = 0; j <= 28; j++) {
        var u2 = j / 28, v = 1 - u2, a0 = v * v * v, a1 = 3 * v * v * u2, a2 = 3 * v * u2 * u2, a3 = u2 * u2 * u2;
        pts.push({ x: a0 * p0.x + a1 * c1[0] + a2 * c2[0] + a3 * p1[0], y: a0 * p0.y + a1 * c1[1] + a2 * c2[1] + a3 * p1[1], w: lerp(w0, w1, u2) });
      }
      var p = makePath(pts), e = p.at(1);
      p.bouton = { x: e.x, y: e.y, a: e.a };
      return p;
    }
    var tdefs = [[[150, 112], [195, 200], [215, 125]], [[55, 175], [170, 215], [110, 145]], [[40, 288], [150, 250], [60, 238]],
      [[95, 385], [175, 280], [60, 330]], [[210, 402], [210, 300], [255, 370]]];
    var branches = tdefs.map(function (d) { var p = cubic(B, d[1], d[2], d[0], 4, 2.5); p.fork = 0; return p; });
    [[0, 0.5, [252, 108], [250, 160]], [3, 0.5, [35, 352], [90, 300]], [1, 0.6, [80, 120], [80, 160]]].forEach(function (d) {
      var f = branches[d[0]].at(d[1]);
      var tw = cubic(f, [lerp(f.x, d[3][0], 0.5), lerp(f.y, d[3][1], 0.5)], d[3], d[2], 2.6, 2.2);
      tw.fork = d[1]; tw.parent = d[0];
      branches.push(tw);
    });

    return { soma: soma, blob: blob, nucleus: nucleus, dendrites: dendrites, leaves: leaves, spines: spines,
      axon: axon, sheaths: sheaths, sites: sites, branches: branches };
  })();

  /* ---------------- timing (ms after a spike starts) ---------------- */
  var T_SOMA = 760, T_AIS = 800, HOP = 72, T_BR = 230;
  G.sites.forEach(function (st, i) { st.t = T_AIS + i * HOP; });
  var T_END = G.sites[G.sites.length - 1].t, T_BOUTON = T_END + 15 + T_BR;
  var PROBE = G.sites[4];

  function axonT(s) {
    var S = G.sites, i;
    if (s <= S[0].s) return S[0].t + 30 * (S[0].s - s) / S[0].s;
    for (i = 0; i < S.length - 1; i++) if (s < S[i + 1].s) return S[i].t + 16 * (s - S[i].s) / (S[i + 1].s - S[i].s);
    return S[S.length - 1].t + 10 * (s - S[S.length - 1].s) / (1 - S[S.length - 1].s);
  }
  G.axon.pts.forEach(function (p) { p.t = axonT(p.s); });
  G.branches.forEach(function (b) {
    var t0 = T_END + 15 + T_BR * b.fork; // twigs start where they leave their parent, all boutons fire together
    b.pts.forEach(function (p) { p.t = t0 + (T_BOUTON - t0) * p.s; });
  });

  // brightness of a site dt ms after it fires
  function ap(dt) { return dt < 0 ? 0 : dt < 22 ? dt / 22 : Math.exp(-(dt - 22) / 130); }
  // membrane potential (mV) dt ms after the probed node fires (slowed down so it can be seen)
  function vm(dt) {
    if (dt < -40) return -70;
    if (dt < 0) { var u = (dt + 40) / 40; return -70 + 15 * u * u; }
    if (dt < 20) return -55 + 95 * Math.sin(dt / 20 * Math.PI / 2);
    if (dt < 90) { var w = (dt - 20) / 70; return 40 - 120 * (0.5 - 0.5 * Math.cos(w * Math.PI)); }
    return -70 - 10 * Math.exp(-(dt - 90) / 120);
  }

  function act(n, now, t) {
    var m = 0, s = n.spikes;
    for (var i = 0; i < s.length; i++) { var v = ap(now - s[i].t0 - t); if (v > m) m = v; }
    return m;
  }
  function somaPre(n, now) {
    var p = 0;
    n.spikes.forEach(function (sp) { sp.inputs.forEach(function (inp) {
      var d = now - sp.t0 - inp.st - inp.dur; if (d > 0) p += 0.3 * Math.exp(-d / 260);
    }); });
    return Math.min(1, p);
  }
  function blips(n, now, fn) {
    n.spikes.forEach(function (sp) { sp.inputs.forEach(function (inp) {
      var u = (now - sp.t0 - inp.st) / inp.dur;
      if (u < 0 || u > 1) return;
      var p = inp.leaf.at(1 - u);
      fn(p.x, p.y, Math.min(1, u * 5) * (u > 0.9 ? (1 - u) * 10 : 1));
    }); });
  }

  /* ---------------- drawing helpers ---------------- */
  function taper(ctx, pts, extra, minW, skipBelow) {
    for (var i = 1; i < pts.length; i++) {
      var w = Math.max(minW || 0, (pts[i - 1].w + pts[i].w) / 2 + extra);
      if (skipBelow && w < skipBelow) continue;
      ctx.lineWidth = w;
      ctx.beginPath(); ctx.moveTo(pts[i - 1].x, pts[i - 1].y); ctx.lineTo(pts[i].x, pts[i].y); ctx.stroke();
    }
  }
  function line(ctx, pts, from) {
    ctx.beginPath();
    for (var i = from || 0; i < pts.length; i++) i === (from || 0) ? ctx.moveTo(pts[i].x, pts[i].y) : ctx.lineTo(pts[i].x, pts[i].y);
    ctx.stroke();
  }
  // lights up the parts of a path whose activation time has come
  function glowLine(ctx, n, now, pts, width) {
    var cap = ctx.lineCap; ctx.lineCap = "butt";
    for (var i = 1; i < pts.length; i++) {
      var I = act(n, now, pts[i].t);
      if (I < 0.02) continue;
      ctx.globalAlpha = I; ctx.lineWidth = width(pts[i]);
      ctx.beginPath(); ctx.moveTo(pts[i - 1].x, pts[i - 1].y); ctx.lineTo(pts[i].x, pts[i].y); ctx.stroke();
    }
    ctx.globalAlpha = 1; ctx.lineCap = cap;
  }
  function blobPath(ctx, sc) {
    var b = G.blob, cx = G.soma.x, cy = G.soma.y; sc = sc || 1;
    ctx.beginPath();
    for (var i = 0; i < b.length; i++) {
      var x = cx + (b[i].x - cx) * sc, y = cy + (b[i].y - cy) * sc;
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.closePath();
  }
  function circle(ctx, x, y, r) { ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); }
  function pill(ctx, l, t) {
    var r = t / 2, x = Math.max(0, l / 2 - r);
    ctx.beginPath(); ctx.moveTo(-x, -r); ctx.lineTo(x, -r); ctx.arc(x, 0, r, -Math.PI / 2, Math.PI / 2);
    ctx.lineTo(-x, r); ctx.arc(-x, 0, r, Math.PI / 2, Math.PI * 1.5); ctx.closePath();
  }
  function glow(ctx, x, y, r, rgb, a) {
    if (a < 0.01) return;
    var g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, "rgba(" + rgb + "," + Math.min(1, a) + ")"); g.addColorStop(1, "rgba(" + rgb + ",0)");
    ctx.fillStyle = g; ctx.fillRect(x - r, y - r, 2 * r, 2 * r);
  }
  function eachSheath(ctx, fn) {
    G.sheaths.forEach(function (sh) { ctx.save(); ctx.translate(sh.x, sh.y); ctx.rotate(sh.a); fn(sh); ctx.restore(); });
  }
  // draws the 1000 x 420 scene at scale k; when the canvas is taller than wide it is turned
  // a quarter turn so the cell body sits at the top and the terminals at the bottom
  function place(ctx, n, k) {
    if (n.vert) ctx.setTransform(0, -k, k, 0, 0, W * k); else ctx.setTransform(k, 0, 0, k, 0, 0);
  }
  function begin(n) {
    var ctx = n.ctx;
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, n.c.width, n.c.height);
    place(ctx, n, n.S * n.dpr);
    ctx.lineCap = ctx.lineJoin = "round";
    return ctx;
  }

  /* ---------------- style 1: realistic ---------------- */
  function drawReal(n, now) {
    var ctx = begin(n), S = n.S, BODY = "#77716a", GOLD = "232,184,74";
    var so = G.soma, nu = G.nucleus;

    ctx.strokeStyle = BODY; ctx.fillStyle = BODY;
    G.dendrites.forEach(function (p) { taper(ctx, p, 0); });
    ctx.globalAlpha = 0.7; ctx.lineWidth = 1.3; ctx.beginPath();
    G.spines.forEach(function (sp) { ctx.moveTo(sp.x, sp.y); ctx.lineTo(sp.ex, sp.ey); }); ctx.stroke();
    ctx.beginPath();
    G.spines.forEach(function (sp) { ctx.moveTo(sp.ex + 2, sp.ey); ctx.arc(sp.ex, sp.ey, 2, 0, TAU); }); ctx.fill(); ctx.globalAlpha = 1;
    taper(ctx, G.axon.pts, 0);
    G.branches.forEach(function (b) { taper(ctx, b.pts, 0); });
    G.branches.forEach(function (b) {
      var o = b.bouton, g = ctx.createRadialGradient(o.x - 3, o.y - 3, 1, o.x, o.y, 11);
      g.addColorStop(0, "#b3ab9e"); g.addColorStop(1, "#6d675f");
      ctx.fillStyle = g; circle(ctx, o.x, o.y, 10); ctx.fill();
      ctx.fillStyle = "#4a4640";
      [[-3, -2], [2, -4], [3, 2], [-2, 3], [0, 0]].forEach(function (v) { circle(ctx, o.x + v[0], o.y + v[1], 1.5); ctx.fill(); });
    });
    var sg = ctx.createRadialGradient(so.x - 15, so.y - 18, 8, so.x, so.y, so.r * 1.1);
    sg.addColorStop(0, "#bdb5a7"); sg.addColorStop(1, BODY);
    ctx.fillStyle = sg; blobPath(ctx); ctx.fill();
    ctx.fillStyle = "#57524b"; ctx.strokeStyle = "#9a9385"; ctx.lineWidth = 1.2;
    circle(ctx, nu.x, nu.y, nu.r); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#2f2c29"; circle(ctx, nu.x + 5, nu.y + 4, 6); ctx.fill();

    // current spreading inside the axon (mostly hidden by myelin)
    ctx.globalCompositeOperation = "lighter"; ctx.strokeStyle = "rgb(" + GOLD + ")";
    glowLine(ctx, n, now, G.axon.pts, function (p) { return Math.min(p.w, 7) + 4; });
    ctx.globalCompositeOperation = "source-over";

    eachSheath(ctx, function (sh) {
      var lg = ctx.createLinearGradient(0, -sh.th / 2, 0, sh.th / 2);
      lg.addColorStop(0, "#5f594f"); lg.addColorStop(0.35, "#d6cdbb"); lg.addColorStop(0.55, "#c4baa7"); lg.addColorStop(1, "#4f4a42");
      ctx.globalAlpha = 0.9; ctx.fillStyle = lg; pill(ctx, sh.len, sh.th); ctx.fill(); ctx.globalAlpha = 1;
      ctx.strokeStyle = "rgba(40,36,30,.28)"; ctx.lineWidth = 0.8;
      pill(ctx, sh.len - 5, sh.th * 0.7); ctx.stroke(); pill(ctx, sh.len - 10, sh.th * 0.42); ctx.stroke();
    });

    ctx.globalCompositeOperation = "lighter";
    var si = act(n, now, T_SOMA), pre = somaPre(n, now);
    glow(ctx, so.x, so.y, 120, GOLD, 0.55 * si + 0.25 * pre);
    blips(n, now, function (x, y, i) { glow(ctx, x, y, 16, GOLD, 0.7 * i); });
    G.sites.forEach(function (st) {
      var I = act(n, now, st.t);
      glow(ctx, st.x, st.y, 28, GOLD, I); glow(ctx, st.x, st.y, 7, "255,244,214", I);
    });
    ctx.strokeStyle = "rgb(" + GOLD + ")";
    G.branches.forEach(function (b) { glowLine(ctx, n, now, b.pts, function () { return 5; }); });
    var bi = act(n, now, T_BOUTON);
    G.branches.forEach(function (b) { glow(ctx, b.bouton.x, b.bouton.y, 26, GOLD, bi); });
    n.parts.forEach(function (p) {
      ctx.globalAlpha = 1 - p.age / p.life; ctx.fillStyle = "rgb(" + GOLD + ")";
      circle(ctx, p.x, p.y, p.r * 0.8); ctx.fill();
    });
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";

    // membrane potential trace, recorded at one node of Ranvier
    n.trace.push({ t: now, v: vmAt(n, now, PROBE.t) });
    while (n.trace.length && now - n.trace[0].t > 2400) n.trace.shift();
    var bx = 330, by = 38, bw = 250, bh = 78;
    function vy(v) { return by + bh * (1 - (v + 90) / 140); }
    ctx.strokeStyle = "rgba(138,133,124,.45)"; ctx.lineWidth = 1 / S; ctx.setLineDash([3 / S, 3 / S]);
    ctx.beginPath(); ctx.moveTo(bx, vy(-70)); ctx.lineTo(bx + bw, vy(-70)); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(PROBE.x, by + bh + 8); ctx.lineTo(PROBE.x, PROBE.y - 17); ctx.stroke();
    ctx.setLineDash([]);
    circle(ctx, PROBE.x, PROBE.y, 15); ctx.stroke();
    ctx.strokeStyle = "rgb(" + GOLD + ")"; ctx.lineWidth = 1.4 / S; ctx.beginPath();
    n.trace.forEach(function (p, i) {
      var x = bx + bw * (1 - (now - p.t) / 2400), y = vy(p.v);
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    });
    ctx.stroke();
    ctx.fillStyle = "#8a857c"; ctx.font = (10 / S) + "px Inter, system-ui, sans-serif"; ctx.textBaseline = "alphabetic";
    ctx.fillText("membrane potential", bx, by - 6 / S);
    ctx.fillText("−70 mV", bx + bw + 5 / S, vy(-70) + 3.5 / S);
  }
  function vmAt(n, now, t) {
    var d = 0; n.spikes.forEach(function (sp) { d += vm(now - sp.t0 - t) + 70; });
    return clamp(-70 + d, -95, 55);
  }

  /* ---------------- style 2: pixel ---------------- */
  var PAL = [[58, 55, 51], [110, 106, 98], [163, 157, 146], [233, 228, 218], [138, 106, 42], [201, 162, 74], [255, 241, 196]];
  var BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(function (v) { return (v + 0.5) / 16 - 0.5; });
  function quantize(ctx, w, h) {
    var img = ctx.getImageData(0, 0, w, h), d = img.data;
    for (var y = 0; y < h; y++) for (var x = 0; x < w; x++) {
      var i = (y * w + x) * 4, a = d[i + 3] / 255;
      if (a === 0) continue;
      var b = BAYER[(y & 3) * 4 + (x & 3)];
      if (a + b * 0.6 < 0.5) { d[i + 3] = 0; continue; }
      var r = d[i] + b * 40, g = d[i + 1] + b * 40, bl = d[i + 2] + b * 40, best = 0, bd = 1e9;
      for (var k = 0; k < PAL.length; k++) {
        var p = PAL[k], dr = r - p[0], dg = g - p[1], db = bl - p[2], dd = dr * dr * 0.3 + dg * dg * 0.59 + db * db * 0.11;
        if (dd < bd) { bd = dd; best = k; }
      }
      d[i] = PAL[best][0]; d[i + 1] = PAL[best][1]; d[i + 2] = PAL[best][2]; d[i + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
  }
  function drawPixel(n, now) {
    var L = n.lctx, lw = n.low.width, lh = n.low.height, k = lw / (n.vert ? H : W), so = G.soma, nu = G.nucleus;
    var C = { d: "#3a3733", b: "#6e6a62", l: "#a39d92", t: "#e9e4da", g: "#c9a24a", h: "#fff1c4" };
    L.setTransform(1, 0, 0, 1, 0, 0); L.clearRect(0, 0, lw, lh); place(L, n, k);
    L.lineCap = L.lineJoin = "round";

    L.strokeStyle = C.b; L.fillStyle = C.b;
    G.dendrites.forEach(function (p) { taper(L, p, 0, 7); });
    taper(L, G.axon.pts, 0, 7);
    G.branches.forEach(function (b) { taper(L, b.pts, 0, 7); circle(L, b.bouton.x, b.bouton.y, 14); L.fill(); });
    var sg = L.createRadialGradient(so.x - 15, so.y - 18, 6, so.x, so.y, so.r * 1.05);
    sg.addColorStop(0, C.l); sg.addColorStop(1, C.b);
    L.fillStyle = sg; blobPath(L); L.fill();
    L.fillStyle = C.d; circle(L, nu.x, nu.y, 22); L.fill();
    L.fillStyle = C.b; circle(L, nu.x + 6, nu.y + 5, 6); L.fill();

    L.strokeStyle = C.g; glowLine(L, n, now, G.axon.pts, function () { return 12; });
    eachSheath(L, function (sh) {
      L.fillStyle = C.d; pill(L, sh.len + 8, sh.th + 8); L.fill();
      L.fillStyle = C.l; pill(L, sh.len, sh.th); L.fill();
      L.strokeStyle = C.t; L.lineWidth = 5; L.beginPath(); L.moveTo(-sh.len * 0.28, -sh.th * 0.2); L.lineTo(sh.len * 0.18, -sh.th * 0.2); L.stroke();
    });

    var si = act(n, now, T_SOMA), pre = somaPre(n, now);
    L.fillStyle = C.g; L.globalAlpha = Math.min(1, si * 0.85 + pre * 0.35); blobPath(L); L.fill(); L.globalAlpha = 1;
    blips(n, now, function (x, y, i) { L.globalAlpha = i; L.fillStyle = C.h; circle(L, x, y, 10); L.fill(); });
    G.sites.forEach(function (st) {
      var I = act(n, now, st.t); if (I < 0.02) return;
      L.globalAlpha = I * 0.8; L.fillStyle = C.g; circle(L, st.x, st.y, 10 + 16 * I); L.fill();
      L.globalAlpha = I; L.fillStyle = C.h; circle(L, st.x, st.y, 7); L.fill();
    });
    L.globalAlpha = 1; L.strokeStyle = C.g;
    G.branches.forEach(function (b) { glowLine(L, n, now, b.pts, function () { return 9; }); });
    var bi = act(n, now, T_BOUTON);
    if (bi > 0.02) G.branches.forEach(function (b) {
      L.globalAlpha = bi; L.fillStyle = C.g; circle(L, b.bouton.x, b.bouton.y, 14 + 8 * bi); L.fill();
      L.fillStyle = C.h; circle(L, b.bouton.x, b.bouton.y, 7); L.fill();
    });
    n.parts.forEach(function (p) {
      L.globalAlpha = 1 - p.age / p.life; L.fillStyle = C.h; L.fillRect(p.x - 3.5, p.y - 3.5, 7, 7);
    });
    L.globalAlpha = 1;
    quantize(L, lw, lh);

    var ctx = n.ctx;
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, n.c.width, n.c.height);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(n.low, 0, 0, lw * n.P * n.dpr, lh * n.P * n.dpr);
  }

  /* ---------------- style 3: Dexter ("lab" cartoon or "showtime" blood) ---------------- */
  function bolt(ctx, x, y, ang, len) {
    var dx = Math.cos(ang), dy = Math.sin(ang);
    ctx.beginPath(); ctx.moveTo(x + dx * 9, y + dy * 9);
    for (var j = 1; j <= 4; j++) {
      var r = 9 + j * len / 4, off = j === 4 ? 0 : (j % 2 ? 6 : -6);
      ctx.lineTo(x + dx * r - dy * off, y + dy * r + dx * off);
    }
    ctx.stroke();
  }
  function star(ctx, x, y, r0, r1, pts, rot) {
    ctx.beginPath();
    for (var i = 0; i < pts * 2; i++) {
      var a = rot + i * Math.PI / pts, r = i % 2 ? r0 : r1;
      i ? ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r) : ctx.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
    }
    ctx.closePath();
  }
  function drawDexter(n, now) {
    if (n.palette === "showtime") return drawShowtime(n, now);
    var ctx = begin(n), so = G.soma, nu = G.nucleus, o = 5;
    var OUT = "#120b1a", PUR = "#8b56cc", PUR2 = "#a97ee6", ORG = "#ff7a1c", WHT = "#f7f4ec", TEAL = "#36c2bd", YEL = "#ffe14a";

    // outlines first, then fills on top: gives one outline around the whole cell
    ctx.strokeStyle = OUT; ctx.fillStyle = OUT;
    G.dendrites.forEach(function (p) { taper(ctx, p, 2 * o); });
    taper(ctx, G.axon.pts, 2 * o);
    G.branches.forEach(function (b) { taper(ctx, b.pts, 2 * o); circle(ctx, b.bouton.x, b.bouton.y, 10 + o); ctx.fill(); });
    blobPath(ctx); ctx.lineWidth = 2 * o; ctx.fill(); ctx.stroke();

    ctx.strokeStyle = PUR; ctx.fillStyle = PUR;
    G.dendrites.forEach(function (p) { taper(ctx, p, 0, 3); });
    taper(ctx, G.axon.pts, 0, 4);
    G.branches.forEach(function (b) { taper(ctx, b.pts, 0, 4); circle(ctx, b.bouton.x, b.bouton.y, 10); ctx.fill(); });
    blobPath(ctx); ctx.fill();

    var si = act(n, now, T_SOMA), pre = somaPre(n, now);
    ctx.save(); blobPath(ctx); ctx.clip();
    ctx.fillStyle = PUR2; circle(ctx, so.x - 22, so.y - 24, 30); ctx.fill();
    ctx.fillStyle = "rgba(18,11,26,.25)"; circle(ctx, so.x + 30, so.y + 34, 50); ctx.fill();
    ctx.globalAlpha = pre * 0.5; ctx.fillStyle = TEAL; ctx.fillRect(so.x - 90, so.y - 90, 180, 180);
    ctx.globalAlpha = Math.min(1, si * 0.9); ctx.fillStyle = YEL; ctx.fillRect(so.x - 90, so.y - 90, 180, 180);
    ctx.restore();

    ctx.fillStyle = OUT; circle(ctx, nu.x, nu.y, nu.r + 4); ctx.fill();
    ctx.fillStyle = ORG; circle(ctx, nu.x, nu.y, nu.r); ctx.fill();
    ctx.fillStyle = "#c4520c"; circle(ctx, nu.x + 6, nu.y + 6, 5); ctx.fill();
    ctx.fillStyle = WHT; circle(ctx, nu.x - 8, nu.y - 9, 4.5); ctx.fill();

    ctx.strokeStyle = YEL;
    glowLine(ctx, n, now, G.axon.pts, function (p) { return Math.max(4, p.w) + 3; });
    G.branches.forEach(function (b) { glowLine(ctx, n, now, b.pts, function () { return 7; }); });
    var bi = act(n, now, T_BOUTON);
    ctx.globalAlpha = bi; ctx.fillStyle = YEL;
    G.branches.forEach(function (b) { circle(ctx, b.bouton.x, b.bouton.y, 10); ctx.fill(); });
    ctx.globalAlpha = 1;

    blips(n, now, function (x, y, i) {
      ctx.globalAlpha = i; ctx.fillStyle = OUT; circle(ctx, x, y, 9); ctx.fill();
      ctx.fillStyle = YEL; circle(ctx, x, y, 5.5); ctx.fill(); ctx.globalAlpha = 1;
    });

    eachSheath(ctx, function (sh) {
      ctx.fillStyle = OUT; pill(ctx, sh.len + 2 * o, sh.th + 2 * o); ctx.fill();
      ctx.fillStyle = WHT; pill(ctx, sh.len, sh.th); ctx.fill();
      ctx.save(); pill(ctx, sh.len, sh.th); ctx.clip();
      ctx.fillStyle = "#c4e9e5"; ctx.fillRect(-sh.len / 2, sh.th * 0.12, sh.len, sh.th); ctx.restore();
      ctx.strokeStyle = "#fff"; ctx.lineWidth = 3; ctx.beginPath();
      ctx.moveTo(-sh.len * 0.3, -sh.th * 0.22); ctx.lineTo(sh.len * 0.08, -sh.th * 0.22); ctx.stroke();
    });

    var tick = Math.floor(now / 70);
    G.sites.forEach(function (st, idx) {
      var I = act(n, now, st.t);
      ctx.fillStyle = OUT; circle(ctx, st.x, st.y, 7.5); ctx.fill();
      ctx.fillStyle = I > 0.08 ? YEL : TEAL; circle(ctx, st.x, st.y, 4.5); ctx.fill();
      if (I < 0.08) return;
      var r = rng(tick * 31 + idx * 7 + 3); r(); r();
      for (var j = 0; j < 4; j++) {
        var ang = j * TAU / 4 + r() * 1.2, len = (14 + 26 * I) * (0.7 + r() * 0.5);
        ctx.strokeStyle = OUT; ctx.lineWidth = 6; bolt(ctx, st.x, st.y, ang, len);
        ctx.strokeStyle = YEL; ctx.lineWidth = 2.6; bolt(ctx, st.x, st.y, ang, len);
      }
    });

    var cols = [YEL, TEAL, ORG];
    n.parts.forEach(function (p) {
      ctx.globalAlpha = 1 - p.age / p.life;
      ctx.fillStyle = OUT; circle(ctx, p.x, p.y, p.r + 2.5); ctx.fill();
      ctx.fillStyle = cols[p.k]; circle(ctx, p.x, p.y, p.r); ctx.fill();
    });
    ctx.globalAlpha = 1;

    n.fx.forEach(function (f) {
      var a = now - f.t0, s = a < 200 ? backOut(a / 200) : 1;
      ctx.save(); ctx.globalAlpha = a > 700 ? Math.max(0, 1 - (a - 700) / 300) : 1;
      ctx.translate(f.x, f.y); ctx.rotate(f.rot); ctx.scale(s, s);
      star(ctx, 0, 0, 34, 54, 11, f.rot * 3); ctx.fillStyle = ORG; ctx.fill(); ctx.lineWidth = 5; ctx.strokeStyle = OUT; ctx.stroke();
      ctx.font = '900 30px "Arial Black", Impact, system-ui, sans-serif'; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.lineWidth = 7; ctx.strokeText(f.text, 0, 2); ctx.fillStyle = YEL; ctx.fillText(f.text, 0, 2);
      ctx.restore();
    });
  }
  function backOut(t) { var c = 1.7; t -= 1; return 1 + (c + 1) * t * t * t + c * t * t; }

  function drawShowtime(n, now) {
    var ctx = begin(n), so = G.soma, nu = G.nucleus;
    var LINE = "#ece6da", BG = "#0b0b0c", RED = "#a30d1b", RED2 = "#c8142a";

    // fine line drawing, like a sketch
    ctx.strokeStyle = LINE; ctx.lineWidth = 2.6;
    line(ctx, G.axon.pts, 5);
    G.branches.forEach(function (b) { line(ctx, b.pts); });
    ctx.strokeStyle = LINE; ctx.fillStyle = LINE;
    G.dendrites.forEach(function (p) { taper(ctx, p, 4.6); });
    blobPath(ctx); ctx.lineWidth = 4.6; ctx.fill(); ctx.stroke();
    ctx.strokeStyle = BG; ctx.fillStyle = BG;
    G.dendrites.forEach(function (p) { taper(ctx, p, -0.2, 0, 1); });
    blobPath(ctx); ctx.fill();

    var si = act(n, now, T_SOMA), pre = somaPre(n, now);
    ctx.globalAlpha = Math.min(1, si * 0.8 + pre * 0.25); ctx.fillStyle = RED; blobPath(ctx, 0.93); ctx.fill(); ctx.globalAlpha = 1;
    blips(n, now, function (x, y, i) { ctx.globalAlpha = i; ctx.fillStyle = RED2; circle(ctx, x, y, 4.5); ctx.fill(); ctx.globalAlpha = 1; });

    ctx.strokeStyle = RED2;
    glowLine(ctx, n, now, G.axon.pts, function () { return 5.5; });
    G.branches.forEach(function (b) { glowLine(ctx, n, now, b.pts, function () { return 5; }); });

    ctx.strokeStyle = LINE; ctx.lineWidth = 2.4;
    eachSheath(ctx, function (sh) { ctx.beginPath(); ctx.ellipse(0, 0, sh.len / 2 + 7, sh.th / 2 + 1, 0, 0, TAU); ctx.stroke(); });
    ctx.beginPath(); ctx.ellipse(nu.x, nu.y, 23, 19, -0.3, 0, TAU);
    var ng = ctx.createRadialGradient(nu.x - 7, nu.y - 7, 2, nu.x, nu.y, 24);
    ng.addColorStop(0, "#bfe6ff"); ng.addColorStop(1, "#5fb4ea"); // sky blue nucleus
    ctx.fillStyle = ng; ctx.fill(); ctx.stroke();

    var bi = act(n, now, T_BOUTON);
    G.branches.forEach(function (b) {
      var o = b.bouton;
      ctx.fillStyle = BG; circle(ctx, o.x, o.y, 9); ctx.fill();
      ctx.globalAlpha = bi; ctx.fillStyle = RED2; ctx.fill(); ctx.globalAlpha = 1;
      ctx.strokeStyle = LINE; ctx.stroke();
    });
    G.sites.forEach(function (st) {
      var I = act(n, now, st.t); if (I < 0.02) return;
      ctx.globalAlpha = I; ctx.fillStyle = RED2; circle(ctx, st.x, st.y, 3 + 5 * I); ctx.fill();
    });
    ctx.globalAlpha = 1;

    n.fx.forEach(function (f) {
      var a = now - f.t0;
      ctx.globalAlpha = a < 1800 ? 0.9 : Math.max(0, 0.9 * (1 - (a - 1800) / 700)); ctx.fillStyle = RED;
      f.dots.forEach(function (d) { circle(ctx, f.x + d.dx, f.y + d.dy, d.r); ctx.fill(); });
    });
    ctx.fillStyle = RED2;
    n.parts.forEach(function (p) {
      ctx.globalAlpha = 1 - p.age / p.life;
      var sp = Math.hypot(p.vx, p.vy);
      ctx.beginPath(); ctx.ellipse(p.x, p.y, p.r * (1 + sp * 18), p.r, Math.atan2(p.vy, p.vx), 0, TAU); ctx.fill();
    });
    ctx.globalAlpha = 1;
  }

  var DRAW = { real: drawReal, pixel: drawPixel, dexter: drawDexter };

  /* ---------------- one animated canvas ---------------- */
  function Neuron(c) {
    var self = this;
    this.c = c; this.ctx = c.getContext("2d");
    this.style = DRAW[c.getAttribute("data-style")] ? c.getAttribute("data-style") : "real";
    this.palette = c.getAttribute("data-palette") || "lab";
    this.spikes = []; this.parts = []; this.fx = []; this.trace = [];
    this.visible = true; this.cw = 0; this.last = 0;
    this.reduce = !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);
    this.next = performance.now() + 600;
    if (this.style === "pixel") { this.low = document.createElement("canvas"); this.lctx = this.low.getContext("2d", { willReadFrequently: true }); }
    c.addEventListener("click", function () { self.fire(performance.now()); });
    if ("IntersectionObserver" in window) new IntersectionObserver(function (e) { self.visible = e[0].isIntersecting; }).observe(c);
  }
  Neuron.prototype.fire = function (now) {
    var last = this.spikes[this.spikes.length - 1];
    if (last && now - last.t0 < 500) return; // refractory period
    var ins = [];
    for (var i = 0; i < 3; i++) ins.push({ leaf: G.leaves[Math.floor(Math.random() * G.leaves.length)], st: Math.random() * 260, dur: 380 + Math.random() * 120 });
    this.spikes.push({ t0: now, inputs: ins, released: false });
  };
  Neuron.prototype.release = function (now) {
    var show = this.style === "dexter" && this.palette === "showtime", self = this;
    G.branches.forEach(function (b) {
      var o = b.bouton;
      for (var k = 0; k < 7; k++) {
        var a = o.a + (Math.random() - 0.5) * 1.8, sp = 0.03 + Math.random() * 0.05;
        self.parts.push({ x: o.x + Math.cos(o.a) * 10, y: o.y + Math.sin(o.a) * 10, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
          age: 0, life: 700 + Math.random() * 500, r: 2 + Math.random() * 2, g: show ? 0.0004 : 0, k: k % 3 });
      }
      if (show) {
        var dots = [{ dx: 0, dy: 0, r: 6 + Math.random() * 3 }];
        for (var j = 0; j < 6; j++) {
          var ang = o.a + (Math.random() - 0.5) * 2, dist = 12 + Math.random() * 22;
          dots.push({ dx: Math.cos(ang) * dist, dy: Math.sin(ang) * dist, r: 1.5 + Math.random() * 2.5 });
        }
        self.fx.push({ x: o.x + Math.cos(o.a) * 16, y: o.y + Math.sin(o.a) * 16, t0: now, life: 2500, dots: dots });
      }
    });
    if (this.style === "dexter" && !show) {
      var b = G.branches[Math.floor(Math.random() * G.branches.length)].bouton;
      var words = ["ZAP!", "BZZT!", "POW!", "FZZT!"];
      this.fx.push({ x: clamp(b.x + 75, 90, 380), y: clamp(b.y - 10, 60, 360), t0: now, life: 1000,
        rot: (Math.random() - 0.5) * 0.4, text: words[Math.floor(Math.random() * words.length)] });
    }
  };
  Neuron.prototype.resize = function () {
    var cw = this.c.clientWidth, ch = this.c.clientHeight, dpr = window.devicePixelRatio || 1;
    if (cw === this.cw && ch === this.ch && dpr === this.dpr) return;
    this.cw = cw; this.ch = ch; this.dpr = dpr; this.vert = ch > cw;
    var long = this.vert ? ch : cw;
    this.S = long / W;
    this.c.width = Math.round(cw * dpr); this.c.height = Math.round(ch * dpr);
    if (this.low) {
      this.P = Math.max(2, Math.round(long / 190));
      this.low.width = Math.ceil(cw / this.P); this.low.height = Math.ceil(ch / this.P);
    }
  };
  Neuron.prototype.frame = function (now) {
    var dt = Math.min(50, now - (this.last || now)), i;
    this.last = now;
    if (!this.visible) return;
    this.resize();
    if (!this.cw) return;
    if (!this.reduce && now >= this.next) { this.fire(now); this.next = now + 2600 + Math.random() * 1400; }
    for (i = this.spikes.length - 1; i >= 0; i--) {
      var sp = this.spikes[i];
      if (!sp.released && now - sp.t0 >= T_BOUTON) { sp.released = true; this.release(now); }
      if (now - sp.t0 > 4000) this.spikes.splice(i, 1);
    }
    var damp = Math.pow(0.998, dt);
    for (i = this.parts.length - 1; i >= 0; i--) {
      var p = this.parts[i];
      p.age += dt; if (this.vert) p.vx -= p.g * dt; else p.vy += p.g * dt; p.vx *= damp; p.vy *= damp; p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.age > p.life) this.parts.splice(i, 1);
    }
    for (i = this.fx.length - 1; i >= 0; i--) if (now - this.fx[i].t0 > this.fx[i].life) this.fx.splice(i, 1);
    DRAW[this.style](this, now);
  };

  var list = [];
  function loop(now) { for (var i = 0; i < list.length; i++) list[i].frame(now); requestAnimationFrame(loop); }
  function init() {
    // preview helper: index.html?neuron=pixel | dexter | dexter-showtime | real
    var q = new URLSearchParams(location.search).get("neuron");
    document.querySelectorAll("canvas.neuron").forEach(function (c) {
      if (q && c.id === "neuron") { var s = q.split("-"); c.setAttribute("data-style", s[0]); if (s[1]) c.setAttribute("data-palette", s[1]); }
      list.push(new Neuron(c));
    });
    if (list.length) requestAnimationFrame(loop);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
