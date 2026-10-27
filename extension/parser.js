// X handles contain 1–15 ASCII letters, digits or underscores.
const RESERVED = new Set(['home', 'explore', 'notifications', 'messages', 'settings', 'search', 'i', 'intent', 'share', 'compose', 'login', 'logout', 'signup', 'tos', 'privacy']);
export function parseHandle(value) {
  if (typeof value !== 'string') return null;
  let handle = value.trim().replace(/^\uFEFF/, '');
  if (handle.startsWith('"') && handle.endsWith('"')) handle = handle.slice(1, -1).trim();
  if (/^(?:https?:\/\/|(?:www\.)?x\.com\/)/i.test(handle)) {
    try {
      const url = new URL(/^https?:/i.test(handle) ? handle : `https://${handle}`);
      if (!['x.com', 'www.x.com'].includes(url.hostname.toLowerCase()) || url.username || url.password || url.port) return null;
      if (!/^\/[A-Za-z0-9_]{1,15}\/?$/.test(url.pathname)) return null;
      handle = url.pathname.replace(/^\/|\/$/g, '');
    } catch { return null; }
  } else if (handle.startsWith('@')) handle = handle.slice(1);
  if (!/^[A-Za-z0-9_]{1,15}$/.test(handle) || RESERVED.has(handle.toLowerCase())) return null;
  return handle.toLowerCase();
}
export function parseList(text, existing = []) {
  const seen = new Set(existing.map(value => value.toLowerCase()));
  const handles = [];
  let invalid = 0, duplicates = 0;
  for (const token of text.split(/[,\r\n]+/)) {
    if (!token.trim()) continue;
    const handle = parseHandle(token);
    if (!handle) invalid++;
    else if (seen.has(handle)) duplicates++;
    else { seen.add(handle); handles.push(handle); }
  }
  return { handles, invalid, duplicates, ignored: invalid + duplicates };
}
