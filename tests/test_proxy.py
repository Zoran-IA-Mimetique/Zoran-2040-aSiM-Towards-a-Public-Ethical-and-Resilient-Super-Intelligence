"""Proxy candidat `RelationalOverlapProxy` — comportement et défauts connus.

Certains tests ci-dessous **verrouillent un défaut** plutôt qu'une qualité : la
saturation décrite en F1 de `RESULTATS-PROXY-C-001.md` est un comportement réel
du proxy, publié comme tel. Le test existe pour qu'il ne disparaisse pas
silencieusement — s'il change, c'est que le proxy a été révisé, ce qui exige un
nouveau pré-enregistrement.
"""

import unittest

from ztemps.profile import Scale
from ztemps.proxy import ObjectSpec, RelationalOverlapProxy
from ztemps.systems import dephasing_family, path_symmetries


def chain_spec(n: int = 4, **kwargs) -> ObjectSpec:
    return ObjectSpec(
        constituents=frozenset(range(n)),
        adjacency=frozenset((i, i + 1) for i in range(n - 1)),
        **kwargs,
    )


class ObjectDeclaration(unittest.TestCase):
    def test_object_and_frame_are_disjoint(self):
        with self.assertRaises(ValueError):
            ObjectSpec(constituents=frozenset({0, 1}), frame=frozenset({1, 2}))

    def test_scales_are_nested(self):
        spec = chain_spec()
        state = {(i, j): 1.0 for i in range(4) for j in range(4) if i < j}
        sets = spec.scale_sets(state)
        self.assertLessEqual(sets[Scale.LOCAL], sets[Scale.OBJET])
        self.assertLessEqual(sets[Scale.OBJET], sets[Scale.CADRE])
        self.assertLessEqual(sets[Scale.CADRE], sets[Scale.GLOBAL])


class PreservationAndCompatibility(unittest.TestCase):
    def test_unchanged_state_is_fully_coherent(self):
        proxy = RelationalOverlapProxy(chain_spec())
        state = {(0, 1): 0.5, (1, 2): 0.5, (2, 3): 0.5, (0, 2): 0.2}
        profile = proxy(state, dict(state))
        self.assertTrue(profile.is_closed)

    def test_change_beyond_tolerance_is_not_preserved(self):
        proxy = RelationalOverlapProxy(chain_spec(), tolerance=0.05)
        before = {(0, 1): 0.5, (1, 2): 0.5, (2, 3): 0.5}
        after = {k: v - 0.2 for k, v in before.items()}
        self.assertEqual(proxy(before, after)[Scale.LOCAL], 0.0)

    def test_sign_flip_is_incompatible_even_when_small(self):
        """Une relation qui s'inverse est contradictoire, pas légèrement altérée."""
        proxy = RelationalOverlapProxy(chain_spec(), tolerance=0.05)
        before = {(0, 1): 0.01, (1, 2): 0.01, (2, 3): 0.01}
        after = {k: -v for k, v in before.items()}
        self.assertEqual(proxy(before, after)[Scale.LOCAL], 0.0)

    def test_vanished_relation_counts_as_lost(self):
        proxy = RelationalOverlapProxy(chain_spec(), tolerance=0.05)
        before = {(0, 1): 0.5, (1, 2): 0.5, (2, 3): 0.5}
        after = {(0, 1): 0.5, (1, 2): 0.5}
        self.assertAlmostEqual(proxy(before, after)[Scale.LOCAL], 2 / 3)


class SymmetryAlignment(unittest.TestCase):
    """§2 — l'alignement se fait par le groupe déclaré, et par lui seul."""

    def test_declared_symmetry_restores_coherence(self):
        spec = chain_spec(4, symmetries=path_symmetries(4))
        proxy = RelationalOverlapProxy(spec)
        before = {(0, 1): 0.9, (1, 2): 0.5, (2, 3): 0.1}
        # Retournement : (0,1)<->(2,3), (1,2) fixe. Le même objet, relu à
        # l'envers, doit rester parfaitement cohérent avec lui-même.
        after = {(0, 1): 0.1, (1, 2): 0.5, (2, 3): 0.9}
        self.assertEqual(proxy(before, after)[Scale.LOCAL], 1.0)

    def test_without_declaration_the_same_relabelling_is_a_loss(self):
        proxy = RelationalOverlapProxy(chain_spec(4))  # aucune symétrie déclarée
        before = {(0, 1): 0.9, (1, 2): 0.5, (2, 3): 0.1}
        after = {(0, 1): 0.1, (1, 2): 0.5, (2, 3): 0.9}
        self.assertLess(proxy(before, after)[Scale.LOCAL], 1.0)


class KnownDefects(unittest.TestCase):
    """Défauts publiés dans RESULTATS-PROXY-C-001.md — verrouillés, pas corrigés."""

    def test_f1_saturation_on_a_fully_decohered_system(self):
        """F1 — un système entièrement décohéré est mesuré « parfaitement cohérent ».

        Lecture incrémentale de `C` : quand les relations ont décru vers zéro,
        l'écart pas-à-pas passe sous θ et tout est déclaré conservé. Défaut réel,
        publié ; sa disparition exigerait un pré-enregistrement 002.
        """
        run = dephasing_family()
        proxy = RelationalOverlapProxy(run.spec, tolerance=0.05)
        late = proxy(run.states[-2], run.states[-1])
        self.assertTrue(late.is_closed, "F1 a changé : réviser le pré-enregistrement")

    def test_f2_low_cardinality_scale_can_reach_zero_alone(self):
        """F2 — LOCAL (5 relations) peut atteindre 0 quand OBJET (15) tient encore."""
        spec = chain_spec(6)
        proxy = RelationalOverlapProxy(spec, tolerance=0.05)
        before = {(i, j): 0.5 for i in range(6) for j in range(6) if i < j}
        after = dict(before)
        for pair in spec.adjacency:  # on ne casse que les relations locales
            after[tuple(sorted(pair))] = 0.5 - 0.3
        profile = proxy(before, after)
        self.assertEqual(profile[Scale.LOCAL], 0.0)
        self.assertGreater(profile[Scale.OBJET], 0.0)
        self.assertEqual(profile.dissolved_scales, (Scale.LOCAL,))


if __name__ == "__main__":
    unittest.main()
