#!/usr/bin/env python3
"""Offline validator + oracle for app/data/laws.json (schema edges_typed_v1)."""
import json
import sys
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "app" / "data" / "laws.json"

NODE_REQUIRED = {
    "id", "title", "canonical", "palieronic", "family",
    "S_local", "S_global", "stability", "weight",
    "frames",
}
FRAMES_REQUIRED = {"local", "intermediate", "global", "proxies", "limits"}
INTERMEDIATE_LEVELS = {"micro", "meso", "macro", "systémique"}
VALID_KINDS = {"parent", "derives", "iso", "contradicts", "related", "absorbed_into", "depends"}
CANONICAL_FAMILIES = {"ULG", "DVE", "UDE", "GHUC", "WP11", "WP12", "SDE", "PAL"}


def main() -> int:
    raw = json.loads(DATA.read_text(encoding="utf-8"))
    nodes = raw["nodes"]
    edges = raw.get("edges", [])
    families = raw.get("families", [])
    by_id = {n["id"]: n for n in nodes}
    errors: list[str] = []
    warnings: list[str] = []

    # Nodes
    for n in nodes:
        missing = NODE_REQUIRED - n.keys()
        if missing:
            errors.append(f"{n.get('id','?')}: missing fields {sorted(missing)}")
        if n.get("family") not in CANONICAL_FAMILIES:
            errors.append(f"{n['id']}: family '{n.get('family')}' not in canonical set")
        for k in ("S_local", "S_global", "weight"):
            v = n.get(k)
            if not isinstance(v, (int, float)) or not (0.0 <= v <= 1.0):
                errors.append(f"{n['id']}.{k}: out of range or non-numeric ({v!r})")
        if (n.get("S_local") or 0) - (n.get("S_global") or 0) > 0.30:
            warnings.append(f"{n['id']}: false_coherence gap={(n['S_local']-n['S_global']):.2f}")
        # Frames structure
        frames = n.get("frames") or {}
        f_missing = FRAMES_REQUIRED - frames.keys()
        if f_missing:
            errors.append(f"{n['id']}.frames: missing keys {sorted(f_missing)}")
        for fk in ("local", "global", "proxies", "limits"):
            v = frames.get(fk)
            if v is not None and (not isinstance(v, list) or any(not isinstance(x, str) for x in v)):
                errors.append(f"{n['id']}.frames.{fk}: must be list[str]")
        if frames.get("intermediate") is not None:
            for entry in frames["intermediate"]:
                if not isinstance(entry, dict) or "level" not in entry or "scope" not in entry:
                    errors.append(f"{n['id']}.frames.intermediate: entries require 'level' + 'scope'")
                elif entry["level"] not in INTERMEDIATE_LEVELS:
                    errors.append(f"{n['id']}.frames.intermediate: level '{entry['level']}' not in {sorted(INTERMEDIATE_LEVELS)}")

    # Families
    for f in families:
        if not f.get("invariant"):
            errors.append(f"family {f['id']}: missing 'invariant'")

    # Edges
    pair_kinds: dict[tuple, set] = defaultdict(set)
    contradict_pairs = set()
    for e in edges:
        if e["kind"] not in VALID_KINDS:
            errors.append(f"edge {e}: unknown kind '{e['kind']}'")
            continue
        if e["source"] not in by_id:
            errors.append(f"edge {e}: source '{e['source']}' unknown")
        if e["target"] not in by_id:
            errors.append(f"edge {e}: target '{e['target']}' unknown")
        if e["source"] == e["target"]:
            errors.append(f"edge {e}: self-loop")
        if e["kind"] == "iso":
            if not e.get("invariants") or not all(isinstance(x, str) and len(x) >= 8 for x in e["invariants"]):
                errors.append(f"edge {e['source']}→{e['target']} (iso): invariants required (≥1, min 8 chars each)")
        if e["kind"] == "contradicts":
            contradict_pairs.add((e["source"], e["target"]))
        pair_kinds[(e["source"], e["target"])].add(e["kind"])

    # Contradicts symmetric
    for (s, t) in list(contradict_pairs):
        if (t, s) not in contradict_pairs:
            warnings.append(f"contradicts {s}↔{t}: missing reciprocal")

    # Stats
    inflation_deguised = sum(1 for n in nodes if (n["id"].startswith("VAR-") or n["id"].startswith("ISO-")) and n["family"] in CANONICAL_FAMILIES) - sum(1 for n in nodes if (n["id"].startswith("VAR-") or n["id"].startswith("ISO-")) and n["family"] not in CANONICAL_FAMILIES)
    # Simpler: nodes whose family is VAR or ISO
    inflation = sum(1 for n in nodes if n["family"] not in CANONICAL_FAMILIES)
    inflation_ratio = inflation / max(1, len(nodes))

    iso_edges = [e for e in edges if e["kind"] == "iso"]
    iso_with_inv = sum(1 for e in iso_edges if e.get("invariants"))
    iso_ratio = 1.0 if not iso_edges else iso_with_inv / len(iso_edges)

    contradicts_count = sum(1 for e in edges if e["kind"] == "contradicts") // 2
    contradicts_density = contradicts_count / max(1, len(nodes))

    fractal_families = sum(1 for f in families if f.get("fractality_demonstrated"))
    compositions = raw.get("compositions", [])
    mu0 = sum(1 for n in nodes if n.get("attractor_tier") == "μ0")
    C_composition = 0.0 if mu0 == 0 else min(1.0, len(compositions) / max(3, mu0))

    broken_refs = sum(1 for e in edges if e["source"] not in by_id or e["target"] not in by_id)
    C_struct = 1.0 if not edges else 1.0 - broken_refs / len(edges)

    S_global = 0.35 * C_struct + 0.40 * C_composition + 0.15 * iso_ratio - 0.10 * min(0.20, contradicts_density)
    contradictions_calibrated = 1 if 0.04 <= contradicts_density <= 0.15 else 0
    HS = (
        0.25 * (1 - inflation_ratio)
        + 0.30 * min(1.0, fractal_families / 3.0)
        + 0.20 * C_composition
        + 0.15 * iso_ratio
        + 0.10 * contradictions_calibrated
    )

    fam_counts = Counter(n["family"] for n in nodes)

    print("ZORAN — laws.json validation (schema edges_typed_v1)")
    print(f"  nodes:               {len(nodes)}")
    print(f"  edges:               {len(edges)}")
    print(f"  density:             {len(edges)/max(1,len(nodes)):.2f}")
    print(f"  families:            {dict(fam_counts)}")
    print(f"  inflation_ratio:     {inflation_ratio:.3f}")
    print(f"  iso_with_invariants: {iso_ratio:.3f}")
    print(f"  contradictions:      {contradicts_count} (density {contradicts_density:.3f})")
    print(f"  C_composition:       {C_composition:.3f}")
    print(f"  C_struct:            {C_struct:.3f}")
    print(f"  fractal_families:    {fractal_families}")
    print(f"  S_global computed:   {S_global:.3f} (publish as: {'scalar' if C_composition >= 3/max(1,mu0) else f'proxy:{S_global:.2f}'})")
    print(f"  HS (honesty):        {HS:.3f}  (target P0.5 ≥ 0.75)")
    if warnings:
        print(f"\nWarnings ({len(warnings)}):")
        for w in warnings:
            print(f"  · {w}")
    if errors:
        print(f"\nErrors ({len(errors)}):")
        for e in errors:
            print(f"  ✗ {e}")
        return 1
    print("\nOK — no structural errors.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
