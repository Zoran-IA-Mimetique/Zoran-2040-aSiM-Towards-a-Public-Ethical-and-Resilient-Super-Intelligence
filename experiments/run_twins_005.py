"""Essai JUMEAUX-005 — codage des fiches et test de la relation partage / autonomie.

Protocole figé dans `PRE-ENREGISTREMENT-JUMEAUX-005.md`.

Le codage ci-dessous est une lecture de la matrice V1.3, **pas** une extraction
depuis les articles sources, qui n'ont pas été consultés. Chaque valeur porte la
citation de la fiche qui la justifie, pour être contestable ligne par ligne.

    python -m experiments.run_twins_005
"""

from __future__ import annotations

import json
import sys
from dataclasses import dataclass, field
from pathlib import Path

from ztemps.ordinal import detectability, exact_p_value, minimum_n, spearman_rho

ALPHA = 0.05
MIN_N_FOR_TEST = 4  # J2 du pré-enregistrement

#: Classes de relations du modèle R_total = R_A + R_B + R_AB.
CLASSES = ("nerveuse", "vasculaire", "squelettique", "viscérale")
#: Éléments de l'indice d'autonomie.
AUTONOMY_ITEMS = ("motrice", "preferences", "fonction_post_separation")

PARTAGE = "partagée"
DISTINCTE = "distincte"
INCONNU = "inconnu"
NON_APPLICABLE = "non_applicable"


@dataclass(frozen=True)
class Case:
    """Un cas codé, avec la justification de chaque valeur."""

    case_id: str
    source: str
    sharing: dict[str, str]
    autonomy: dict[str, str]
    justification: dict[str, str] = field(default_factory=dict)

    def _ratio(self, values: dict[str, str], positive: str) -> float | None:
        known = [v for v in values.values() if v not in (INCONNU, NON_APPLICABLE)]
        if not known:
            return None
        return sum(1 for v in known if v == positive) / len(known)

    @property
    def sharing_index(self) -> float | None:
        return self._ratio(self.sharing, PARTAGE)

    @property
    def autonomy_index(self) -> float | None:
        return self._ratio(self.autonomy, PARTAGE)

    @property
    def is_codable(self) -> bool:
        return self.sharing_index is not None and self.autonomy_index is not None


# --- Codage, figé (§3 du pré-enregistrement) ------------------------------
# `partagée` pour l'autonomie signifie « élément documenté comme présent ».
CASES = [
    Case(
        case_id="J1 — pygopages, moelle en U",
        source="Yokota et al., 2021, DOI 10.3171/CASE218 (via matrice V1.3)",
        sharing={
            "nerveuse": PARTAGE,
            "vasculaire": INCONNU,
            "squelettique": PARTAGE,
            "viscérale": INCONNU,
        },
        autonomy={
            "motrice": PARTAGE,
            "preferences": INCONNU,
            "fonction_post_separation": PARTAGE,
        },
        justification={
            "nerveuse": "« sac dural unique contenant une moelle épinière continue en U »",
            "squelettique": "« union sacrée » (ligne pygopages de la matrice)",
            "motrice": "« aucun déficit des membres inférieurs ni trouble de marche »",
            "fonction_post_separation": "« 16 mois de suivi » après séparation",
            "vasculaire/viscérale": "non énoncées par la fiche — inconnu, pas absence",
        },
    ),
    Case(
        case_id="J2 — parapagus dicephalus",
        source="Bovendeert et al., 2020, DOI 10.1186/s13256-020-02501-x (via matrice V1.3)",
        sharing={
            "nerveuse": DISTINCTE,
            "vasculaire": INCONNU,
            "squelettique": PARTAGE,
            "viscérale": PARTAGE,
        },
        autonomy={
            "motrice": INCONNU,
            "preferences": INCONNU,
            "fonction_post_separation": NON_APPLICABLE,
        },
        justification={
            "nerveuse": "« deux têtes, deux colonnes vertébrales »",
            "squelettique": "« un tronc »",
            "viscérale": "« foie fusionné »",
            "autonomie": "« spécimen anatomique ; aucune donnée comportementale » "
            "→ NON CODABLE, et non codé zéro",
        },
    ),
    Case(
        case_id="J3 — thoraco-omphalo-ischiopage séparés",
        source="Sheng et al., DOI 10.3233/PRM-220121 (via matrice V1.3)",
        sharing={
            "nerveuse": DISTINCTE,
            "vasculaire": INCONNU,
            "squelettique": PARTAGE,
            "viscérale": PARTAGE,
        },
        autonomy={
            "motrice": PARTAGE,
            "preferences": INCONNU,
            "fonction_post_separation": PARTAGE,
        },
        justification={
            "nerveuse": "« deux systèmes nerveux » (ligne de la matrice)",
            "squelettique": "« pelvis et une jambe partagés »",
            "viscérale": "« foie, gros intestin, vessie » partagés",
            "motrice/fonction": "« suivi fonctionnel cinq ans après séparation »",
        },
    ),
    Case(
        case_id="J4 — craniopage, partage sensoriel rapporté",
        source="Zohny et Savulescu, 2024, DOI 10.1017/S0963180124000197 (via matrice V1.3)",
        sharing={
            "nerveuse": PARTAGE,
            "vasculaire": INCONNU,
            "squelettique": INCONNU,
            "viscérale": INCONNU,
        },
        autonomy={
            "motrice": DISTINCTE,
            "preferences": PARTAGE,
            "fonction_post_separation": NON_APPLICABLE,
        },
        justification={
            "nerveuse": "« connexion thalamique, partage sensoriel et moteur »",
            "squelettique": "la matrice dit « crânes parfois fusionnés » — "
            "« parfois » n'affirme rien pour ce cas : inconnu",
            "motrice": "« partage sensoriel et moteur » n'affirme pas l'autonomie motrice",
            "preferences": "« préférences et comportements distincts rapportés »",
            "fonction_post_separation": "jamais séparées — non applicable",
        },
    ),
]


def main() -> int:
    coded = [
        {
            "case_id": c.case_id,
            "source": c.source,
            "s": c.sharing_index,
            "a": c.autonomy_index,
            "codable": c.is_codable,
            "partage": c.sharing,
            "autonomie": c.autonomy,
            "justification": c.justification,
        }
        for c in CASES
    ]
    codable = [c for c in CASES if c.is_codable]
    n = len(codable)

    results = {
        "essai": "JUMEAUX-005",
        "provenance": "codage de la matrice V1.3 ; articles sources non consultés",
        "codage": coded,
        "tests": {},
    }

    # J1 — combien de cas codables ?
    results["tests"]["J1_cas_codables"] = {
        "n": n,
        "exclus": [c.case_id for c in CASES if not c.is_codable],
    }

    # Détectabilité au n obtenu, et au n de la matrice complète.
    limits = detectability(max(n, 3))
    results["detectabilite"] = {
        "n": limits.n,
        "p_minimal_ordre_parfait": limits.p_perfect_order,
        "p_minimal_une_inversion": limits.p_one_inversion,
        "conclut_au_seuil": limits.can_reach(ALPHA),
        "robuste_au_seuil": limits.is_robust_at(ALPHA),
        "n_minimal_pour_conclure": minimum_n(ALPHA),
        "n_minimal_pour_un_resultat_robuste": minimum_n(ALPHA, robust=True),
    }

    # J2 — sous le seuil de taille, aucun test n'est calculé.
    if n < MIN_N_FOR_TEST:
        results["tests"]["J2_seuil_de_taille"] = {
            "declenche": True,
            "n": n,
            "seuil": MIN_N_FOR_TEST,
            "action": "aucun ρ n'est calculé ni publié",
            "motif": (
                f"à n = {n}, le meilleur p atteignable est "
                f"{limits.p_perfect_order:.4f} > {ALPHA} : aucune donnée ne peut "
                "conclure"
            ),
        }
        results["tests"]["J3_correlation"] = {"effectue": False}
        results["verdict"] = "INDECIDABLE"
    else:
        s = [c.sharing_index for c in codable]
        a = [c.autonomy_index for c in codable]
        try:
            rho = spearman_rho(s, a)
            p = exact_p_value(s, a)
            results["tests"]["J3_correlation"] = {
                "effectue": True,
                "rho": rho,
                "p_exact_unilateral": p,
                "conclut": p <= ALPHA,
            }
            results["verdict"] = "CONCLUT" if p <= ALPHA else "NE_CONCLUT_PAS"
        except ValueError as exc:
            results["tests"]["J3_correlation"] = {
                "effectue": False,
                "empechement": str(exc),
            }
            results["verdict"] = "INDECIDABLE"

    # J4 — robustesse, rapportée systématiquement.
    results["tests"]["J4_robustesse"] = {
        "survit_a_une_inversion": limits.is_robust_at(ALPHA),
        "p_avec_une_inversion": limits.p_one_inversion,
    }

    out = Path(__file__).with_name("resultats_005.json")
    out.write_text(json.dumps(results, indent=2, ensure_ascii=False), encoding="utf-8")
    print(json.dumps(results["tests"], indent=2, ensure_ascii=False))
    print(json.dumps(results["detectabilite"], indent=2, ensure_ascii=False))
    print("verdict :", results["verdict"])
    return 0


if __name__ == "__main__":
    sys.exit(main())
