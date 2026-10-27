import { createJob, control, reserve, finish, daily, settings } from './queue.js';
import { parseHandle } from './parser.js';
let chain = Promise.resolve();
const isX = url => /^https:\/\/(x|twitter)\.com\//.test(url || '');
chrome.runtime.onMessage.addListener((message, sender, reply) => {
  if (message?.scope !== 'blocklist-runner') return;
  chain = chain.catch(() => {}).then(async () => {
    const data = await chrome.storage.local.get(['blockJob', 'blockDaily', 'blockSettings']);
    let job = data.blockJob, counter = daily(data.blockDaily);
    const fromContent = Boolean(sender.tab);
    if (fromContent && (!isX(sender.url) || !job || sender.tab.id !== job.tabId)) throw Error('Cet onglet ne possède pas la file.');
    if (!fromContent && !sender.url?.startsWith(chrome.runtime.getURL(''))) throw Error('Origine refusée.');
    const action = message.action;
    if (action === 'start' && !fromContent) {
      if (job && ['running', 'paused'].includes(job.status)) throw Error('Arrêtez la file actuelle avant de commencer une autre liste.');
      const tab = await chrome.tabs.get(message.tabId);
      if (!isX(tab.url)) throw Error('Ouvrez un onglet https://x.com ou https://twitter.com connecté.');
      const store = (await chrome.storage.local.get('blocklistX')).blocklistX;
      const list = store?.lists.find(item => item.id === message.listId);
      if (!store?.accepted || !list?.accounts.length || list.accounts.some(handle => parseHandle(handle) !== handle)) throw Error('Liste vide ou invalide.');
      if (message.expectedName !== list.name || JSON.stringify(message.expectedAccounts) !== JSON.stringify(list.accounts)) throw Error('La liste a changé. Recommencez la confirmation.');
      const config = settings(message.config);
      // Confirm the content script is available BEFORE creating a running job.
      await chrome.tabs.sendMessage(tab.id, { scope: 'blocklist-probe' });
      job = createJob(list.accounts, config, tab.id, list.name);
      await chrome.storage.local.set({ blockSettings: config });
    } else if (['pause', 'resume', 'stop'].includes(action)) {
      control(job, action);
    } else if (action === 'hello' && fromContent && job.inFlight) {
      job.status = 'paused'; job.message = 'Page rechargée pendant une action : résultat incertain. Vérifiez le compte avant reprise ; il sera passé.';
    } else if (action === 'reserve' && fromContent) {
      if (Date.now() < job.dueAt) throw Error('Délai non écoulé.');
      const result = reserve(job, counter); counter = result.counter;
      await chrome.storage.local.set({ blockJob: job, blockDaily: counter });
      return { job, allowed: result.allowed, counter };
    } else if (action === 'result' && fromContent) {
      if (message.index !== job.index) throw Error('Résultat périmé.');
      if (!['bloqué', 'déjà bloqué', 'introuvable', 'erreur'].includes(message.outcome)) throw Error('Résultat invalide.');
      finish(job, message.outcome);
    } else if (action === 'hazard' && fromContent) {
      job.status = 'paused'; job.message = 'Arrêt automatique : limite, captcha ou vérification détecté. Résolvez le problème dans X ; aucune reprise automatique.';
    } else if (action !== 'get' && action !== 'hello' && action !== 'start') throw Error('Commande inconnue.');
    await chrome.storage.local.set({ ...(job ? { blockJob: job } : {}), blockDaily: counter });
    return { job, counter, config: data.blockSettings };
  }).then(value => reply({ ok: true, ...value }), error => reply({ ok: false, error: error.message }));
  return true;
});
