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
    // yeux : ils s'ouvrent quand l'aiguille de leur lettre passe sur leur angle
    const eyes = [...svg.querySelectorAll(".logo-eye")].map(el => {
      const ring = ringOf(el.dataset.i), total = +ring.span;
      return { el, rel: (((+el.dataset.a - +ring.a0) % 360) + 360) % 360, total, start: +el.dataset.i * STAGGER, dur: (TURN * total) / 315 };
    });
    svg.classList.add("tracing");
    let t0 = null;
    const frame = now => {
      t0 ??= now + delay;
      const t = now - t0;
      for (const s of parts) {
        const hand = s.total * inOut(clamp((t - s.start) / s.dur));
        s.p.setAttribute("d", sector(s.cx, s.cy, s.r0, s.r1, s.a0, Math.min(s.span, hand - s.rel)));
      }
      for (const e of eyes) e.el.classList.toggle("is-open", e.total * inOut(clamp((t - e.start) / e.dur)) >= e.rel);
      if (t < DURATION) requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }

  if (!intro) return;

  intro.classList.add("playing");
  const logoSvg = intro.querySelector("[data-logo]");
  trace(logoSvg, 300);
  // clignement des yeux, une fois le logo complet
  setTimeout(() => logoSvg.querySelectorAll(".logo-eye").forEach(e => e.classList.add("blink")), 300 + DURATION + 80);

  const LEAVE = 300 + DURATION + 750, WIPE = 1100;   // laisse le temps au clignement
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
