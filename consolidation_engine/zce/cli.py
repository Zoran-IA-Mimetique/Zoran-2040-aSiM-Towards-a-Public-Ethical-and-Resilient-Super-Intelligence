"""CLI de ZORAN_CONSOLIDATION_ENGINE_V1.

Commandes :
  validate        contrôler manifeste + graphe + registre (aucune écriture)
  dry-run         exécuter les 8 opérations en dry-run vers --out
  gate-candidate  décision déterministe sur un candidat LLM (jamais exécuté)
  apply           REFUSÉ en V1 (GUARD_DRY_RUN_ONLY) — sort en code 3
  version         identité du moteur

Codes de sortie : 0 succès ; 2 entrée refusée (fail-closed) ; 3 guard.
"""

import argparse
import json
import os
import sys

from . import engine, guards, identity, llm_gate, util

SCHEMAS_DIR = os.path.join(os.path.dirname(__file__), "..", "schemas")


def main(argv=None):
    parser = argparse.ArgumentParser(prog="zce", description=__doc__)
    sub = parser.add_subparsers(dest="cmd", required=True)

    p_validate = sub.add_parser("validate", help="valider les trois entrées gelées")
    _add_inputs(p_validate)

    p_dry = sub.add_parser("dry-run", help="exécution complète en dry-run")
    _add_inputs(p_dry)
    p_dry.add_argument("--root", required=True, help="racine de l'arbre gelé")
    p_dry.add_argument("--out", required=True, help="répertoire de sortie (seul lieu d'écriture)")
    p_dry.add_argument("--now", help="horodatage UTC gelé (YYYY-MM-DDTHH:MM:SSZ)")

    p_gate = sub.add_parser("gate-candidate", help="décider sur un candidat LLM structuré")
    p_gate.add_argument("--candidate", required=True)
    p_gate.add_argument("--now")
    p_gate.add_argument("--out", help="fichier de décision (optionnel)")

    p_apply = sub.add_parser("apply", help="REFUSÉ en V1 (dry-run strict)")
    p_apply.add_argument("rest", nargs="*")

    sub.add_parser("version", help="identité du moteur")

    args = parser.parse_args(argv)

    if args.cmd == "version":
        print(util.canonical_json({
            "object_id": identity.ENGINE_OBJECT_ID,
            "meta_id": identity.ENGINE_META_ID,
            "version": identity.ENGINE_VERSION,
            "plan": identity.PLAN_META_ID,
            "mode": "DRY_RUN_ONLY",
        }))
        return 0

    if args.cmd == "apply":
        try:
            guards.refuse_apply()
        except guards.DryRunViolation as exc:
            print(str(exc), file=sys.stderr)
            return 3

    if args.cmd == "validate":
        try:
            _, _, input_receipts = engine.load_and_validate_inputs(
                args.manifest, args.graph, args.ledger, SCHEMAS_DIR)
        except engine.InputRejected as exc:
            print(str(exc), file=sys.stderr)
            return 2
        print(util.canonical_json({"status": "PASS", "inputs": input_receipts}))
        return 0

    if args.cmd == "dry-run":
        try:
            summary = engine.run_dry_run(
                root=args.root, manifest_path=args.manifest,
                graph_path=args.graph, ledger_path=args.ledger,
                out_dir=args.out, now=args.now, schemas_dir=SCHEMAS_DIR)
        except engine.InputRejected as exc:
            print(str(exc), file=sys.stderr)
            return 2
        print(json.dumps(summary, sort_keys=True, ensure_ascii=False, indent=2))
        return 0

    if args.cmd == "gate-candidate":
        candidate = util.load_json(args.candidate)
        schema = util.load_json(os.path.join(SCHEMAS_DIR, "llm_candidate.schema.json"))
        decision = llm_gate.gate(candidate, schema, util.parse_now(args.now))
        if args.out:
            util.write_json(args.out, decision)
        print(json.dumps(decision, sort_keys=True, ensure_ascii=False, indent=2))
        return 0 if decision["decision"] == llm_gate.DECISION_ACCEPT else 3

    return 0


def _add_inputs(parser):
    parser.add_argument("--manifest", required=True)
    parser.add_argument("--graph", required=True)
    parser.add_argument("--ledger", required=True)


if __name__ == "__main__":
    sys.exit(main())
