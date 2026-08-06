"""Point 1 de l'ordre de travail — promotion des cadres déclarés.

Applique les sept critères du §12.1 aux hiérarchies roulement et batterie.
Aucun calcul de `S` ni de `Φ_C` : ils restent NON_MESURÉ (§27).

    python -m experiments.run_cadres_008
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

from zoran import evaluer_hierarchie, portes_absolues
from zoran.proxys import PROXYS_ROULEMENT
from zoran.hierarchies import (
    BATTERIE,
    REPLIS_BATTERIE,
    REPLIS_ROULEMENT,
    ROULEMENT,
    TRANSFERTS_BATTERIE_CADRES,
    TRANSFERTS_ROULEMENT_CADRES,
)


def rapport(nom, cadres, replis, transferts):
    resultat = evaluer_hierarchie(cadres, replis=replis, transferts=transferts)
    return {
        "hierarchie": nom,
        "cadres_promus": list(resultat.cadres_promus),
        "regle_des_deux_cadres": resultat.regle_deux_cadres.value,
        "motif": resultat.motif,
        "detail": [
            {
                "identifiant": r.identifiant,
                "statut": r.statut.value,
                "manquants": [c.value for c in r.manquants],
                "motif": r.motif,
                "criteres": {
                    c.value: ("NON_MESURÉ" if v is None else v)
                    for c, v in r.criteres.items()
                },
            }
            for r in resultat.rapports
        ],
    }


def main() -> int:
    resultats = {
        "ordre_de_travail": "§20 point 1 — objet CadreCausal et promotion",
        "S": "NON_MESURÉ",
        "motif_S": "proxys, seuils et pondérations non calibrés (§27)",
        "hierarchies": [
            rapport(
                "roulement (§13)",
                ROULEMENT,
                REPLIS_ROULEMENT,
                TRANSFERTS_ROULEMENT_CADRES,
            ),
            rapport(
                "batterie (§14)", BATTERIE, REPLIS_BATTERIE, TRANSFERTS_BATTERIE_CADRES
            ),
        ],
    }

    for h in resultats["hierarchies"]:
        print(f"\n=== {h['hierarchie']} ===")
        for d in h["detail"]:
            manque = f"  ← {d['motif']}" if d["manquants"] else ""
            print(f"  {d['identifiant']:32s} {d['statut']:12s}{manque}")
        print(f"  → {h['motif']}")

    out = Path(__file__).with_name("resultats_008.json")
    out.write_text(json.dumps(resultats, indent=2, ensure_ascii=False), encoding="utf-8")
    bloquantes = portes_absolues(PROXYS_ROULEMENT)
    resultats["portes_absolues_bloquantes"] = list(bloquantes)
    print(f"\nportes absolues non calculables : {len(bloquantes)} proxys critiques "
          "sans seuil calibré")
    print(f"S = {resultats['S']} — {resultats['motif_S']}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
