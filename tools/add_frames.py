#!/usr/bin/env python3
"""Add `frames` (local / intermediate / global / proxies / limits) to each law.

Idempotent : si `frames` existe déjà sur un nœud, le script remplace par la
définition canonique ci-dessous. Lance-le après modification du dictionnaire
FRAMES pour resynchroniser.

Usage : python3 tools/add_frames.py
"""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "app" / "data" / "laws.json"


def f(local, intermediate, global_, proxies, limits):
    """Helper to build a frames dict in canonical order."""
    return {
        "local": local,
        "intermediate": intermediate,
        "global": global_,
        "proxies": proxies,
        "limits": limits,
    }


# Canonical per-law frames.
# Each entry: id → frames dict (cf. P0.5_INT spec: COHERENCE_FRAME_MODEL.md).
FRAMES: dict[str, dict] = {
    # ───────── ULG ─────────
    "ULG-001": f(
        local=["cadre représentationnel F unique en cours d'examen"],
        intermediate=[
            {"level": "meso", "scope": "famille ULG (5 lois)"},
            {"level": "macro", "scope": "ensemble des cadres représentationnels connus"},
        ],
        global_=["système ZORAN entier (graphe complet de toutes familles)"],
        proxies=["cosine cross-modèle d'embeddings de cadre"],
        limits=["ne calcule pas la pragmatique", "n'opère pas hors-cadre représentationnel"],
    ),
    "ULG-002": f(
        local=["chaîne de cadres F_k vers leur limite ULG"],
        intermediate=[{"level": "meso", "scope": "famille ULG"}],
        global_=["limite asymptotique en k (non atteinte en temps fini)"],
        proxies=["distance d(F_k, ULG) à k fini"],
        limits=["n'évalue pas la vitesse de convergence", "asymptote non observable"],
    ),
    "ULG-003": f(
        local=["transformation T appliquée à un cadre F"],
        intermediate=[{"level": "meso", "scope": "famille ULG"}, {"level": "macro", "scope": "groupe Aut(F)"}],
        global_=["invariance préservée à travers tous les automorphismes"],
        proxies=["test de symétrie sur un échantillon de transformations"],
        limits=["ne traite pas les transformations non-Aut", "ne couvre pas les invariants non-morphologiques"],
    ),
    "ULG-004": f(
        local=["boule B_ε(x) autour du point latent x"],
        intermediate=[{"level": "meso", "scope": "famille ULG"}],
        global_=["mesure de densité étendue à l'ensemble du cadre"],
        proxies=["estimation kernel-density à ε fini"],
        limits=["instable quand ε → 0 sans renormalisation", "non-définie hors zones échantillonnées"],
    ),
    "ULG-005": f(
        local=["signal localisé en (x, t)"],
        intermediate=[{"level": "meso", "scope": "famille ULG (loi palieronique)"}, {"level": "macro", "scope": "espace latent fractal dynamique"}],
        global_=["loi d'échelle valide à toutes échelles temporelles"],
        proxies=["exposant de Hurst H estimé sur fenêtre finie"],
        limits=["fractalité dynamique du signal, distincte de la fractalité du graphe ZORAN", "n'évalue pas la stabilité hors loi d'échelle"],
    ),

    # ───────── DVE ─────────
    "DVE-001": f(
        local=["cadre x et boule de variantes admissibles ΔV(x)"],
        intermediate=[
            {"level": "meso", "scope": "famille DVE"},
            {"level": "macro", "scope": "espace exploratoire des cadres"},
        ],
        global_=["graphe complet de toutes les dérivations possibles"],
        proxies=["énumération bornée + filtrage par admissibilité"],
        limits=["ne juge pas la qualité finale d'une variante", "ne garantit pas la complétude de l'énumération"],
    ),
    "DVE-002": f(
        local=["dérivation d ∈ Derivations isolée"],
        intermediate=[{"level": "meso", "scope": "famille DVE"}, {"level": "macro", "scope": "WP-12 (cadres d'admissibilité)"}],
        global_=["traçabilité maintenue sur l'historique complet"],
        proxies=["log de dérivation (trace) consultable"],
        limits=["ne réalise pas l'admissibilité — délègue à WP-12", "n'évalue pas la coût de la dérivation"],
    ),
    "DVE-003": f(
        local=["bifurcation isolée parent → branch"],
        intermediate=[{"level": "meso", "scope": "famille DVE"}],
        global_=["S_global du système avant et après bifurcation"],
        proxies=["estimation de S_global selon WP11-003"],
        limits=["seuil δ doit être calibré par cas", "bifurcation acceptable à court terme peut dégrader à long terme"],
    ),
    "DVE-004": f(
        local=["sous-espace A(ΔV) à un point x"],
        intermediate=[{"level": "meso", "scope": "famille DVE"}, {"level": "macro", "scope": "intersection avec WP-12"}],
        global_=["union des espaces admissibles sur l'ensemble des x"],
        proxies=["échantillonnage Monte-Carlo de A(ΔV)"],
        limits=["ne caractérise pas la frontière fine", "dépend de la définition courante de WP-12"],
    ),
    "DVE-005": f(
        local=["variante v et son entropie H(v)"],
        intermediate=[{"level": "meso", "scope": "famille DVE"}],
        global_=["seuil H_max calibré sur le graphe global"],
        proxies=["entropie de Shannon estimée sur la distribution latente"],
        limits=["seuil H_max statique — non adaptatif", "ne distingue pas entropie informative vs bruit"],
    ),

    # ───────── UDE ─────────
    "UDE-001": f(
        local=["chemin path en cours d'évaluation"],
        intermediate=[{"level": "meso", "scope": "famille UDE"}, {"level": "macro", "scope": "graphe des cadres explorables"}],
        global_=["maximisation globale de gain−cost sur l'ensemble du graphe"],
        proxies=["argmax local + heuristiques d'élagage"],
        limits=["maximum local seulement, pas garanti global", "fonctions gain et cost à définir par cadre"],
    ),
    "UDE-002": f(
        local=["voisinage d'un point candidat x"],
        intermediate=[{"level": "meso", "scope": "famille UDE"}, {"level": "macro", "scope": "champ de gradient F"}],
        global_=["cartographie complète des attracteurs du graphe"],
        proxies=["détection numérique de divergence et gradient"],
        limits=["échantillonnage discret peut manquer attracteurs étroits", "ne classifie pas par palier μ"],
    ),
    "UDE-003": f(
        local=["paire (L1, L2) de lois candidates"],
        intermediate=[{"level": "meso", "scope": "famille UDE"}],
        global_=["réseau résonant complet inter-familles"],
        proxies=["cosine d'embeddings φ"],
        limits=["résonance ≠ vérité — peut produire fausses résonances (cf. WP11-005)", "dépend du choix de φ"],
    ),
    "UDE-004": f(
        local=["point x près de la frontière ∂U"],
        intermediate=[{"level": "meso", "scope": "famille UDE (loi palieronique)"}, {"level": "macro", "scope": "frange exploratoire courante"}],
        global_=["topologie globale exploré ↔ inconnu"],
        proxies=["estimation de ε(x) par échantillonnage local"],
        limits=["frontière mouvante — résultat instantané seulement", "ne mesure pas la profondeur de l'inconnu"],
    ),
    "UDE-005": f(
        local=["cadre x et attracteur cible A"],
        intermediate=[{"level": "meso", "scope": "famille UDE"}, {"level": "macro", "scope": "champ d'attracteurs cartographié"}],
        global_=["distribution complète des sauts dans l'espace"],
        proxies=["température τ adaptative, distance euclidienne approximée"],
        limits=["ne garantit pas la cohérence post-saut", "dépend de la qualité de la carte UDE-002"],
    ),

    # ───────── GHUC ─────────
    "GHUC-001": f(
        local=["famille F unique soumise à consolidation"],
        intermediate=[
            {"level": "meso", "scope": "famille GHUC (opérations C, P, F)"},
            {"level": "macro", "scope": "toutes les familles canoniques"},
            {"level": "systémique", "scope": "topologie globale ZORAN"},
        ],
        global_=["méta-cadre Ω⁸ — invariant de consolidation préservé"],
        proxies=["test de monotonie S_global sous compression (R-S5)"],
        limits=["ne génère pas — consolide seulement", "ne traite pas hors-canonique"],
    ),
    "GHUC-002": f(
        local=["cadre F et sa version compressée C(F)"],
        intermediate=[{"level": "meso", "scope": "famille GHUC"}, {"level": "macro", "scope": "I_struct sur l'ensemble des familles"}],
        global_=["préservation de I_struct globalement"],
        proxies=["mesure I_struct(F) via complexité descriptionnelle approximée"],
        limits=["définition de I_struct opérationnelle, pas formelle", "compressions agressives peuvent perdre des cas-frontière"],
    ),
    "GHUC-002-a": f(
        local=["loi unique L et ses paramètres internes"],
        intermediate=[{"level": "meso", "scope": "GHUC compression intra-loi"}],
        global_=["I_struct(L) globalement préservé"],
        proxies=["complexité K(L) approximée"],
        limits=["ne traite pas les inter-relations entre lois"],
    ),
    "GHUC-002-a-i": f(
        local=["champ `domains` d'une loi"],
        intermediate=[{"level": "meso", "scope": "GHUC compression mots-clés"}],
        global_=["lexique consolidé sur l'ensemble du corpus"],
        proxies=["index de synonymie cross-domains"],
        limits=["dépend de la qualité du dictionnaire de synonymes"],
    ),
    "GHUC-002-a-ii": f(
        local=["champ `examples` d'une loi"],
        intermediate=[{"level": "meso", "scope": "GHUC compression exemples"}],
        global_=["diversité d'exemples préservée à travers le corpus"],
        proxies=["score de diversité par embedding d'exemples"],
        limits=["seuil θ de diversité subjectif"],
    ),
    "GHUC-002-b": f(
        local=["paire de lois L1, L2"],
        intermediate=[{"level": "meso", "scope": "GHUC compression inter-loi"}],
        global_=["fusion conservant I_struct(L1) ∪ I_struct(L2)"],
        proxies=["test d'équivalence structurelle"],
        limits=["fusion irréversible — exige absorption traçable"],
    ),
    "GHUC-002-b-i": f(
        local=["paire L1, L2 candidate à synonymie"],
        intermediate=[{"level": "meso", "scope": "GHUC synonymie"}],
        global_=["consolidation systémique du lexique scientifique"],
        proxies=["cosine ≥ 0.92 sur embeddings"],
        limits=["seuil arbitraire — calibration nécessaire"],
    ),
    "GHUC-002-b-ii": f(
        local=["paire L1, L2 candidate à équivalence"],
        intermediate=[{"level": "meso", "scope": "GHUC équivalence"}],
        global_=["réduction des doublons systémiques"],
        proxies=["test d'égalité Inv(L1) = Inv(L2)"],
        limits=["dépend de la qualité de l'extraction d'invariants"],
    ),
    "GHUC-003": f(
        local=["branche b candidate à pruning"],
        intermediate=[{"level": "meso", "scope": "famille GHUC"}, {"level": "macro", "scope": "familles concurrentes"}],
        global_=["pruning préservant la connectivité globale"],
        proxies=["ratio gain(b)/noise(b) calculé localement"],
        limits=["seuil θ statique — pas adaptatif", "peut prune des cas-frontière utiles"],
    ),
    "GHUC-004": f(
        local=["paire de cadres compatibles F1, F2"],
        intermediate=[{"level": "meso", "scope": "famille GHUC"}],
        global_=["topologie globale après fusion"],
        proxies=["test d'intersection Inv(F1) ∩ Inv(F2)"],
        limits=["fusion intransitive — F1⊕F2⊕F3 dépend de l'ordre"],
    ),

    # ───────── WP11 ─────────
    "WP11-001": f(
        local=["loi ou attracteur unique mesuré"],
        intermediate=[
            {"level": "meso", "scope": "famille WP-11"},
            {"level": "macro", "scope": "intersection avec WP-12 (admissibilité)"},
        ],
        global_=["système ZORAN entier — mesure conjointe S_local et S_global"],
        proxies=["formules opérationnelles des sous-lois (WP11-002, -003)"],
        limits=["S_local ⊥ S_global a priori — ne fournit PAS de relation déterministe"],
    ),
    "WP11-002": f(
        local=["voisinage N(x) d'un attracteur"],
        intermediate=[{"level": "meso", "scope": "famille WP-11"}],
        global_=["non applicable — métrique strictement locale"],
        proxies=["1 − var sur d_struct(x, y) dans N(x)"],
        limits=["taille de N(x) à choisir par cas", "insensible à la cohérence systémique"],
    ),
    "WP11-003": f(
        local=["non applicable — métrique strictement systémique"],
        intermediate=[{"level": "meso", "scope": "famille WP-11"}, {"level": "macro", "scope": "compositions opératoires"}],
        global_=["graphe complet — toutes paires de cadres F1, F2"],
        proxies=["formule décomposée 0.35·C_struct + 0.40·C_composition + 0.15·C_iso − 0.10·contradictions_density"],
        limits=["proxy tant que C_composition < seuil R-S2", "dépend de la calibration des coefficients α,β,γ,δ"],
    ),
    "WP11-004": f(
        local=["méta-règle — pas de contexte local"],
        intermediate=[{"level": "meso", "scope": "famille WP-11"}, {"level": "systémique", "scope": "tout calcul de cohérence"}],
        global_=["interdiction systémique d'inférence S_local → S_global"],
        proxies=["audit programmatique des chaînes d'inférence"],
        limits=["ne propose pas d'alternative — règle d'interdiction pure"],
    ),
    "WP11-005": f(
        local=["loi unique avec son couple (S_local, S_global)"],
        intermediate=[{"level": "meso", "scope": "famille WP-11"}],
        global_=["audit systémique des configurations à gap > 0.30"],
        proxies=["seuil Δ_max calibré (0.30 par défaut)"],
        limits=["seuil arbitraire — calibration empirique nécessaire"],
    ),

    # ───────── WP12 ─────────
    "WP12-001": f(
        local=["cadre F unique candidat à admissibilité"],
        intermediate=[
            {"level": "meso", "scope": "famille WP-12"},
            {"level": "macro", "scope": "intersection avec WP-11 (cohérence)"},
        ],
        global_=["ensemble admissible de tous les cadres"],
        proxies=["conjonction NC(F) ∧ Min(F) ∧ Fert(F)"],
        limits=["les trois critères peuvent être en tension (cf. contradiction WP12-003 ↔ WP12-004)"],
    ),
    "WP12-002": f(
        local=["proposition p ∈ F"],
        intermediate=[{"level": "meso", "scope": "famille WP-12"}],
        global_=["consistance du cadre F entier"],
        proxies=["recherche de paires p, ¬p dans F"],
        limits=["ne détecte pas les contradictions implicites"],
    ),
    "WP12-003": f(
        local=["cadre F et sa complexité K(F)"],
        intermediate=[{"level": "meso", "scope": "famille WP-12"}],
        global_=["classes d'équivalence sur l'ensemble des cadres"],
        proxies=["complexité de Kolmogorov approximée"],
        limits=["en tension avec WP12-004 (fertilité) — cf. contradiction déclarée"],
    ),
    "WP12-004": f(
        local=["cadre F et son F_parent"],
        intermediate=[{"level": "meso", "scope": "famille WP-12"}],
        global_=["arbre généalogique des cadres"],
        proxies=["décompte des prédictions nouvelles (différence symétrique)"],
        limits=["en tension avec WP12-003 (minimalité) — cf. contradiction déclarée"],
    ),
    "WP12-005": f(
        local=["cadre F et son voisinage N(F)"],
        intermediate=[{"level": "meso", "scope": "famille WP-12"}, {"level": "macro", "scope": "tous les cadres voisins indépendants"}],
        global_=["validation conjointe sur le réseau d'attracteurs"],
        proxies=["compat(F, G) pour G ∈ N(F)"],
        limits=["dépend de la définition du voisinage N(F)"],
    ),

    # ───────── SDE ─────────
    "SDE-001": f(
        local=["objet x sous focalisation cognitive"],
        intermediate=[{"level": "meso", "scope": "famille SDE"}],
        global_=["scène cognitive complète (focal + diffus)"],
        proxies=["décomposition focus(x) + diffuse(x)"],
        limits=["ne formalise pas le saut focal/diffus", "ne couvre pas l'attention partielle"],
    ),
    "SDE-002": f(
        local=["paire ⟨O, X⟩ observateur/objet"],
        intermediate=[{"level": "meso", "scope": "famille SDE"}],
        global_=["réseau complet d'observations mutuelles"],
        proxies=["test de symétrie ⟨O,X⟩ ↔ ⟨X,O⟩"],
        limits=["en tension avec ULG-003 (invariance morphologique) — cf. contradiction déclarée"],
    ),
    "SDE-003": f(
        local=["instance d'attention courante"],
        intermediate=[{"level": "meso", "scope": "famille SDE"}],
        global_=["bilan F_focal + F_diffuse = F_total"],
        proxies=["mesure de répartition d'attention"],
        limits=["F_focal et F_diffuse non observables directement"],
    ),
    "SDE-004": f(
        local=["paire d'opérations Skopein S1, S2"],
        intermediate=[{"level": "meso", "scope": "famille SDE"}],
        global_=["modulo invariant Skopein global"],
        proxies=["test commutativité ⟨S1∘S2⟩ ≡ ⟨S2∘S1⟩"],
        limits=["instabilité observée — variance sous perturbation à étudier"],
    ),
    "SDE-005": f(
        local=["relation ⟨O,X⟩ unique"],
        intermediate=[{"level": "meso", "scope": "famille SDE"}],
        global_=["cohérence des symétries sur l'ensemble des relations"],
        proxies=["application de σ et test de fixed point"],
        limits=["σ peut être non-trivial pour certaines paires asymétriques"],
    ),

    # ───────── PAL ─────────
    "PAL-001": f(
        local=["palier discret n et son voisinage de cohérence"],
        intermediate=[{"level": "meso", "scope": "famille PAL"}, {"level": "macro", "scope": "spectre des paliers"}],
        global_=["dynamique inter-palier complète"],
        proxies=["⌊log(S_global)/log(φ)⌋ approximation"],
        limits=["nature du quantum φ à clarifier", "S_global en proxy donc Δpalier en proxy"],
    ),
    "PAL-002": f(
        local=["transition entre paliers n et n+1"],
        intermediate=[{"level": "meso", "scope": "famille PAL"}],
        global_=["distribution complète des transitions sur le spectre"],
        proxies=["estimation Boltzmann de P(n→n+1)"],
        limits=["température T cognitive non mesurable directement"],
    ),
    "PAL-003": f(
        local=["point x près du seuil critique x_c"],
        intermediate=[{"level": "meso", "scope": "famille PAL"}],
        global_=["distribution des seuils sur le système"],
        proxies=["détection x > x_c avec hystérésis"],
        limits=["seuil x_c contextuel — pas universel"],
    ),
    "PAL-004": f(
        local=["état actuel dans l'espace des cadres"],
        intermediate=[{"level": "meso", "scope": "famille PAL"}, {"level": "macro", "scope": "topologie d'attracteurs"}],
        global_=["statistique des sauts sur l'ensemble"],
        proxies=["comparaison Δx_saut vs Δx_derivation"],
        limits=["instabilité — cohérence post-saut non garantie"],
    ),
    "PAL-005": f(
        local=["paliers n et n+k voisins"],
        intermediate=[{"level": "meso", "scope": "famille PAL"}, {"level": "systémique", "scope": "spectre complet"}],
        global_=["préservation de S_global à travers k paliers"],
        proxies=["mesure |S_global(n) − S_global(n+k)|"],
        limits=["k borné par la connectivité du spectre", "S_global en proxy"],
    ),
}


def main() -> int:
    raw = json.loads(DATA.read_text(encoding="utf-8"))
    nodes = raw["nodes"]

    missing = [n["id"] for n in nodes if n["id"] not in FRAMES]
    if missing:
        print(f"ERROR: no frames defined for {len(missing)} node(s):")
        for m in missing:
            print(f"  · {m}")
        return 1

    extra = [k for k in FRAMES if k not in {n["id"] for n in nodes}]
    if extra:
        print(f"WARNING: frames defined for {len(extra)} non-existent node(s):")
        for e in extra:
            print(f"  · {e}")

    for n in nodes:
        n["frames"] = FRAMES[n["id"]]

    DATA.write_text(json.dumps(raw, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"OK — added/updated frames on {len(nodes)} nodes.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
