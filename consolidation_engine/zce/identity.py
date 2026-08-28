"""Identités et contrat d'objet (plan canonique v1.1, §8).

Chaque objet produit ou contrôlé par le moteur porte le contrat minimal :
object_id, meta_id, type, version, dates UTC, field_scope, trace, SHA-256,
provenance, relations, cohérence, guards, rollback et verdict K3.
"""

from . import util

ENGINE_OBJECT_ID = "ZORAN-CONSOLIDATION-ENGINE"
ENGINE_META_ID = "ZORAN-CONSOLIDATION-ENGINE:v1"
ENGINE_VERSION = "1.0.0"
PLAN_META_ID = "ZORAN-PLAN-CANONIQUE-MINIMAL:v1.1"


def object_id_for_path(rel_path: str) -> str:
    """Identité stable dérivée du chemin relatif normalisé (jamais du contenu)."""
    normalized = rel_path.replace("\\", "/").strip("/")
    return "ZORAN-FILE-" + util.sha256_text(normalized)[:16]


def meta_id(object_id: str, version: int) -> str:
    return "%s:v%d" % (object_id, version)


def stamp(object_id, object_type, body, now, source_repo, source_ref,
          version=1, field_scope=None, relations=None, coherence=None,
          guard_ids=None, rollback=None, k3_verdict="NON_MESURÉ",
          total_trace_id=None):
    """Enveloppe un corps de document dans le contrat d'objet du §8."""
    return {
        "object_id": object_id,
        "meta_id": meta_id(object_id, version),
        "object_type": object_type,
        "version": version,
        "created_at": now,
        "effective_at": now,
        "updated_at": now,
        "redated_at": None,
        "redating_reason": None,
        "field_scope": field_scope or [],
        "total_trace_id": total_trace_id or ("TRACE-" + util.sha256_text(object_id + now)[:16]),
        "content_sha256": util.sha256_obj(body),
        "source_repo": source_repo,
        "source_ref": source_ref,
        "relations": relations or [],
        "coherence": coherence or {},
        "guard_ids": guard_ids or [],
        "rollback": rollback or {},
        "k3_verdict": k3_verdict,
        "body": body,
    }
