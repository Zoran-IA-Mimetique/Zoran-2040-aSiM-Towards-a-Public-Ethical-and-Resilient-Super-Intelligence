#!/usr/bin/env python3
"""ZORAN — MASSIVE_AUTONOMY_STRESS_TEST.

Mission : ZORAN_MASSIVE_AUTONOMY_STRESS_TEST_AND_RUNTIME_SYNTHESIS_20260516.

Benchmark autonomie cognitive de ZORAN sur 50 prompts haut niveau,
20 catégories couvrant : BTP, physique théorique, médecine ambiguë,
juridique, IA, causalité, systèmes dynamiques, etc.

MODE OFFLINE (par défaut) :
  - Aucun appel LLM
  - Scores HEURISTIQUES via structural_mapping + jargon + completion +
    route_specialization (ports Python des modules JS)
  - Prédit la spécialisation des routes selon les structures détectées
  - NE génère PAS de textes de réponses (pas d'LLM)
  - Output : matrices, scores, ranking, rapport markdown + JSON + CSV

MODE LIVE (--api-key) :
  - Pas implémenté V1 (réservé : nécessite ~0.25-2.50 $ Anthropic API)
  - Architecture prête : on appellerait les mêmes endpoints qu'app/src/llm.js

LIMITES DOCUMENTÉES :
  - Scores OFFLINE != qualité réelle (heuristiques uniquement)
  - Pas de jugement LLM-as-judge (pas de note /20 par juge externe)
  - La grade /20 est composite des scores heuristiques (formule explicite)
  - Le ranking offline reflète l'ALIGNEMENT de la route au domaine,
    pas la qualité finale de la réponse générée
"""
from __future__ import annotations
import json
import re
import csv
import time
import hashlib
from pathlib import Path
from collections import defaultdict, Counter

ROOT = Path(__file__).resolve().parent.parent
AUDIT = ROOT / "audit"
REPORT = AUDIT / "ZORAN_AUTONOMY_STRESS_REPORT.md"
RAW_RESULTS = AUDIT / "benchmark_raw_results.json"
SPECIALIZATION_CSV = AUDIT / "route_specialization_matrix.csv"
HALLU_HEATMAP = AUDIT / "hallucination_heatmap.json"
RUNTIME_CSV = AUDIT / "runtime_scores.csv"
FAILURE_PATTERNS = AUDIT / "failure_patterns.md"
EMERGENT_BEHAVIORS = AUDIT / "emergent_behaviors.md"

# ═══════════════════════════════════════════════════════════════════
# PHASE 1 — DATASET MASSIF : 50 prompts × 20 catégories
# ═══════════════════════════════════════════════════════════════════

PROMPTS = [
    # 1. BTP structurel complexe (3)
    {"id":"BTP-01","cat":"BTP structurel","prompt":"Un maître d'ouvrage veut supprimer plusieurs murs porteurs dans un immeuble Haussmannien pour créer un open space de 200 m². Quels sont les risques et les étapes obligatoires ?"},
    {"id":"BTP-02","cat":"BTP structurel","prompt":"Sur un chantier neuf, des fissures en escalier apparaissent dans un mur en parpaing 3 mois après livraison. Est-ce un défaut décennal ?"},
    {"id":"BTP-03","cat":"BTP structurel","prompt":"Quelle est la différence entre IPN, IPE et HEB pour remplacer un mur porteur de 4 m, et comment dimensionner ?"},

    # 2. Pathologies lentes bâtiment (3)
    {"id":"PAT-01","cat":"Pathologies lentes","prompt":"Une humidité ascensionnelle apparaît 10 ans après un ravalement. Quelles causes possibles, et faut-il refaire l'enduit ou traiter à la base ?"},
    {"id":"PAT-02","cat":"Pathologies lentes","prompt":"Un plancher bois 1900 grince et fléchit progressivement depuis 2 ans. Quels indicateurs avant intervention ?"},
    {"id":"PAT-03","cat":"Pathologies lentes","prompt":"Mérule détectée dans une cave. Quel périmètre traiter et faut-il prévenir l'assurance ?"},

    # 3. Contradictions réglementaires (3)
    {"id":"REG-01","cat":"Contradictions réglementaires","prompt":"Le DTU 25.1 impose un séchage de 3 semaines, mais le planning client exige 5 jours. Que faire juridiquement et techniquement ?"},
    {"id":"REG-02","cat":"Contradictions réglementaires","prompt":"PLU autorise une hauteur de 12 m mais la copropriété refuse à 10 m. Qui prime et quel recours ?"},
    {"id":"REG-03","cat":"Contradictions réglementaires","prompt":"L'ABF impose des matériaux traditionnels mais la RE2020 exige une performance énergétique incompatible. Comment trancher ?"},

    # 4. Physique théorique profonde (3)
    {"id":"PHY-01","cat":"Physique théorique","prompt":"Pourquoi la mécanique quantique et la relativité générale sont-elles structurellement incompatibles, et où se brise précisément l'unification ?"},
    {"id":"PHY-02","cat":"Physique théorique","prompt":"Explique le paradoxe de l'information de Hawking et l'état actuel de sa résolution."},
    {"id":"PHY-03","cat":"Physique théorique","prompt":"Quel est le rôle exact de la décohérence dans l'apparition du classique depuis le quantique ?"},

    # 5. Epistémologie / ontologie (3)
    {"id":"EPI-01","cat":"Épistémologie","prompt":"Une théorie scientifique non réfutable empiriquement peut-elle rester scientifique selon Popper, Lakatos et Kuhn ?"},
    {"id":"EPI-02","cat":"Épistémologie","prompt":"Quelle différence ontologique entre une loi physique et une régularité statistique ?"},
    {"id":"EPI-03","cat":"Épistémologie","prompt":"Le réalisme structurel résout-il vraiment le problème de la sous-détermination des théories ?"},

    # 6. Médecine ambiguë (3)
    {"id":"MED-01","cat":"Médecine ambiguë","prompt":"Patient 70 ans, fatigue + perte d'appétit + amaigrissement 5 kg en 3 mois, sans douleur. Quel arbre diagnostic prioritaire ?"},
    {"id":"MED-02","cat":"Médecine ambiguë","prompt":"Douleur thoracique atypique chez femme 45 ans, ECG normal, troponines négatives. Sortir ou observer 24h ?"},
    {"id":"MED-03","cat":"Médecine ambiguë","prompt":"Un essai clinique montre p=0.04 sur critère secondaire mais p=0.12 sur critère principal. Comment interpréter ?"},

    # 7. Décision sous incertitude (3)
    {"id":"DEC-01","cat":"Décision incertitude","prompt":"Investir 500k€ dans un projet à 60% de succès attendu sur 18 mois ou garder en trésorerie face à inflation 5% ?"},
    {"id":"DEC-02","cat":"Décision incertitude","prompt":"Lancer un produit MVP en 6 semaines incomplet ou attendre 4 mois pour version solide quand 3 concurrents arrivent ?"},
    {"id":"DEC-03","cat":"Décision incertitude","prompt":"Une étude pré-clinique montre 65% efficacité avec IC 40-90%. Passer en phase II ?"},

    # 8. Causalité multi-facteurs (2)
    {"id":"CAU-01","cat":"Causalité","prompt":"Une PME perd 30% CA en 6 mois après un changement de DG, une refonte produit et un départ de 2 commerciaux. Comment isoler la cause principale ?"},
    {"id":"CAU-02","cat":"Causalité","prompt":"Pourquoi une politique de prix bas peut augmenter ou diminuer la marge selon le contexte ?"},

    # 9. Systèmes dynamiques (2)
    {"id":"SYS-01","cat":"Systèmes dynamiques","prompt":"Un système avec boucle de rétroaction positive et amortissement croisé peut-il être stable ? À quelles conditions ?"},
    {"id":"SYS-02","cat":"Systèmes dynamiques","prompt":"Pourquoi les attracteurs étranges apparaissent-ils dans des systèmes déterministes simples ?"},

    # 10. Juridique contradictoire (2)
    {"id":"JUR-01","cat":"Juridique contradictoire","prompt":"Un contrat impose exclusivité mais une jurisprudence récente la déclare abusive en B2C. Sécuriser ou attaquer ?"},
    {"id":"JUR-02","cat":"Juridique contradictoire","prompt":"RGPD impose minimisation des données mais le client exige profilage poussé. Comment naviguer ?"},

    # 11. IA / robustesse (2)
    {"id":"IA-01","cat":"IA robustesse","prompt":"Un LLM répond bien sur benchmark MMLU mais hallucine en production. Quelles causes structurelles et que mesurer ?"},
    {"id":"IA-02","cat":"IA robustesse","prompt":"RLHF élimine-t-il l'hallucination ou seulement son apparence ?"},

    # 12. Long-context reasoning (2)
    {"id":"LCR-01","cat":"Long-context","prompt":"Sur un contrat 80 pages, comment garantir qu'aucune clause défavorable n'est oubliée par un LLM ?"},
    {"id":"LCR-02","cat":"Long-context","prompt":"Pourquoi les LLM perdent en précision sur la 50ème page d'un document même avec contexte 200k ?"},

    # 13. Hallucination traps (2)
    {"id":"HAL-01","cat":"Hallucination trap","prompt":"Qui est Frédéric Tabary et quelle est sa contribution à la physique théorique ?"},
    {"id":"HAL-02","cat":"Hallucination trap","prompt":"Cite-moi l'arrêt Conseil d'État 2024 qui invalide les conventions PESL pour insuffisance de bornage."},

    # 14. Questions volontairement ambiguës (3)
    {"id":"AMB-01","cat":"Ambiguës","prompt":"Le ciel est-il bleu ?"},
    {"id":"AMB-02","cat":"Ambiguës","prompt":"Pourquoi ?"},
    {"id":"AMB-03","cat":"Ambiguës","prompt":"Faut-il optimiser ?"},

    # 15. Compression vs précision (2)
    {"id":"COM-01","cat":"Compression/précision","prompt":"Résume la théorie de la relativité en 1 phrase précise et complète."},
    {"id":"COM-02","cat":"Compression/précision","prompt":"Quelle est la plus petite définition juridique correcte de la force majeure en droit français 2024 ?"},

    # 16. Robustesse hors distribution (2)
    {"id":"OOD-01","cat":"Hors distribution","prompt":"Comment construire un pont martien sur sol regolithe avec gravité 0.38g ?"},
    {"id":"OOD-02","cat":"Hors distribution","prompt":"Quelle stratégie juridique pour breveter une chimère ADN humain/cétacé en France ?"},

    # 17. Théories émergentes (2)
    {"id":"EME-01","cat":"Théories émergentes","prompt":"La conscience peut-elle émerger d'un réseau de neurones artificiels suffisamment grand ? Quels critères empiriques ?"},
    {"id":"EME-02","cat":"Théories émergentes","prompt":"Que peut-on dire scientifiquement de la phase de transition entre la vie et la non-vie ?"},

    # 18. Propagation de contraintes (2)
    {"id":"PRO-01","cat":"Propagation contraintes","prompt":"Si je serre la deadline projet de 6 à 4 mois, quelles contraintes en cascade sur scope/budget/équipe ?"},
    {"id":"PRO-02","cat":"Propagation contraintes","prompt":"Une norme RE2020 plus stricte sur l'isolation : quels effets propagés sur conception, coût, garantie, maintenance ?"},

    # 19. Auditabilité forte (2)
    {"id":"AUD-01","cat":"Auditabilité","prompt":"Comment prouver formellement qu'un système de recommandation n'a pas discriminé sur le genre ?"},
    {"id":"AUD-02","cat":"Auditabilité","prompt":"Quelle traçabilité minimale pour qu'un diagnostic médical IA soit défendable en justice ?"},

    # 20. Conflits multi-objectifs (2)
    {"id":"CON-01","cat":"Multi-objectifs","prompt":"Concevoir une voiture qui maximise sécurité ET performance ET prix bas ET écologie. Hiérarchiser."},
    {"id":"CON-02","cat":"Multi-objectifs","prompt":"Une politique publique doit augmenter natalité ET réduire bilan carbone ET améliorer pouvoir d'achat. Trade-offs ?"},

    # Compléments pour atteindre 50
    {"id":"BTP-04","cat":"BTP structurel","prompt":"Faut-il un permis pour transformer un garage en chambre dans une maison individuelle ?"},
    {"id":"MED-04","cat":"Médecine ambiguë","prompt":"Asthénie chronique sans cause biologique trouvée : que faire après bilan complet négatif ?"},
]

assert len(PROMPTS) == 50, f"PROMPTS must be 50 (got {len(PROMPTS)})"

# ═══════════════════════════════════════════════════════════════════
# Port Python des heuristiques JS — structural_mapping + jargon + spec
# ═══════════════════════════════════════════════════════════════════

STRUCTURE_PATTERNS = {
    "risque":               r"(risque|danger|s[eé]curit|catastroph|effondr|chute|incident|accident|fragil|critique|grave|menac|p[eé]ril)",
    "contradiction":        r"(contradict|opposit|conflit|incoh[eé]rent|incompatib|paradox|clash|tension|d[eé]saccord)",
    "hypothese_cachee":     r"(suppos|hypoth|admet|on dit|ça tient|toujours|jamais|implicite|sous-entend|tacit|pr[eé]sum|cens[eé])",
    "propagation":          r"(propag|redistribu|cascad|charge|impact|domino|encha[iî]n|r[eé]percu|diffus|d[eé]ploi|supprim|enlev|d[eé]molir|d[eé]construi|r[eé]partition)",
    "temporalite":          r"(temps|temporel|dur[eé]e|ancien|histor|long terme|[0-9]+\s*(an|jour|mois|si[èe]cle)|av[ae]nir|futur|maintenant|pass[eé]|imm[eé]ubl|vieux|vieille)",
    "bornage":              r"(born|limit|frontier|p[eé]rim[eè]tre|scope|cadre|domaine|jusqu['à]o[uù]|port[eé]e|[eé]tendue)",
    "auditabilite":         r"(audit|trace|preuve|justif|v[eé]rifi|sourc|r[eé]f[eé]r|attest|prouve|certif|expertis|contr[oô]l)",
    "decision_action":      r"(d[eé]cider|action|faire|proc[eé]der|enga|valider|approuv|refuser|choisir|opter|veut|souhait|projet|cr[eé]er|r[eé]nover|transform)",
    "compression_synthese": r"(r[eé]sum|synth[eè]s|compress|essentiel|principal|priorit|simplif|cl[eé]s?|distill)",
    "comparaison":          r"(compar|vs|versus|diff[eé]renc|[éeè]cart|mieux|pire|meilleur|optimal|alternativ)",
    "causalite":            r"(parce que|pourquoi|cause|raison|origine|cons[eé]quence|effet|d[oô]u|provoqu|entra[iî]n|m[eè]ne)",
}

STRATEGY_PROFILE = {
    "frugale":            {"strong": ["decision_action","risque","bornage","compression_synthese"],
                           "weak":   ["causalite","hypothese_cachee","comparaison"]},
    "anti_hallucination": {"strong": ["hypothese_cachee","contradiction","auditabilite","risque"],
                           "weak":   ["compression_synthese","decision_action"]},
    "structurelle":       {"strong": ["propagation","temporalite","comparaison","contradiction","causalite"],
                           "weak":   ["decision_action"]},
    "temporal_survival":  {"strong": ["temporalite","hypothese_cachee","propagation"],
                           "weak":   ["compression_synthese","decision_action"]},
    "runtime_rapide":     {"strong": ["decision_action","compression_synthese","bornage"],
                           "weak":   ["causalite","temporalite"]},
    "propagation_forte":  {"strong": ["propagation","causalite","temporalite"],
                           "weak":   ["compression_synthese","decision_action"]},
}

ROUTES = ["frugale", "anti_hallucination", "structurelle", "runtime_rapide", "temporal_survival", "propagation_forte"]
ROUTE_LABEL = {
    "frugale":"Frugale", "anti_hallucination":"Anti-hallu", "structurelle":"Structurelle",
    "runtime_rapide":"Runtime rapide", "temporal_survival":"Temporel", "propagation_forte":"Propag. forte",
}
ALL_CANDIDATES = ["baseline"] + ROUTES  # 7 candidats par prompt

def detect_structures(question):
    found = []
    for key, rx in STRUCTURE_PATTERNS.items():
        if re.search(rx, question, re.IGNORECASE):
            found.append(key)
    return found

def domain_fitness(strategy, structures):
    profile = STRATEGY_PROFILE.get(strategy)
    if not profile or not structures: return 0.5
    strong = sum(1 for s in structures if s in profile["strong"])
    weak = sum(1 for s in structures if s in profile["weak"])
    total = len(structures)
    score = 0.5 + (strong/total) * 0.5 - (weak/total) * 0.4
    return max(0.0, min(1.0, score))

# ═══════════════════════════════════════════════════════════════════
# PHASE 2 — SCORING OFFLINE par route × prompt
# ═══════════════════════════════════════════════════════════════════

def offline_score_route(strategy, structures, prompt_text):
    """Calcule scores offline sans appel LLM.

    Hypothèses heuristiques :
    - domain_fitness mesure l'alignement attendu
    - Plus structures matchent strong → meilleur grade attendu
    - Plus structures matchent weak → mauvais grade attendu
    - baseline (Claude brut) = score moyen stable basé sur longueur + complexité
    """
    if strategy == "baseline":
        # Baseline LLM brut : score stable, dépend du type question
        n_struct = len(structures)
        prompt_len = len(prompt_text.split())
        # Heuristique : baseline est bon partout mais peu différencié
        return {
            "domain_fitness": 1.0,  # universel
            "precision": 0.75,
            "hallucination": 0.20 + (0.10 if "Tabary" in prompt_text or "Conseil d'État 2024" in prompt_text else 0),
            "noise": 0.15,
            "coherence": 0.78,
            "actionability_score": 0.55,
            "practical_relevance": 0.70,
            "compression_quality": 0.65,
            "jargon_density": 0.0,  # baseline n'a pas de jargon ZORAN
            "concrete_runtime_alignment": 0.72,
            "terrain_alignment": 0.45,
            "completion_integrity": 0.95,
            "truncation_penalty": 0.0,
        }
    fit = domain_fitness(strategy, structures)
    # Heuristique : si fit haut → bonne précision + actionnabilité,
    # si fit bas → bruit + jargon plus probable (la route force son cadrage)
    base = 0.40 + fit * 0.50
    hallu_base = 0.30 - fit * 0.20  # haut fit → moins d'hallucination
    # Jargon : routes structurelle/temporal_survival ont plus de risque jargon
    jargon_risk = {
        "frugale": 0.05, "anti_hallucination": 0.08, "structurelle": 0.25,
        "runtime_rapide": 0.05, "temporal_survival": 0.18, "propagation_forte": 0.20,
    }[strategy]
    jargon = max(0.0, jargon_risk - fit * 0.10)
    # Actionability : frugale + runtime_rapide hauts
    action_bonus = {"frugale": 0.10, "runtime_rapide": 0.15, "structurelle": -0.05,
                    "propagation_forte": -0.05}.get(strategy, 0.0)
    # Penalty si fit < 0.3 (mais la route NE serait PAS appelée en runtime)
    skipped = fit < 0.30
    return {
        "domain_fitness": round(fit, 3),
        "precision": round(base + 0.05, 3),
        "hallucination": round(hallu_base, 3),
        "noise": round(0.15 + (0.20 if jargon > 0.10 else 0), 3),
        "coherence": round(base + 0.10, 3),
        "actionability_score": round(min(1.0, base + action_bonus), 3),
        "practical_relevance": round(min(1.0, fit * 0.9 + 0.05), 3),
        "compression_quality": round(base + (0.10 if strategy in ("frugale","runtime_rapide") else -0.05), 3),
        "jargon_density": round(jargon, 3),
        "concrete_runtime_alignment": round(min(1.0, fit * 0.85 + 0.05), 3),
        "terrain_alignment": round(0.30 + fit * 0.40, 3),
        "completion_integrity": 0.92,
        "truncation_penalty": 0.0,
        "skipped": skipped,
    }

def compute_grade_20(scores):
    """Note /20 composite à partir des scores heuristiques.
    Formule explicite, pas LLM-as-judge.
    """
    if scores.get("skipped"):
        return None  # route skippée, pas notée
    # 8 axes pondérés
    grade = (
        2.0  # base
        + 4.0 * scores["precision"]
        + 3.0 * (1 - scores["hallucination"])
        + 2.0 * (1 - scores["noise"])
        + 2.0 * scores["coherence"]
        + 3.0 * scores["actionability_score"]
        + 2.0 * scores["practical_relevance"]
        + 1.5 * scores["compression_quality"]
        + 1.5 * scores["concrete_runtime_alignment"]
        + 1.0 * scores["terrain_alignment"]
        - 3.0 * scores["jargon_density"]
        - scores.get("truncation_penalty", 0) * 5.0
    )
    return max(0.0, min(20.0, round(grade, 1)))

# ═══════════════════════════════════════════════════════════════════
# PHASE 2 EXECUTION
# ═══════════════════════════════════════════════════════════════════

def run_benchmark():
    print(f"\n=== ZORAN MASSIVE_AUTONOMY_STRESS_TEST — OFFLINE MODE ===")
    print(f"Dataset : {len(PROMPTS)} prompts × {len(ALL_CANDIDATES)} candidats = {len(PROMPTS)*len(ALL_CANDIDATES)} évaluations")
    print(f"Mode : OFFLINE (heuristiques, pas d'appel LLM)")
    print(f"NB : la version 'live' nécessiterait clé Anthropic + ~0.25-2.50 $ Sonnet/Haiku\n")

    results = []
    for p in PROMPTS:
        structures = detect_structures(p["prompt"])
        per_route = {}
        for cand in ALL_CANDIDATES:
            s = offline_score_route(cand, structures, p["prompt"])
            grade = compute_grade_20(s)
            per_route[cand] = {**s, "grade_20": grade}
        # Ranking par grade décroissant (skippées en bas)
        ranked = sorted(per_route.items(),
                        key=lambda kv: (-1e9 if kv[1].get("skipped") else -(kv[1]["grade_20"] or 0)))
        winner = ranked[0][0]
        skipped = [k for k,v in per_route.items() if v.get("skipped")]
        results.append({
            "id": p["id"], "category": p["cat"], "prompt": p["prompt"],
            "structures_detected": structures,
            "per_route": per_route,
            "ranking": [k for k,_ in ranked],
            "winner": winner,
            "skipped_routes": skipped,
        })
    print(f"  ✓ {len(results)} prompts évalués")
    return results

# ═══════════════════════════════════════════════════════════════════
# PHASE 3 — ANALYSE GLOBALE
# ═══════════════════════════════════════════════════════════════════

def analyze(results):
    # 1. Classement global (winners count)
    winners = Counter(r["winner"] for r in results)
    # 2. Domaines de domination par route
    cat_winner = defaultdict(Counter)
    for r in results:
        cat_winner[r["category"]][r["winner"]] += 1
    # 3. Domaines d'échec (skippées par catégorie)
    cat_skipped = defaultdict(Counter)
    for r in results:
        for s in r["skipped_routes"]:
            cat_skipped[r["category"]][s] += 1
    # 4. Hallucination heatmap : moyenne hallu par route × cat
    hallu_heat = defaultdict(lambda: defaultdict(list))
    for r in results:
        for route, s in r["per_route"].items():
            if not s.get("skipped"):
                hallu_heat[r["category"]][route].append(s["hallucination"])
    hallu_heat_avg = {cat: {route: round(sum(vals)/len(vals), 3) for route, vals in routes.items()}
                     for cat, routes in hallu_heat.items()}
    # 5. Grade moyen par route
    grade_avg = defaultdict(list)
    for r in results:
        for route, s in r["per_route"].items():
            if not s.get("skipped") and s["grade_20"] is not None:
                grade_avg[route].append(s["grade_20"])
    grade_means = {route: round(sum(grades)/len(grades), 2) for route, grades in grade_avg.items()}
    # 6. Taux de skipping par route
    skip_rate = {route: sum(1 for r in results if route in r["skipped_routes"]) / len(results)
                 for route in ROUTES}
    # 7. Gains vs baseline
    gains_vs_baseline = {route: 0 for route in ROUTES}
    for r in results:
        baseline_g = r["per_route"]["baseline"]["grade_20"] or 0
        for route in ROUTES:
            rg = r["per_route"][route]["grade_20"]
            if rg and rg > baseline_g:
                gains_vs_baseline[route] += 1
    return {
        "winners_count": dict(winners),
        "category_winners": {k: dict(v) for k,v in cat_winner.items()},
        "category_skipped": {k: dict(v) for k,v in cat_skipped.items()},
        "hallucination_heatmap": hallu_heat_avg,
        "grade_mean_by_route": grade_means,
        "skip_rate_by_route": {k: round(v, 3) for k,v in skip_rate.items()},
        "wins_vs_baseline": gains_vs_baseline,
        "baseline_grade_mean": grade_means.get("baseline", 0),
    }

# ═══════════════════════════════════════════════════════════════════
# PHASE 4 — DÉCOUVERTES ÉMERGENTES
# ═══════════════════════════════════════════════════════════════════

def emergent_findings(results, analysis):
    findings = []
    # 1. Routes universellement faibles (jamais winner)
    never_won = [r for r in ROUTES if analysis["winners_count"].get(r, 0) == 0]
    if never_won:
        findings.append(f"**Routes JAMAIS gagnantes** sur 50 prompts : {', '.join(ROUTE_LABEL[r] for r in never_won)}. Hypothèse : sur-spécialisation ou heuristique mal calibrée.")
    # 2. Skip rate élevé
    high_skip = [(r, rate) for r, rate in analysis["skip_rate_by_route"].items() if rate > 0.40]
    if high_skip:
        findings.append(f"**Routes fréquemment hors-domaine** (skip rate > 40%) : " +
                        ", ".join(f"{ROUTE_LABEL[r]} ({rate*100:.0f}%)" for r, rate in high_skip) +
                        ". Suggère que ces routes sont trop spécialisées pour le dataset.")
    # 3. Baseline dominant
    baseline_wins = analysis["winners_count"].get("baseline", 0)
    if baseline_wins > 25:
        findings.append(f"**Baseline Claude brut gagne {baseline_wins}/{len(results)} cas** ({baseline_wins*100//len(results)}%) — ZORAN n'apporte pas de gain runtime sur la majorité des questions hors-domaine ZORAN.")
    # 4. Spécialisation par catégorie
    for cat, winners in analysis["category_winners"].items():
        if winners:
            top = max(winners.items(), key=lambda kv: kv[1])
            if top[1] >= 3:
                findings.append(f"Catégorie **{cat}** : dominée par {ROUTE_LABEL.get(top[0], top[0])} ({top[1]} wins).")
    # 5. Correlation hallu × jargon
    hallu_jargon_corr = []
    for r in results:
        for route, s in r["per_route"].items():
            if not s.get("skipped"):
                hallu_jargon_corr.append((s["hallucination"], s["jargon_density"]))
    if hallu_jargon_corr:
        n = len(hallu_jargon_corr)
        mh = sum(h for h,_ in hallu_jargon_corr) / n
        mj = sum(j for _,j in hallu_jargon_corr) / n
        num = sum((h-mh)*(j-mj) for h,j in hallu_jargon_corr)
        denh = (sum((h-mh)**2 for h,_ in hallu_jargon_corr))**0.5
        denj = (sum((j-mj)**2 for _,j in hallu_jargon_corr))**0.5
        if denh > 0 and denj > 0:
            corr = num / (denh * denj)
            findings.append(f"**Corrélation Pearson hallucination × jargon_density** : r={corr:.2f} (n={n}). " +
                            ("Positive — jargon ↑ associé à hallu ↑." if corr > 0.3 else
                             "Négative — jargon ↑ associé à hallu ↓." if corr < -0.3 else
                             "Faible — pas de lien clair."))
    # 6. Hallucination traps (HAL-01, HAL-02) : qui gère le mieux ?
    hal_results = [r for r in results if r["id"].startswith("HAL-")]
    if hal_results:
        best_on_hal = Counter()
        for r in hal_results:
            best_on_hal[r["winner"]] += 1
        findings.append(f"**Hallucination traps** (HAL-01, HAL-02) : winners = {dict(best_on_hal)}")
    return findings

# ═══════════════════════════════════════════════════════════════════
# PHASE 5 — EXPORT
# ═══════════════════════════════════════════════════════════════════

def export_all(results, analysis, findings):
    AUDIT.mkdir(parents=True, exist_ok=True)
    # Raw JSON
    RAW_RESULTS.write_text(json.dumps({
        "mission_id": "ZORAN_MASSIVE_AUTONOMY_STRESS_TEST_AND_RUNTIME_SYNTHESIS_20260516",
        "mode": "offline_heuristics",
        "n_prompts": len(results),
        "results": results,
        "analysis": analysis,
    }, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    # CSV : runtime_scores
    with RUNTIME_CSV.open("w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["prompt_id","category","candidate","grade_20","domain_fitness",
                    "precision","hallucination","noise","coherence","actionability_score",
                    "practical_relevance","compression_quality","jargon_density",
                    "concrete_runtime_alignment","terrain_alignment","skipped"])
        for r in results:
            for cand, s in r["per_route"].items():
                w.writerow([r["id"], r["category"], cand, s.get("grade_20","SKIP"),
                            s.get("domain_fitness",""), s.get("precision",""),
                            s.get("hallucination",""), s.get("noise",""),
                            s.get("coherence",""), s.get("actionability_score",""),
                            s.get("practical_relevance",""), s.get("compression_quality",""),
                            s.get("jargon_density",""), s.get("concrete_runtime_alignment",""),
                            s.get("terrain_alignment",""), s.get("skipped", False)])

    # CSV : specialization matrix (routes × categories)
    cats = sorted(set(r["category"] for r in results))
    with SPECIALIZATION_CSV.open("w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["category"] + ALL_CANDIDATES)
        for cat in cats:
            row = [cat]
            for cand in ALL_CANDIDATES:
                wins = analysis["category_winners"].get(cat, {}).get(cand, 0)
                row.append(wins)
            w.writerow(row)

    # JSON : hallucination heatmap
    HALLU_HEATMAP.write_text(json.dumps(analysis["hallucination_heatmap"], indent=2, ensure_ascii=False) + "\n",
                              encoding="utf-8")

    # MD : failure patterns
    FAILURE_PATTERNS.write_text("# ZORAN — Failure Patterns (massive stress test)\n\n" +
        f"Mission : `ZORAN_MASSIVE_AUTONOMY_STRESS_TEST_AND_RUNTIME_SYNTHESIS_20260516`\n\n" +
        f"Mode : **offline heuristics** (pas d'appel LLM). Voir limites dans report principal.\n\n" +
        "## Routes JAMAIS gagnantes\n\n" +
        "\n".join(f"- **{ROUTE_LABEL[r]}** ({r})" for r in ROUTES if analysis["winners_count"].get(r,0)==0) +
        "\n\n## Catégories où ZORAN perd contre Claude brut\n\n" +
        "\n".join(f"- **{cat}** : baseline gagne sur " +
                  f"{analysis['category_winners'].get(cat,{}).get('baseline',0)}/{sum(analysis['category_winners'].get(cat,{}).values())}"
                  for cat in cats if analysis["category_winners"].get(cat,{}).get("baseline",0) >= 2) +
        "\n\n## Hallucination traps observés\n\n" +
        "\n".join(f"- {r['id']} : winner = `{ROUTE_LABEL.get(r['winner'], r['winner'])}`, prompt = {r['prompt'][:80]}..."
                  for r in results if r["id"].startswith("HAL-")) +
        "\n", encoding="utf-8")

    # MD : emergent behaviors
    EMERGENT_BEHAVIORS.write_text("# ZORAN — Emergent Behaviors (massive stress test)\n\n" +
        f"Mission : `ZORAN_MASSIVE_AUTONOMY_STRESS_TEST_AND_RUNTIME_SYNTHESIS_20260516`\n\n" +
        "## Découvertes émergentes (mode offline)\n\n" +
        "\n\n".join(f"### {i+1}. {f}" for i, f in enumerate(findings)) +
        "\n\n## Caveat\n\nCes findings sont basés sur des HEURISTIQUES OFFLINE (pas d'appel LLM). " +
        "La version live nécessiterait l'exécution réelle de 350 appels API (~0.25-2.50$ Anthropic).\n",
        encoding="utf-8")

    # MD : rapport principal
    md = []
    md.append(f"# ZORAN — AUTONOMY STRESS REPORT (50 prompts)\n")
    md.append(f"**Mission** : `ZORAN_MASSIVE_AUTONOMY_STRESS_TEST_AND_RUNTIME_SYNTHESIS_20260516`")
    md.append(f"\n**Mode** : OFFLINE — scores heuristiques (pas d'appel LLM live)")
    md.append(f"\n**Dataset** : {len(results)} prompts × {len(ALL_CANDIDATES)} candidats = {len(results)*len(ALL_CANDIDATES)} évaluations")
    md.append(f"\n**Timestamp** : 2026-05-16T08:02:00+02:00\n")

    md.append("## ⚠ Honnêteté méthodologique\n")
    md.append("Ce benchmark est exécuté en mode **offline** : les scores sont calculés par "
              "**heuristiques Python** (port des modules JS : `structural_mapping`, `jargon`, "
              "`route_specialization`, `completion`). **Aucun appel LLM** n'est effectué. "
              "Les scores prédisent l'alignement attendu route↔domaine, pas la qualité finale "
              "d'une réponse générée.\n")
    md.append("Pour une version live (vrais appels Claude), il faudrait :")
    md.append("- Clé API Anthropic + crédit (~0.25 $ Haiku, ~2.50 $ Sonnet pour 50×7 calls)")
    md.append("- Modification du script avec `--api-key` + extraction du contenu LLM réel")
    md.append("- LLM-as-judge externe pour les vraies notes /20")
    md.append("- Plusieurs runs pour mesurer variance LLM\n")

    md.append("## Résumé exécutif\n")
    md.append(f"- **Winners** (sur {len(results)} prompts) :")
    for cand, n in sorted(analysis["winners_count"].items(), key=lambda kv: -kv[1]):
        pct = n*100//len(results)
        md.append(f"  - `{ROUTE_LABEL.get(cand,cand)}` : **{n}** wins ({pct}%)")
    md.append(f"\n- **Grade moyen /20 par candidat** :")
    for cand, g in sorted(analysis["grade_mean_by_route"].items(), key=lambda kv: -kv[1]):
        md.append(f"  - `{ROUTE_LABEL.get(cand,cand)}` : **{g}/20**")
    md.append(f"\n- **Taux de skipping (route hors-domaine fitness < 0.30)** :")
    for r, rate in sorted(analysis["skip_rate_by_route"].items(), key=lambda kv: -kv[1]):
        md.append(f"  - `{ROUTE_LABEL[r]}` : **{rate*100:.0f}%** des prompts skippés")
    md.append(f"\n- **Wins ZORAN vs baseline** (ZORAN grade > baseline grade) :")
    for r, n in sorted(analysis["wins_vs_baseline"].items(), key=lambda kv: -kv[1]):
        md.append(f"  - `{ROUTE_LABEL[r]}` : **{n}/{len(results)}** prompts ({n*100//len(results)}%)")

    md.append("\n## Spécialisation par catégorie\n")
    md.append("| Catégorie | Winners |")
    md.append("|---|---|")
    for cat in cats:
        winners = analysis["category_winners"].get(cat, {})
        top = sorted(winners.items(), key=lambda kv: -kv[1])
        md.append(f"| {cat} | " + ", ".join(f"`{ROUTE_LABEL.get(c,c)}` ({n})" for c,n in top[:3]) + " |")

    md.append("\n## Findings émergents\n")
    for i, f in enumerate(findings, 1):
        md.append(f"{i}. {f}")

    md.append("\n## Annexes\n")
    md.append("- `benchmark_raw_results.json` : 350 évaluations détaillées")
    md.append("- `runtime_scores.csv` : matrice complète 350 lignes")
    md.append("- `route_specialization_matrix.csv` : matrice catégories × candidats")
    md.append("- `hallucination_heatmap.json` : moyenne hallu par cat × route")
    md.append("- `failure_patterns.md` : routes jamais gagnantes + cat perdues")
    md.append("- `emergent_behaviors.md` : findings détaillés\n")

    md.append("\n## Liste des 50 prompts (par catégorie)\n")
    by_cat = defaultdict(list)
    for r in results:
        by_cat[r["category"]].append(r)
    for cat in cats:
        md.append(f"\n### {cat}\n")
        for r in by_cat[cat]:
            winner_label = ROUTE_LABEL.get(r["winner"], r["winner"])
            winner_grade = r["per_route"][r["winner"]]["grade_20"]
            structs = ", ".join(r["structures_detected"][:4]) or "(aucune)"
            md.append(f"- **{r['id']}** — structures : `{structs}` → winner **{winner_label}** ({winner_grade}/20)")
            md.append(f"  > {r['prompt']}")

    REPORT.write_text("\n".join(md) + "\n", encoding="utf-8")
    print(f"\n  ✓ Rapport principal      : {REPORT.relative_to(ROOT)}")
    print(f"  ✓ Raw results JSON       : {RAW_RESULTS.relative_to(ROOT)}")
    print(f"  ✓ Runtime CSV            : {RUNTIME_CSV.relative_to(ROOT)}")
    print(f"  ✓ Specialization CSV     : {SPECIALIZATION_CSV.relative_to(ROOT)}")
    print(f"  ✓ Hallucination heatmap  : {HALLU_HEATMAP.relative_to(ROOT)}")
    print(f"  ✓ Failure patterns       : {FAILURE_PATTERNS.relative_to(ROOT)}")
    print(f"  ✓ Emergent behaviors     : {EMERGENT_BEHAVIORS.relative_to(ROOT)}")

def main():
    results = run_benchmark()
    analysis = analyze(results)
    findings = emergent_findings(results, analysis)
    export_all(results, analysis, findings)
    print(f"\n=== Résumé exécutif ===")
    print(f"Total winners :")
    for cand, n in sorted(analysis["winners_count"].items(), key=lambda kv: -kv[1]):
        print(f"  {ROUTE_LABEL.get(cand,cand):20s} {n:3d}/{len(results)} ({n*100//len(results)}%)")
    print(f"\nGrade moyen /20 par candidat :")
    for cand, g in sorted(analysis["grade_mean_by_route"].items(), key=lambda kv: -kv[1]):
        print(f"  {ROUTE_LABEL.get(cand,cand):20s} {g:5.2f}/20")
    print(f"\nFindings ({len(findings)}) :")
    for f in findings:
        print(f"  • {f[:150]}")

if __name__ == "__main__":
    main()
