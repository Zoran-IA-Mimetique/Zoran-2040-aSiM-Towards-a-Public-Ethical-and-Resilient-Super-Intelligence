"""Acquisition des deux courbes de décroissance exigées par FORME-006.

Produit exactement les deux fichiers que `run_shape_006.py` sait lire, en
mesurant un **vrai** processeur supraconducteur :

    mesures_T1.csv   relaxation énergétique   → β attendu 1
    mesures_T2.csv   Ramsey, déphasage        → β attendu 2

## Ce que ce script n'est pas

Ce n'est pas une simulation. Il n'existe volontairement **aucun mode
« simulateur »** ici, et c'est une décision, pas un oubli : un simulateur avec un
modèle de bruit en `1/f` restituerait l'exposant qu'on y aurait mis. Il
confirmerait la loi par construction, ce qui est le contraire d'un test.

FORME-006 ne peut être tranché que par un dispositif physique.

## Pré-requis

```bash
pip install qiskit qiskit-ibm-runtime
export IBM_QUANTUM_TOKEN="…"     # compte gratuit, plan Open
python -m experiments.acquire_qubit_006
```

Le plan Open est limité au mode `job`/`batch` — pas de session. Le script en
tient compte.

## Ensuite

```bash
python -m experiments.run_shape_006 mesures_T1.csv
python -m experiments.run_shape_006 mesures_T2.csv
```

Chaque appel répond `ACCORD` ou `DESACCORD_LOI_REFUTEE`.

⚠ Ce script n'a **pas** pu être exécuté lors de son écriture : aucun jeton
d'accès n'était disponible. La surface d'API de `qiskit-ibm-runtime` évolue ;
vérifier les noms au premier lancement plutôt que de supposer qu'ils sont
exacts.
"""

from __future__ import annotations

import os
import sys
from pathlib import Path

#: Délais balayés, en secondes. Couvrent typiquement 0 → ~2·T1 sur du matériel
#: courant. À élargir si les amplitudes n'atteignent pas le régime décroissant.
DELAYS_SECONDS = [i * 4e-6 for i in range(41)]  # 0 → 160 µs
SHOTS = 4096
#: Le lecteur exige 0 < amplitude < 1 : on écarte les points saturés.
EPSILON = 1e-3


def build_circuits(qubit: int, delays: list[float]):
    """Deux familles de circuits : relaxation `T1` et Ramsey `T2*`.

    Ramsey **sans désaccord** : sans oscillation à filtrer, la probabilité lue
    donne directement l'enveloppe de cohérence, qui est la grandeur dont
    FORME-006 a besoin.
    """
    from qiskit import QuantumCircuit

    t1_circuits, t2_circuits = [], []
    for delay in delays:
        t1 = QuantumCircuit(qubit + 1, 1)
        t1.x(qubit)
        t1.delay(delay, qubit, unit="s")
        t1.measure(qubit, 0)
        t1_circuits.append(t1)

        t2 = QuantumCircuit(qubit + 1, 1)
        t2.h(qubit)
        t2.delay(delay, qubit, unit="s")
        t2.h(qubit)
        t2.measure(qubit, 0)
        t2_circuits.append(t2)
    return t1_circuits, t2_circuits


def probability_of_one(counts: dict[str, int]) -> float:
    total = sum(counts.values())
    if total == 0:
        raise ValueError("aucun coup enregistré")
    return sum(v for k, v in counts.items() if k.endswith("1")) / total


def write_curve(path: Path, times: list[float], amplitudes: list[float]) -> int:
    rows = [
        (t, a)
        for t, a in zip(times, amplitudes)
        if EPSILON < a < 1.0 - EPSILON and t > 0.0
    ]
    lines = ["t,amplitude"] + [f"{t:.9e},{a:.6f}" for t, a in rows]
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")
    return len(rows)


def main() -> int:
    token = os.environ.get("IBM_QUANTUM_TOKEN")
    if not token:
        print(
            "IBM_QUANTUM_TOKEN absent.\n"
            "Ce script mesure du matériel réel ; il n'a pas de mode dégradé, "
            "parce qu'un simulateur restituerait l'exposant qu'on y aurait mis.\n"
            "Compte gratuit (plan Open) puis :  export IBM_QUANTUM_TOKEN=…",
            file=sys.stderr,
        )
        return 2

    try:
        from qiskit import transpile
        from qiskit_ibm_runtime import QiskitRuntimeService, SamplerV2
    except ImportError:
        print(
            "Dépendances manquantes :  pip install qiskit qiskit-ibm-runtime",
            file=sys.stderr,
        )
        return 2

    service = QiskitRuntimeService(channel="ibm_quantum_platform", token=token)
    backend = service.least_busy(operational=True, simulator=False)
    print(f"dispositif : {backend.name}")

    qubit = 0
    t1_circuits, t2_circuits = build_circuits(qubit, DELAYS_SECONDS)
    compiled = transpile(t1_circuits + t2_circuits, backend=backend)

    # Plan Open : mode job, pas de session.
    sampler = SamplerV2(mode=backend)
    result = sampler.run(compiled, shots=SHOTS).result()

    split = len(t1_circuits)
    populations = [
        probability_of_one(item.data.c.get_counts()) for item in result
    ]
    t1_pop, t2_pop = populations[:split], populations[split:]

    out = Path(__file__).parent

    # T1 : la population de |1> décroît comme l'enveloppe elle-même.
    n1 = write_curve(out / "mesures_T1.csv", DELAYS_SECONDS, t1_pop)

    # Ramsey sans désaccord : P(1) → 1/2. L'enveloppe vaut |1 - 2·P(1)|.
    t2_envelope = [abs(1.0 - 2.0 * p) for p in t2_pop]
    n2 = write_curve(out / "mesures_T2.csv", DELAYS_SECONDS, t2_envelope)

    print(f"mesures_T1.csv : {n1} points exploitables (β attendu ≈ 1)")
    print(f"mesures_T2.csv : {n2} points exploitables (β attendu ≈ 2)")
    if min(n1, n2) < 10:
        print(
            "Moins de dix points exploitables : élargir DELAYS_SECONDS pour "
            "couvrir le régime décroissant.",
            file=sys.stderr,
        )
        return 1
    print("\nEnsuite :\n"
          "  python -m experiments.run_shape_006 experiments/mesures_T1.csv\n"
          "  python -m experiments.run_shape_006 experiments/mesures_T2.csv")
    return 0


if __name__ == "__main__":
    sys.exit(main())
