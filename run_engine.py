#!/usr/bin/env python3
"""CLI simple pour le moteur de décision « cadres + curseurs ».

Usage :
    python run_engine.py                 # lance le scénario de démo (moteur)
    python run_engine.py --system s.json # charge un système depuis un JSON
    python run_engine.py --no-alternatives

Le format JSON attendu est celui de ``System.to_dict()`` :
    {
      "frames": [ {"name": ..., "type": ..., ...}, ... ],
      "dependencies": [ {"from": ..., "to": ..., "effect": ...}, ... ]
    }
"""

from __future__ import annotations

import argparse
import json
import sys

from decision_engine import DecisionEngine
from decision_engine.examples.moteur import demo
from decision_engine.models import System


def _run_demo(with_alternatives: bool) -> dict:
    result = demo()
    if not with_alternatives:
        result.pop("alternatives", None)
    return result


def _run_file(path: str, with_alternatives: bool) -> dict:
    with open(path, "r", encoding="utf-8") as handle:
        data = json.load(handle)
    engine = DecisionEngine(System.from_dict(data.get("system", data)))
    if "objectives" in data:
        engine.apply_objectives(data["objectives"])
    return engine.decide(with_alternatives=with_alternatives)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--system",
        help="chemin vers un système JSON (sinon : scénario de démo)",
    )
    parser.add_argument(
        "--no-alternatives",
        action="store_true",
        help="ne pas calculer les alternatives",
    )
    args = parser.parse_args(argv)

    with_alternatives = not args.no_alternatives
    if args.system:
        result = _run_file(args.system, with_alternatives)
    else:
        result = _run_demo(with_alternatives)

    print(json.dumps(result, indent=2, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    sys.exit(main())
