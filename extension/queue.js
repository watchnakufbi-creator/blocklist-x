// Pure queue policy: no Chrome API, DOM or timers. Daily quota counts attempts
// reserved BEFORE confirmation (including uncertain outcomes), conservatively.
export const defaults = { min: 8, max: 20, cap: 100 };
export function settings(value = {}) {
  const result = { ...defaults, ...value };
  if (![result.min, result.max, result.cap].every(Number.isInteger) || result.min < 8 || result.max < result.min || result.max > 3600 || result.cap < 1 || result.cap > 1000) throw Error('Délais : 8 à 3600 s, maximum ≥ minimum. Plafond : 1 à 1000.');
  return result;
}
export const dayKey = (now = new Date()) => `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
export function daily(counter, now = new Date()) {
  return counter?.day === dayKey(now) ? counter : { day: dayKey(now), count: 0 };
}
export function delay(config, random = Math.random) { return Math.floor((config.min + random() * (config.max - config.min)) * 1000); }
export function createJob(accounts, config, tabId, name) {
  return { accounts: [...accounts], config: settings(config), tabId, name, index: 0, status: 'running', errors: 0, dueAt: 0, inFlight: false, results: [], message: 'Démarrage.' };
}
export function control(job, action) {
  if (!job) throw Error('Aucune file.');
  if (action === 'stop') { job.status = 'stopped'; job.message = 'Arrêt demandé. Une confirmation déjà envoyée à X ne peut pas être annulée.'; }
  if (action === 'pause' && job.status === 'running') { job.status = 'paused'; job.message = 'En pause.'; }
  if (action === 'resume' && job.status === 'paused') {
    if (job.inFlight) { finish(job, 'erreur', Date.now(), 0); job.inFlight = false; }
    job.status = job.index >= job.accounts.length ? 'done' : 'running'; job.errors = 0; job.message = job.status === 'done' ? 'Liste terminée.' : 'Reprise explicite.';
  }
  return job;
}
export function reserve(job, counter, now = new Date()) {
  counter = daily(counter, now);
  if (job.status !== 'running' || job.inFlight) return { allowed: false, counter };
  if (counter.count >= job.config.cap) { job.status = 'paused'; job.message = 'Plafond quotidien atteint. Reprise manuelle possible un autre jour.'; return { allowed: false, counter }; }
  job.inFlight = true; counter.count++; return { allowed: true, counter };
}
export function finish(job, outcome, now = Date.now(), random = Math.random()) {
  job.results.push({ handle: job.accounts[job.index], outcome });
  job.index++; job.inFlight = false;
  job.errors = outcome === 'erreur' ? job.errors + 1 : 0;
  job.dueAt = now + delay(job.config, () => random);
  if (job.status !== 'running') return job;
  if (job.errors >= 3) { job.status = 'paused'; job.message = 'Arrêt automatique : 3 erreurs consécutives. Vérifiez X avant toute reprise.'; }
  else if (job.index >= job.accounts.length) { job.status = 'done'; job.message = 'Liste terminée.'; }
  return job;
}
