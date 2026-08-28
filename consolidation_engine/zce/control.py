"""Contrôle de chaque fichier AVANT toute intervention (plan §15, op. 2).

Chaque entrée du manifeste subit une liste fermée de contrôles ; le
résultat est un reçu par fichier, jamais un booléen muet.
"""

import os

from . import util

CHECKS = ["INSIDE_ROOT", "EXISTS", "IS_FILE", "NOT_SYMLINK", "SIZE_MATCH", "SHA_MATCH"]


def control_file(root: str, entry: dict) -> dict:
    """Contrôle une entrée de manifeste contre l'arbre gelé ; ne modifie rien."""
    rel_path = entry["path"]
    checks = []
    abs_root = os.path.realpath(root)
    abs_path = os.path.realpath(os.path.join(root, rel_path))

    inside = abs_path == abs_root or abs_path.startswith(abs_root + os.sep)
    checks.append(_check("INSIDE_ROOT", inside,
                         "" if inside else "chemin hors racine gelée: %s" % rel_path))

    exists = inside and os.path.lexists(os.path.join(root, rel_path))
    checks.append(_check("EXISTS", exists,
                         "" if exists else "fichier absent du disque"))

    is_file = exists and os.path.isfile(abs_path)
    checks.append(_check("IS_FILE", is_file if exists else None,
                         "" if is_file else "n'est pas un fichier régulier"))

    not_symlink = exists and not os.path.islink(os.path.join(root, rel_path))
    checks.append(_check("NOT_SYMLINK", not_symlink if exists else None,
                         "" if not_symlink else "lien symbolique refusé"))

    actual_sha = None
    actual_size = None
    if is_file and not_symlink:
        actual_sha = util.sha256_file(abs_path)
        actual_size = os.path.getsize(abs_path)
        size_ok = ("size" not in entry) or (entry["size"] == actual_size)
        checks.append(_check("SIZE_MATCH", size_ok,
                             "" if size_ok else "taille %s attendue, %s réelle"
                             % (entry.get("size"), actual_size)))
        sha_ok = entry["content_sha256"] == actual_sha
        checks.append(_check("SHA_MATCH", sha_ok,
                             "" if sha_ok else "SHA manifeste %s ≠ SHA réel %s"
                             % (entry["content_sha256"], actual_sha)))
    else:
        checks.append(_check("SIZE_MATCH", None, "non mesurable: fichier illisible"))
        checks.append(_check("SHA_MATCH", None, "non mesurable: fichier illisible"))

    failed = sorted(c["check"] for c in checks if c["status"] == "FAIL")
    unmeasured = sorted(c["check"] for c in checks if c["status"] == "NON_MESURÉ")
    return {
        "path": rel_path,
        "checks": checks,
        "actual_sha256": actual_sha,
        "actual_size": actual_size,
        "failed_checks": failed,
        "unmeasured_checks": unmeasured,
        "ok": not failed and not unmeasured,
    }


def _check(name, ok, detail):
    if ok is None:
        status = "NON_MESURÉ"
    else:
        status = "PASS" if ok else "FAIL"
    return {"check": name, "status": status, "detail": detail}
