"""Utilitaires déterministes : JSON canonique, SHA-256, horloge injectable."""

import datetime
import hashlib
import json
import os

ISO_FMT = "%Y-%m-%dT%H:%M:%SZ"


def canonical_json(obj) -> str:
    """Sérialisation canonique : clés triées, séparateurs fixes, UTF-8."""
    return json.dumps(obj, sort_keys=True, ensure_ascii=False, separators=(",", ":"))


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def sha256_text(text: str) -> str:
    return sha256_bytes(text.encode("utf-8"))


def sha256_obj(obj) -> str:
    return sha256_text(canonical_json(obj))


def sha256_file(path: str) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


def parse_now(value=None) -> str:
    """Horloge injectable : --now > ZCE_NOW > horloge réelle. Format UTC gelé."""
    raw = value or os.environ.get("ZCE_NOW")
    if raw:
        # Valide le format en le rejouant.
        parsed = datetime.datetime.strptime(raw, ISO_FMT)
        return parsed.strftime(ISO_FMT)
    return datetime.datetime.now(datetime.timezone.utc).strftime(ISO_FMT)


def load_json(path: str):
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def write_text(path: str, text: str) -> None:
    os.makedirs(os.path.dirname(path) or ".", exist_ok=True)
    with open(path, "w", encoding="utf-8", newline="\n") as f:
        f.write(text)


def write_json(path: str, obj) -> str:
    """Écrit un JSON canonique + saut de ligne final ; retourne le SHA-256 du contenu."""
    text = canonical_json(obj) + "\n"
    write_text(path, text)
    return sha256_text(text)
