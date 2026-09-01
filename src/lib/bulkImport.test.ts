import { describe, it, expect } from 'vitest';
import { parseBulkImport } from './bulkImport';

describe('parseBulkImport — cas normal', () => {
  it('une ligne = une routine', () => {
    const r = parseBulkImport('Eau froide visage\nMot du jour\n3 minutes de silence');
    expect(r).toHaveLength(3);
    expect(r.map((x) => x.title)).toEqual([
      'Eau froide visage',
      'Mot du jour',
      '3 minutes de silence',
    ]);
    expect(r.every((x) => x.active)).toBe(true);
  });

  it('applique la catégorie et l’heure par défaut', () => {
    const r = parseBulkImport('Test', { category: 'Calme', suggestedTime: '09:00' });
    expect(r[0].category).toBe('Calme');
    expect(r[0].suggestedTime).toBe('09:00');
  });
});

describe('parseBulkImport — cas limites', () => {
  it('ignore lignes vides et espaces', () => {
    const r = parseBulkImport('  A  \n\n   \n B \n');
    expect(r.map((x) => x.title)).toEqual(['A', 'B']);
  });

  it('déduplique (insensible à la casse)', () => {
    const r = parseBulkImport('Gratitude\ngratitude\nGRATITUDE');
    expect(r).toHaveLength(1);
  });

  it('gère les fins de ligne Windows (CRLF)', () => {
    const r = parseBulkImport('A\r\nB');
    expect(r).toHaveLength(2);
  });
});

describe('parseBulkImport — cas erreur / entrée vide', () => {
  it('chaîne vide => aucune routine', () => {
    expect(parseBulkImport('')).toHaveLength(0);
    expect(parseBulkImport('   \n  \n')).toHaveLength(0);
  });
});
