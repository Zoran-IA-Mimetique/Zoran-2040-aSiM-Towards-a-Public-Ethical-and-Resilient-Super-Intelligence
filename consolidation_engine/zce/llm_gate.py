"""Porte déterministe des candidats LLM (plan §15.1, règle 8).

Un LLM ne produit jamais une commande autorisée : il fournit un candidat
structuré. Ce module décide ACCEPT_FOR_SANDBOX, REJECT ou ROLLBACK par
règles fermées. Il n'exécute rien, n'importe aucun module d'exécution
(pas de subprocess, os.system, eval ou exec) et n'applique aucun diff.
"""

from . import guards, schema_check, util

DECISION_ACCEPT = "ACCEPT_FOR_SANDBOX"
DECISION_REJECT = "REJECT"
DECISION_ROLLBACK = "ROLLBACK"

ALLOWED_KINDS = ["PATCH_CANDIDATE", "TEXT_CANDIDATE"]

# Toute clé évoquant une exécution rend le candidat inadmissible d'office.
FORBIDDEN_KEYS = {"command", "commands", "shell", "exec", "execute", "script", "eval"}


def _forbidden_keys_in(obj, path="$"):
    found = []
    if isinstance(obj, dict):
        for key in sorted(obj):
            if key.lower() in FORBIDDEN_KEYS:
                found.append("%s.%s" % (path, key))
            found.extend(_forbidden_keys_in(obj[key], "%s.%s" % (path, key)))
    elif isinstance(obj, list):
        for i, item in enumerate(obj):
            found.extend(_forbidden_keys_in(item, "%s[%d]" % (path, i)))
    return found


def gate(candidate: dict, schema: dict, now: str) -> dict:
    """Décision déterministe sur un candidat LLM. Ne modifie aucun fichier."""
    causes = []

    schema_errors = schema_check.validate(candidate, schema)
    causes.extend("SCHEMA: %s" % e for e in schema_errors)

    forbidden = _forbidden_keys_in(candidate)
    causes.extend("%s: clé d'exécution interdite %s" % (guards.GUARD_NO_LLM_EXECUTION, k)
                  for k in forbidden)

    kind = candidate.get("kind")
    if kind not in ALLOWED_KINDS:
        causes.append("KIND: '%s' hors de %s" % (kind, ALLOWED_KINDS))

    target = candidate.get("target_path", "")
    if isinstance(target, str) and target:
        for violation in guards.check_patch_target(target):
            causes.append("%s: cible %s" % (violation, target))

    diff = candidate.get("diff_unified", "")
    if isinstance(diff, str):
        diff_lines = len([l for l in diff.splitlines() if l])
        if diff_lines > guards.MODIFICATION_BUDGET["max_diff_lines_per_patch"]:
            causes.append("%s: diff de %d lignes > budget %d"
                          % (guards.GUARD_MODIFICATION_BUDGET, diff_lines,
                             guards.MODIFICATION_BUDGET["max_diff_lines_per_patch"]))

    if not candidate.get("tests_declared"):
        causes.append("PROOF: tests_declared vide — aucun candidat sans test")
    if not candidate.get("falsifier"):
        causes.append("PROOF: falsifier absent — aucun candidat sans falsificateur")
    rollback_ref = candidate.get("rollback_ref") or {}
    if not rollback_ref.get("content_sha256"):
        causes.append("PROOF: rollback_ref.content_sha256 absent — rollback non prouvé")

    if candidate.get("claims_applied") is True:
        decision = DECISION_ROLLBACK
        causes.append("APPLY: le candidat prétend être déjà appliqué ; "
                      "interdit en dry-run → ROLLBACK exigé")
    elif causes:
        decision = DECISION_REJECT
    else:
        decision = DECISION_ACCEPT

    return {
        "schema": "zoran.zce.gate_decision.v1",
        "candidate_id": candidate.get("candidate_id"),
        "candidate_sha256": util.sha256_obj(candidate),
        "decision": decision,
        "causes": sorted(causes),
        "decided_at": now,
        "executed": False,
        "applied": False,
        "next_step": ("sandbox isolée + falsificateur + POST K3 + preuve de "
                      "rollback avant toute admission réelle"
                      if decision == DECISION_ACCEPT else
                      "candidat inadmissible en l'état"),
    }
