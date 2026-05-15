#!/usr/bin/env python3
"""Offline validator + oracle for app/data/laws.json.

Validates:
  - JSON structure / required fields per node
  - All references (parents / children / related / contradictions) resolve
  - S_local / S_global are present and in [0, 1]
  - Flags 'false coherence' nodes (S_local - S_global > 0.30)
  - Reports family counts, density, averages
"""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "app" / "data" / "laws.json"

REQUIRED = {
    "id", "title", "canonical", "palieronic", "family",
    "parents", "children", "related", "contradictions",
    "S_local", "S_global", "stability", "weight",
}

def main() -> int:
    raw = json.loads(DATA.read_text(encoding="utf-8"))
    nodes = raw["nodes"]
    by_id = {n["id"]: n for n in nodes}
    errors: list[str] = []
    warnings: list[str] = []

    for n in nodes:
        missing = REQUIRED - n.keys()
        if missing:
            errors.append(f"{n.get('id','?')}: missing fields {sorted(missing)}")
        for field in ("parents", "children", "related", "contradictions"):
            for r in n.get(field, []):
                if r not in by_id:
                    errors.append(f"{n['id']}.{field}: unknown ref '{r}'")
        for k in ("S_local", "S_global", "weight"):
            v = n.get(k)
            if not isinstance(v, (int, float)) or not (0.0 <= v <= 1.0):
                errors.append(f"{n['id']}.{k}: out of range or non-numeric ({v!r})")
        gap = (n.get("S_local") or 0) - (n.get("S_global") or 0)
        if gap > 0.30:
            warnings.append(f"{n['id']}: false_coherence gap={gap:.2f}")

    families: dict[str, int] = {}
    for n in nodes:
        families[n["family"]] = families.get(n["family"], 0) + 1

    link_count = sum(
        len(n.get(f, []))
        for n in nodes
        for f in ("parents", "related", "contradictions")
    )
    density = link_count / max(1, len(nodes))

    avg = lambda key: sum(n.get(key, 0) for n in nodes) / max(1, len(nodes))

    print(f"ZORAN — laws.json validation")
    print(f"  nodes:    {len(nodes)}")
    print(f"  links:    {link_count}")
    print(f"  density:  {density:.2f}")
    print(f"  families: {families}")
    print(f"  S_local  avg = {avg('S_local'):.3f}")
    print(f"  S_global avg = {avg('S_global'):.3f}")
    print(f"  gap      avg = {avg('S_local') - avg('S_global'):+.3f}")
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
