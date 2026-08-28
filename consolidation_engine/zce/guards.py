"""Guards, checkpoints, budgets de modification et rayon d'impact.

Interdictions structurelles de ZORAN_CONSOLIDATION_ENGINE_V1 :
 - aucune écriture hors du répertoire de sortie (dry-run strict) ;
 - aucune réécriture des briques protégées (ZMOS, K3, NLP, Amygdale,
   moteur 4.0, ZenMOS) ;
 - aucun chargement des onze moteurs historiques 00-11 ;
 - aucune exécution de code proposé par un LLM ;
 - aucune suppression silencieuse ;
 - aucun merge/push/déploiement automatique.
"""

import re

GUARD_DRY_RUN_ONLY = "GUARD_DRY_RUN_ONLY"
GUARD_NO_SILENT_DELETE = "GUARD_NO_SILENT_DELETE"
GUARD_NO_LLM_EXECUTION = "GUARD_NO_LLM_EXECUTION"
GUARD_NO_HISTORICAL_ENGINES = "GUARD_NO_HISTORICAL_ENGINES"
GUARD_PROTECTED_COMPONENTS = "GUARD_PROTECTED_COMPONENTS"
GUARD_MODIFICATION_BUDGET = "GUARD_MODIFICATION_BUDGET"
GUARD_IMPACT_RADIUS = "GUARD_IMPACT_RADIUS"
GUARD_ROLLBACK_FIRST = "GUARD_ROLLBACK_FIRST"

ALL_GUARDS = [
    GUARD_DRY_RUN_ONLY,
    GUARD_NO_SILENT_DELETE,
    GUARD_NO_LLM_EXECUTION,
    GUARD_NO_HISTORICAL_ENGINES,
    GUARD_PROTECTED_COMPONENTS,
    GUARD_MODIFICATION_BUDGET,
    GUARD_IMPACT_RADIUS,
    GUARD_ROLLBACK_FIRST,
]

# Briques que le moteur n'a pas le droit de réécrire.
PROTECTED_PATTERNS = [
    r"zmos", r"zenmos", r"amygdala", r"amygdale",
    r"(^|[/_-])k3([/_.-]|$)", r"(^|[/_-])nlp([/_.-]|$)",
    r"moteur[_-]?4[._-]?0", r"engine[_-]?4[._-]?0",
]

# Moteurs historiques 00-11 : jamais chargés, jamais patchés.
HISTORICAL_ENGINE_PATTERN = r"(^|/)(moteur|engine)[_-]?(0[0-9]|1[01])([/_.-]|$)"

# Budget de modification par run (checkpoint dur, pas une préférence).
MODIFICATION_BUDGET = {
    "max_patches_per_run": 10,
    "max_files_per_patch": 3,
    "max_diff_lines_per_patch": 80,
}

# Rayon d'impact par défaut : seuls ces préfixes sont patchables.
DEFAULT_IMPACT_RADIUS = ["components/", "lib/", "docs/", "unknown/"]


def is_protected(path: str) -> bool:
    lowered = path.lower()
    return any(re.search(p, lowered) for p in PROTECTED_PATTERNS)


def is_historical_engine(path: str) -> bool:
    return re.search(HISTORICAL_ENGINE_PATTERN, path.lower()) is not None


def in_impact_radius(path: str, radius=None) -> bool:
    prefixes = radius if radius is not None else DEFAULT_IMPACT_RADIUS
    return any(path.startswith(prefix) for prefix in prefixes)


def check_patch_target(path: str, radius=None):
    """Retourne la liste des guards violés par une cible de patch."""
    violations = []
    if is_historical_engine(path):
        violations.append(GUARD_NO_HISTORICAL_ENGINES)
    if is_protected(path):
        violations.append(GUARD_PROTECTED_COMPONENTS)
    if not in_impact_radius(path, radius):
        violations.append(GUARD_IMPACT_RADIUS)
    return violations


class DryRunViolation(RuntimeError):
    """Levée si un chemin d'écriture hors dry-run est atteint en V1."""


def refuse_apply():
    raise DryRunViolation(
        "%s: ZORAN_CONSOLIDATION_ENGINE_V1 est en dry-run strict ; "
        "aucune application de patch, aucun merge, aucun push, aucun "
        "déploiement. L'application réelle exige une version ultérieure, "
        "un PRE K3 et une branche isolée." % GUARD_DRY_RUN_ONLY
    )
