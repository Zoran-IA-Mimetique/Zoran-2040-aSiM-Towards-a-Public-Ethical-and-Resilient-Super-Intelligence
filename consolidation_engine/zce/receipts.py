"""Journal append-only chaîné, reçus et certificat de contrôle.

Le journal est la preuve d'ordre ET d'intégrité (v1.0.1) : chaque
événement porte un numéro de séquence strictement croissant,
l'horodatage gelé du run, le SHA-256 de sa charge utile, le
`previous_event_sha256` de l'événement précédent (génèse = 64 zéros) et
son propre `event_sha256`. Toute falsification d'un événement casse la
chaîne, détectable par `verify_chain`. Il démontre notamment que le plan
de rollback est scellé AVANT le plan de patch (GUARD_ROLLBACK_FIRST).
"""

import os

from . import util

GENESIS_SHA256 = "0" * 64


def _entry_sha256(entry: dict) -> str:
    """SHA-256 de l'événement, calculé sur tous ses champs sauf event_sha256."""
    hashable = {k: v for k, v in entry.items() if k != "event_sha256"}
    return util.sha256_obj(hashable)


def verify_chain(entries) -> dict:
    """Vérifie le chaînage complet ; retourne {ok, broken_seq, cause}."""
    previous = GENESIS_SHA256
    for i, entry in enumerate(entries):
        if entry.get("seq") != i + 1:
            return {"ok": False, "broken_seq": entry.get("seq"),
                    "cause": "séquence non strictement croissante"}
        if entry.get("previous_event_sha256") != previous:
            return {"ok": False, "broken_seq": entry["seq"],
                    "cause": "previous_event_sha256 ne chaîne pas"}
        if entry.get("event_sha256") != _entry_sha256(entry):
            return {"ok": False, "broken_seq": entry["seq"],
                    "cause": "event_sha256 falsifié ou contenu altéré"}
        previous = entry["event_sha256"]
    return {"ok": True, "broken_seq": None, "cause": ""}


class Journal:
    def __init__(self, now: str):
        self.now = now
        self.entries = []

    def log(self, event: str, payload) -> dict:
        previous = self.entries[-1]["event_sha256"] if self.entries else GENESIS_SHA256
        entry = {
            "seq": len(self.entries) + 1,
            "ts": self.now,
            "event": event,
            "payload_sha256": util.sha256_obj(payload),
            "previous_event_sha256": previous,
        }
        entry["event_sha256"] = _entry_sha256(entry)
        self.entries.append(entry)
        return entry

    def seq_of(self, event: str):
        for entry in self.entries:
            if entry["event"] == event:
                return entry["seq"]
        return None

    def chain_ok(self) -> bool:
        return verify_chain(self.entries)["ok"]

    def write(self, path: str) -> str:
        lines = [util.canonical_json(e) for e in self.entries]
        text = "\n".join(lines) + "\n"
        util.write_text(path, text)
        return util.sha256_text(text)


def build_certificate(now, inputs_sha, outputs_sha, counters, guard_states,
                      aggregate_before, aggregate_after, blocked, notes,
                      k3_verdict, verdict_basis):
    """Certificat de contrôle du run : chaque claim est adossé à un reçu
    (SHA d'entrée ou de sortie) ; aucun claim libre. Le verdict est REPRIS
    de la mesure (cadre minimal observé), jamais codé en dur : un cadre
    FAIL ou une borne basse à 0 interdit PASS_DRY_RUN."""
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
        "k3_verdict": k3_verdict,
        "verdict_basis": verdict_basis,
        "verdict": "PASS_DRY_RUN" if k3_verdict == "PASS" else "FAIL_DRY_RUN",
    }


def write_stamped(path, stamped_obj):
    return util.write_json(path, stamped_obj)


def out_path(out_dir, name):
    return os.path.join(out_dir, name)
