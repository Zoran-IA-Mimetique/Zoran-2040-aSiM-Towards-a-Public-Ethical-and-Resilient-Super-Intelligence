#!/usr/bin/env python3
"""Add runtime_admissible flag to each canonical law.

Per ZORAN_RUNTIME_ARCHITECTURE_AND_ORACLE_GOVERNANCE_20260515 mission :
- All canonical laws (in laws.json) → runtime_admissible = true by default
- (Future) Sandbox laws (in laws_sandbox.json) → runtime_admissible = false
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "app" / "data" / "laws.json"


def main() -> int:
    raw = json.loads(DATA.read_text(encoding="utf-8"))
    nodes = raw["nodes"]
    updated = 0
    for n in nodes:
        if "runtime_admissible" not in n:
            n["runtime_admissible"] = True
            updated += 1
    DATA.write_text(json.dumps(raw, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"OK — runtime_admissible=True on {updated} canonical nodes (total {len(nodes)} nodes).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
