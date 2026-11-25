// Intro : le logo ebgn se trace (anneau + secteur, angles multiples de 45°),
// puis un dégradé balayé le fait disparaître. Une fois par session.
(() => {
  const intro = document.getElementById("intro");
  if (!intro) return;
  const svg = intro.querySelector("svg");
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce || sessionStorage.getItem("ebgn-intro")) { intro.remove(); return; }
  sessionStorage.setItem("ebgn-intro", "1");
  intro.classList.add("playing");

  // [début, fin] en degrés, sens anti-horaire, 0° à droite
  const LETTERS = [
    { ring: [0, 315], pie: [0, 135] },     // e
    { ring: [90, 360], pie: [225, 360] },  // b
    { ring: [225, 540], pie: [45, 180] },  // g
    { ring: [315, 630], pie: [135, 270] }, // n
  ];
  const R = 50, T = 0.3, SP = 0.3, STEP = 2 * R + SP * R, RI = R * (1 - T);
  const NS = "http://www.w3.org/2000/svg";
  const f = n => +n.toFixed(3);
  const pt = (cx, r, a) => [f(cx + r * Math.cos(a * Math.PI / 180)), f(R - r * Math.sin(a * Math.PI / 180))];

  function sector(cx, r0, r1, a0, span) {
    if (span <= 0.05) return "";
    const a1 = a0 + Math.min(span, 359.99), L = span > 180 ? 1 : 0;
    const [x0, y0] = pt(cx, r1, a0), [x1, y1] = pt(cx, r1, a1);
    if (!r0) return `M${cx} ${R}L${x0} ${y0}A${r1} ${r1} 0 ${L} 0 ${x1} ${y1}Z`;
    const [x2, y2] = pt(cx, r0, a1), [x3, y3] = pt(cx, r0, a0);
    return `M${x0} ${y0}A${r1} ${r1} 0 ${L} 0 ${x1} ${y1}L${x2} ${y2}A${r0} ${r0} 0 ${L} 1 ${x3} ${y3}Z`;
  }
  const el = (tag, attrs, parent) => {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    return parent.appendChild(e);
  };

  const pad = 12;
  svg.setAttribute("viewBox", `${-pad} ${-pad} ${3 * STEP + 2 * R + 2 * pad} ${2 * R + 2 * pad}`);
  const guides = el("g", { class: "intro-guides" }, svg);
  const shapes = LETTERS.map((L, i) => {
    const cx = R + i * STEP;
    for (let a = 0; a < 360; a += 45) {
      const [x, y] = pt(cx, R * 1.1, a);
      el("line", { x1: cx, y1: R, x2: x, y2: y, class: a % 90 ? "intro-diag" : "" }, guides);
    }
    el("circle", { cx, cy: R, r: R }, guides);
    el("circle", { cx, cy: R, r: RI }, guides);
    return { L, cx, ring: el("path", { class: "fill-carmine" }, svg), pie: el("path", { class: "fill-carmine" }, svg) };
  });

  const clamp = x => Math.max(0, Math.min(1, x));
  const inOut = x => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  const seq = (t, start, dur) => inOut(clamp((t - start) / dur));

  const DRAWN = 300 + 3 * 170 + 650 + 650, LEAVE = DRAWN + 450, GONE = LEAVE + 1100;
  let t0 = null, leaving = false;

  function leave() {
    if (leaving) return;
    leaving = true;
    intro.classList.add("leaving");
    intro.classList.remove("playing");  // l'animation de la page démarre sous le balayage
    setTimeout(() => intro.remove(), GONE - LEAVE);
  }
  intro.addEventListener("click", leave);
  addEventListener("keydown", leave, { once: true });

  function frame(now) {
    t0 ??= now;
    const t = now - t0;
    shapes.forEach(({ L, cx, ring, pie }, i) => {
      const d = 300 + i * 170;
      ring.setAttribute("d", sector(cx, RI, R, L.ring[0], (L.ring[1] - L.ring[0]) * seq(t, d, 900)));
      // le secteur déborde un peu sous l'anneau : pas de liseré d'anticrénelage
      pie.setAttribute("d", sector(cx, 0, RI + 0.6, L.pie[0], (L.pie[1] - L.pie[0]) * seq(t, d + 650, 650)));
    });
    if (t >= LEAVE) leave();
    if (t < DRAWN || !leaving) requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
