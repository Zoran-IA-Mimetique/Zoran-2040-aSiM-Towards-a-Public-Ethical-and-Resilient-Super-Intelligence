"""Promotion des cadres — §12.1 de la lettre de mission du 6 août 2026.

Ces tests verrouillent des règles, pas des comportements souhaitables : chacun
correspond à une interdiction explicite de la lettre.
"""

import unittest

from zoran import CadreCausal, Critere, Statut, Triplet, evaluer_hierarchie, promouvoir
from zoran.hierarchies import BATTERIE, REPLIS_BATTERIE, REPLIS_ROULEMENT, ROULEMENT


def cadre_complet(identifiant="X", **surcharges):
    defauts = dict(
        frontiere="frontière",
        fonction="fonction",
        proxys=("p1",),
        triplet=Triplet("operant", "operande", "opere"),
        causalite_testable=("Y",),
        invariants=("seuil",),
    )
    defauts.update(surcharges)
    return CadreCausal(identifiant=identifiant, **defauts)


class RegleDePromotion(unittest.TestCase):
    """§12.1 — « Si une condition manque, conserver l'ensemble comme voisinage… »"""

    def test_les_sept_criteres_promeuvent(self):
        autre = cadre_complet("Y", proxys=("p2",))
        rapport = promouvoir(cadre_complet(), [cadre_complet(), autre])
        self.assertIs(rapport.statut, Statut.CADRE)
        self.assertEqual(rapport.manquants, ())

    def test_un_seul_critere_manquant_empeche_la_promotion(self):
        for absent in ("frontiere", "fonction", "triplet"):
            with self.subTest(critere=absent):
                autre = cadre_complet("Y", proxys=("p2",))
                rapport = promouvoir(
                    cadre_complet(**{absent: None}), [cadre_complet(), autre]
                )
                self.assertIsNot(rapport.statut, Statut.CADRE)

    def test_le_repli_ne_peut_pas_etre_cadre(self):
        """Contourner la règle de promotion par le repli est interdit."""
        with self.assertRaises(ValueError):
            promouvoir(cadre_complet(), [], repli=Statut.CADRE)


class NonMesure(unittest.TestCase):
    """§2 — NON_MESURÉ est une classe à part, jamais « non satisfait »."""

    def test_un_champ_absent_vaut_non_mesure_et_non_faux(self):
        rapport = promouvoir(cadre_complet(invariants=()), [])
        self.assertIsNone(rapport.criteres[Critere.INVARIANT])
        self.assertIn("NON_MESURÉ", rapport.motif)

    def test_un_champ_vide_est_refuse_a_la_construction(self):
        """Mieux vaut None explicite qu'une coquille silencieuse."""
        with self.assertRaises(ValueError):
            CadreCausal(identifiant="X", frontiere="   ")

    def test_un_triplet_incomplet_est_refuse(self):
        with self.assertRaises(ValueError):
            Triplet("operant", "", "opere")


class DoubleComptage(unittest.TestCase):
    """§12.1 critère 7 — jugeable sur la hiérarchie, jamais sur un cadre isolé."""

    def test_isole_le_septieme_critere_est_non_mesure(self):
        rapport = promouvoir(cadre_complet(), [])
        self.assertIsNone(rapport.criteres[Critere.SANS_DOUBLE_COMPTE])

    def test_proxy_commun_non_trace_est_un_double_comptage(self):
        a = cadre_complet("A", proxys=("temperature",))
        b = cadre_complet("B", proxys=("temperature",))
        rapport = promouvoir(a, [a, b])
        self.assertIs(rapport.criteres[Critere.SANS_DOUBLE_COMPTE], False)
        self.assertIn("temperature", rapport.motif)

    def test_partage_explicitement_trace_est_accepte(self):
        a = cadre_complet("A", proxys=("temperature",),
                          variables_partagees={"B": ("temperature",)})
        b = cadre_complet("B", proxys=("temperature",))
        self.assertIs(promouvoir(a, [a, b]).criteres[Critere.SANS_DOUBLE_COMPTE], True)


class HierarchiesDeclarees(unittest.TestCase):
    """Points 2 et 3 de l'ordre de travail (§20)."""

    def test_r2_antipodal_n_est_jamais_promu(self):
        """§13 — « sous-graphe diagnostique par défaut », sauf protocole isolant."""
        resultat = evaluer_hierarchie(ROULEMENT, replis=REPLIS_ROULEMENT)
        antipodal = next(
            r for r in resultat.rapports if r.identifiant.startswith("R2")
        )
        self.assertIs(antipodal.statut, Statut.RELATION)
        self.assertNotIn("R2 — Relation antipodale", resultat.cadres_promus)

    def test_la_planete_reste_non_mesuree(self):
        """§13 « NON_MESURÉ dans PRONOSTIA » ; §14 « partiellement ou NON_MESURÉ »."""
        for cadres, replis, prefixe in (
            (ROULEMENT, REPLIS_ROULEMENT, "R5"),
            (BATTERIE, REPLIS_BATTERIE, "B4"),
        ):
            with self.subTest(cadre=prefixe):
                resultat = evaluer_hierarchie(cadres, replis=replis)
                planete = next(
                    r for r in resultat.rapports if r.identifiant.startswith(prefixe)
                )
                self.assertIs(planete.statut, Statut.NON_MESURE)

    def test_regle_des_deux_cadres_satisfaite(self):
        """§0 — local ET premier relationnel englobant."""
        for cadres, replis in ((ROULEMENT, REPLIS_ROULEMENT), (BATTERIE, REPLIS_BATTERIE)):
            with self.subTest(cadres=cadres[0].identifiant):
                resultat = evaluer_hierarchie(cadres, replis=replis)
                self.assertTrue(resultat.deux_cadres_obligatoires)
                self.assertGreaterEqual(len(resultat.cadres_promus), 2)

    def test_la_cellule_limitante_est_un_invariant_du_pack(self):
        """§14 — « Les bonnes cellules ne compensent pas cette sortie. »"""
        pack = next(c for c in BATTERIE if c.identifiant.startswith("B2"))
        self.assertTrue(any("limitante" in i for i in pack.invariants))


class AucuneMoyenne(unittest.TestCase):
    """§12.2 — conjonction de portes, jamais une moyenne des critères."""

    def test_il_n_existe_pas_de_score_de_cadre(self):
        rapport = promouvoir(cadre_complet(invariants=()), [])
        self.assertFalse(hasattr(rapport, "score"))
        self.assertFalse(any("score" in nom for nom in vars(rapport)))


if __name__ == "__main__":
    unittest.main()


class GelDeStructure(unittest.TestCase):
    """Point 4 de l'ordre de travail — §23, « sens des seuils » et NON_MESURÉ."""

    def test_un_seuil_sans_protocole_est_refuse(self):
        """§23 — « Les coefficients physiques non calibrés restent NON_MESURÉ »."""
        from zoran.proxys import Criticite, ProxyDeclare, SensSeuil, TraitementAbsence

        with self.assertRaises(ValueError) as ctx:
            ProxyDeclare(
                identifiant="X",
                cadre="C",
                grandeur="g",
                unite="K",
                lieu_de_mesure="l",
                sens_seuil=SensSeuil.CROISSANT_DEGRADE,
                criticite=Criticite.CRITIQUE,
                traitement_absence=TraitementAbsence.NON_MESURE,
                seuil=42.0,  # sans protocole
            )
        self.assertIn("§23", str(ctx.exception))

    def test_tous_les_seuils_restent_non_mesures(self):
        from zoran.proxys import PROXYS_ROULEMENT

        for proxy in PROXYS_ROULEMENT:
            with self.subTest(proxy=proxy.identifiant):
                self.assertFalse(proxy.seuil_est_mesure)
                self.assertEqual(proxy.statut_seuil(), "NON_MESURÉ")

    def test_aucune_porte_absolue_n_est_calculable(self):
        """§24 — les portes absolues passent avant toute comparaison relative."""
        from zoran.proxys import PROXYS_ROULEMENT, portes_absolues

        bloquantes = portes_absolues(PROXYS_ROULEMENT)
        self.assertGreater(len(bloquantes), 0)
        self.assertIn("R0_temperature_contact", bloquantes)

    def test_la_structure_est_gelee_meme_sans_valeurs(self):
        from zoran.proxys import PROXYS_ROULEMENT, gel_complet

        gele, motif = gel_complet(PROXYS_ROULEMENT)
        self.assertTrue(gele, motif)
        self.assertIn("NON_MESURÉES", motif)

    def test_les_deux_temperatures_restent_distinctes(self):
        """Arbitrage de l'auteur : même dimension, observables différentes."""
        from zoran.proxys import PROXYS_ROULEMENT, TRANSFERTS_ROULEMENT

        noms = {p.identifiant for p in PROXYS_ROULEMENT}
        self.assertIn("R0_temperature_contact", noms)
        self.assertIn("R1_temperature_voisinage", noms)
        contact = next(p for p in PROXYS_ROULEMENT if p.identifiant.endswith("contact"))
        voisin = next(p for p in PROXYS_ROULEMENT if p.identifiant.endswith("voisinage"))
        self.assertEqual(contact.unite, voisin.unite)  # même dimension
        self.assertNotEqual(contact.lieu_de_mesure, voisin.lieu_de_mesure)  # pas la même
        self.assertTrue(
            any(t.grandeur == "chaleur de contact" for t in TRANSFERTS_ROULEMENT),
            "le lien R0→R1 doit être un transfert déclaré, pas une fusion",
        )

    def test_le_film_degrade_en_decroissant(self):
        """Le sens du seuil est déclaré par proxy, pas supposé uniforme."""
        from zoran.proxys import PROXYS_ROULEMENT, SensSeuil

        film = next(p for p in PROXYS_ROULEMENT if "film" in p.identifiant)
        self.assertIs(film.sens_seuil, SensSeuil.DECROISSANT_DEGRADE)
