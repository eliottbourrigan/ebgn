"""Logo ebgn : par lettre, un anneau et un secteur plein, angles multiples de 45°.

Angles en degrés, sens anti-horaire, 0° à droite. Rayon R ; l'anneau va de R·(1 − t) à R.
"""
import math

R = 50
LETTERS = (  # (anneau, secteur) : (début, fin)
    ((0, 315), (0, 180)),     # e
    ((90, 360), (180, 360)),  # b
    ((225, 540), (0, 180)),   # g
    ((315, 630), (90, 270)),  # n
)
OVERLAP = 0.6  # le secteur passe un peu sous l'anneau : pas de liseré d'anticrénelage


def _f(n: float) -> float:
    return round(n, 3) + 0.0


def _pt(cx: float, r: float, a: float) -> tuple[float, float]:
    return _f(cx + r * math.cos(math.radians(a))), _f(R - r * math.sin(math.radians(a)))


def sector(cx: float, r0: float, r1: float, a0: float, span: float) -> str:
    """Secteur de couronne (r0 > 0) ou de disque (r0 = 0), de a0 à a0 + span."""
    if span <= 0:
        return ""
    a1, large = a0 + min(span, 359.99), int(span > 180)
    x0, y0 = _pt(cx, r1, a0)
    x1, y1 = _pt(cx, r1, a1)
    if not r0:
        return f"M{cx} {R}L{x0} {y0}A{r1} {r1} 0 {large} 0 {x1} {y1}Z"
    x2, y2 = _pt(cx, r0, a1)
    x3, y3 = _pt(cx, r0, a0)
    return f"M{x0} {y0}A{r1} {r1} 0 {large} 0 {x1} {y1}L{x2} {y2}A{r0} {r0} 0 {large} 1 {x3} {y3}Z"


def logo(t: float = 0.3, sp: float = 0.3, guides: bool = False) -> dict:
    """Géométrie prête pour le gabarit : t = épaisseur, sp = interlettre (en fractions de R)."""
    step, ri = 2 * R + sp * R, _f(R * (1 - t))
    letters = []
    for i, (ring, pie) in enumerate(LETTERS):
        cx = R + i * step
        parts = [
            {"kind": "ring", "r0": ri, "r1": R, "a0": ring[0], "span": ring[1] - ring[0]},
            {"kind": "pie", "r0": 0, "r1": _f(ri + OVERLAP), "a0": pie[0], "span": pie[1] - pie[0]},
        ]
        for p in parts:
            p["d"] = sector(cx, p["r0"], p["r1"], p["a0"], p["span"])
        rays = [(cx, R, *_pt(cx, R * 1.1, a), a % 90 != 0) for a in range(0, 360, 45)] if guides else []
        letters.append({"i": i, "cx": _f(cx), "parts": parts, "rays": rays})
    pad = 8 if guides else 0
    return {
        "letters": letters, "R": R, "ri": ri, "guides": guides,
        "viewbox": f"{-pad} {-pad} {_f(3 * step + 2 * R + 2 * pad)} {2 * R + 2 * pad}",
    }
