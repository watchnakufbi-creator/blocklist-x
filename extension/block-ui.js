import { settings, delay } from './queue.js';
const $ = id => document.getElementById(id);
const call = async (action, extra = {}) => {
  const result = await chrome.runtime.sendMessage({ scope: 'blocklist-runner', action, ...extra });
  if (!result?.ok) throw Error(result?.error || 'Service indisponible.');
  return result;
};
let snapshot;
function config() { return settings({ min: Number($('delay-min').value), max: Number($('delay-max').value), cap: Number($('daily-cap').value) }); }
$('prepare-block').onclick = async () => {
  try {
    const data = (await chrome.storage.local.get('blocklistX')).blocklistX;
    const list = data?.lists.find(item => item.id === $('lists').value);
    if (!list?.accounts.length) throw Error('Choisissez une liste non vide.');
    const value = config(); snapshot = { listId: list.id, expectedName: list.name, expectedAccounts: [...list.accounts], config: value };
    $('block-summary').textContent = `Liste « ${list.name} » : ${list.accounts.length} compte(s). Délais : ${value.min}–${value.max} s ; durée minimale indicative (hors chargements et pauses) : ${Math.ceil(Math.max(0, list.accounts.length - 1) * delay(value, () => 0) / 60000)} à ${Math.ceil(Math.max(0, list.accounts.length - 1) * delay(value, () => 1) / 60000)} min. Plafond : ${value.cap} tentatives/jour. X peut limiter ou suspendre votre compte. Vérifiez votre liste et la session connectée. Les blocages ne sont pas annulés par Arrêter.`;
    $('block-consent').checked = false; $('start-block').disabled = true; $('block-confirm').hidden = false;
  } catch (error) { $('run-status').textContent = error.message; }
};
$('block-consent').onchange = () => { $('start-block').disabled = !$('block-consent').checked; };
$('cancel-block').onclick = () => { $('block-confirm').hidden = true; snapshot = null; };
$('start-block').onclick = async () => {
  if (!$('block-consent').checked || !snapshot) return;
  $('start-block').disabled = true;
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    await call('start', { ...snapshot, tabId: tab?.id });
    $('block-confirm').hidden = true; snapshot = null;
  } catch (error) { $('run-status').textContent = `${error.message} Si nécessaire, rechargez l’onglet X après l’installation.`; }
  finally { $('start-block').disabled = !$('block-consent').checked; }
};
for (const action of ['pause', 'resume', 'stop']) {
  $(action + '-block').onclick = () => call(action).then(refresh).catch(error => { $('run-status').textContent = error.message; });
}
async function refresh() {
  try {
    const { job, counter } = await call('get');
    $('run-status').textContent = job ? `${job.name} — ${job.index}/${job.accounts.length} : ${job.status}. ${job.message}\nAujourd’hui : ${counter.count}/${job.config.cap} tentative(s).` : 'Aucune file active.';
    $('run-results').replaceChildren();
    for (const item of job?.results || []) { const li = document.createElement('li'); li.textContent = `@${item.handle} : ${item.outcome}`; $('run-results').append(li); }
  } catch (error) { $('run-status').textContent = error.message; }
}
const saved = (await chrome.storage.local.get('blockSettings')).blockSettings;
if (saved) { $('delay-min').value = saved.min; $('delay-max').value = saved.max; $('daily-cap').value = saved.cap; }
chrome.storage.onChanged.addListener((changes, area) => { if (area === 'local' && changes.blockJob) void refresh(); });
void refresh();
