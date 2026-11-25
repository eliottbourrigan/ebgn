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

  // « Tracé » : chaque anneau se déroule, puis son secteur ; lettres décalées de 170 ms.
  const DURATION = 3 * 170 + 650 + 650;
  function trace(svg, delay = 0) {
    const parts = [...svg.querySelectorAll("path[data-span]")].map(p => {
      const d = p.dataset, n = Number;
      p.setAttribute("d", "");
      return { p, cx: n(d.cx), cy: n(d.cy), r0: n(d.r0), r1: n(d.r1), a0: n(d.a0), span: n(d.span),
               start: n(d.i) * 170 + (d.kind === "pie" ? 650 : 0), dur: d.kind === "pie" ? 650 : 900 };
    });
    let t0 = null;
    const frame = now => {
      t0 ??= now + delay;
      const t = now - t0;
      for (const s of parts) s.p.setAttribute("d", sector(s.cx, s.cy, s.r0, s.r1, s.a0, s.span * inOut(clamp((t - s.start) / s.dur))));
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

// Clic n'importe où : une onde carmin s'élargit et s'efface, comme une goutte dans l'eau.
(() => {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  addEventListener("pointerdown", e => {
    for (const late of [false, true]) {
      const ring = document.createElement("span");
      ring.className = late ? "ripple ripple-late" : "ripple";
      ring.style.left = `${e.clientX}px`;
      ring.style.top = `${e.clientY}px`;
      ring.addEventListener("animationend", () => ring.remove());
      document.body.appendChild(ring);
    }
  }, { passive: true });
})();
