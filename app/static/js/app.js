// Logo ebgn tracé (géométrie rendue par le serveur, app/logo.py) :
// écran de chargement à chaque visite, puis balayé par un dégradé.
(() => {
  const intro = document.getElementById("intro");
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) { intro?.remove(); return; }

  const f = n => +n.toFixed(3);
  const pt = (cx, cy, r, a) => [f(cx + r * Math.cos(a * Math.PI / 180)), f(cy - r * Math.sin(a * Math.PI / 180))];
  function sector(cx, cy, r0, r1, a0, span) {  // même tracé que app/logo.py
    if (span <= 0.05) return "";
    const a1 = a0 + Math.min(span, 359.99), L = span > 180 ? 1 : 0;
    const [x0, y0] = pt(cx, cy, r1, a0), [x1, y1] = pt(cx, cy, r1, a1);
    if (!r0) return `M${cx} ${cy}L${x0} ${y0}A${r1} ${r1} 0 ${L} 0 ${x1} ${y1}Z`;
    const [x2, y2] = pt(cx, cy, r0, a1), [x3, y3] = pt(cx, cy, r0, a0);
    return `M${x0} ${y0}A${r1} ${r1} 0 ${L} 0 ${x1} ${y1}L${x2} ${y2}A${r0} ${r0} 0 ${L} 1 ${x3} ${y3}Z`;
  }
  const clamp = x => Math.max(0, Math.min(1, x));
  const inOut = x => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);

  // « Tracé » : pour chaque lettre, une seule aiguille fait le tour depuis le début de l'anneau
  // et découvre en même temps l'anneau et le secteur ; lettres décalées de 170 ms.
  const STAGGER = 170, TURN = 1300;   // TURN : durée d'un tour de 315°, même vitesse pour toutes les lettres
  const DURATION = 3 * STAGGER + TURN;
  function trace(svg, delay = 0) {
    const paths = [...svg.querySelectorAll("path[data-span]")];
    const ringOf = i => paths.find(p => p.dataset.i === i && p.dataset.kind === "ring").dataset;
    const parts = paths.map(p => {
      const d = p.dataset, n = Number, ring = ringOf(d.i);
      p.setAttribute("d", "");
      return { p, cx: n(d.cx), cy: n(d.cy), r0: n(d.r0), r1: n(d.r1), a0: n(d.a0), span: n(d.span),
               rel: (((n(d.a0) - n(ring.a0)) % 360) + 360) % 360,   // retard angulaire par rapport à l'aiguille
               total: n(ring.span), start: n(d.i) * STAGGER, dur: (TURN * n(ring.span)) / 315 };
    });
    let t0 = null;
    const frame = now => {
      t0 ??= now + delay;
      const t = now - t0;
      for (const s of parts) {
        const hand = s.total * inOut(clamp((t - s.start) / s.dur));
        s.p.setAttribute("d", sector(s.cx, s.cy, s.r0, s.r1, s.a0, Math.min(s.span, hand - s.rel)));
      }
      if (t < DURATION) requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }

  if (!intro) return;

  intro.classList.add("playing");
  trace(intro.querySelector("[data-logo]"), 300);

  const LEAVE = 300 + DURATION + 450, WIPE = 1100;
  let leaving = false;
  function leave() {
    if (leaving) return;
    leaving = true;
    intro.classList.add("leaving");
    intro.classList.remove("playing");  // la page s'anime sous le balayage
    setTimeout(() => intro.remove(), WIPE);
  }
  setTimeout(leave, LEAVE);
  intro.addEventListener("click", leave);
  addEventListener("keydown", leave, { once: true });
})();

// Pluie : des gouttes tombent vers un point de fuite (grosses, floues et pâles → petites, nettes et foncées),
// puis une onde unique s'élargit à l'impact. Un clic fait la même onde. Réglages dans #rain-settings.
(() => {
  const cv = document.getElementById("rain"), dialog = document.getElementById("rain-settings");
  if (!cv || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const ctx = cv.getContext("2d"), hasFilter = typeof ctx.filter === "string";

  // ——— réglages : défauts = valeurs des curseurs rendues par le serveur ; préférences en localStorage ———
  const form = dialog.querySelector("form"), inputs = [...form.querySelectorAll("input[name]")];
  const read = el => (el.type === "checkbox" ? el.checked : +el.value);
  const DEFAULTS = Object.fromEntries(inputs.map(el => [el.name, el.type === "checkbox" ? el.defaultChecked : +el.defaultValue]));
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem("ebgn-pluie") || "{}"); } catch {}
  const P = { ...DEFAULTS, ...saved, pause: false };
  const decimals = el => (el.step.includes(".") ? el.step.split(".")[1].length : 0);
  function sync() {
    for (const el of inputs) {
      el.type === "checkbox" ? (el.checked = P[el.name]) : (el.value = P[el.name]);
      const out = form.querySelector(`output[data-for="${el.name}"]`);
      if (out) out.textContent = (+P[el.name]).toFixed(decimals(el));
    }
  }
  form.addEventListener("input", e => {
    if (!e.target.name) return;
    P[e.target.name] = read(e.target);
    sync();
    const { pause, ...keep } = P;
    localStorage.setItem("ebgn-pluie", JSON.stringify(keep));
  });
  document.getElementById("rain-reset").addEventListener("click", () => {
    Object.assign(P, DEFAULTS); localStorage.removeItem("ebgn-pluie"); sync();
  });
  document.getElementById("rain-open").addEventListener("click", () => dialog.showModal());
  dialog.addEventListener("click", e => { if (e.target === dialog) dialog.close(); });  // clic hors du cadre
  sync();

  // ——— couleurs : le carmin du thème, éclairci (début de chute) et assombri (impact) ———
  const hex = getComputedStyle(document.documentElement).getPropertyValue("--color-carmine").trim() || "#a3142e";
  const CARMINE = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
  const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
  const LIGHT = mix(CARMINE, [255, 255, 255], 0.5), DARK = mix(CARMINE, [0, 0, 0], 0.32);
  const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;

  let W = 0, H = 0;
  function resize() {
    const dpr = Math.min(2, devicePixelRatio || 1);
    W = innerWidth; H = innerHeight;
    cv.width = W * dpr; cv.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  addEventListener("resize", resize); resize();

  const rand = (a, b) => a + Math.random() * (b - a);
  const clamp = x => Math.max(0, Math.min(1, x));
  const ease = t => 1 - Math.pow(1 - t, 2.6);
  let mouse = { x: W / 2, y: H / 2 };
  addEventListener("pointermove", e => { mouse = { x: e.clientX, y: e.clientY }; }, { passive: true });

  const drops = [], waves = [];
  let now = performance.now();
  function drop(x, y) {
    if (x === undefined) { x = rand(0.04, 0.96) * W; y = rand(0.06, 0.94) * H; }
    const s = rand(0.7, 1.3);
    drops.push({ x, y, s, t0: now, dur: P.fall * 1000 * rand(0.85, 1.15), r0: P.size * s, r1: P.end * rand(0.85, 1.15),
                 ph: rand(0, 7), ph2: rand(0, 7), spin: rand(-1, 1) });
  }
  const wave = (x, y, s = 1) => waves.push({ x, y, t0: now, dur: P.plocdur * 1000, R: 90 * P.ploc * s });

  addEventListener("pointerdown", e => {
    if (e.target.closest("#rain-settings, #rain-open")) return;
    P.clickdrop ? drop(e.clientX, e.clientY) : wave(e.clientX, e.clientY);
  }, { passive: true });

  function blob(x, y, r, amp, ph, ph2, dir, stretch) {  // disque déformé, étiré vers le point de fuite
    ctx.save();
    ctx.translate(x, y); ctx.rotate(dir); ctx.scale(1 + stretch, 1 - stretch * 0.35);
    ctx.beginPath();
    for (let i = 0; i <= 36; i++) {
      const th = (i / 36) * Math.PI * 2, rr = r * (1 + amp * Math.sin(3 * th + ph) + amp * 0.6 * Math.sin(2 * th + ph2));
      i ? ctx.lineTo(rr * Math.cos(th), rr * Math.sin(th)) : ctx.moveTo(rr * Math.cos(th), rr * Math.sin(th));
    }
    ctx.closePath();
    ctx.restore();
  }

  let last = performance.now(), acc = 0;
  function frame(t) {
    const dt = Math.min(100, t - last); last = t;
    if (!P.pause) {
      now += dt;
      acc += (dt / 1000) * P.rate * clamp((W * H) / (1280 * 800) + 0.2);  // débit proportionnel à la surface
      while (acc >= 1) { drop(); acc -= 1; }
    }
    ctx.clearRect(0, 0, W, H);

    for (let i = waves.length - 1; i >= 0; i--) {
      const g = waves[i], p = (now - g.t0) / g.dur;
      if (p >= 1) { waves.splice(i, 1); continue; }
      const late = clamp((p - 0.6) / 0.4), soft = late * late * (3 - 2 * late);   // flou en fin de vie seulement
      ctx.strokeStyle = rgba(mix(DARK, CARMINE, p), P.alpha * Math.pow(1 - p, 1.2));
      ctx.lineWidth = 0.7 + 0.3 * p;
      if (hasFilter && soft > 0) ctx.filter = `blur(${(P.plocblur * soft).toFixed(2)}px)`;
      ctx.beginPath(); ctx.arc(g.x, g.y, Math.max(0.5, g.R * ease(p)), 0, Math.PI * 2); ctx.stroke();
      ctx.filter = "none";
    }

    const v = P.follow ? mouse : { x: W / 2, y: H / 2 }, m = 1 + P.vanish, tw = now / 1000;
    for (let i = drops.length - 1; i >= 0; i--) {
      const d = drops[i], p = clamp((now - d.t0) / d.dur);
      if (p >= 1) { drops.splice(i, 1); wave(d.x, d.y, d.s); continue; }
      const e = p * p, k = Math.pow(m, 1 - e);
      const x = v.x + (d.x - v.x) * k, y = v.y + (d.y - v.y) * k;
      const r = d.r1 * Math.pow(d.r0 / d.r1, 1 - e), blur = r * 0.6 * Math.pow(1 - e, 1.3);
      const alpha = P.alpha * (0.06 + 0.94 * Math.pow(e, 1.25)), col = mix(LIGHT, DARK, Math.pow(e, 0.8));
      blob(x, y, r, P.wobble * (1 - e), d.ph + tw * 2.2 * d.spin, d.ph2 - tw * 1.7,
           Math.atan2(v.y - y, v.x - x), 0.22 * (1 - e) + 0.08 * e);
      if (hasFilter) {
        ctx.filter = blur > 0.4 ? `blur(${blur.toFixed(1)}px)` : "none";
        ctx.fillStyle = rgba(col, alpha);
      } else {  // sans filtre de canvas : bord adouci par un dégradé
        const gr = ctx.createRadialGradient(x, y, 0, x, y, r * 1.3);
        gr.addColorStop(0, rgba(col, alpha));
        gr.addColorStop(clamp(1 - blur / r) * 0.75, rgba(col, alpha));
        gr.addColorStop(1, rgba(col, 0));
        ctx.fillStyle = gr;
      }
      ctx.fill();
      ctx.filter = "none";
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();

// Anatomie 3D (/anatomie) : glb Écorché lu à la main, rendu WebGL2 sans bibliothèque.
// Glisser = tourner, molette / pincer = zoom. Sélection : la structure passe en carmin, visible à travers
// le reste (rayons X), et la caméra vient se placer là où elle est le plus visible.
(() => {
  const root = document.getElementById("anatomie");
  if (!root) return;
  const canvas = document.getElementById("ana-canvas"), status = document.getElementById("ana-status");
  const q = document.getElementById("ana-q"), results = document.getElementById("ana-results");
  const bar = document.getElementById("ana-selected"), label = document.getElementById("ana-name");
  const gl = canvas.getContext("webgl2", { antialias: true });
  const fail = msg => { status.textContent = msg; status.classList.add("text-carmine"); };
  if (!gl) return fail("WebGL n'est pas disponible sur ce navigateur.");
  const still = matchMedia("(prefers-reduced-motion: reduce)").matches;

  const VS = `#version 300 es
  layout(location=0) in vec3 p; layout(location=1) in vec3 n; layout(location=2) in vec4 c;
  uniform mat4 vp; out vec3 vp_, vn; out vec4 vc;
  void main() { vec3 w = p * 0.0001; vp_ = w; vn = n; vc = c; gl_Position = vp * vec4(w, 1.0); }`;
  const FS = `#version 300 es
  precision highp float;
  in vec3 vp_, vn; in vec4 vc; uniform vec3 eye; uniform int mode; out vec4 o;
  const vec3 RED = vec3(0.80, 0.06, 0.18), PAPER = vec3(0.984, 0.984, 0.976);
  void main() {
    if (mode == 4) { o = vec4(0, 0, 0, 1); return; }          // passe de visibilité : le reste
    if (mode == 5) { o = vec4(1, 0, 0, 1); return; }          // passe de visibilité : la sélection
    if (mode == 3) { o = vec4(RED, 0.5); return; }           // rayons X
    vec3 N = normalize(vn); if (!gl_FrontFacing) N = -N;
    vec3 V = normalize(eye - vp_);
    float d = max(dot(N, V), 0.0), s = pow(max(dot(N, V), 0.0), 24.0) * 0.12;
    vec3 base = vc.rgb;
    if (mode == 1) base = mix(vec3(dot(base, vec3(0.3, 0.55, 0.15))), PAPER, 0.45);  // le reste, estompé
    if (mode == 2) base = RED * (0.45 + 0.55 * max(vc.r, max(vc.g, vc.b)));          // sélection (garde l'AO)
    o = vec4(base * (0.42 + 0.58 * d) + s, 1.0);
  }`;
  const sh = (type, src) => {
    const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  };
  const prog = gl.createProgram();
  gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS));
  gl.linkProgram(prog); gl.useProgram(prog);
  const U = n => gl.getUniformLocation(prog, n), uVP = U("vp"), uEye = U("eye"), uMode = U("mode");

  // --- matrices (colonnes) ---
  const persp = (fy, a, n, f) => { const t = 1 / Math.tan(fy / 2); return [t / a, 0, 0, 0, 0, t, 0, 0, 0, 0, (f + n) / (n - f), -1, 0, 0, 2 * f * n / (n - f), 0]; };
  const sub = (a, b) => a.map((x, i) => x - b[i]), norm = a => { const l = Math.hypot(...a) || 1; return a.map(x => x / l); };
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  function look(e, t) {
    const z = norm(sub(e, t)), x = norm(cross([0, 1, 0], z)), y = cross(z, x);
    return [x[0], y[0], z[0], 0, x[1], y[1], z[1], 0, x[2], y[2], z[2], 0, -dot(x, e), -dot(y, e), -dot(z, e), 1];
  }
  const mul = (a, b) => { const o = new Array(16).fill(0); for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) for (let k = 0; k < 4; k++) o[c * 4 + r] += a[k * 4 + r] * b[c * 4 + k]; return o; };

  // --- caméra orbitale ---
  const FOV = 0.6;
  const cam = { t: [0, 0.88, 0], az: 0, el: 0.08, d: 3 };
  const home = () => {
    const a = canvas.clientWidth / canvas.clientHeight, h = Math.tan(FOV / 2);
    return { t: [0, 0.88, 0], az: cam.az, el: 0.08, d: Math.max(1.0 / h, 0.5 / (h * a)) };
  };
  const eyeOf = c => [c.t[0] + c.d * Math.cos(c.el) * Math.sin(c.az), c.t[1] + c.d * Math.sin(c.el), c.t[2] + c.d * Math.cos(c.el) * Math.cos(c.az)];
  const vpOf = (c, aspect) => mul(persp(FOV, aspect, Math.max(0.01, c.d * 0.02), c.d + 4), look(eyeOf(c), c.t));

  let meshes = [], byKey = new Map(), sel = [], dirty = true, anim = null;

  function draw(c, w, h, pick) {
    gl.viewport(0, 0, w, h);
    gl.clearColor(...(pick ? [0, 0, 0, 1] : [0.984, 0.984, 0.976, 1]));
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LESS); gl.disable(gl.BLEND);
    gl.uniformMatrix4fv(uVP, false, vpOf(c, w / h)); gl.uniform3fv(uEye, eyeOf(c));
    const one = (m, mode) => { gl.uniform1i(uMode, mode); gl.bindVertexArray(m.vao); gl.drawElements(gl.TRIANGLES, m.count, gl.UNSIGNED_SHORT, m.io); };
    for (const m of meshes) if (!sel.includes(m)) one(m, pick ? 4 : sel.length ? 1 : 0);
    if (pick) { for (const m of sel) one(m, 5); return; }
    if (!sel.length) return;
    gl.disable(gl.DEPTH_TEST); gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    for (const m of sel) one(m, 3);
    gl.enable(gl.DEPTH_TEST); gl.disable(gl.BLEND); gl.depthFunc(gl.LEQUAL);
    for (const m of sel) one(m, 2);
  }

  // Meilleur point de vue : rendu minuscule depuis 24 directions, on garde celle où la sélection
  // couvre le plus de pixels (un muscle profond est vu par où il affleure).
  const P = 96, fbo = gl.createFramebuffer(), tex = gl.createTexture(), rb = gl.createRenderbuffer();
  gl.bindTexture(gl.TEXTURE_2D, tex); gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGBA8, P, P);
  gl.bindRenderbuffer(gl.RENDERBUFFER, rb); gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT24, P, P);
  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
  gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, rb);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  const px = new Uint8Array(P * P * 4);
  function bestView(t, d) {
    let best = null, score = -1;
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    for (const el of [-0.45, 0.05, 0.5]) for (let i = 0; i < 8; i++) {
      const az = i * Math.PI / 4, c = { t, az, el, d };
      draw(c, P, P, true);
      gl.readPixels(0, 0, P, P, gl.RGBA, gl.UNSIGNED_BYTE, px);
      let n = 0; for (let k = 0; k < px.length; k += 4) n += px[k] > 127;
      const turn = Math.abs(Math.atan2(Math.sin(az - cam.az), Math.cos(az - cam.az)));
      const s = n * (1 - 0.08 * turn / Math.PI) * (el === 0.05 ? 1.05 : 1);  // à égalité : bouger le moins possible
      if (s > score) { score = s; best = c; }
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    // invisible de partout (os sous les muscles) : on regarde depuis le côté du corps où il se trouve
    return score > 0 ? best : { t, az: Math.atan2(t[0], t[2]), el: 0.05, d };
  }

  function fly(to) {
    if (still) { Object.assign(cam, to); dirty = true; return; }
    const from = { ...cam, t: [...cam.t] }, daz = Math.atan2(Math.sin(to.az - cam.az), Math.cos(to.az - cam.az));
    anim = { from, to, daz, t0: performance.now() };
  }

  function select(keys, text) {
    sel = keys.map(k => byKey.get(k)).filter(Boolean);
    if (!sel.length) return;
    const lo = [0, 1, 2].map(i => Math.min(...sel.map(m => m.lo[i]))), hi = [0, 1, 2].map(i => Math.max(...sel.map(m => m.hi[i])));
    const t = lo.map((x, i) => (x + hi[i]) / 2), r = Math.hypot(...sub(hi, lo)) / 2;
    const a = canvas.clientWidth / canvas.clientHeight, fit = Math.sin(FOV / 2) * Math.min(1, a);
    const d = Math.max(0.8, (r / fit) * 1.3);
    label.textContent = text; bar.classList.replace("hidden", "flex");
    fly(bestView(t, d)); dirty = true;
  }
  function clear() {
    sel = []; bar.classList.replace("flex", "hidden"); fly(home()); dirty = true;
  }

  // --- interactions ---
  const pts = new Map(); let pinch = 0;
  canvas.addEventListener("pointerdown", e => { canvas.setPointerCapture(e.pointerId); pts.set(e.pointerId, [e.clientX, e.clientY]); anim = null; q.blur(); });
  canvas.addEventListener("pointermove", e => {
    if (!pts.has(e.pointerId)) return;
    const [x0, y0] = pts.get(e.pointerId); pts.set(e.pointerId, [e.clientX, e.clientY]);
    if (pts.size === 1) {
      cam.az -= (e.clientX - x0) * 0.008;
      cam.el = Math.max(-1.45, Math.min(1.45, cam.el + (e.clientY - y0) * 0.008));
    } else {
      const [a, b] = [...pts.values()], g = Math.hypot(a[0] - b[0], a[1] - b[1]);
      if (pinch) cam.d = Math.max(0.1, Math.min(8, cam.d * pinch / g));
      pinch = g;
    }
    dirty = true;
  });
  const up = e => { pts.delete(e.pointerId); pinch = 0; };
  canvas.addEventListener("pointerup", up); canvas.addEventListener("pointercancel", up);
  canvas.addEventListener("wheel", e => { e.preventDefault(); anim = null; cam.d = Math.max(0.1, Math.min(8, cam.d * Math.exp(e.deltaY * 0.0015))); dirty = true; }, { passive: false });

  results.addEventListener("click", e => {
    const b = e.target.closest(".ana-hit");
    if (!b) return;
    select([b.dataset.key], b.dataset.label);
    results.replaceChildren(); q.blur();
  });
  document.getElementById("ana-clear").addEventListener("click", clear);
  q.addEventListener("focus", () => { if (q.value.trim()) htmx.trigger(q, "search"); });
  q.addEventListener("keydown", e => {
    if (e.key === "Enter") results.querySelector(".ana-hit")?.click();
    if (e.key === "Escape") { q.value = ""; results.replaceChildren(); }
  });

  // --- boucle ---
  const ease = x => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  function frame(now) {
    const dpr = Math.min(devicePixelRatio || 1, 2), w = Math.round(canvas.clientWidth * dpr), h = Math.round(canvas.clientHeight * dpr);
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; dirty = true; }
    if (anim) {
      const k = ease(Math.min(1, (now - anim.t0) / 900)), { from, to } = anim;
      cam.az = from.az + anim.daz * k; cam.el = from.el + (to.el - from.el) * k;
      cam.d = from.d * Math.pow(to.d / from.d, k); cam.t = from.t.map((x, i) => x + (to.t[i] - x) * k);
      if (k === 1) anim = null;
      dirty = true;
    }
    if (dirty && meshes.length) { draw(cam, w, h, false); dirty = false; }
    requestAnimationFrame(frame);
  }

  // --- chargement du glb (positions int16, normales int8, couleurs uint8, indices uint16) ---
  async function load(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(res.status);
    const total = +res.headers.get("content-length") || 0, reader = res.body.getReader(), parts = [];
    let got = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      parts.push(value); got += value.length;
      if (total) status.textContent = `Chargement du modèle… ${Math.round(got / total * 100)} %`;
    }
    const buf = new Uint8Array(got); let o = 0;
    for (const p of parts) { buf.set(p, o); o += p.length; }
    const dv = new DataView(buf.buffer), jl = dv.getUint32(12, true);
    const g = JSON.parse(new TextDecoder().decode(buf.subarray(20, 20 + jl))), bin = buf.subarray(28 + jl);
    const vb = gl.createBuffer(), ib = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vb); gl.bufferData(gl.ARRAY_BUFFER, bin, gl.STATIC_DRAW);
    const attr = (loc, acc, size, type, normalized) => {
      const a = g.accessors[acc], v = g.bufferViews[a.bufferView];
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, size, type, normalized, v.byteStride || 0, v.byteOffset + (a.byteOffset || 0));
    };
    for (const n of g.nodes) {
      if (n.mesh == null) continue;
      const pr = g.meshes[n.mesh].primitives[0], A = pr.attributes, pa = g.accessors[A.POSITION], ia = g.accessors[pr.indices];
      const vao = gl.createVertexArray(); gl.bindVertexArray(vao);
      gl.bindBuffer(gl.ARRAY_BUFFER, vb);
      attr(0, A.POSITION, 3, gl.SHORT, false); attr(1, A.NORMAL, 3, gl.BYTE, true); attr(2, A.COLOR_0, 4, gl.UNSIGNED_BYTE, true);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib);
      const m = { key: n.extras.name, vao, count: ia.count, io: g.bufferViews[ia.bufferView].byteOffset + (ia.byteOffset || 0),
                  lo: pa.min.map(x => x * 1e-4), hi: pa.max.map(x => x * 1e-4) };
      meshes.push(m); byKey.set(m.key, m);
    }
    gl.bindVertexArray(null);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, bin, gl.STATIC_DRAW);
  }

  load(root.dataset.model).then(() => {
    status.remove(); Object.assign(cam, home()); dirty = true;
  }).catch(() => fail("Impossible de charger le modèle. Recharge la page."));
  requestAnimationFrame(frame);
})();
