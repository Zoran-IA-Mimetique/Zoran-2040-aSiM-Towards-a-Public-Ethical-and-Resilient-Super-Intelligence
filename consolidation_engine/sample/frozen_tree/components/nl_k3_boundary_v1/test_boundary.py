# Échantillon gelé — test de la frontière (objet de soutien, type test).

from boundary import boundary


def test_boundary_fail_closed():
    try:
        boundary(None)
    except ValueError:
        return True
    return False
