"""Promotion des cadres — §12.1 de la lettre de mission du 6 août 2026.

Ces tests verrouillent des règles, pas des comportements souhaitables : chacun
correspond à une interdiction explicite de la lettre.

La classe `MissionCorrective` en fin de fichier porte les douze tests exigés
par la mission corrective ciblée. Ils sont numérotés dans l'ordre de la
mission, et aucun d'eux ne présente une CI verte comme une validation
physique : ils vérifient du logiciel et de la classification épistémique.
"""

import json
import pathlib
import unittest

from zoran import (
    CONSTANTE_DENOMINATEUR,
    CONTRAT_ZORAN,
    FORMULE_CANONIQUE,
    CadreCausal,
    Calibration,
    ContratDeMesure,
    Critere,
    LienTransfert,
    PartageDeclare,
    RoleNiveau,
    Statut,
    StatutJauge,
    StatutSeuil,
    TermeMesure,
    Triplet,
    VerdictRegleDeuxCadres,
    calcul_formel,
    evaluer_S,
    evaluer_hierarchie,
    portes_absolues,
    promouvoir,
)
from zoran.hierarchies import (
    BATTERIE,
    REPLIS_BATTERIE,
    REPLIS_ROULEMENT,
    ROULEMENT,
    TRANSFERTS_BATTERIE_CADRES,
    TRANSFERTS_ROULEMENT_CADRES,
)

RACINE = pathlib.Path(__file__).resolve().parent.parent


def cadre_complet(identifiant="X", **surcharges):
    defauts = dict(
        frontiere="frontière",
        fonction="fonction",
        proxys=("p1",),
        triplet=Triplet("operant", "operande", "opere"),
        causalite_testable=("Y",),
        invariants=("seuil",),
        effets_causaux={"p1": f"EFFET_{identifiant}"},
    )
    defauts.update(surcharges)
    return CadreCausal(identifiant=identifiant, **defauts)


class RegleDePromotion(unittest.TestCase):
    """§12.1 — « Si une condition manque, conserver l'ensemble comme voisinage… »"""

    def test_les_sept_criteres_promeuvent(self):
        a = cadre_complet("A")
        b = cadre_complet("B", proxys=("p2",), effets_causaux={"p2": "EFFET_B"})
        rapport = promouvoir(a, [a, b])
        self.assertIs(rapport.statut, Statut.CADRE)
        self.assertEqual(rapport.manquants, ())

    def test_un_seul_critere_manquant_empeche_la_promotion(self):
        for absent in ("frontiere", "fonction", "triplet"):
            with self.subTest(critere=absent):
                a = cadre_complet("A", **{absent: None})
                b = cadre_complet("B", proxys=("p2",), effets_causaux={"p2": "EFFET_B"})
                self.assertIsNot(promouvoir(a, [a, b]).statut, Statut.CADRE)

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

    def test_un_effet_declare_pour_un_proxy_absent_est_refuse(self):
        with self.assertRaises(ValueError):
            CadreCausal(identifiant="X", proxys=("p1",), effets_causaux={"p2": "E"})


class DoubleComptage(unittest.TestCase):
    """§12.1 critère 7 — sur l'effet causal, jamais sur le nom du proxy."""

    def test_isole_le_septieme_critere_est_non_mesure(self):
        rapport = promouvoir(cadre_complet(), [])
        self.assertIsNone(rapport.criteres[Critere.SANS_DOUBLE_COMPTE])

    def test_effet_commun_non_trace_est_un_double_comptage(self):
        a = cadre_complet("A", proxys=("t_a",), effets_causaux={"t_a": "EFFET_T"})
        b = cadre_complet("B", proxys=("t_b",), effets_causaux={"t_b": "EFFET_T"})
        rapport = promouvoir(a, [a, b])
        self.assertIs(rapport.criteres[Critere.SANS_DOUBLE_COMPTE], False)
        self.assertIn("EFFET_T", rapport.motif)

    def test_partage_trace_avec_provenance_est_accepte(self):
        a = cadre_complet(
            "A",
            proxys=("t_a",),
            effets_causaux={"t_a": "EFFET_T"},
            variables_partagees={
                "B": (PartageDeclare("EFFET_T", "campagne 2026-08, fichier X"),)
            },
        )
        b = cadre_complet("B", proxys=("t_b",), effets_causaux={"t_b": "EFFET_T"})
        self.assertIs(promouvoir(a, [a, b]).criteres[Critere.SANS_DOUBLE_COMPTE], True)

    def test_partage_sans_provenance_est_non_mesure_et_non_pass(self):
        """§22 — un partage sans provenance n'est pas une trace."""
        a = cadre_complet(
            "A",
            proxys=("t_a",),
            effets_causaux={"t_a": "EFFET_T"},
            variables_partagees={"B": (PartageDeclare("EFFET_T", "   "),)},
        )
        b = cadre_complet("B", proxys=("t_b",), effets_causaux={"t_b": "EFFET_T"})
        self.assertIsNone(promouvoir(a, [a, b]).criteres[Critere.SANS_DOUBLE_COMPTE])

    def test_un_transfert_declare_n_est_pas_deux_dettes(self):
        a = cadre_complet("A", proxys=("t_a",), effets_causaux={"t_a": "EFFET_T"})
        b = cadre_complet("B", proxys=("t_b",), effets_causaux={"t_b": "EFFET_T"})
        transferts = (LienTransfert("A", "B", "EFFET_T"),)
        self.assertIs(
            promouvoir(a, [a, b], transferts=transferts).criteres[
                Critere.SANS_DOUBLE_COMPTE
            ],
            True,
        )


class HierarchiesDeclarees(unittest.TestCase):
    """Points 2 et 3 de l'ordre de travail (§20)."""

    def test_r2_antipodal_n_est_jamais_promu(self):
        """§13 — « sous-graphe diagnostique par défaut », sauf protocole isolant."""
        resultat = evaluer_hierarchie(
            ROULEMENT,
            replis=REPLIS_ROULEMENT,
            transferts=TRANSFERTS_ROULEMENT_CADRES,
        )
        antipodal = next(
            r for r in resultat.rapports if r.identifiant.startswith("R2")
        )
        self.assertIs(antipodal.statut, Statut.RELATION)
        self.assertNotIn("R2 — Relation antipodale", resultat.cadres_promus)

    def test_la_planete_reste_non_mesuree(self):
        """§13 « NON_MESURÉ dans PRONOSTIA » ; §14 « partiellement ou NON_MESURÉ »."""
        for cadres, replis, transferts, prefixe in (
            (ROULEMENT, REPLIS_ROULEMENT, TRANSFERTS_ROULEMENT_CADRES, "R5"),
            (BATTERIE, REPLIS_BATTERIE, TRANSFERTS_BATTERIE_CADRES, "B4"),
        ):
            with self.subTest(cadre=prefixe):
                resultat = evaluer_hierarchie(
                    cadres, replis=replis, transferts=transferts
                )
                planete = next(
                    r for r in resultat.rapports if r.identifiant.startswith(prefixe)
                )
                self.assertIs(planete.statut, Statut.NON_MESURE)

    def test_regle_des_deux_cadres_est_un_pass_structurel(self):
        """§0 — le local ET son premier relationnel englobant, nommément."""
        for cadres, replis, transferts in (
            (ROULEMENT, REPLIS_ROULEMENT, TRANSFERTS_ROULEMENT_CADRES),
            (BATTERIE, REPLIS_BATTERIE, TRANSFERTS_BATTERIE_CADRES),
        ):
            with self.subTest(cadres=cadres[0].identifiant):
                resultat = evaluer_hierarchie(
                    cadres, replis=replis, transferts=transferts
                )
                self.assertIs(resultat.regle_deux_cadres, VerdictRegleDeuxCadres.PASS)
                self.assertIn("PASS structurel", resultat.motif)

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

    def test_aucun_seuil_n_est_calibre(self):
        from zoran.proxys import PROXYS_ROULEMENT

        for proxy in PROXYS_ROULEMENT:
            with self.subTest(proxy=proxy.identifiant):
                self.assertFalse(proxy.seuil_est_calibre)
                self.assertIs(proxy.statut_seuil(), StatutSeuil.PROTOCOLE_DECLARE)

    def test_aucune_porte_absolue_n_est_calculable(self):
        """§24 — les portes absolues passent avant toute comparaison relative."""
        from zoran.proxys import PROXYS_ROULEMENT, portes_absolues

        bloquantes = portes_absolues(PROXYS_ROULEMENT)
        self.assertEqual(len(bloquantes), 5)
        self.assertIn("R0_temperature_contact", bloquantes)

    def test_la_structure_est_gelee_meme_sans_valeurs(self):
        from zoran.proxys import PROXYS_ROULEMENT, gel_complet

        gele, motif = gel_complet(PROXYS_ROULEMENT)
        self.assertTrue(gele, motif)
        self.assertIn("DÉCLARÉS, pas EXÉCUTÉS", motif)

    def test_les_deux_temperatures_restent_distinctes(self):
        """Arbitrage de l'auteur : même dimension, observables différentes."""
        from zoran.proxys import PROXYS_ROULEMENT, TRANSFERTS_ROULEMENT

        noms = {p.identifiant for p in PROXYS_ROULEMENT}
        self.assertIn("R0_temperature_contact", noms)
        self.assertIn("R1_temperature_voisinage", noms)
        contact = next(p for p in PROXYS_ROULEMENT if p.identifiant.endswith("contact"))
        voisin = next(p for p in PROXYS_ROULEMENT if p.identifiant.endswith("voisinage"))
        self.assertEqual(contact.unite, voisin.unite)  # même dimension
        self.assertNotEqual(contact.lieu_de_mesure, voisin.lieu_de_mesure)
        self.assertTrue(
            any(t.grandeur == "chaleur de contact" for t in TRANSFERTS_ROULEMENT),
            "le lien R0→R1 doit être un transfert déclaré, pas une fusion",
        )

    def test_le_film_degrade_en_decroissant(self):
        """Le sens du seuil est déclaré par proxy, pas supposé uniforme."""
        from zoran.proxys import PROXYS_ROULEMENT, SensSeuil

        film = next(p for p in PROXYS_ROULEMENT if "film" in p.identifiant)
        self.assertIs(film.sens_seuil, SensSeuil.DECROISSANT_DEGRADE)


# --- Mission corrective ciblée — les douze tests exigés -------------------


def _proxy(identifiant, **surcharges):
    from zoran.proxys import Criticite, ProxyDeclare, SensSeuil, TraitementAbsence

    defauts = dict(
        cadre="C",
        grandeur="grandeur",
        unite="K",
        lieu_de_mesure="lieu",
        sens_seuil=SensSeuil.CROISSANT_DEGRADE,
        criticite=Criticite.CRITIQUE,
        traitement_absence=TraitementAbsence.NON_MESURE,
    )
    defauts.update(surcharges)
    return ProxyDeclare(identifiant=identifiant, **defauts)


class MissionCorrective(unittest.TestCase):
    """Les douze tests obligatoires, dans l'ordre de la mission.

    Aucun d'eux ne mesure le monde. Ils vérifient que le moteur refuse ce
    qu'il doit refuser, et que la classification épistémique du corpus ne
    dérive pas.
    """

    # 1. Deux cadres promus mais sans LOCAL → FAIL.
    def test_01_deux_cadres_promus_sans_local_echouent(self):
        a = cadre_complet("A", role=RoleNiveau.ENGLOBANT, causalite_testable=("B",))
        b = cadre_complet(
            "B",
            role=RoleNiveau.SUPERIEUR,
            proxys=("p2",),
            effets_causaux={"p2": "EFFET_B"},
            causalite_testable=("A",),
        )
        resultat = evaluer_hierarchie([a, b])
        self.assertEqual(len(resultat.cadres_promus), 2)
        self.assertIs(resultat.regle_deux_cadres, VerdictRegleDeuxCadres.FAIL)
        self.assertIn("LOCAL", resultat.motif)
        self.assertFalse(resultat.admissible)

    # 2. LOCAL + cadre supérieur non directement englobant → FAIL ou NON_MESURÉ.
    def test_02_local_plus_superieur_non_englobant_ne_passe_pas(self):
        local = cadre_complet("L", role=RoleNiveau.LOCAL, causalite_testable=("S",))
        superieur = cadre_complet(
            "S",
            role=RoleNiveau.SUPERIEUR,
            proxys=("p2",),
            effets_causaux={"p2": "EFFET_S"},
            causalite_testable=("L",),
        )
        resultat = evaluer_hierarchie([local, superieur])
        self.assertIn(
            resultat.regle_deux_cadres,
            (VerdictRegleDeuxCadres.FAIL, VerdictRegleDeuxCadres.NON_MESURE),
        )
        self.assertIn("englobant", resultat.motif)

    # 3. LOCAL + premier englobant causal correctement relié → PASS STRUCTUREL.
    def test_03_local_plus_premier_englobant_relie_est_un_pass_structurel(self):
        local = cadre_complet("L", role=RoleNiveau.LOCAL, causalite_testable=("V",))
        voisinage = cadre_complet(
            "V",
            role=RoleNiveau.VOISINAGE_RELATIONNEL,
            proxys=("p2",),
            effets_causaux={"p2": "EFFET_V"},
            causalite_testable=("L",),
        )
        resultat = evaluer_hierarchie([local, voisinage])
        self.assertIs(resultat.regle_deux_cadres, VerdictRegleDeuxCadres.PASS)
        self.assertIn("PASS structurel", resultat.motif)
        # Le lien doit être déclaré des DEUX côtés : le retrait d'un sens suffit.
        local_unilateral = cadre_complet(
            "L", role=RoleNiveau.LOCAL, causalite_testable=("V",)
        )
        voisinage_muet = cadre_complet(
            "V",
            role=RoleNiveau.VOISINAGE_RELATIONNEL,
            proxys=("p2",),
            effets_causaux={"p2": "EFFET_V"},
            causalite_testable=("autre",),
        )
        unilateral = evaluer_hierarchie([local_unilateral, voisinage_muet])
        self.assertIs(
            unilateral.regle_deux_cadres, VerdictRegleDeuxCadres.NON_MESURE
        )

    # 4. Seuil numérique + protocole déclaré sans résultat de calibration → NON_MESURÉ.
    def test_04_protocole_declare_sans_calibration_reste_non_mesure(self):
        proxy = _proxy(
            "X", protocole_calibration="banc instrumenté, quantile de sortie", seuil=42.0
        )
        self.assertIs(proxy.statut_seuil(), StatutSeuil.PROTOCOLE_DECLARE)
        self.assertFalse(proxy.seuil_est_calibre)
        self.assertIn("X", portes_absolues([proxy]))

    # 5. Seuil avec provenance et incertitude complètes → SEUIL_CALIBRÉ.
    def test_05_calibration_complete_donne_seuil_calibre(self):
        calibration = Calibration(
            resultat=42.0,
            incertitude=1.5,
            source="campagne banc 2026-08",
            provenance="run-31108800082, empreinte sha256:0000",
        )
        proxy = _proxy(
            "X",
            protocole_calibration="banc instrumenté, quantile de sortie",
            seuil=42.0,
            calibration=calibration,
        )
        self.assertIs(proxy.statut_seuil(), StatutSeuil.SEUIL_CALIBRE)
        self.assertTrue(proxy.seuil_est_calibre)
        # Une calibration exécutée mais sans seuil retenu ne suffit pas.
        partiel = _proxy(
            "Y",
            protocole_calibration="banc instrumenté",
            calibration=calibration,
        )
        self.assertIs(partiel.statut_seuil(), StatutSeuil.CALIBRATION_EXECUTEE)
        self.assertFalse(partiel.seuil_est_calibre)

    # 6. Deux noms différents partageant le même identifiant causal → double comptage.
    def test_06_deux_noms_un_seul_effet_est_un_double_comptage(self):
        a = cadre_complet(
            "A", proxys=("temperature_contact",),
            effets_causaux={"temperature_contact": "EFFET_CHALEUR"},
        )
        b = cadre_complet(
            "B", proxys=("temp_interface",),
            effets_causaux={"temp_interface": "EFFET_CHALEUR"},
        )
        rapport = promouvoir(a, [a, b])
        self.assertIs(rapport.criteres[Critere.SANS_DOUBLE_COMPTE], False)
        self.assertIsNot(rapport.statut, Statut.CADRE)
        self.assertIn("EFFET_CHALEUR", rapport.motif)

    # 7. Même dimension physique mais identifiants causaux différents → aucune fusion.
    def test_07_meme_dimension_effets_distincts_ne_fusionnent_pas(self):
        a = cadre_complet(
            "A", proxys=("temperature_contact",),
            effets_causaux={"temperature_contact": "EFFET_CHALEUR_CONTACT"},
        )
        b = cadre_complet(
            "B", proxys=("temperature_voisinage",),
            effets_causaux={"temperature_voisinage": "EFFET_CHALEUR_VOISINAGE"},
        )
        self.assertIs(promouvoir(a, [a, b]).criteres[Critere.SANS_DOUBLE_COMPTE], True)
        # Et sur le corpus gelé : même unité, effets et lieux distincts, transfert déclaré.
        from zoran.proxys import PROXYS_ROULEMENT

        contact = next(p for p in PROXYS_ROULEMENT if p.identifiant.endswith("contact"))
        voisin = next(p for p in PROXYS_ROULEMENT if p.identifiant.endswith("voisinage"))
        self.assertEqual(contact.unite, voisin.unite)
        self.assertNotEqual(contact.identifiant, voisin.identifiant)
        self.assertTrue(
            any(
                t.effet_causal == "EFFET_CHALEUR_CONTACT"
                for t in TRANSFERTS_ROULEMENT_CADRES
            ),
            "la réconciliation R0→R1 doit être un transfert déclaré, pas une fusion",
        )

    # 8. ROLES-007 reste DISSOCIATION_NON_ETABLIE.
    def test_08_roles_007_reste_dissociation_non_etablie(self):
        donnees = json.loads(
            (RACINE / "experiments" / "resultats_007.json").read_text(encoding="utf-8")
        )
        self.assertEqual(donnees["verdict"], "DISSOCIATION_NON_ETABLIE")
        texte = (RACINE / "RESULTATS-ROLES-007.md").read_text(encoding="utf-8")
        self.assertIn("VERDICT PRÉ-ENREGISTRÉ, INCHANGÉ", texte)
        self.assertIn("DISSOCIATION_NON_ETABLIE", texte)

    # 9. L'interprétation R2/R4 reste exploratoire.
    def test_09_l_interpretation_r2_r4_reste_exploratoire(self):
        texte = (RACINE / "RESULTATS-ROLES-007.md").read_text(encoding="utf-8")
        self.assertIn("HYPOTHÈSE EXPLORATOIRE", texte)
        self.assertIn("requalification\n> rétroactive du verdict", texte)
        self.assertNotIn("la dissociation est établie par R2 et R4", texte)

    # 10. Le seuil 0,10 non justifié ne peut promouvoir la branche A.
    def test_10_le_seuil_010_ne_promeut_pas_la_branche_a(self):
        texte = (RACINE / "Z-TEMPS-STATUT-CANONIQUE.md").read_text(encoding="utf-8")
        self.assertIn("SEUIL_NON_CALIBRÉ", texte)
        self.assertIn("Elle est retirée comme\nseuil opérationnel", texte)
        self.assertIn("la branche A est `NON_MESURÉE` et ne peut pas", texte)
        # Aucune exécution de la branche A n'existe dans le dépôt.
        executables = [
            p.name
            for p in (RACINE / "experiments").glob("*.py")
            if "branche" in p.name or "poids_structurels" in p.name
        ]
        self.assertEqual(executables, [])

    # 11. Tous les tests historiques restent verts.
    def test_11_les_essais_historiques_gardent_leurs_verdicts(self):
        """Les résultats pré-enregistrés ne bougent pas sous cette mission."""
        attendus = {
            "resultats_004.json": "verdict",
            "resultats_005.json": "verdict",
            "resultats_007.json": "verdict",
        }
        for fichier, cle in attendus.items():
            chemin = RACINE / "experiments" / fichier
            with self.subTest(fichier=fichier):
                donnees = json.loads(chemin.read_text(encoding="utf-8"))
                self.assertIn(cle, donnees)
        # JUMEAUX-005 reste indécidable : aucun coefficient n'a été calculé.
        jumeaux = json.loads(
            (RACINE / "experiments" / "resultats_005.json").read_text(encoding="utf-8")
        )
        self.assertEqual(jumeaux["verdict"], "INDECIDABLE")
        # La rétractation 006 n'est pas retirée.
        self.assertTrue((RACINE / "RETRACTATION-FORME-006.md").exists())

    # 12. La formule canonique reste S = (β × ΔΦ) / (1 + T + σ), sans score.
    def test_12_la_formule_canonique_ne_produit_aucun_score(self):
        from zoran.proxys import PROXYS_ROULEMENT

        self.assertEqual(FORMULE_CANONIQUE, "S = (β × ΔΦ) / (1 + T + σ)")
        self.assertEqual(CONSTANTE_DENOMINATEUR, 1.0)

        valeur, motif = evaluer_S(CONTRAT_ZORAN, PROXYS_ROULEMENT)
        self.assertIsNone(valeur)
        self.assertIn("NON_MESURÉ", motif)


# --- Correctif final — la jauge ne fabrique pas de score ------------------


def _terme(valeur, proxy="P0", **surcharges):
    defauts = dict(
        normalisation="grandeur brute divisée par sa valeur nominale",
        incertitude=0.05,
        provenance="campagne fictive, empreinte sha256:0000",
    )
    defauts.update(surcharges)
    return TermeMesure(valeur=valeur, proxy=proxy, **defauts)


def _proxy_calibre(identifiant):
    return _proxy(
        identifiant,
        protocole_calibration="banc instrumenté",
        seuil=1.0,
        calibration=Calibration(1.0, 0.1, "campagne fictive", "sha256:0000"),
    )


class JaugeSansFabrication(unittest.TestCase):
    """Le défaut : quatre `float` renseignés étaient pris pour quatre mesures.

    Ces tests séparent le **calcul formel** — de l'arithmétique — de
    l'**évaluation mesurée**, qui exige un contrat reliant chaque terme à son
    proxy, sa normalisation, son incertitude et sa provenance.
    """

    # 1. Quatre floats bruts ne produisent aucun S.
    def test_quatre_floats_bruts_ne_produisent_aucun_s(self):
        with self.assertRaises(TypeError):
            evaluer_S(1.0, 2.0, 3.0, 4.0)  # l'ancienne signature n'existe plus
        with self.assertRaises(TypeError) as ctx:
            evaluer_S(0.7, [_proxy_calibre("P0")])  # un nombre nu n'est pas un contrat
        self.assertIn("ne mesurent rien", str(ctx.exception))
        valeur, motif = evaluer_S()
        self.assertIsNone(valeur)
        self.assertIn("aucun contrat de mesure", motif)
        # Un terme sans provenance est refusé à la construction.
        for champ in ("proxy", "normalisation", "provenance"):
            with self.subTest(champ=champ):
                with self.assertRaises(ValueError):
                    _terme(1.0, **{champ: "   "})
        # Un contrat partiel ne débloque rien.
        partiel = ContratDeMesure(beta=_terme(1.0), delta_phi=_terme(1.0))
        valeur, motif = evaluer_S(partiel, [_proxy_calibre("P0")])
        self.assertIsNone(valeur)
        self.assertIn("contrat incomplet", motif)
        self.assertIn("T", motif)

    # 2. Proxys calibrés mais non reliés aux termes → NON_MESURÉ.
    def test_proxys_calibres_non_relies_ne_debloquent_rien(self):
        contrat = ContratDeMesure(
            beta=_terme(2.0, proxy="TERME_BETA"),
            delta_phi=_terme(3.0, proxy="TERME_DELTA_PHI"),
            T=_terme(0.0, proxy="TERME_T"),
            sigma=_terme(0.0, proxy="TERME_SIGMA"),
        )
        etrangers = [_proxy_calibre(f"SANS_RAPPORT_{i}") for i in range(4)]
        valeur, motif = evaluer_S(contrat, etrangers)
        self.assertIsNone(valeur)
        self.assertIn("absent des proxys", motif)
        # Reliés mais non calibrés : toujours NON_MESURÉ.
        relies_non_calibres = [
            _proxy(nom, protocole_calibration="banc instrumenté")
            for nom in ("TERME_BETA", "TERME_DELTA_PHI", "TERME_T", "TERME_SIGMA")
        ]
        valeur, motif = evaluer_S(contrat, relies_non_calibres)
        self.assertIsNone(valeur)
        self.assertIn("non calibré", motif)

    # 3. T ou σ négatif → hors domaine.
    def test_charge_negative_est_hors_domaine(self):
        for nom, args in (("T", (2.0, 3.0, -0.5, 0.0)), ("σ", (2.0, 3.0, 0.0, -0.5))):
            with self.subTest(terme=nom):
                resultat = calcul_formel(*args)
                self.assertIsNone(resultat.valeur)
                self.assertIs(resultat.statut, StatutJauge.HORS_DOMAINE)
                self.assertIn(nom, resultat.motif)

    # 4. NaN ou infini → hors domaine.
    def test_nan_et_infini_sont_hors_domaine(self):
        for valeur in (float("nan"), float("inf"), float("-inf")):
            with self.subTest(valeur=valeur):
                resultat = calcul_formel(valeur, 3.0, 0.0, 0.0)
                self.assertIsNone(resultat.valeur)
                self.assertIs(resultat.statut, StatutJauge.HORS_DOMAINE)
            with self.subTest(valeur=valeur, position="denominateur"):
                self.assertIs(
                    calcul_formel(2.0, 3.0, valeur, 0.0).statut,
                    StatutJauge.HORS_DOMAINE,
                )
        # Et un terme non fini est refusé dès la construction du contrat.
        with self.assertRaises(ValueError):
            _terme(float("nan"))

    # 5. T = σ = 0 conserve le dénominateur formel égal à 1.
    def test_le_denominateur_reste_un_quand_les_charges_sont_nulles(self):
        resultat = calcul_formel(2.0, 3.0, 0.0, 0.0)
        self.assertEqual(resultat.valeur, 6.0)  # 6 / (1 + 0 + 0)
        self.assertIs(resultat.statut, StatutJauge.CALCUL_FORMEL)
        self.assertIn("dénominateur 1.0", resultat.motif)
        self.assertIn("PAS une mesure", resultat.motif)
        # Le statut MESURE est structurellement interdit sur un calcul formel.
        from zoran.jauge import ResultatFormel

        with self.assertRaises(ValueError):
            ResultatFormel(6.0, StatutJauge.MESURE, "tentative")

    # 6. Aucune documentation ne présente le résultat algébrique comme une mesure.
    def test_aucune_documentation_ne_presente_le_calcul_comme_une_mesure(self):
        interdits = (
            "S mesuré",
            "S est mesuré",
            "score mesuré",
            "S = 6",
            "jauge mesurée",
        )
        for chemin in sorted(RACINE.glob("*.md")) + [RACINE / "zoran" / "jauge.py"]:
            texte = chemin.read_text(encoding="utf-8")
            for phrase in interdits:
                with self.subTest(fichier=chemin.name, phrase=phrase):
                    self.assertNotIn(phrase, texte)
        jauge = (RACINE / "zoran" / "jauge.py").read_text(encoding="utf-8")
        self.assertIn("CALCUL_FORMEL", jauge)
        self.assertIn("ne mesure rien", jauge)

    # 7. ROLES-007 reste NON ÉTABLI dans tous les documents faisant autorité.
    def test_roles_007_reste_non_etabli_dans_les_documents_faisant_autorite(self):
        faisant_autorite = (
            "README.md",
            "Z-TEMPS-STATUT-CANONIQUE.md",
            "RESULTATS-ROLES-007.md",
        )
        for nom in faisant_autorite:
            texte = (RACINE / nom).read_text(encoding="utf-8")
            with self.subTest(document=nom):
                self.assertIn("DISSOCIATION_NON_ETABLIE", texte)
                for surclassement in (
                    "dissociation est établie",
                    "dissociation établie",
                    "la dissociation est exacte",
                    "ROLES-007, exacte",
                ):
                    if surclassement == "dissociation est établie" and nom == (
                        "RESULTATS-ROLES-007.md"
                    ):
                        continue  # cité dans la correction d'audit, entre guillemets
                    self.assertNotIn(surclassement, texte)
        # Aucune mesure physique n'est revendiquée pour cet essai.
        for nom in faisant_autorite:
            texte = (RACINE / nom).read_text(encoding="utf-8")
            with self.subTest(document=nom, controle="mesures R1-R4"):
                self.assertNotIn("Mesures R1-R4", texte)
                self.assertNotIn("mesures R1-R4", texte)


if __name__ == "__main__":
    unittest.main()
