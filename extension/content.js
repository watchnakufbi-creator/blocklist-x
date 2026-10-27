(() => {
  const S = globalThis.BlockListDOM;
  let halted = false, job, panel, status, initialized = false;
  const send = async (action, extra = {}) => {
    const response = await chrome.runtime.sendMessage({ scope: 'blocklist-runner', action, ...extra });
    if (!response?.ok) throw Error(response?.error || 'Connexion à l’extension perdue.');
    return response;
  };
  const visible = node => node && node.getClientRects().length > 0;
  const find = selector => [...document.querySelectorAll(selector)].find(visible);
  function hazard() {
    return S.hazardPath.test(location.pathname) || Boolean(find(S.challenge)) ||
      [...document.querySelectorAll(S.alerts)].some(node => S.hazardText.test(node.textContent)) ||
      S.hazardText.test(find(S.main)?.textContent || '');
  }
  function mount() {
    if (panel?.isConnected) return;
    panel = document.createElement('aside');
    // Shadow DOM isolates controls from X styles; all content is plain text.
    const shadow = panel.attachShadow({ mode: 'closed' });
    panel.style.cssText = 'position:fixed;bottom:16px;right:16px;z-index:2147483647;max-width:360px';
    const box = document.createElement('div');
    box.style.cssText = 'background:#172131;color:white;padding:16px;border:2px solid #89bfff;border-radius:12px;font:14px system-ui';
    status = document.createElement('p'); status.setAttribute('role', 'status'); box.append(status);
    for (const [label, action] of [['Pause', 'pause'], ['Reprendre', 'resume'], ['Arrêter', 'stop']]) {
      const button = document.createElement('button'); button.textContent = label;
      button.style.cssText = 'padding:9px;margin:4px;cursor:pointer';
      button.onclick = async () => {
        if (action !== 'resume') halted = true; // synchronous cancellation before storage/network waits
        try { await send(action); } catch (error) { status.textContent = error.message; }
      };
      box.append(button);
    }
    shadow.append(box); document.documentElement.append(panel);
  }
  chrome.runtime.onMessage.addListener((message, sender, reply) => {
    if (message?.scope === 'blocklist-probe') { reply({ ready: true }); }
  });
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.blockJob) {
      job = changes.blockJob.newValue;
      if (job?.status !== 'running') halted = true;
    }
  });
  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
  function guard() {
    if (halted) throw Error('Interruption demandée.');
    if (hazard()) {
      halted = true;
      void send('hazard').catch(() => {});
      throw Error('Limite ou vérification détectée.');
    }
  }
  async function waitFor(check, timeout = 12000) {
    const end = Date.now() + timeout;
    while (Date.now() < end) {
      guard(); const result = check(); if (result) return result;
      await sleep(100);
    }
    throw Error('Élément X introuvable ou état non confirmé.');
  }
  async function click(node) {
    guard();
    const fresh = await send('get');
    if (fresh.job?.status !== 'running') { halted = true; guard(); }
    guard(); if (!visible(node) || !node.isConnected) throw Error('Élément X disparu.');
    node.click();
  }
  async function block(handle, index) {
    // Match profile identity before touching its menu. Protected profiles use
    // the same profile menu and need no access to their posts.
    await waitFor(() => {
      const node = find(S.profile);
      return node && (node.textContent.match(S.handlePattern) || []).some(value => value.toLowerCase() === `@${handle}`);
    });
    if (find(S.unblock)) return 'déjà bloqué';
    await click(await waitFor(() => find(S.menu)));
    const choice = await waitFor(() => find(S.block) || find(S.unblock));
    if (choice.matches(S.unblock)) return 'déjà bloqué';
    if (!S.blockText.test(choice.textContent.trim())) throw Error('Action Bloquer non reconnue.');
    await click(choice);
    const confirmation = await waitFor(() => find(S.confirm));
    if (!S.blockText.test(confirmation.textContent.trim())) throw Error('Confirmation Bloquer non reconnue.');
    // Charge quota before sending the irreversible UI confirmation.
    guard(); const reservation = await send('reserve');
    if (!reservation.allowed) { halted = true; throw Error('Plafond atteint ou file interrompue.'); }
    await click(confirmation);
    await waitFor(() => !find(S.dialog) && Boolean(find(S.unblock)));
    return 'bloqué';
  }
  async function loop() {
    for (;;) {
      try {
        const result = await send(initialized ? 'get' : 'hello');
        initialized = true; job = result.job;
        mount(); status.textContent = `${job.name} : ${job.index}/${job.accounts.length} · ${job.status}\n${job.message} · Quota : ${result.counter.count}/${job.config.cap} tentative(s).`;
        if (job.status !== 'running') { halted = true; await sleep(250); continue; }
        if (halted) { location.reload(); return; } // clear stale X menus after an explicit resume
        if (job.inFlight) { await send('hello'); continue; } // uncertain write/result: never retry blindly
        halted = false;
        if (hazard()) { halted = true; await send('hazard'); continue; }
        if (job.index >= job.accounts.length) { await send('pause'); continue; }
        if (Date.now() < job.dueAt) { await sleep(100); continue; }
        if (result.counter.count >= job.config.cap) { await send('reserve'); continue; }
        const handle = job.accounts[job.index], index = job.index;
        const expected = `/${handle}`;
        if (location.pathname.replace(/\/$/, '').toLowerCase() !== expected) {
          guard(); location.assign(`${location.origin}/${encodeURIComponent(handle)}`); return;
        }
        let outcome;
        try {
          // Give profile routing time to settle before recognizing unavailable accounts.
          await waitFor(() => find(S.profile) || S.missingText.test(find(S.main)?.textContent || ''));
          outcome = S.missingText.test(find(S.main)?.textContent || '') ? 'introuvable' : await block(handle, index);
        } catch (error) {
          if (halted) { await sleep(100); continue; }
          outcome = 'erreur';
        }
        await send('result', { index, outcome });
      } catch (error) {
        if (status) status.textContent = `File inactive ou inaccessible : ${error.message}`;
        await sleep(500);
      }
    }
  }
  // Safety polling during all asynchronous DOM waits, not just between accounts.
  setInterval(() => {
    if (job?.status === 'running' && !halted && hazard()) {
      halted = true; void send('hazard').catch(() => {});
    }
  }, 100);
  void loop();
})();
