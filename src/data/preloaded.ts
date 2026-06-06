import type { Category } from '../types';

/** Spécification d'une routine préchargée (sans champs techniques). */
export interface PreloadedRoutine {
  title: string;
  description: string;
  category: Category;
  suggestedTime: string;
}

/**
 * Routines préchargées au premier lancement (REGLE 11 — données documentées).
 * L'ordre et les libellés correspondent au cahier des charges MVP V1.
 */
export const PRELOADED_ROUTINES: PreloadedRoutine[] = [
  {
    title: 'Eau froide visage',
    description: "S'asperger le visage d'eau froide pour activer la vigilance.",
    category: 'Énergie',
    suggestedTime: '07:00',
  },
  {
    title: 'Mâcher un chewing-gum',
    description: 'Mâcher pour stimuler la concentration avant une tâche.',
    category: 'Focus',
    suggestedTime: '09:00',
  },
  {
    title: 'Mot du jour',
    description: 'Apprendre un nouveau mot et le réutiliser dans la journée.',
    category: 'Apprentissage',
    suggestedTime: '08:30',
  },
  {
    title: '3 minutes de silence',
    description: 'Trois minutes sans stimulation pour calmer le mental.',
    category: 'Calme',
    suggestedTime: '12:30',
  },
  {
    title: 'Gratitude',
    description: 'Noter mentalement trois choses positives.',
    category: 'Calme',
    suggestedTime: '21:00',
  },
  {
    title: 'Dessiner 2 minutes',
    description: 'Un croquis libre de deux minutes pour activer la créativité.',
    category: 'Créativité',
    suggestedTime: '17:00',
  },
  {
    title: 'Debout 2 minutes',
    description: 'Se lever et bouger deux minutes pour relancer l’énergie.',
    category: 'Énergie',
    suggestedTime: '15:00',
  },
  {
    title: 'Affirmation miroir',
    description: 'Se regarder et formuler une affirmation positive.',
    category: 'Focus',
    suggestedTime: '07:30',
  },
  {
    title: 'Main non dominante',
    description: 'Utiliser la main non dominante pour une action banale.',
    category: 'Apprentissage',
    suggestedTime: '13:00',
  },
  {
    title: 'Douche chaud/froid',
    description: 'Alterner chaud et froid en fin de douche.',
    category: 'Énergie',
    suggestedTime: '07:15',
  },
  {
    title: 'Célébrer une victoire',
    description: 'Reconnaître et célébrer une petite victoire du jour.',
    category: 'Focus',
    suggestedTime: '18:00',
  },
  {
    title: 'Voix saboteuse',
    description: 'Identifier une pensée auto-saboteuse et la reformuler.',
    category: 'Calme',
    suggestedTime: '14:00',
  },
  {
    title: 'Parfum de travail',
    description: 'Associer une odeur spécifique aux phases de concentration.',
    category: 'Focus',
    suggestedTime: '09:30',
  },
  {
    title: 'Rire 2 minutes',
    description: 'Provoquer deux minutes de rire pour libérer la tension.',
    category: 'Énergie',
    suggestedTime: '16:00',
  },
  {
    title: 'Suivre des personnes inspirantes',
    description: 'Consacrer un instant à du contenu inspirant et choisi.',
    category: 'Apprentissage',
    suggestedTime: '20:00',
  },
];
