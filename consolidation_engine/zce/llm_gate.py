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


def _diff_paths(diff: str):
    """Chemins réels visés par le diff unifié : lignes '--- ' / '+++ ',
    préfixes a/ b/ retirés, /dev/null ignoré."""
    paths = set()
    for line in diff.splitlines():
        if not (line.startswith("--- ") or line.startswith("+++ ")):
            continue
        path = line[4:].strip().split("\t")[0]
        if path == "/dev/null" or not path:
            continue
        for prefix in ("a/", "b/"):
            if path.startswith(prefix):
                path = path[len(prefix):]
        paths.add(path)
    return sorted(paths)


def gate(candidate: dict, schema: dict, now: str,
         manifest: dict = None, ledger: dict = None) -> dict:
    """Décision déterministe sur un candidat LLM. Ne modifie aucun fichier.

    v1.0.1 : les chemins réels du diff sont extraits et confrontés à
    target_path, au manifeste, au gap du registre, au rayon autorisé et au
    rollback. Sans manifeste ni registre fournis, la vérification de
    contexte est impossible → REJECT (fail-closed).
    """
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

    # Contexte déterministe : manifeste + registre des écarts (fail-closed).
    gap = None
    radius = None
    if manifest is None or ledger is None:
        causes.append("CONTEXT: manifeste et registre des écarts requis pour "
                      "vérifier cible, gap et rayon — non fournis → fail-closed")
    else:
        manifest_paths = set(e["path"] for e in manifest.get("objects", []))
        if target not in manifest_paths:
            causes.append("CONTEXT: target_path '%s' absent du manifeste" % target)
        gaps_by_id = {g["gap_id"]: g for g in ledger.get("gaps", [])}
        gap = gaps_by_id.get(candidate.get("gap_id"))
        if gap is None:
            causes.append("CONTEXT: gap_id '%s' absent du registre des écarts"
                          % candidate.get("gap_id"))
        elif gap.get("target") != target:
            causes.append("CONTEXT: gap %s cible '%s' ≠ target_path '%s'"
                          % (gap["gap_id"], gap.get("target"), target))
        if gap and gap.get("allowed_paths"):
            radius = gap["allowed_paths"]

    if isinstance(target, str) and target:
        for violation in guards.check_patch_target(target, radius):
            causes.append("%s: cible %s" % (violation, target))

    rollback_ref = candidate.get("rollback_ref") or {}
    if rollback_ref.get("path") and rollback_ref.get("path") != target:
        causes.append("ROLLBACK: rollback_ref.path '%s' ≠ target_path '%s'"
                      % (rollback_ref.get("path"), target))

    diff = candidate.get("diff_unified", "")
    if isinstance(diff, str):
        diff_lines = len([l for l in diff.splitlines() if l])
        if diff_lines > guards.MODIFICATION_BUDGET["max_diff_lines_per_patch"]:
            causes.append("%s: diff de %d lignes > budget %d"
                          % (guards.GUARD_MODIFICATION_BUDGET, diff_lines,
                             guards.MODIFICATION_BUDGET["max_diff_lines_per_patch"]))
        touched = _diff_paths(diff)
        if kind == "PATCH_CANDIDATE" and not touched:
            causes.append("DIFF: aucun chemin détectable dans diff_unified — "
                          "candidat invérifiable")
        for path in touched:
            if path != target:
                causes.append("DIFF_TARGET_MISMATCH: le diff touche '%s' alors "
                              "que la cible déclarée est '%s'" % (path, target))
            for violation in guards.check_patch_target(path, radius):
                causes.append("%s: chemin du diff %s" % (violation, path))

    if not candidate.get("tests_declared"):
        causes.append("PROOF: tests_declared vide — aucun candidat sans test")
    if not candidate.get("falsifier"):
        causes.append("PROOF: falsifier absent — aucun candidat sans falsificateur")
    rollback_sha = (candidate.get("rollback_ref") or {}).get("content_sha256") or ""
    if not util.is_sha256(rollback_sha):
        causes.append("PROOF: rollback_ref.content_sha256 absent ou mal formé "
                      "— rollback non prouvé")

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
