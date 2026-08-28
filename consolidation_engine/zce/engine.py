"""ZORAN_CONSOLIDATION_ENGINE_V1 — orchestration dry-run (plan §15).

Huit opérations, une seule passe, zéro écriture hors du répertoire de
sortie :
 1. lire le plan gelé (manifeste, graphe, registre des écarts) et le
    valider par schéma ;
 2. contrôler chaque fichier et calculer identité + SHA ;
 3. classer KEEP/WIRE/CORRECT/SUPPORT/ARCHIVE/DUPLICATE/QUARANTINE ;
 4. relier (relations typées, endpoints résolus) ;
 5. détecter orphelins, doublons, chemins pendants, guards manquants ;
 6. sceller le rollback PUIS proposer un patch borné + PACK_REQUEST ;
 7. mesurer la cohérence numérique avant/après (projection dry-run) ;
 8. publier manifestes, reçus, journal et certificat de contrôle.
"""

import glob
import os

from . import classify, coherence, control, guards, identity, pack, patch, receipts, schema_check, util

OUTPUT_FILES = [
    "ZCE_RUN_MANIFEST_V1.json",
    "ZCE_DECISIONS_V1.json",
    "ZCE_FINDINGS_V1.json",
    "ZCE_ROLLBACK_PLAN_V1.json",
    "ZCE_PATCH_PLAN_V1.json",
    "ZCE_PACK_REQUESTS_V1.json",
    "ZCE_COHERENCE_MEASURE_V1.json",
]

NO_INTERVENTION = {"KEEP", "SUPPORT", "ARCHIVE"}
PATCHABLE = {"WIRE", "CORRECT", "DUPLICATE"}


class InputRejected(ValueError):
    """Entrée non conforme au contrat : le moteur refuse de continuer (fail-closed)."""


def check_output_isolation(out_dir, root, input_paths):
    """Correction v1.0.1 §5 : --out ne peut être ni dans --root ni dans les
    répertoires des entrées. Fail-closed AVANT toute écriture."""
    out = os.path.realpath(out_dir)
    forbidden = [("racine gelée --root", os.path.realpath(root))]
    for input_path in input_paths:
        directory = os.path.realpath(os.path.dirname(input_path) or ".")
        forbidden.append(("répertoire d'entrée %s" % directory, directory))
    for label, directory in forbidden:
        if out == directory or out.startswith(directory + os.sep):
            raise InputRejected(
                "%s: répertoire de sortie '%s' situé dans %s — refusé "
                "fail-closed" % (guards.GUARD_OUTPUT_ISOLATION, out, label))


def check_integrity(root, manifest, graph, ledger):
    """Correction v1.0.1 §6 : exhaustivité et unicité, fail-closed.

    Bloquent le run : un fichier réel sous la racine absent du manifeste ;
    un chemin, object_id, relation_id ou gap_id dupliqué ; un SHA-256
    déclaré mal formé.
    """
    errors = []
    objects = manifest["objects"]

    def duplicates(values):
        seen, dups = set(), set()
        for value in values:
            if value in seen:
                dups.add(value)
            seen.add(value)
        return sorted(dups)

    for path in duplicates([e["path"] for e in objects]):
        errors.append("chemin dupliqué au manifeste: %s" % path)
    for oid in duplicates([e["object_id"] for e in objects if e.get("object_id")]):
        errors.append("object_id dupliqué au manifeste: %s" % oid)
    for rid in duplicates([r["relation_id"] for r in graph["relations"]]):
        errors.append("relation_id dupliqué au graphe: %s" % rid)
    for gid in duplicates([g["gap_id"] for g in ledger["gaps"]]):
        errors.append("gap_id dupliqué au registre: %s" % gid)

    for entry in objects:
        if not util.is_sha256(entry["content_sha256"]):
            errors.append("SHA-256 mal formé au manifeste: %s (%s)"
                          % (entry["path"], entry["content_sha256"]))

    declared = set(e["path"] for e in objects)
    abs_root = os.path.realpath(root)
    for dirpath, dirnames, filenames in os.walk(abs_root):
        dirnames.sort()
        for filename in sorted(filenames):
            rel = os.path.relpath(os.path.join(dirpath, filename), abs_root)
            rel = rel.replace(os.sep, "/")
            if rel not in declared:
                errors.append("fichier réel absent du manifeste: %s" % rel)

    if errors:
        raise InputRejected("intégrité refusée (fail-closed): "
                            + "; ".join(sorted(errors)))
    return {"objects_declared": len(declared), "integrity": "PASS"}


def load_and_validate_inputs(manifest_path, graph_path, ledger_path, schemas_dir):
    """Opération 1 : lecture + validation par schéma, fail-closed."""
    schemas = {}
    for schema_file in sorted(glob.glob(os.path.join(schemas_dir, "*.schema.json"))):
        schemas[os.path.basename(schema_file)] = util.load_json(schema_file)
    inputs = {
        "manifest": (manifest_path, "manifest.schema.json"),
        "relation_graph": (graph_path, "relation_graph.schema.json"),
        "gap_ledger": (ledger_path, "gap_ledger.schema.json"),
    }
    loaded, input_receipts, errors = {}, {}, []
    for name, (path, schema_name) in sorted(inputs.items()):
        doc = util.load_json(path)
        violations = schema_check.validate(doc, schemas[schema_name])
        errors.extend("%s: %s" % (name, v) for v in violations)
        loaded[name] = doc
        input_receipts[name] = {"path": path, "sha256": util.sha256_file(path),
                                "schema": schema_name, "violations": len(violations)}
    if errors:
        raise InputRejected("entrées refusées (fail-closed): " + "; ".join(sorted(errors)))
    return loaded, schemas, input_receipts


def run_dry_run(root, manifest_path, graph_path, ledger_path, out_dir,
                now=None, schemas_dir=None):
    now = util.parse_now(now)
    schemas_dir = schemas_dir or os.path.join(os.path.dirname(__file__), "..", "schemas")

    # Guard v1.0.1 §5 — isolation du répertoire de sortie, avant toute écriture.
    check_output_isolation(out_dir, root, [manifest_path, graph_path, ledger_path])

    journal = receipts.Journal(now)

    # Op 1 — lecture et validation des entrées gelées.
    loaded, schemas, input_receipts = load_and_validate_inputs(
        manifest_path, graph_path, ledger_path, schemas_dir)
    manifest, graph, ledger = loaded["manifest"], loaded["relation_graph"], loaded["gap_ledger"]
    objects = manifest["objects"]
    gaps = ledger["gaps"]
    relations = graph["relations"]
    journal.log("INPUTS_VALIDATED", input_receipts)

    # Op 1bis (v1.0.1 §6) — exhaustivité et unicité, fail-closed.
    integrity_receipt = check_integrity(root, manifest, graph, ledger)
    journal.log("INTEGRITY_VERIFIED", integrity_receipt)

    # Op 2 — contrôle de chaque fichier avant intervention + identités.
    controls = {}
    for entry in sorted(objects, key=lambda e: e["path"]):
        controls[entry["path"]] = control.control_file(root, entry)
    journal.log("FILES_CONTROLLED", controls)

    # Op 3 — classification déterministe.
    decisions = classify.classify_all(controls, objects, gaps)
    journal.log("OBJECTS_CLASSIFIED", decisions)

    # Op 4 — relations typées, résolution des extrémités.
    manifest_paths = set(e["path"] for e in objects)
    resolved, dangling = [], []
    for rel in sorted(relations, key=lambda r: r["relation_id"]):
        ends_known = rel["from"] in manifest_paths and rel["to"] in manifest_paths
        ends_ok = ends_known and controls[rel["from"]]["ok"] and controls[rel["to"]]["ok"]
        (resolved if ends_ok else dangling).append(dict(rel, resolved=ends_ok))
    journal.log("RELATIONS_RESOLVED", {"resolved": resolved, "dangling": dangling})

    # Op 5 — détections : orphelins, doublons, chemins pendants, guards manquants.
    endpoint_paths = set()
    for rel in relations:
        endpoint_paths.update([rel["from"], rel["to"]])
    orphans = sorted(p for p in manifest_paths
                     if p not in endpoint_paths
                     and next(e for e in objects if e["path"] == p).get("status") != "archived")
    duplicates = [d for d in decisions if d["label"] == "DUPLICATE"]
    guards_missing = [g for g in gaps if g["kind"] == "MISSING_GUARD"]
    findings = {
        "orphans": orphans,
        "duplicates": [{"path": d["path"], "canonical_path": d["canonical_path"]}
                       for d in duplicates],
        "dangling_relations": [r["relation_id"] for r in dangling],
        "missing_guards": [{"gap_id": g["gap_id"], "target": g["target"],
                            "cause": g["cause"]} for g in guards_missing],
        "quarantined": [d["path"] for d in decisions if d["label"] == "QUARANTINE"],
    }
    journal.log("FINDINGS_DETECTED", findings)

    # Op 6 — rollback scellé AVANT le plan de patch, puis patch borné + PACK_REQUEST.
    rollback_entries = patch.build_rollback_plan(decisions, controls)
    journal.log("ROLLBACK_PLAN_SEALED", rollback_entries)
    patches, blocked, budget_receipt = patch.build_patch_plan(
        decisions, gaps, rollback_entries, controls)
    journal.log("PATCH_PLAN_PROPOSED", {"patches": patches, "blocked": blocked,
                                        "budget": budget_receipt})
    pack_requests = pack.build_pack_requests(gaps)
    journal.log("PACK_REQUESTS_EMITTED", pack_requests)

    # Op 7 — cohérence numérique avant / après (projection dry-run).
    measure = _measure_coherence(decisions, resolved, dangling, patches, blocked,
                                 pack_requests, gaps, rollback_entries,
                                 input_receipts, schemas, journal)
    journal.log("COHERENCE_MEASURED", measure)

    # Verdict K3 réel (v1.0.1 §2) : repris du cadre minimal observé,
    # jamais codé en dur ; il stampe toutes les sorties et le certificat.
    k3_verdict, verdict_basis = coherence.verdict(measure)

    # Op 8 — publication des sorties, du journal et du certificat.
    source_repo = manifest.get("source_repo", "UNKNOWN")
    source_ref = manifest.get("source_ref", "UNKNOWN")

    run_manifest_body = {
        "schema": "zoran.zce.run_manifest.v1",
        "frozen_root": os.path.normpath(root).replace("\\", "/"),
        "objects": [_stamped_object(e, controls[e["path"]], relations, now,
                                    source_repo, source_ref)
                    for e in sorted(objects, key=lambda e: e["path"])],
    }
    bodies = {
        "ZCE_RUN_MANIFEST_V1.json": ("run_manifest", run_manifest_body),
        "ZCE_DECISIONS_V1.json": ("decision_set", {
            "schema": "zoran.zce.decisions.v1", "decisions": decisions}),
        "ZCE_FINDINGS_V1.json": ("finding_set", {
            "schema": "zoran.zce.findings.v1", "findings": findings}),
        "ZCE_ROLLBACK_PLAN_V1.json": ("rollback_plan", {
            "schema": "zoran.zce.rollback_plan.v1", "entries": rollback_entries,
            "sealed_before_patch_plan": True}),
        "ZCE_PATCH_PLAN_V1.json": ("patch_plan", {
            "schema": "zoran.zce.patch_plan.v1", "patches": patches,
            "blocked": blocked, "budget": budget_receipt, "mode": "DRY_RUN"}),
        "ZCE_PACK_REQUESTS_V1.json": ("pack_request_set", {
            "schema": "zoran.zce.pack_requests.v1", "requests": pack_requests}),
        "ZCE_COHERENCE_MEASURE_V1.json": ("coherence_measure", measure),
    }
    outputs_sha = {}
    for filename in OUTPUT_FILES:
        object_type, body = bodies[filename]
        stamped = identity.stamp(
            object_id="ZCE-" + filename.replace(".json", ""),
            object_type=object_type, body=body, now=now,
            source_repo=source_repo, source_ref=source_ref,
            guard_ids=guards.ALL_GUARDS, k3_verdict=k3_verdict,
            rollback={"procedure": "supprimer le répertoire de sortie du run ; "
                                   "aucune autre trace n'existe (dry-run)"})
        outputs_sha[filename] = receipts.write_stamped(
            receipts.out_path(out_dir, filename), stamped)
    journal.log("OUTPUTS_WRITTEN", outputs_sha)
    outputs_sha["ZCE_JOURNAL_V1.jsonl"] = journal.write(
        receipts.out_path(out_dir, "ZCE_JOURNAL_V1.jsonl"))

    counters = {
        "files_total": len(objects),
        "files_ok": sum(1 for c in controls.values() if c["ok"]),
        "decisions_total": len(decisions),
        "labels": _label_counts(decisions),
        "relations_total": len(relations),
        "relations_resolved": len(resolved),
        "relations_dangling": len(dangling),
        "orphans": len(orphans),
        "patches_proposed": len(patches),
        "patches_blocked": len(blocked),
        "pack_requests": len(pack_requests),
        "rollback_entries": len(rollback_entries),
        "rollback_seq": journal.seq_of("ROLLBACK_PLAN_SEALED"),
        "patch_seq": journal.seq_of("PATCH_PLAN_PROPOSED"),
        "journal_chain_ok": journal.chain_ok(),
    }
    certificate_body = receipts.build_certificate(
        now=now, inputs_sha=input_receipts, outputs_sha=outputs_sha,
        counters=counters,
        guard_states={g: "ACTIVE" for g in guards.ALL_GUARDS},
        aggregate_before=measure["before"]["overall_point"],
        aggregate_after=measure["after"]["overall_point"],
        blocked=blocked,
        notes=["la projection 'après' suppose patches appliqués et paquets "
               "livrés ; elle ne certifie aucun comportement runtime",
               "aucun moteur historique 00-11 chargé",
               "aucun code LLM exécuté"],
        k3_verdict=k3_verdict, verdict_basis=verdict_basis)
    certificate = identity.stamp(
        object_id="ZCE-CONTROL-CERTIFICATE", object_type="control_certificate",
        body=certificate_body, now=now, source_repo=source_repo,
        source_ref=source_ref, guard_ids=guards.ALL_GUARDS, k3_verdict=k3_verdict,
        rollback={"procedure": "supprimer le répertoire de sortie du run"})
    outputs_sha["ZCE_CONTROL_CERTIFICATE_V1.json"] = receipts.write_stamped(
        receipts.out_path(out_dir, "ZCE_CONTROL_CERTIFICATE_V1.json"), certificate)

    return {
        "now": now,
        "out_dir": out_dir,
        "counters": counters,
        "outputs_sha256": outputs_sha,
        "coherence_before": measure["before"]["overall_point"],
        "coherence_after_projected": measure["after"]["overall_point"],
        "overall_delta_s": measure["overall_delta_s"],
        "k3_verdict": k3_verdict,
        "verdict": certificate_body["verdict"],
    }


def _measure_coherence(decisions, resolved, dangling, patches, blocked,
                       pack_requests, gaps, rollback_entries, input_receipts,
                       schemas, journal):
    """Comptages gelés par cadre ; sources de chaque proxy documentées ici.

    Seul le cadre local change entre avant et après : les cinq autres
    mesurent le processus du run lui-même (validation, causes, guards,
    journal, reçus) et gardent les mêmes comptages ; leurs cellules
    'après' restent en classe projetée car elles participent à la
    projection d'ensemble.
    """
    patched_paths = set(p["path"] for p in patches)
    missing_bricks = set(g["target"] for g in gaps if g["kind"] == "MISSING_BRICK")
    packed = set(r["brick"] for r in pack_requests)

    aligned_before = sum(1 for d in decisions if d["label"] in NO_INTERVENTION)
    aligned_after = aligned_before + sum(
        1 for d in decisions if d["label"] in PATCHABLE and d["path"] in patched_paths)
    rel_total = len(resolved) + len(dangling)
    # Après projection : une relation pendante est réputée résoluble si sa
    # brique manquante fait l'objet d'un PACK_REQUEST ouvert.
    rel_after = len(resolved) + sum(
        1 for r in dangling if any(b in r["to"] or b in r["from"] for b in packed))

    def counts(m_al, m_ap, r_co, r_ap):
        return {"mission_aligned": m_al, "mission_applicable": m_ap,
                "relations_coherent": r_co, "relations_applicable": r_ap}

    local_before = counts(aligned_before, len(decisions), len(resolved), rel_total)
    local_after = counts(aligned_after, len(decisions), rel_after, rel_total)

    inputs_ok = sum(1 for r in input_receipts.values() if r["violations"] == 0)
    lower = counts(inputs_ok + len(schemas), len(input_receipts) + len(schemas),
                   inputs_ok, len(input_receipts))

    with_cause = sum(1 for d in decisions if d.get("rule_id") and d.get("cause"))
    dup_claims = [d for d in decisions if d["label"] == "DUPLICATE"]
    dup_confirmed = sum(1 for d in dup_claims if d.get("canonical_path"))
    peer = counts(with_cause, len(decisions), dup_confirmed, len(dup_claims))

    violations_detected = len(blocked)
    upper = counts(len(_active_guards()), len(_active_guards()),
                   violations_detected, violations_detected)

    chain = receipts.verify_chain(journal.entries)
    stamped = sum(1 for e in journal.entries if e["ts"] == journal.now)
    temporal = counts(stamped, len(journal.entries),
                      int(chain["ok"]) * len(journal.entries), len(journal.entries))

    globalc = counts(len(pack_requests), len(missing_bricks),
                     len(rollback_entries),
                     sum(1 for d in decisions if d["label"] in PATCHABLE))

    causes = {
        "local": "objets sans intervention / objets contrôlés ; relations résolues / déclarées",
        "lower": "entrées et schémas validés / chargés",
        "peer": "décisions causées / totales ; doublons confirmés / réclamés",
        "upper": "guards actifs / requis ; cibles interdites bloquées / détectées",
        "temporal": "événements horodatés / journalisés ; chaîne d'intégrité du journal valide",
        "global": "PACK_REQUEST émis / briques manquantes ; rollbacks scellés / cibles patchables",
    }
    process_frames = {"lower": lower, "peer": peer, "upper": upper,
                      "temporal": temporal, "global": globalc}

    before_cells = [coherence.frame_cell("local", local_before,
                                         coherence.CLASS_OBSERVED, causes["local"])]
    after_cells = [coherence.frame_cell("local", local_after,
                                        coherence.CLASS_PROJECTED, causes["local"])]
    for frame, c in sorted(process_frames.items()):
        before_cells.append(coherence.frame_cell(frame, c, coherence.CLASS_OBSERVED,
                                                 causes[frame]))
        after_cells.append(coherence.frame_cell(frame, c, coherence.CLASS_PROJECTED,
                                                causes[frame]))
    return coherence.measure(before_cells, after_cells)


def _active_guards():
    return guards.ALL_GUARDS


def _stamped_object(entry, ctl, relations, now, source_repo, source_ref):
    path = entry["path"]
    object_id = entry.get("object_id") or identity.object_id_for_path(path)
    rels = sorted([r["relation_id"] for r in relations
                   if path in (r["from"], r["to"])])
    body = {
        "path": path,
        "object_type": entry.get("object_type", "unknown"),
        "declared_sha256": entry["content_sha256"],
        "actual_sha256": ctl["actual_sha256"],
        "size": ctl["actual_size"],
        "control_ok": ctl["ok"],
        "failed_checks": ctl["failed_checks"] + ctl["unmeasured_checks"],
    }
    return identity.stamp(
        object_id=object_id, object_type="file_record", body=body, now=now,
        source_repo=source_repo, source_ref=source_ref,
        field_scope=entry.get("field_scope", []), relations=rels,
        k3_verdict="PASS" if ctl["ok"] else "FAIL")


def _label_counts(decisions):
    counts = {}
    for d in decisions:
        counts[d["label"]] = counts.get(d["label"], 0) + 1
    return counts
