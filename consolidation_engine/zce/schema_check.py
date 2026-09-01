"""Validateur JSON déterministe (sous-ensemble documenté de JSON Schema).

Sous-ensemble supporté : type, required, properties, items, enum,
additionalProperties (booléen). Suffisant pour les contrats V1 ; tout
document hors contrat est refusé avec la liste exhaustive des causes.
"""


def _type_ok(value, expected):
    mapping = {
        "object": dict,
        "array": list,
        "string": str,
        "integer": int,
        "number": (int, float),
        "boolean": bool,
        "null": type(None),
    }
    py = mapping[expected]
    if expected == "integer" and isinstance(value, bool):
        return False
    if expected == "number" and isinstance(value, bool):
        return False
    return isinstance(value, py)


def validate(instance, schema, path="$"):
    """Retourne la liste triée des violations ; liste vide = conforme."""
    errors = []
    expected_type = schema.get("type")
    if expected_type is not None and not _type_ok(instance, expected_type):
        errors.append("%s: type attendu %s" % (path, expected_type))
        return sorted(errors)
    if "enum" in schema and instance not in schema["enum"]:
        errors.append("%s: valeur hors enum %s" % (path, schema["enum"]))
    if isinstance(instance, dict):
        for key in schema.get("required", []):
            if key not in instance:
                errors.append("%s: clé requise absente '%s'" % (path, key))
        properties = schema.get("properties", {})
        if schema.get("additionalProperties") is False:
            for key in sorted(instance):
                if key not in properties:
                    errors.append("%s: clé non déclarée '%s'" % (path, key))
        for key, subschema in sorted(properties.items()):
            if key in instance:
                errors.extend(validate(instance[key], subschema, path + "." + key))
    if isinstance(instance, list) and "items" in schema:
        for i, item in enumerate(instance):
            errors.extend(validate(item, schema["items"], "%s[%d]" % (path, i)))
    return sorted(errors)
