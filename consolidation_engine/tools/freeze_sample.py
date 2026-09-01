"""Régénère sample/inputs/manifest.json depuis sample/frozen_tree.

Déterministe et rejouable : SHA-256 réels calculés depuis l'arbre, puis
deux mutations volontaires appliquées pour l'exercice de quarantaine :
 - unknown/tampered.py reçoit un SHA faux (premier caractère basculé) ;
 - components/ghost_component/ghost.py est déclaré au manifeste mais
   absent du disque (SHA constant de la chaîne 'ghost').
"""

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from zce import util  # noqa: E402

BASE = os.path.join(os.path.dirname(__file__), "..", "sample")
TREE = os.path.join(BASE, "frozen_tree")

OBJECT_TYPES = {
    "components/nl_k3_boundary_v1/boundary.py": ("component", "active"),
    "components/nl_k3_boundary_v1/test_boundary.py": ("test", "active"),
    "components/k3_frame_algebra_v1_1/algebra.py": ("component", "active"),
    "lib/zoran-core-runtime.ts": ("component", "active"),
    "components/zoran_chat_runtime_v1/runtime.py": ("component", "active"),
    "docs/notes.md": ("doc", "active"),
    "docs/notes_copy.md": ("doc", "active"),
    "archive/old_report.md": ("doc", "archived"),
    "unknown/tampered.py": ("unknown", "active"),
}


def flip_first_hex(sha: str) -> str:
    return ("0" if sha[0] != "0" else "1") + sha[1:]


def main():
    objects = []
    for rel_path, (object_type, status) in sorted(OBJECT_TYPES.items()):
        abs_path = os.path.join(TREE, rel_path)
        sha = util.sha256_file(abs_path)
        size = os.path.getsize(abs_path)
        if rel_path == "unknown/tampered.py":
            sha = flip_first_hex(sha)  # mutation volontaire → QUARANTINE
        objects.append({
            "path": rel_path,
            "object_type": object_type,
            "status": status,
            "size": size,
            "content_sha256": sha,
            "field_scope": ["zoran0"],
        })
    objects.append({
        "path": "components/ghost_component/ghost.py",
        "object_type": "component",
        "status": "active",
        "size": 42,
        "content_sha256": util.sha256_text("ghost"),  # fichier absent → QUARANTINE
        "field_scope": ["zoran0"],
    })
    manifest = {
        "schema": "zoran.zce.manifest.v1",
        "source_repo": "Zoran-IA-Mimetique/Zoran-2040-aSiM-sample",
        "source_ref": "FROZEN_SAMPLE_V1",
        "objects": sorted(objects, key=lambda o: o["path"]),
    }
    out = os.path.join(BASE, "inputs", "manifest.json")
    sha = util.write_json(out, manifest)
    print("manifest écrit:", os.path.normpath(out))
    print("sha256:", sha)


if __name__ == "__main__":
    main()
