"""Classification déterministe (plan §15, op. 3).

Sept étiquettes fermées : KEEP, WIRE, CORRECT, SUPPORT, ARCHIVE,
DUPLICATE, QUARANTINE. Les règles sont ordonnées : la première qui
s'applique gagne, et chaque décision porte son identifiant de règle et
sa cause. Aucune étiquette libre, aucune intuition.
"""

LABELS = ["KEEP", "WIRE", "CORRECT", "SUPPORT", "ARCHIVE", "DUPLICATE", "QUARANTINE"]

SUPPORT_TYPES = {"doc", "test", "config", "schema"}


def classify_all(controls: dict, manifest_objects: list, gaps: list) -> list:
    """Retourne une décision par objet du manifeste, dans l'ordre du manifeste trié."""
    correct_targets = {g["target"]: g for g in gaps if g["kind"] == "CORRECT"}
    wire_targets = {g["target"]: g for g in gaps if g["kind"] == "WIRE"}

    # Doublons : même SHA réel ; le chemin canonique (plus petit ordre
    # lexicographique) est conservé, les autres sont marqués DUPLICATE.
    by_sha = {}
    for entry in sorted(manifest_objects, key=lambda e: e["path"]):
        ctl = controls[entry["path"]]
        if ctl["ok"] and ctl["actual_sha256"]:
            by_sha.setdefault(ctl["actual_sha256"], []).append(entry["path"])
    duplicate_of = {}
    for sha, paths in by_sha.items():
        for extra in paths[1:]:
            duplicate_of[extra] = {"canonical": paths[0], "sha256": sha}

    decisions = []
    for entry in sorted(manifest_objects, key=lambda e: e["path"]):
        path = entry["path"]
        ctl = controls[path]
        if not ctl["ok"]:
            cause = "contrôle en échec: %s" % ", ".join(ctl["failed_checks"] + ctl["unmeasured_checks"])
            decisions.append(_decision(path, "QUARANTINE", "R1_CONTROL_FAILED", cause))
        elif path in duplicate_of:
            dup = duplicate_of[path]
            decisions.append(_decision(
                path, "DUPLICATE", "R2_SHA_DUPLICATE",
                "contenu identique à %s (sha256 %s)" % (dup["canonical"], dup["sha256"]),
                extra={"canonical_path": dup["canonical"]}))
        elif entry.get("status") == "archived":
            decisions.append(_decision(path, "ARCHIVE", "R3_STATUS_ARCHIVED",
                                       "statut 'archived' déclaré au manifeste"))
        elif path in correct_targets:
            gap = correct_targets[path]
            decisions.append(_decision(path, "CORRECT", "R4_GAP_CORRECT",
                                       "écart %s: %s" % (gap["gap_id"], gap["cause"]),
                                       extra={"gap_id": gap["gap_id"]}))
        elif path in wire_targets:
            gap = wire_targets[path]
            decisions.append(_decision(path, "WIRE", "R5_GAP_WIRE",
                                       "écart %s: %s" % (gap["gap_id"], gap["cause"]),
                                       extra={"gap_id": gap["gap_id"]}))
        elif entry.get("object_type") in SUPPORT_TYPES:
            decisions.append(_decision(path, "SUPPORT", "R6_SUPPORT_TYPE",
                                       "objet de soutien (type %s)" % entry["object_type"]))
        else:
            decisions.append(_decision(path, "KEEP", "R7_DEFAULT_KEEP",
                                       "contrôlé, unique, actif, sans écart déclaré"))
    return decisions


def _decision(path, label, rule_id, cause, extra=None):
    decision = {"path": path, "label": label, "rule_id": rule_id, "cause": cause}
    if extra:
        decision.update(extra)
    return decision
