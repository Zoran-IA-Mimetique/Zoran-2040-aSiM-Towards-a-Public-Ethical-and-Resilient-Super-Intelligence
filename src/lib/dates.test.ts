import { describe, it, expect } from 'vitest';
import {
  dayKey,
  isValidTime,
  timeToMinutes,
  isWithinAllowedHours,
  periodStartKey,
  displayTime,
  uid,
} from './dates';

describe('dates — cas normaux', () => {
  it('dayKey formate YYYY-MM-DD', () => {
    expect(dayKey(new Date(2026, 5, 6))).toBe('2026-06-06');
    expect(dayKey(new Date(2026, 0, 1))).toBe('2026-01-01');
  });

  it('timeToMinutes convertit correctement', () => {
    expect(timeToMinutes('00:00')).toBe(0);
    expect(timeToMinutes('08:30')).toBe(510);
    expect(timeToMinutes('23:59')).toBe(1439);
  });

  it('displayTime renvoie la valeur ou un tiret', () => {
    expect(displayTime('07:00')).toBe('07:00');
    expect(displayTime(undefined)).toBe('—');
    expect(displayTime('99:99')).toBe('—');
  });
});

describe('isValidTime — cas limites et erreurs', () => {
  it('accepte les heures valides', () => {
    expect(isValidTime('00:00')).toBe(true);
    expect(isValidTime('23:59')).toBe(true);
  });
  it('rejette les heures invalides', () => {
    expect(isValidTime('24:00')).toBe(false);
    expect(isValidTime('12:60')).toBe(false);
    expect(isValidTime('7:00')).toBe(false);
    expect(isValidTime('abc')).toBe(false);
    expect(isValidTime('')).toBe(false);
  });
  it('timeToMinutes renvoie NaN sur invalide', () => {
    expect(Number.isNaN(timeToMinutes('99:99'))).toBe(true);
  });
});

describe('isWithinAllowedHours', () => {
  it('plage normale', () => {
    expect(isWithinAllowedHours('10:00', '08:00', '22:00')).toBe(true);
    expect(isWithinAllowedHours('07:00', '08:00', '22:00')).toBe(false);
    expect(isWithinAllowedHours('22:00', '08:00', '22:00')).toBe(true);
  });
  it('plage traversant minuit', () => {
    expect(isWithinAllowedHours('23:00', '22:00', '06:00')).toBe(true);
    expect(isWithinAllowedHours('03:00', '22:00', '06:00')).toBe(true);
    expect(isWithinAllowedHours('12:00', '22:00', '06:00')).toBe(false);
  });
  it('renvoie false sur entrée invalide', () => {
    expect(isWithinAllowedHours('xx', '08:00', '22:00')).toBe(false);
  });
});

describe('periodStartKey', () => {
  const ref = new Date(2026, 5, 6); // 2026-06-06
  it('jour = aujourd’hui', () => {
    expect(periodStartKey('day', ref)).toBe('2026-06-06');
  });
  it('semaine = J-6', () => {
    expect(periodStartKey('week', ref)).toBe('2026-05-31');
  });
  it('mois = J-29', () => {
    expect(periodStartKey('month', ref)).toBe('2026-05-08');
  });
});

describe('uid', () => {
  it('génère des identifiants uniques', () => {
    const a = uid();
    const b = uid();
    expect(a).not.toBe(b);
    expect(a.length).toBeGreaterThan(5);
  });
});
