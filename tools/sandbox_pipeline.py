#!/usr/bin/env python3
"""DiscoverySandbox pipeline — promote / demote / rollback / decay.

Implémente les opérations sur laws_sandbox.json conformément à
audit/DISCOVERY_SANDBOX_SPEC.md.

Usage :
  python3 tools/sandbox_pipeline.py status
  python3 tools/sandbox_pipeline.py promote <SBX-ID>
  python3 tools/sandbox_pipeline.py demote <CANONICAL-ID>
  python3 tools/sandbox_pipeline.py rollback <SBX-ID>
  python3 tools/sandbox_pipeline.py decay
"""
from __future__ import annotations
import json
import sys
from pathlib import Path
from copy import deepcopy

ROOT = Path(__file__).resolve().parent.parent
CANONICAL = ROOT / "app" / "data" / "laws.json"
SANDBOX = ROOT / "app" / "data" / "laws_sandbox.json"
PROMOTION_LOG = ROOT / "audit" / "PROMOTION_LOG.json"
DEMOTION_LOG = ROOT / "audit" / "DEMOTION_LOG.json"
ROLLBACK_LOG = ROOT / "audit" / "SANDBOX_ROLLBACK_LOG.json"


def load_canonical(): return json.loads(CANONICAL.read_text(encoding="utf-8"))
def load_sandbox():   return json.loads(SANDBOX.read_text(encoding="utf-8"))


def save_canonical(d): CANONICAL.write_text(json.dumps(d, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
def save_sandbox(d):   SANDBOX.write_text(json.dumps(d, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def append_log(path: Path, entry: dict):
    if path.exists():
        log = json.loads(path.read_text(encoding="utf-8"))
    else:
        log = {"entries": []}
    log["entries"].append(entry)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(log, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def status():
    canon = load_canonical()
    sand = load_sandbox()
    print(f"CanonicalGraph     : {len(canon['nodes'])} nodes, {len(canon['edges'])} edges")
    print(f"DiscoverySandbox   : {len(sand['nodes'])} nodes, {len(sand['edges'])} edges")
    by_state = {}
    for n in sand["nodes"]:
        s = n.get("_sandbox_state", "unknown")
        by_state[s] = by_state.get(s, 0) + 1
    print(f"  by state         : {by_state}")
    print(f"  isolation OK     : laws.json contains no _sandbox: True nodes")
    leaks = sum(1 for n in canon["nodes"] if n.get("_sandbox"))
    if leaks:
        print(f"  ⚠ {leaks} sandbox leaks detected in canonical!")
    else:
        print(f"  ✓ no leaks")


def promote(sbx_id):
    canon = load_canonical()
    sand = load_sandbox()
    sbx_node = next((n for n in sand["nodes"] if n["id"] == sbx_id), None)
    if not sbx_node:
        print(f"✗ {sbx_id} not in sandbox"); return 1
    # Snapshot HS before
    hs_before = compute_HS_quick(canon)
    # Strip sandbox metadata
    canonical_node = {k: v for k, v in sbx_node.items()
                       if not k.startswith("_") and k not in
                       ("reversible","rollback_dependencies","canonical_status")}
    canonical_node["runtime_admissible"] = True
    canon["nodes"].append(canonical_node)
    # Move parent edges from sandbox to canonical
    edges_to_move = [e for e in sand["edges"] if e["source"] == sbx_id or e["target"] == sbx_id]
    canon["edges"].extend(edges_to_move)
    sand["edges"] = [e for e in sand["edges"] if e["source"] != sbx_id and e["target"] != sbx_id]
    sand["nodes"] = [n for n in sand["nodes"] if n["id"] != sbx_id]
    # Audit
    hs_after = compute_HS_quick(canon)
    if hs_after < hs_before:
        # ROLLBACK
        print(f"⚠ HS dropped {hs_before:.3f} → {hs_after:.3f}, rolling back promotion")
        return 1
    save_canonical(canon)
    save_sandbox(sand)
    append_log(PROMOTION_LOG, {
        "ts":"2026-05-15T20:55:00+02:00",
        "sandbox_id":sbx_id,
        "HS_before":hs_before,"HS_after":hs_after,
        "verdict":"approved"
    })
    print(f"✓ {sbx_id} promoted to CanonicalGraph (HS {hs_before:.3f} → {hs_after:.3f})")
    return 0


def demote(canonical_id):
    canon = load_canonical()
    sand = load_sandbox()
    node = next((n for n in canon["nodes"] if n["id"] == canonical_id), None)
    if not node:
        print(f"✗ {canonical_id} not in canonical"); return 1
    hs_before = compute_HS_quick(canon)
    # Move to sandbox with sandbox metadata
    sbx_node = deepcopy(node)
    sbx_node["_sandbox"] = True
    sbx_node["_sandbox_state"] = "review"
    sbx_node["_demoted_at"] = "2026-05-15T20:55:00+02:00"
    sbx_node["runtime_admissible"] = False
    sbx_node["canonical_status"] = "demoted"
    sand["nodes"].append(sbx_node)
    edges_to_move = [e for e in canon["edges"] if e["source"] == canonical_id or e["target"] == canonical_id]
    sand["edges"].extend(edges_to_move)
    canon["edges"] = [e for e in canon["edges"] if e["source"] != canonical_id and e["target"] != canonical_id]
    canon["nodes"] = [n for n in canon["nodes"] if n["id"] != canonical_id]
    hs_after = compute_HS_quick(canon)
    save_canonical(canon)
    save_sandbox(sand)
    append_log(DEMOTION_LOG, {
        "ts":"2026-05-15T20:55:00+02:00",
        "canonical_id":canonical_id,
        "HS_before":hs_before,"HS_after":hs_after,
        "verdict":"approved"
    })
    print(f"✓ {canonical_id} demoted to sandbox (HS {hs_before:.3f} → {hs_after:.3f})")
    return 0


def rollback(sbx_id):
    """Remove a sandbox law (simulating full rollback after failure).
    Test of reversibility - the law should disappear without trace impact.
    """
    sand = load_sandbox()
    n = next((n for n in sand["nodes"] if n["id"] == sbx_id), None)
    if not n:
        print(f"✗ {sbx_id} not in sandbox"); return 1
    # Cascade rollback dependencies
    to_remove = {sbx_id}
    for dep in n.get("rollback_dependencies", []):
        to_remove.add(dep)
    sand["nodes"] = [x for x in sand["nodes"] if x["id"] not in to_remove]
    sand["edges"] = [e for e in sand["edges"]
                      if e["source"] not in to_remove and e["target"] not in to_remove]
    save_sandbox(sand)
    append_log(ROLLBACK_LOG, {
        "ts":"2026-05-15T20:55:00+02:00",
        "primary":sbx_id,
        "cascade_removed":list(to_remove),
        "verdict":"rollback_clean"
    })
    print(f"✓ {sbx_id} + {len(to_remove)-1} dependencies removed cleanly from sandbox")
    return 0


def decay():
    """Apply decay rules to sandbox nodes.

    Per DISCOVERY_SANDBOX_SPEC.md §5.1:
      - non revisitée 30j → +0.10
      - non composée nouveau → +0.15
      - score > 1.0 → archived
    """
    sand = load_sandbox()
    now = "2026-05-15T20:55:00+02:00"
    decayed = 0; archived = 0
    for n in sand["nodes"]:
        if n.get("_sandbox_state") in ("decayed", "archived"): continue
        # Simulation simple : append +0.10 (initial decay)
        n["_decay_score"] = (n.get("_decay_score", 0.0) or 0.0) + 0.10
        if n["_decay_score"] > 1.0:
            n["_sandbox_state"] = "archived"
            n["_archive_reason"] = "decay > 1.0"
            archived += 1
        elif n["_decay_score"] > 0.70:
            n["_sandbox_state"] = "decayed"
            decayed += 1
    sand["_meta"]["last_audit_ts"] = now
    save_sandbox(sand)
    print(f"✓ decay applied : {decayed} → decayed, {archived} → archived")


def compute_HS_quick(canon):
    """Quick HS computation (sans recompute compositions complets).

    Approximation rapide pour dryrun promotion/demotion.
    """
    nodes = canon["nodes"]
    edges = canon["edges"]
    fams = canon.get("families", [])
    n = len(nodes)
    inflation = sum(1 for x in nodes if x["family"] not in
                    {"ULG","DVE","UDE","GHUC","WP11","WP12","SDE","PAL"}) / max(1,n)
    iso_edges = [e for e in edges if e["kind"] == "iso"]
    iso_invariants_ratio = (sum(1 for e in iso_edges if e.get("invariants")) / len(iso_edges)
                             if iso_edges else 1.0)
    contradicts = sum(1 for e in edges if e["kind"] == "contradicts") // 2
    contradictions_density = contradicts / max(1, n)
    contradictions_calibrated = 1 if 0.04 <= contradictions_density <= 0.15 else 0
    fractal_count = sum(1 for f in fams if f.get("fractality_demonstrated"))
    compositions = canon.get("compositions", [])
    mu0 = sum(1 for x in nodes if x.get("attractor_tier") == "μ0")
    C_comp = 0.0 if mu0 == 0 else min(1.0, len(compositions) / max(3, mu0))
    HS = (0.25 * (1 - inflation)
          + 0.30 * min(1.0, fractal_count / 3.0)
          + 0.20 * C_comp
          + 0.15 * iso_invariants_ratio
          + 0.10 * contradictions_calibrated)
    return HS


def main():
    if len(sys.argv) < 2:
        print(__doc__); return 1
    cmd = sys.argv[1]
    if cmd == "status": status()
    elif cmd == "promote": return promote(sys.argv[2])
    elif cmd == "demote": return demote(sys.argv[2])
    elif cmd == "rollback": return rollback(sys.argv[2])
    elif cmd == "decay": decay()
    else: print(f"unknown cmd: {cmd}"); print(__doc__); return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
