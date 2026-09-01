#!/usr/bin/env python3
"""Generate a static SVG preview of the law graph (2D projection).

Uses a deterministic force-directed layout so the preview is reproducible.
This is a *static* snapshot — the real product is the live 3D WebGL app in /app.
"""
from __future__ import annotations

import json
import math
import random
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "app" / "data" / "laws.json"
OUT_SVG = ROOT / "app" / "preview.svg"

WIDTH, HEIGHT = 1600, 1000
PADDING = 60

PALETTE = {
    "canonical":  "#4ea3ff",
    "variant":    "#3ad17a",
    "palieronic": "#b86bff",
    "unstable":   "#ff6b6b",
    "absorbed":   "#7a7a7a",
    "attractor":  "#ffcc4d",
}

FAMILY_ANCHOR_ORDER = ["ULG","DVE","UDE","GHUC","WP11","WP12","SDE","PAL"]


def node_color(n: dict) -> str:
    if n.get("stability") == "absorbée": return PALETTE["absorbed"]
    if n.get("stability") == "instable": return PALETTE["unstable"]
    if n.get("attractor_tier") in ("μ0", "μ1"): return PALETTE["attractor"]
    if n.get("palieronic"): return PALETTE["palieronic"]
    if n.get("canonical"): return PALETTE["canonical"]
    return PALETTE["variant"]


def build_links(nodes: list[dict], edges: list[dict] | None) -> list[tuple[str, str, str, float]]:
    """Supporte les deux schémas : legacy (n.parents/related/contradictions) ou edges_typed_v1."""
    by_id = {n["id"] for n in nodes}
    out = []
    if edges:
        for e in edges:
            if e.get("source") in by_id and e.get("target") in by_id:
                out.append((e["source"], e["target"], e["kind"], e.get("weight", 0.5)))
        return out
    for n in nodes:
        for p in n.get("parents", []):
            if p in by_id: out.append((p, n["id"], "parent", n.get("weight", 0.5)))
        for r in n.get("related", []):
            if r in by_id: out.append((n["id"], r, "related", 0.35))
        for c in n.get("contradictions", []):
            if c in by_id: out.append((n["id"], c, "contradicts", 0.6))
    return out


def layout(nodes: list[dict], links: list[tuple], iters: int = 500) -> dict[str, tuple[float, float]]:
    """Force-directed layout with per-family angular anchors for legibility."""
    rng = random.Random(20260515)
    pos = {}
    family_centers = {}
    for i, fam in enumerate(FAMILY_ANCHOR_ORDER):
        theta = (i / len(FAMILY_ANCHOR_ORDER)) * 2 * math.pi - math.pi / 2
        family_centers[fam] = (
            WIDTH / 2 + 320 * math.cos(theta),
            HEIGHT / 2 + 260 * math.sin(theta),
        )

    for node in nodes:
        cx, cy = family_centers.get(node["family"], (WIDTH / 2, HEIGHT / 2))
        pos[node["id"]] = [cx + rng.uniform(-40, 40), cy + rng.uniform(-40, 40)]

    n = len(nodes)
    k = math.sqrt((WIDTH * HEIGHT) / max(1, n)) * 0.85
    t = 80.0

    link_pairs = [(s, tg) for s, tg, _, _ in links]
    ids = list(pos.keys())
    id_to_node = {nd["id"]: nd for nd in nodes}

    for _ in range(iters):
        disp = {nid: [0.0, 0.0] for nid in pos}
        for i in range(len(ids)):
            for j in range(i + 1, len(ids)):
                a, b = ids[i], ids[j]
                dx = pos[a][0] - pos[b][0]
                dy = pos[a][1] - pos[b][1]
                d2 = dx*dx + dy*dy + 0.01
                d = math.sqrt(d2)
                f = (k * k) / d
                ux, uy = dx / d, dy / d
                disp[a][0] += ux * f; disp[a][1] += uy * f
                disp[b][0] -= ux * f; disp[b][1] -= uy * f
        for s, tg in link_pairs:
            if s not in pos or tg not in pos: continue
            dx = pos[s][0] - pos[tg][0]
            dy = pos[s][1] - pos[tg][1]
            d = math.sqrt(dx*dx + dy*dy) + 0.01
            f = (d * d) / k
            ux, uy = dx / d, dy / d
            disp[s][0] -= ux * f; disp[s][1] -= uy * f
            disp[tg][0] += ux * f; disp[tg][1] += uy * f
        # Gentle family-center pull keeps clusters from drifting/clipping borders
        for nid in pos:
            fam = id_to_node[nid]["family"]
            cx, cy = family_centers.get(fam, (WIDTH / 2, HEIGHT / 2))
            disp[nid][0] += (cx - pos[nid][0]) * 0.012
            disp[nid][1] += (cy - pos[nid][1]) * 0.012
        # Gravity toward center
        for nid in pos:
            disp[nid][0] += (WIDTH / 2 - pos[nid][0]) * 0.002
            disp[nid][1] += (HEIGHT / 2 - pos[nid][1]) * 0.002

        for nid in pos:
            dx, dy = disp[nid]
            d = math.sqrt(dx*dx + dy*dy) + 0.01
            step = min(d, t) / d
            pos[nid][0] += dx * step
            pos[nid][1] += dy * step
            pos[nid][0] = min(WIDTH - PADDING,  max(PADDING, pos[nid][0]))
            pos[nid][1] = min(HEIGHT - PADDING, max(PADDING, pos[nid][1]))
        t = max(0.6, t * 0.985)

    return {nid: (p[0], p[1]) for nid, p in pos.items()}


def render_svg(nodes: list[dict], links: list[tuple], pos: dict) -> str:
    out = []
    out.append(
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {WIDTH} {HEIGHT}" '
        f'width="{WIDTH}" height="{HEIGHT}" font-family="-apple-system,Segoe UI,sans-serif">'
    )
    out.append('<defs>')
    out.append('<radialGradient id="bg" cx="50%" cy="50%" r="70%">')
    out.append('<stop offset="0%" stop-color="#0c1018"/><stop offset="100%" stop-color="#04050a"/>')
    out.append('</radialGradient>')
    out.append('<filter id="glow"><feGaussianBlur stdDeviation="3" result="b"/>'
               '<feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>')
    out.append('</defs>')
    out.append(f'<rect width="{WIDTH}" height="{HEIGHT}" fill="url(#bg)"/>')

    # links
    for s, tg, kind, w in links:
        if s not in pos or tg not in pos: continue
        x1, y1 = pos[s]; x2, y2 = pos[tg]
        if kind == "contradicts":
            stroke, opacity, sw = "#ff6b6b", 0.55, 1.2
        elif kind == "iso":
            stroke, opacity, sw = "#b86bff", 0.50, 1.0
        elif kind == "absorbed_into":
            stroke, opacity, sw = "#888888", 0.45, 0.8
        elif kind == "derives":
            stroke, opacity, sw = "#3ad17a", 0.40, 0.8
        elif kind == "related":
            stroke, opacity, sw = "#b8c4e0", 0.10, 0.5
        else:
            stroke, opacity, sw = "#ffcc4d" if w >= 0.85 else "#b8c4e0", 0.45 if w >= 0.85 else 0.28, max(0.5, w*1.3)
        out.append(
            f'<line x1="{x1:.1f}" y1="{y1:.1f}" x2="{x2:.1f}" y2="{y2:.1f}" '
            f'stroke="{stroke}" stroke-opacity="{opacity}" stroke-width="{sw:.2f}"/>'
        )

    # nodes
    for n in nodes:
        x, y = pos[n["id"]]
        c = node_color(n)
        r = 4 + (n.get("weight") or 0) * 9
        out.append(
            f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{r:.1f}" fill="{c}" '
            f'fill-opacity="0.92" stroke="#0c1018" stroke-width="1" filter="url(#glow)"/>'
        )
        if n.get("canonical") and (n.get("weight") or 0) >= 0.88:
            label = n["id"]
            out.append(
                f'<text x="{x:.1f}" y="{y + r + 12:.1f}" fill="#e7ecf5" '
                f'font-size="10" text-anchor="middle" opacity="0.85">{label}</text>'
            )

    # legend
    legend_items = [
        ("attracteur", PALETTE["attractor"]),
        ("canonique",  PALETTE["canonical"]),
        ("palieronic", PALETTE["palieronic"]),
        ("variante",   PALETTE["variant"]),
        ("instable",   PALETTE["unstable"]),
        ("absorbée",   PALETTE["absorbed"]),
    ]
    out.append('<g transform="translate(24,24)">')
    out.append('<rect width="180" height="160" rx="6" fill="#0d1018" fill-opacity="0.85" stroke="#1f2434"/>')
    out.append('<text x="14" y="22" fill="#b3bbcd" font-size="11" font-weight="600" letter-spacing="1">ZORAN — LAWS</text>')
    out.append('<text x="14" y="38" fill="#6e7794" font-size="9">FRACTAL_LAW_TREE_OMEGA</text>')
    for i, (label, color) in enumerate(legend_items):
        yy = 58 + i * 16
        out.append(f'<circle cx="22" cy="{yy}" r="5" fill="{color}"/>')
        out.append(f'<text x="36" y="{yy + 3}" fill="#b3bbcd" font-size="10">{label}</text>')
    out.append('</g>')

    families_count = len({n.get("family") for n in nodes if n.get("family")})
    out.append(
        f'<text x="{WIDTH-24}" y="{HEIGHT-20}" text-anchor="end" '
        f'fill="#6e7794" font-size="10">'
        f'{len(nodes)} nœuds · {len(links)} liens · {families_count} familles · preview statique'
        f'</text>'
    )
    out.append('</svg>')
    return ''.join(out)


def main():
    raw = json.loads(DATA.read_text(encoding="utf-8"))
    nodes = raw["nodes"]
    edges = raw.get("edges")
    links = build_links(nodes, edges)
    pos = layout(nodes, links)
    svg = render_svg(nodes, links, pos)
    OUT_SVG.write_text(svg, encoding="utf-8")
    print(f"wrote {OUT_SVG} ({len(svg)} bytes) — {len(nodes)} nodes, {len(links)} links")


if __name__ == "__main__":
    main()
