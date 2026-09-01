# SANDBOX GENERATION PROTOCOL

**Mission** : `ZORAN_DISTRIBUTED_GENERATIVE_LAW_ENGINE_20260516`
**Source** : `tools/distributed_generative_law_engine.py` → `main()` (sandbox push)
**Cross-refs** : `audit/DISTRIBUTED_GENERATIVE_LAW_ENGINE.md`, `audit/CHILD_LAW_PIPELINE.md`, `audit/GENERATION_ORACLE.md`, `audit/DISCOVERY_SANDBOX_SPEC.md`

---

## 1. Rôle

Protocole d'insertion des filles acceptées par l'Oracle dans
`app/data/laws_sandbox.json` — seule voie d'écriture pour les lois
générées. Aucun chemin vers `laws.json` dans `main()`. Garantit
traçabilité, plafond global, besoins de validation aval.

---

## 2. Schéma d'une fille insérée

Chaque fille acceptée est poussée comme nœud dans `sandbox["nodes"]`
avec exactement les champs suivants :

```jsonc
{
  "id":                         "WP11-ULG-014-d1",      // gap-mère-d{i}
  "parent_id":                  "ULG-014",
  "mother_id":                  "ULG-014",              // traçabilité dupliquée
  "family":                     "WP11",
  "generation_type":            "derivation_local",
  "rationale":                  "Comble lacune topologique WP11 autour de ULG-014",
  "estimated_S_local":          0.812,
  "estimated_propagation_cost": 0.450,
  "status":                     "sandbox_candidate",
  "generation_oracle_accepted": true,
  "needs": ["propagation_test", "temporal_test", "composition_test"]
}
```

Aucune fille ne reçoit `attractor_tier`, `weight`, `frames`, ni
aucun champ canonique avant promotion humaine.

---

## 3. Cap global `MAX_CHILDREN = 50`

Après collecte des filles acceptées (365 sur 476 au run 2026-05-16) :

```python
MAX_CHILDREN = 50
if len(new_children) > MAX_CHILDREN:
    new_children.sort(key=lambda c: -c["estimated_S_local"])
    new_children = new_children[:MAX_CHILDREN]
```

→ 365 → **50** filles injectées, tri descendant par `estimated_S_local`.
Plafond dur, trace dans `meta.total_proposed` / `meta.total_accepted`.

---

## 4. Métadonnées sandbox écrites

```jsonc
"meta": {
  "last_generation_run":    "2026-05-16T01:12:00+02:00",
  "mission":                "ZORAN_DISTRIBUTED_GENERATIVE_LAW_ENGINE_20260516",
  "total_proposed":         476,
  "total_accepted":         365,
  "rejection_breakdown":    { "pertinence_locale_insuffisante": 111 }
}
```

---

## 5. Garanties protocolaires

- **Sandbox-only** : `laws_sandbox.json` est la seule destination de
  `new_children` ; `laws.json` reçoit uniquement les champs structurels
  injectés sur les mères.
- **Pas d'auto-promotion** : `status="sandbox_candidate"` est terminal
  côté moteur génératif. Passage à `canonical_candidate` requiert les
  3 tests de `needs[]`.
- **Traçabilité double** : `parent_id` + `mother_id` retrouvent
  l'ascendance même après réécriture.
- **Idempotence** : `child_id = f"{gap}-{mother_id}-d{i+1}"` déterministe ;
  un re-run produit les mêmes IDs.
