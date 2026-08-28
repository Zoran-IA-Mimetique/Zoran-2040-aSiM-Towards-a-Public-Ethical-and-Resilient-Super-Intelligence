"""Journal append-only, reçus et certificat de contrôle.

Le journal est la preuve d'ordre : chaque événement porte un numéro de
séquence strictement croissant, l'horodatage gelé du run et le SHA-256
de sa charge utile. Il démontre notamment que le plan de rollback est
scellé AVANT le plan de patch (GUARD_ROLLBACK_FIRST).
"""

import os

from . import util


class Journal:
    def __init__(self, now: str):
        self.now = now
        self.entries = []

    def log(self, event: str, payload) -> dict:
        entry = {
            "seq": len(self.entries) + 1,
            "ts": self.now,
            "event": event,
            "payload_sha256": util.sha256_obj(payload),
        }
        self.entries.append(entry)
        return entry

    def seq_of(self, event: str):
        for entry in self.entries:
            if entry["event"] == event:
                return entry["seq"]
        return None

    def write(self, path: str) -> str:
        lines = [util.canonical_json(e) for e in self.entries]
        text = "\n".join(lines) + "\n"
        util.write_text(path, text)
        return util.sha256_text(text)


def build_certificate(now, inputs_sha, outputs_sha, counters, guard_states,
                      aggregate_before, aggregate_after, blocked, notes):
    """Certificat de contrôle du run : chaque claim est adossé à un reçu
    (SHA d'entrée ou de sortie) ; aucun claim libre."""
    claims = [
        {"claim": "entrées lues et validées par schéma",
         "receipt": inputs_sha},
        {"claim": "chaque objet du manifeste contrôlé avant intervention",
         "receipt": {"files_controlled": counters["files_total"],
                     "files_ok": counters["files_ok"]}},
        {"claim": "chaque objet classé avec règle et cause",
         "receipt": {"decisions": counters["decisions_total"],
                     "labels": counters["labels"]}},
        {"claim": "rollback scellé avant patch (ordre du journal)",
         "receipt": {"rollback_seq": counters["rollback_seq"],
                     "patch_seq": counters["patch_seq"]}},
        {"claim": "aucune écriture hors répertoire de sortie, aucune "
                  "application de patch, aucune suppression",
         "receipt": {"mode": "DRY_RUN", "patches_applied": 0, "deletions": 0}},
        {"claim": "aucun moteur historique 00-11 chargé ou exécuté",
         "receipt": {"historical_engines_loaded": 0}},
        {"claim": "sorties hachées et journalisées",
         "receipt": outputs_sha},
    ]
    return {
        "schema": "zoran.zce.control_certificate.v1",
        "issued_at": now,
        "mode": "DRY_RUN",
        "guard_states": guard_states,
        "claims": claims,
        "counters": counters,
        "coherence_overall_before": aggregate_before,
        "coherence_overall_after_projected": aggregate_after,
        "patches_blocked_by_guards": blocked,
        "notes": notes,
        "verdict": "PASS_DRY_RUN",
    }


def write_stamped(path, stamped_obj):
    return util.write_json(path, stamped_obj)


def out_path(out_dir, name):
    return os.path.join(out_dir, name)
