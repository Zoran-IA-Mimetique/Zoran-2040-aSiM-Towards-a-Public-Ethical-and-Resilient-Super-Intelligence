"""Plan de patch minimal, explicable, réversible — et rollback D'ABORD.

Le moteur ne code pas librement : il propose un patch borné par écart
(gap) du registre, sous budget de modification et rayon d'impact. En V1
le plan est produit en dry-run et n'est JAMAIS appliqué. Le plan de
rollback est construit avant le plan de patch (GUARD_ROLLBACK_FIRST).
"""

from . import guards


def build_rollback_plan(decisions, controls):
    """Snapshot de restauration pour chaque cible potentiellement patchée.

    Construit AVANT toute proposition de patch : chemin + SHA-256 de
    référence + procédure de restauration exacte.
    """
    entries = []
    for decision in decisions:
        if decision["label"] not in ("WIRE", "CORRECT", "DUPLICATE"):
            continue
        ctl = controls[decision["path"]]
        entries.append({
            "rollback_id": "RB-%03d" % (len(entries) + 1),
            "path": decision["path"],
            "reference_sha256": ctl["actual_sha256"],
            "procedure": "restaurer le contenu dont le SHA-256 vaut "
                         "reference_sha256 depuis l'arbre gelé ; vérifier le "
                         "SHA après restauration ; consigner un reçu ROLLBACKS_TO",
        })
    return entries


def build_patch_plan(decisions, gaps, rollback_entries, controls):
    """Propose un patch borné par décision WIRE/CORRECT et une résorption
    par DUPLICATE. Retourne (patches, blocked, budget_receipt)."""
    rollback_by_path = {e["path"]: e for e in rollback_entries}
    gaps_by_id = {g["gap_id"]: g for g in gaps}
    budget = guards.MODIFICATION_BUDGET
    patches, blocked = [], []

    for decision in decisions:
        if decision["label"] not in ("WIRE", "CORRECT", "DUPLICATE"):
            continue
        path = decision["path"]
        gap = gaps_by_id.get(decision.get("gap_id"))
        radius = gap.get("allowed_paths") if gap and gap.get("allowed_paths") else None
        violations = guards.check_patch_target(path, radius)
        if violations:
            blocked.append({"path": path, "label": decision["label"],
                            "blocked_by": violations, "cause": decision["cause"]})
            continue
        if len(patches) >= budget["max_patches_per_run"]:
            blocked.append({"path": path, "label": decision["label"],
                            "blocked_by": [guards.GUARD_MODIFICATION_BUDGET],
                            "cause": "budget max_patches_per_run atteint"})
            continue
        max_lines = budget["max_diff_lines_per_patch"]
        if gap and gap.get("max_diff_lines"):
            max_lines = min(max_lines, gap["max_diff_lines"])
        if decision["label"] == "DUPLICATE":
            action = ("proposer l'archivage explicite du doublon et le "
                      "réaiguillage des références vers %s ; aucune "
                      "suppression silencieuse" % decision["canonical_path"])
            tests = ["vérifier qu'aucune référence ne pointe encore vers le doublon"]
        else:
            action = "patch minimal borné pour résorber l'écart: %s" % decision["cause"]
            tests = (gap.get("acceptance_tests") if gap else None) or \
                    ["rejouer les tests du composant avant/après patch"]
        patches.append({
            "patch_id": "PATCH-%03d" % (len(patches) + 1),
            "path": path,
            "label": decision["label"],
            "gap_id": decision.get("gap_id"),
            "cause": decision["cause"],
            "action": action,
            "max_files": budget["max_files_per_patch"],
            "max_diff_lines": max_lines,
            "acceptance_tests": tests,
            "rollback_id": rollback_by_path[path]["rollback_id"],
            "reference_sha256": controls[path]["actual_sha256"],
            "status": "PROPOSED_DRY_RUN",
            "applied": False,
        })
    receipt = {
        "budget": budget,
        "patches_proposed": len(patches),
        "patches_blocked": len(blocked),
        "budget_respected": len(patches) <= budget["max_patches_per_run"],
    }
    return patches, blocked, receipt
