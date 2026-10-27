import { describe, it, expect } from 'vitest';
import { createJob, settings, delay, daily, dayKey, reserve, finish, control } from '../extension/queue.js';
const make = (config = {}) => createJob(['one', 'two', 'three', 'four'], config, 12, 'Test');
describe('délais et paramètres', () => {
  it('utilise 8–20 secondes et 100 tentatives par défaut', () => expect(settings()).toEqual({ min: 8, max: 20, cap: 100 }));
  it.each([{ min: 0 }, { min: 9, max: 8 }, { cap: 0 }, { cap: 1.2 }, { max: Infinity }, { cap: 1001 }, { min: NaN }])('refuse une configuration dangereuse %j', config => expect(() => settings(config)).toThrow());
  it('respecte la plage avec une source aléatoire contrôlée', () => {
    for (let n = 0; n <= 100; n++) expect(delay(settings(), () => n / 100)).toBeGreaterThanOrEqual(8000);
    expect(delay(settings(), () => 0)).toBe(8000);
    expect(delay(settings(), () => 1)).toBe(20000);
    expect(delay(settings({ min: 12, max: 12 }))).toBe(12000);
  });
});
describe('plafond quotidien persistant', () => {
  it('ne perd pas les tentatives en passant à une nouvelle file', () => {
    const now = new Date(2026, 9, 27, 12), first = make({ cap: 1 });
    const result = reserve(first, null, now);
    expect(result.allowed).toBe(true); expect(result.counter.count).toBe(1);
    const restoredCounter = JSON.parse(JSON.stringify(result.counter));
    const second = make({ cap: 1 });
    expect(reserve(second, restoredCounter, now).allowed).toBe(false);
    expect(second.status).toBe('paused');
  });
  it('réinitialise au changement de date locale', () => {
    const today = new Date(2026, 9, 27), tomorrow = new Date(2026, 9, 28);
    expect(daily({ day: dayKey(today), count: 100 }, tomorrow)).toEqual({ day: dayKey(tomorrow), count: 0 });
  });
  it('réserve une seule fois avant résultat, même après sérialisation', () => {
    const job = make(); const first = reserve(job, null);
    expect(reserve(JSON.parse(JSON.stringify(job)), first.counter).allowed).toBe(false);
    expect(first.counter.count).toBe(1);
  });
});
describe('pause, reprise et arrêt', () => {
  it('pause sans perdre sa position ni le délai prévu', () => {
    const job = make(); finish(job, 'déjà bloqué', 1000, 0); control(job, 'pause');
    const restored = JSON.parse(JSON.stringify(job)); control(restored, 'resume');
    expect(restored.index).toBe(1); expect(restored.dueAt).toBe(9000); expect(restored.status).toBe('running');
  });
  it('passe un compte incertain à la reprise sans renvoyer une confirmation', () => {
    const job = make(); reserve(job, null); control(job, 'pause'); control(job, 'resume');
    expect(job.index).toBe(1); expect(job.inFlight).toBe(false); expect(job.results[0].outcome).toBe('erreur');
  });
  it('arrête après trois erreurs consécutives', () => {
    const job = make(); for (let i = 0; i < 3; i++) finish(job, 'erreur');
    expect(job.status).toBe('paused'); expect(job.message).toContain('3 erreurs');
    expect(reserve(job, null).allowed).toBe(false);
  });
  it('un résultat non erroné remet la série à zéro', () => {
    const job = make(); finish(job, 'erreur'); finish(job, 'introuvable'); finish(job, 'erreur');
    expect(job.errors).toBe(1); expect(job.status).toBe('running');
  });
  it('un arrêt est immédiat et aucune reprise ne le relance', () => {
    const job = make(); control(job, 'stop'); control(job, 'resume');
    expect(job.status).toBe('stopped'); expect(reserve(job, null).allowed).toBe(false);
    finish(job, 'bloqué'); expect(job.status).toBe('stopped');
  });
  it('termine une liste et conserve les résultats', () => {
    const job = createJob(['one'], {}, 12, 'Test'); finish(job, 'bloqué');
    expect(job.status).toBe('done'); expect(job.results).toEqual([{ handle: 'one', outcome: 'bloqué' }]);
  });
});
