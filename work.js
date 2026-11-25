// Work page: a culture of neurons, drawn like a fluorescence micrograph and
// pixelated. Each glowing cell body is one project; hovering over it (or tapping it)
// opens its card. Neighbouring cells are wired together into one network, and each
// cell's neurites keep branching until they fill the whole page. No line ever
// touches another: each new piece is checked against everything already drawn
// before it is kept. Clicking a cell sends one action potential out along all of
// its branches as a wave of bright pixels.
(function () {
  const map = document.getElementById("mindmap");
  if (!map) return;
  const nodes = [...map.querySelectorAll(".mm-node")];
  const N = nodes.length;
  const put = (el, x, y) => { el.style.left = x + "px"; el.style.top = y + "px"; };
  const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
  let mode = "oval", spots = [];

  /* ---------------- where the cells sit ---------------- */

  // wide screens: evenly round an oval, with room for an open card at every cell.
  // If the window is too narrow for that, the map grows taller.
  function oval(w, h) {
    mode = "oval";
    const card = nodes[0].querySelector(".mm-card");
    const bw = card.offsetWidth, bh = card.offsetHeight;
    for (let tries = 0; tries < 20; tries++, h += 50) {
      spots = ring(w, h, bw, bh);
      const clear = spots.every((p, i) => spots.every((q, j) =>
        j <= i || Math.abs(p.x - q.x) >= bw + 16 || Math.abs(p.y - q.y) >= bh + 16));
      if (clear) break;
    }
    map.style.height = h + "px";
  }
  // walk the oval in "card units" so the gap between neighbours is even all the way round
  function ring(w, h, bw, bh) {
    const cx = w / 2, cy = h / 2, rx = cx - bw / 2 - 4, ry = cy - bh / 2 - 4;
    const K = 720, pts = [], len = [0];
    for (let i = 0; i <= K; i++) {
      const a = -Math.PI / 2 + (i / K) * Math.PI * 2;
      pts.push({ x: cx + rx * Math.cos(a), y: cy + ry * Math.sin(a) });
      if (i) len.push(len[i - 1] + Math.hypot((pts[i].x - pts[i - 1].x) / bw, (pts[i].y - pts[i - 1].y) / bh));
    }
    const step = len[K] / N;
    let j = 0;
    return nodes.map((n, i) => {
      const want = step * (i + 0.5);
      while (len[j + 1] < want) j++;
      return { x: pts[j].x, y: pts[j].y };
    });
  }
  // phones: a zigzag down the page
  function column(w) {
    mode = "column";
    const gap = 112, top = 70;
    spots = nodes.map((n, i) => ({ x: w * (i % 2 ? 0.7 : 0.3), y: top + i * gap }));
    map.style.height = top * 2 + (N - 1) * gap + "px";
  }

  let lastW = -1, lastH = -1;
  function layout() {
    map.style.height = "";                    // back to the stylesheet height before measuring
    const w = map.clientWidth;
    if (w < 700) column(w); else oval(w, map.clientHeight);
    nodes.forEach((n, i) => put(n, spots[i].x, spots[i].y));
    const pw = document.documentElement.clientWidth;
    if (pw === lastW && map.clientHeight === lastH) return;   // nothing moved: keep the culture as it is
    lastW = pw; lastH = map.clientHeight;
    build();
  }

  /* ---------------- growing the network ---------------- */

  const P = 2;                                // one art pixel = 2 screen pixels
  const cv = document.createElement("canvas");
  cv.className = "mm-neurons"; cv.setAttribute("aria-hidden", "true");
  map.prepend(cv);
  const ctx = cv.getContext("2d");
  const low = document.createElement("canvas"), L = low.getContext("2d");      // drawn small, shown big
  const still = document.createElement("canvas"), S = still.getContext("2d");  // nuclei + the far neurites, drawn once
  let W = 0, H = 0, OX = 0, OY = 0, somas = [], near = [], far = [];
  const NEAR = 120;                           // neurites closer than this to their cell sway; the rest hold still

  // a tiny seeded random so the culture keeps the same shape on every resize
  const rand = s => () => (s = (s * 16807) % 2147483647) / 2147483647;

  // occupancy grid over the whole page: 3px cells, each remembers which neuron took it.
  // A neurite keeps 3px from its own cell's lines and 6px from anyone else's.
  const G = 3, WALL = 254;
  let grid, gw, gh;
  const cellAt = (x, y) => { const i = Math.floor((x + OX) / G), j = Math.floor((y + OY) / G); return i < 0 || j < 0 || i >= gw || j >= gh ? -1 : j * gw + i; };
  function free(x, y, me) {
    const i = Math.floor((x + OX) / G), j = Math.floor((y + OY) / G);
    if (i < 2 || j < 2 || i >= gw - 2 || j >= gh - 2) return false;
    for (let dj = -2; dj <= 2; dj++) for (let di = -2; di <= 2; di++) {
      const v = grid[(j + dj) * gw + i + di];
      if (v && (v !== me + 1 || (Math.abs(di) <= 1 && Math.abs(dj) <= 1))) return false;
    }
    return true;
  }
  function mark(a, b, me) {
    const n = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 1.5));
    for (let k = 0; k <= n; k++) { const c = cellAt(a.x + (b.x - a.x) * k / n, a.y + (b.y - a.y) * k / n); if (c >= 0) grid[c] = me + 1; }
  }
  function clear(a, b, skip, me) {            // can a segment go from a to b without touching anything?
    const len = Math.hypot(b.x - a.x, b.y - a.y), n = Math.max(1, Math.ceil(len / 1.5));
    for (let k = 0; k <= n; k++) if ((k === n || k * len / n >= skip) && !free(a.x + (b.x - a.x) * k / n, a.y + (b.y - a.y) * k / n, me)) return false;
    return true;
  }
  function disc(c, r, me) {
    for (let y = c.y - r; y <= c.y + r; y += G) for (let x = c.x - r; x <= c.x + r; x += G)
      if (Math.hypot(x - c.x, y - c.y) <= r) { const k = cellAt(x, y); if (k >= 0) grid[k] = me + 1; }
  }
  function wall(r) {                          // keep neurites out of a rectangle given in map coordinates
    for (let y = r.t; y <= r.b; y += G) for (let x = r.l; x <= r.r; x += G) { const k = cellAt(x, y); if (k >= 0) grid[k] = WALL; }
  }

  function build() {
    // the canvas covers the whole page; map coordinates are shifted by OX, OY onto it
    const mr = map.getBoundingClientRect();
    OX = Math.round(mr.left + scrollX); OY = Math.round(mr.top + scrollY);
    W = document.documentElement.clientWidth; H = Math.max(innerHeight, OY + map.clientHeight + 120);
    const dpr = window.devicePixelRatio || 1;
    cv.style.left = -OX + "px"; cv.style.top = -OY + "px";
    cv.style.width = W + "px"; cv.style.height = H + "px";
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    low.width = still.width = Math.ceil(W / P); low.height = still.height = Math.ceil(H / P);
    gw = Math.ceil(W / G); gh = Math.ceil(H / G); grid = new Uint8Array(gw * gh);
    const R0 = mode === "oval" ? (map.clientWidth > 1000 ? 16 : 14) : 13;
    const R = rand(20261125);
    const segs = [];

    // the menu gets a clear patch so its links stay readable
    const nav = document.querySelector(".side nav");
    if (nav) { const n = nav.getBoundingClientRect(); wall({ l: n.left - mr.left - 14, t: n.top - mr.top - 12, r: n.right - mr.left + 14, b: n.bottom - mr.top + 12 }); }

    // the cell bodies: lumpy blobs, each with its own wobble
    somas = spots.map(p => ({
      x: p.x, y: p.y, r: R0 * (0.9 + R() * 0.25), ph: R() * 6.28, lob: [R() * 6.28, R() * 6.28, R() * 6.28], hot: 0, fired: -1, reach: 0
    }));
    somas.forEach((s, i) => disc(s, s.r + 3, i));

    // one network: each cell sends a wavy process to its neighbour (round the oval, or down the zigzag)
    const pairs = mode === "oval" ? somas.map((s, i) => [i, (i + 1) % N]) : somas.slice(1).map((s, i) => [i, i + 1]);
    pairs.forEach(([i, j]) => {
      const a = somas[i], b = somas[j], dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy);
      const ux = dx / d, uy = dy / d, nx = -uy, ny = ux, ph = R() * 6.28, waves = 1 + R() * 1.5;
      const s0 = a.r + 6, s1 = d - b.r - 6, pts = [];
      for (let s = s0; s <= s1; s += 4) {
        const f = (s - s0) / (s1 - s0), amp = 7 * Math.sin(Math.PI * f) * Math.sin(ph + f * waves * 6.28);
        pts.push({ x: a.x + ux * s + nx * amp, y: a.y + uy * s + ny * amp });
      }
      segs.push({ a: { x: a.x + ux * a.r * 0.8, y: a.y + uy * a.r * 0.8 }, b: pts[0], w: 2.4, d: 0, own: i, link: true, f: 0 });
      let run = s0;
      for (let k = 1; k < pts.length; k++) {
        mark(pts[k - 1], pts[k], i);
        segs.push({ a: pts[k - 1], b: pts[k], w: 2.4, d: run, own: i, link: true, f: k / pts.length });
        run += Math.hypot(pts[k].x - pts[k - 1].x, pts[k].y - pts[k - 1].y);
      }
      segs.push({ a: pts[pts.length - 1], b: { x: b.x - ux * b.r * 0.8, y: b.y - uy * b.r * 0.8 }, w: 2.4, d: run, own: i, link: true, f: 1 });
    });

    // then the neurites, a step at a time, taking turns, until there is no room left on the page
    const tips = somas.map(() => []);
    somas.forEach((s, i) => {
      const seeds = mode === "oval" ? 13 : 7;
      for (let k = 0; k < seeds; k++) {
        const a = (k + R() * 0.7) * 6.283 / seeds + s.ph, ax = Math.cos(a), ay = Math.sin(a);
        const out = { x: s.x + ax * (s.r + 9), y: s.y + ay * (s.r + 9) }, start = { x: s.x + ax * (s.r + 15), y: s.y + ay * (s.r + 15) };
        if (!clear(out, start, 0, i)) continue;
        mark(out, start, i);
        segs.push({ a: { x: s.x + ax * s.r * 0.8, y: s.y + ay * s.r * 0.8 }, b: start, w: 2.4, d: 0, own: i });
        tips[i].push({ x: start.x, y: start.y, a, w: 2, d: 15, depth: 0 });
      }
    });
    for (let round = 0, any = true; any && round < 3000; round++) {
      any = false;
      tips.forEach((list, i) => {
        const next = [];
        list.forEach(t => {
          let placed = false;
          for (let tries = 0; tries < 5 && !placed; tries++) {
            const a = t.a + (R() - 0.5) * (0.45 + tries * 0.55), step = 7 + R() * 4;
            const b = { x: t.x + Math.cos(a) * step, y: t.y + Math.sin(a) * step };
            if (!clear(t, b, 6, i)) continue;     // skip the first 6px: that is where it joins its own line
            mark(t, b, i);
            segs.push({ a: { x: t.x, y: t.y }, b, w: t.w, d: t.d, own: i });
            Object.assign(t, { x: b.x, y: b.y, a, w: Math.max(0.7, t.w * 0.97), d: t.d + step });
            placed = true;
          }
          if (!placed) return;                // boxed in: this branch stops here
          next.push(t);
          if (t.depth < 14 && R() < 0.17) {    // fork, so the branches spread into every gap
            const side = R() < 0.5 ? -1 : 1;
            next.push({ x: t.x, y: t.y, a: t.a + side * (0.5 + R() * 0.6), w: Math.max(0.7, t.w * 0.8), d: t.d, depth: t.depth + 1 });
            t.a -= side * 0.2; t.depth++;
          }
        });
        tips[i] = next;
        if (next.length) any = true;
      });
    }
    // near neurites sway a little (tips most, never more than 1.2px); the far ones hold still
    segs.forEach(s => {
      s.sw = s.link ? 0.8 * Math.sin(Math.PI * s.f) : Math.min(1, s.d / NEAR) * 1.2;
      s.ph = (s.a.x * 0.013 + s.a.y * 0.017) % 6.28;
      s.len = Math.hypot(s.b.x - s.a.x, s.b.y - s.a.y);
      somas[s.own].reach = Math.max(somas[s.own].reach, s.d + s.len);
    });
    near = segs.filter(s => s.link || s.d < NEAR);
    far = segs.filter(s => !s.link && s.d >= NEAR);
    somas.forEach((s, i) => { s.segs = segs.filter(g => g.own === i); });   // each cell's branches, for its action potential
    map.neurons = { somas, segs };
    paintStill();
    draw(performance.now());                  // show it straight away, not on the next frame
  }

  /* ---------------- drawing ---------------- */

  const BUCKETS = 8;
  const tint = k => `rgb(255,${Math.round(228 - 178 * k)},${Math.round(160 - 115 * k)})`;   // yellow at the cell, red at the tips
  const shade = s => s.link ? 0.05 + 0.2 * Math.sin(Math.PI * s.f) : Math.min(1, s.d / 85);
  const sway = (p, s, t) => ({ x: p.x + Math.sin(t * 0.0011 + s.ph) * s.sw, y: p.y + Math.cos(t * 0.0009 + s.ph * 1.3) * s.sw });
  const moves = s => s.link || s.d < NEAR;
  const toLow = g => g.setTransform(1 / P, 0, 0, 1 / P, OX / P, OY / P);

  // neurites, batched by colour: a wide faint glow pass, then the bright core
  function strokeAll(g, list, t) {
    const buckets = Array.from({ length: BUCKETS }, () => ({ glow: new Path2D(), core: [] }));
    list.forEach(s => {
      const b = buckets[Math.min(BUCKETS - 1, Math.floor(shade(s) * BUCKETS))];
      const a = t === null ? s.a : sway(s.a, s, t), e = t === null ? s.b : sway(s.b, s, t);
      b.glow.moveTo(a.x, a.y); b.glow.lineTo(e.x, e.y);
      b.core.push(a, e, s.w);
    });
    g.lineCap = "round";
    g.strokeStyle = "rgba(255,90,45,.2)"; g.lineWidth = 3.4;
    buckets.forEach(b => g.stroke(b.glow));
    buckets.forEach((b, i) => {
      g.strokeStyle = tint(i / (BUCKETS - 1));
      for (let k = 0; k < b.core.length; k += 3) {
        g.lineWidth = Math.max(1, b.core[k + 2] * 0.9);
        g.beginPath(); g.moveTo(b.core[k].x, b.core[k].y); g.lineTo(b.core[k + 1].x, b.core[k + 1].y); g.stroke();
      }
    });
  }

  // the parts that never move: nuclei in the dish, and every far-flung neurite
  function paintStill() {
    const R = rand(777);
    S.setTransform(1, 0, 0, 1, 0, 0);
    S.clearRect(0, 0, still.width, still.height);
    toLow(S);
    const count = Math.round(W * H / 1500);
    for (let k = 0; k < count; k++) {
      const x = R() * W - OX, y = R() * H - OY, r = 1.6 + R() * 2.6;
      const hue = R() < 0.14 ? "rgba(255,70,110," : R() < 0.5 ? "rgba(130,90,255," : "rgba(80,100,255,";
      S.fillStyle = hue + (0.18 + R() * 0.26) + ")";
      S.beginPath(); S.ellipse(x, y, r, r * (0.7 + R() * 0.3), R() * 3, 0, 6.29); S.fill();
    }
    strokeAll(S, far, null);
  }

  // a cell body: a lumpy blob lit from the upper left so it reads as round
  function soma(s, t) {
    const breathe = 1 + 0.05 * Math.sin(t * 0.0016 + s.ph), hot = s.hot;
    const r = s.r * breathe * (1 + 0.12 * hot);
    const halo = L.createRadialGradient(s.x, s.y, r * 0.5, s.x, s.y, r * (2.4 + hot));
    halo.addColorStop(0, `rgba(255,150,70,${0.35 + 0.35 * hot})`); halo.addColorStop(1, "rgba(255,90,40,0)");
    L.fillStyle = halo; L.beginPath(); L.arc(s.x, s.y, r * (2.4 + hot), 0, 6.29); L.fill();
    L.beginPath();
    for (let k = 0; k <= 36; k++) {
      const a = k / 36 * 6.283;
      const q = r * (1 + 0.13 * Math.sin(3 * a + s.lob[0] + t * 0.0007) + 0.08 * Math.sin(5 * a + s.lob[1]) + 0.05 * Math.sin(2 * a + s.lob[2] - t * 0.0005));
      k ? L.lineTo(s.x + Math.cos(a) * q, s.y + Math.sin(a) * q) : L.moveTo(s.x + Math.cos(a) * q, s.y + Math.sin(a) * q);
    }
    const body = L.createRadialGradient(s.x - r * 0.38, s.y - r * 0.42, r * 0.08, s.x, s.y, r * 1.15);
    body.addColorStop(0, hot > 0.5 ? "#ffffff" : "#fff8e0");
    body.addColorStop(0.3, "#ffd88a");
    body.addColorStop(0.7, "#ff9446");
    body.addColorStop(1, "#b53a20");
    L.fillStyle = body; L.fill();
    // the nucleus, a faint shadow sitting low and to the right
    L.fillStyle = `rgba(170,70,40,${0.35 - 0.2 * hot})`;
    L.beginPath(); L.ellipse(s.x + r * 0.18, s.y + r * 0.2, r * 0.36, r * 0.3, 0.4, 0, 6.29); L.fill();
  }

  // an action potential: a front of bright pixels running out along every branch at once
  const SPEED = 0.42;                         // px per ms
  function spike(s, now, t) {
    const front = (now - s.fired) * SPEED;
    if (front > s.reach + 30) { s.fired = -1; return; }
    const fade = Math.max(0.35, 1 - front / (s.reach + 30) * 0.65);
    L.save(); L.setTransform(1, 0, 0, 1, 0, 0);
    s.segs.forEach(g => {
      if (front < g.d || front > g.d + g.len) return;
      const f = (front - g.d) / (g.len || 1);
      const a = moves(g) ? sway(g.a, g, t) : g.a, b = moves(g) ? sway(g.b, g, t) : g.b;
      const x = Math.round((a.x + (b.x - a.x) * f + OX) / P), y = Math.round((a.y + (b.y - a.y) * f + OY) / P);
      L.globalAlpha = 0.45 * fade; L.fillStyle = "#ff9a4a"; L.fillRect(x - 2, y - 2, 4, 4);   // a hard-edged halo
      L.globalAlpha = fade; L.fillStyle = "#fffbe8"; L.fillRect(x - 1, y - 1, 2, 2);          // the hot core
    });
    L.restore();
  }

  function draw(now) {
    const t = calm ? 0 : now;
    L.setTransform(1, 0, 0, 1, 0, 0);
    L.clearRect(0, 0, low.width, low.height);
    L.drawImage(still, 0, 0);
    toLow(L);
    strokeAll(L, near, t);
    somas.forEach(s => { if (s.fired >= 0) spike(s, now, t); });
    somas.forEach(s => soma(s, t));
    // blow the small picture up with hard pixel edges
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, cv.width, cv.height);
    ctx.drawImage(low, 0, 0, low.width * P * cv.width / W, low.height * P * cv.height / H);
  }

  /* ---------------- hover, click, motion ---------------- */

  // a hovered (or tapped, or keyboard-focused) cell glows brighter while its card is open;
  // clicking it (or pressing Enter) fires one action potential, unless one is already running
  const target = new Array(N).fill(0);
  nodes.forEach((n, i) => {
    n.addEventListener("mouseenter", () => target[i] = 1);
    n.addEventListener("focus", () => target[i] = 1);
    n.addEventListener("mouseleave", () => { if (document.activeElement !== n) target[i] = 0; });
    n.addEventListener("blur", () => target[i] = 0);
    const fire = () => { const s = somas[i]; if (s && s.fired < 0) s.fired = performance.now(); };
    n.addEventListener("click", fire);
    n.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fire(); } });
  });

  let last = 0;
  function tick(now) {
    requestAnimationFrame(tick);
    if (now - last < 33) return;              // 30 frames a second is plenty
    last = now;
    somas.forEach((s, i) => { s.hot += (target[i] - s.hot) * 0.25; });
    draw(now);
  }

  new ResizeObserver(layout).observe(map);
  addEventListener("resize", layout);
  if (document.fonts) document.fonts.ready.then(() => { lastW = -1; layout(); });
  layout();
  requestAnimationFrame(tick);
})();
