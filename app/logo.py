"""Logo ebgn : chaque lettre est un cercle inscrit dans une case carrée,
fait d'un anneau et d'un secteur plein, angles multiples de 45°.

Angles en degrés, sens anti-horaire, 0° à droite. Rayon R ; l'anneau va de R·(1 − t) à R.
Le g et le n sont décalés d'un rayon vers le bas (demi-case).
"""
import math

R = 50
T = 0.28   # épaisseur de l'anneau, en fraction de R
SP = 0.2   # espace entre les cases, en fraction de R
LETTERS = (  # (anneau, secteur, décalage vertical en rayons) ; angles (début, fin)
    ((45, 315), (135, 225), 0),   # e
    ((135, 360), (225, 360), 0),  # b
    ((225, 540), (45, 180), 1),   # g
    ((0, 180), (90, 180), 1),     # n
)
OVERLAP = 0.6  # le secteur passe un peu sous l'anneau : pas de liseré d'anticrénelage


def _f(n: float) -> float:
    return round(n, 3) + 0.0


def _pt(cx: float, cy: float, r: float, a: float) -> tuple[float, float]:
    return _f(cx + r * math.cos(math.radians(a))), _f(cy - r * math.sin(math.radians(a)))


def sector(cx: float, cy: float, r0: float, r1: float, a0: float, span: float) -> str:
    """Secteur de couronne (r0 > 0) ou de disque (r0 = 0), de a0 à a0 + span."""
    if span <= 0:
        return ""
    a1, large = a0 + min(span, 359.99), int(span > 180)
    x0, y0 = _pt(cx, cy, r1, a0)
    x1, y1 = _pt(cx, cy, r1, a1)
    if not r0:
        return f"M{cx} {cy}L{x0} {y0}A{r1} {r1} 0 {large} 0 {x1} {y1}Z"
    x2, y2 = _pt(cx, cy, r0, a1)
    x3, y3 = _pt(cx, cy, r0, a0)
    return f"M{x0} {y0}A{r1} {r1} 0 {large} 0 {x1} {y1}L{x2} {y2}A{r0} {r0} 0 {large} 1 {x3} {y3}Z"


def logo(t: float = T, sp: float = SP, guides: bool = False) -> dict:
    """Géométrie prête pour le gabarit. Repères : la case carrée de chaque lettre et sa ligne médiane."""
    step, ri = 2 * R + sp * R, _f(R * (1 - t))
    letters = []
    for i, (ring, pie, dy) in enumerate(LETTERS):
        cx, cy = _f(R + i * step), R + dy * R
        parts = [
            {"kind": "ring", "r0": ri, "r1": R, "a0": ring[0], "span": ring[1] - ring[0]},
            {"kind": "pie", "r0": 0, "r1": _f(ri + OVERLAP), "a0": pie[0], "span": pie[1] - pie[0]},
        ]
        for p in parts:
            p["d"] = sector(cx, cy, p["r0"], p["r1"], p["a0"], p["span"])
        letters.append({"i": i, "cx": cx, "cy": cy, "parts": parts, "box": (_f(cx - R), cy - R, 2 * R)})
    pad = 4 if guides else 0
    return {
        "letters": letters, "R": R, "ri": ri, "guides": guides,
        "viewbox": f"{-pad} {-pad} {_f(3 * step + 2 * R + 2 * pad)} {3 * R + 2 * pad}",
    }


def glyph_svg(index: int = 0, t: float = T, color: str = "#a3142e") -> str:
    """Une lettre seule en SVG autonome (favicon : le « e »)."""
    ring, pie, _ = LETTERS[index]
    ri = _f(R * (1 - t))
    d = sector(R, R, ri, R, ring[0], ring[1] - ring[0]) + sector(R, R, 0, _f(ri + OVERLAP), pie[0], pie[1] - pie[0])
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {2 * R} {2 * R}"><path fill="{color}" d="{d}"/></svg>'
