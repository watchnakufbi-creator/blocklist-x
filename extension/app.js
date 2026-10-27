import { parseHandle, parseList } from './parser.js';
const $ = id => document.getElementById(id);
const KEY = 'blocklistX';
let state = { accepted: false, lists: [] }, selected = '', limit = 100, busy = false;
const current = () => state.lists.find(list => list.id === selected);
const report = message => { $('status').textContent = message; };
if (location.pathname.endsWith('/options.html')) {
  document.body.classList.add('options');
  $('options').hidden = true;
}
$('options').onclick = () => chrome.runtime.openOptionsPage();
function render() {
  $('warning').hidden = state.accepted;
  $('app').hidden = !state.accepted;
  const select = $('lists');
  select.replaceChildren();
  for (const list of state.lists) {
    const option = document.createElement('option');
    option.value = list.id;
    option.textContent = `${list.name} (${list.accounts.length})`;
    select.append(option);
  }
  if (!current()) selected = state.lists[0]?.id || '';
  select.value = selected;
  if (!state.lists.length) {
    const option = document.createElement('option');
    option.textContent = 'Aucune liste — créez votre première liste';
    select.append(option);
  }
  const list = current();
  $('details').hidden = !list;
  if (list) { $('title').value = list.name; $('description').value = list.description; }
  renderAccounts();
}
function renderAccounts() {
  const list = current();
  $('accounts').replaceChildren();
  if (!list) return;
  const query = $('search').value.trim().replace(/^@/, '').toLowerCase();
  const matches = list.accounts.filter(handle => handle.includes(query));
  $('count').textContent = `${matches.length} compte(s) affichable(s) sur ${list.accounts.length}`;
  for (const handle of matches.slice(0, limit)) {
    const li = document.createElement('li');
    const name = document.createElement('span');
    name.textContent = `@${handle}`;
    const button = document.createElement('button');
    button.textContent = 'Supprimer';
    button.setAttribute('aria-label', `Supprimer @${handle}`);
    button.onclick = () => mutate(() => { current().accounts = current().accounts.filter(item => item !== handle); return 'Compte supprimé.'; });
    li.append(name, button); $('accounts').append(li);
  }
  if (!matches.length) {
    const li = document.createElement('li'); li.textContent = 'Aucun compte à afficher.'; $('accounts').append(li);
  }
  $('more').hidden = matches.length <= limit;
}
// Serialize writes within a view; the shared Web Lock also protects popup/options races.
async function mutate(change) {
  if (busy) return;
  busy = true;
  try {
    await navigator.locks.request(KEY, async () => {
      state = (await chrome.storage.local.get(KEY))[KEY] || { accepted: false, lists: [] };
      const previous = structuredClone(state);
      const previousSelected = selected;
      try {
        const message = change();
        await chrome.storage.local.set({ [KEY]: state });
        render(); report(message);
      } catch (error) { state = previous; selected = previousSelected; throw error; }
    });
  } catch (error) { report(`Opération impossible : ${error.message}`); }
  finally { busy = false; }
}
$('understood').onchange = () => { $('accept').disabled = !$('understood').checked; };
$('accept').onclick = () => { if ($('understood').checked) mutate(() => { state.accepted = true; return 'Bienvenue. Créez votre première liste.'; }); };
$('create').onsubmit = event => {
  event.preventDefault(); const name = $('name').value.trim();
  if (!name) return report('Saisissez un nom non vide.');
  mutate(() => {
    selected = crypto.randomUUID();
    state.lists.push({ id: selected, name, description: '', accounts: [] });
    $('name').value = ''; $('search').value = ''; limit = 100;
    return 'Liste créée.';
  });
};
$('lists').onchange = () => { selected = $('lists').value; $('search').value = ''; limit = 100; render(); };
$('metadata').onsubmit = event => {
  event.preventDefault(); const name = $('title').value.trim(), description = $('description').value;
  if (!name) return report('Saisissez un nom non vide.');
  mutate(() => { const list = current(); if (!list) throw new Error('Liste supprimée dans une autre fenêtre.'); list.name = name; list.description = description; return 'Nom et description enregistrés.'; });
};
$('delete-list').onclick = () => {
  if (!current() || !confirm(`Supprimer définitivement la liste « ${current().name} » ?`)) return;
  mutate(() => { state.lists = state.lists.filter(list => list.id !== selected); return 'Liste supprimée.'; });
};
$('add').onsubmit = event => {
  event.preventDefault(); const handle = parseHandle($('handle').value);
  if (!handle) return report('Pseudo invalide : 1 à 15 lettres, chiffres ou caractères « _ ». Les chemins réservés de X sont refusés.');
  mutate(() => {
    const list = current(); if (!list) throw new Error('Liste indisponible.');
    if (list.accounts.includes(handle)) return 'Compte déjà présent, aucun ajout.';
    list.accounts.push(handle); $('handle').value = ''; return 'Compte ajouté.';
  });
};
$('file').onchange = async () => {
  const file = $('file').files[0], target = selected;
  if (!file) return;
  try {
    if (!/\.(txt|csv)$/i.test(file.name)) throw new Error('Choisissez un fichier .txt ou .csv.');
    if (file.size > 2 * 1024 * 1024) throw new Error('Fichier trop volumineux (2 Mo maximum).');
    const text = await file.text();
    await mutate(() => {
      const list = state.lists.find(item => item.id === target);
      if (!list) throw new Error('La liste cible a été supprimée.');
      const result = parseList(text, list.accounts);
      list.accounts.push(...result.handles);
      return `${result.handles.length} compte(s) ajouté(s), ${result.ignored} ignoré(s) : ${result.invalid} invalide(s), ${result.duplicates} doublon(s).`;
    });
  } catch (error) { report(error.message); }
  finally { $('file').value = ''; }
};
$('export').onclick = () => {
  const list = current(); if (!list) return;
  const url = URL.createObjectURL(new Blob([list.accounts.join('\r\n') + (list.accounts.length ? '\r\n' : '')], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a'); link.href = url; link.download = 'blocklist-x.csv';
  document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  report(`${list.accounts.length} compte(s) exporté(s).`);
};
$('search').oninput = () => { limit = 100; renderAccounts(); };
$('more').onclick = () => { limit += 100; renderAccounts(); };
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes[KEY] && !busy) { state = changes[KEY].newValue || { accepted: false, lists: [] }; render(); }
});
try { state = (await chrome.storage.local.get(KEY))[KEY] || state; render(); }
catch { report('Stockage inaccessible. Fermez puis rouvrez l’extension.'); }
