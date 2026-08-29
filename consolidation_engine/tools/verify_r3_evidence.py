"""Vérification déterministe du dossier d'évidence R3 (revue Codex, finding P1).

Rejouable localement et en CI :
 1. chaque fichier de evidence/r3 correspond au SHA-256 pinné dans SHA256SUMS ;
 2. chaque reçu *.json est un JSON valide ;
 3. le bundle ZORAN_OPPOSED_PAIR_GATE_V1_1.zip est extrait vers --workdir et
    son manifeste interne MANIFEST_SHA256.json est vérifié (SHA-256 + taille
    de chacun de ses fichiers).

Les tests du bundle (20) et la campagne 1M sont rejoués par les étapes CI
suivantes dans le répertoire extrait ; ce script prépare et certifie l'arbre.
Sortie 0 = conforme ; toute divergence lève et sort en erreur (fail-closed).
"""

import argparse
import glob
import hashlib
import json
import os
import sys
import zipfile

BUNDLE = "ZORAN_OPPOSED_PAIR_GATE_V1_1.zip"


def sha256_file(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--evidence-dir", required=True)
    parser.add_argument("--workdir", required=True,
                        help="répertoire d'extraction du bundle (hors dépôt)")
    args = parser.parse_args()
    os.chdir(args.evidence_dir)

    # 1. Sommes pinnées de tout le dossier d'évidence.
    checked = 0
    with open("SHA256SUMS", "r", encoding="utf-8") as f:
        for line in f:
            expected, _, name = line.strip().partition("  ")
            actual = sha256_file(name)
            if actual != expected:
                raise SystemExit("SHA divergent pour %s: %s ≠ %s"
                                 % (name, actual, expected))
            checked += 1
    print("SHA256SUMS: %d fichiers conformes" % checked)

    # 2. Chaque reçu JSON doit se parser.
    receipts = sorted(glob.glob("*.json"))
    for receipt in receipts:
        with open(receipt, "r", encoding="utf-8") as f:
            json.load(f)
    print("reçus JSON valides: %d" % len(receipts))

    # 3. Extraction du bundle + vérification de son manifeste interne.
    zipfile.ZipFile(BUNDLE).extractall(args.workdir)
    root = os.path.join(args.workdir, "ZORAN_OPPOSED_PAIR_GATE_V1_1")
    manifest = json.load(open(os.path.join(root, "MANIFEST_SHA256.json"),
                              encoding="utf-8"))
    for entry in manifest["files"]:
        path = os.path.join(root, entry["path"])
        actual = sha256_file(path)
        if actual != entry["sha256"]:
            raise SystemExit("manifeste interne: SHA divergent pour %s"
                             % entry["path"])
        if os.path.getsize(path) != entry["size_bytes"]:
            raise SystemExit("manifeste interne: taille divergente pour %s"
                             % entry["path"])
    print("manifeste interne du bundle: %d fichiers conformes"
          % len(manifest["files"]))
    print("racine extraite:", root)
    return 0


if __name__ == "__main__":
    sys.exit(main())
