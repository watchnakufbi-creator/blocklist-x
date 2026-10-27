import { describe, it, expect } from 'vitest';
import { parseHandle, parseList } from '../extension/parser.js';
describe('validation et nettoyage des pseudos', () => {
  it.each(['pseudo', '@Pseudo', '  @PSEUDO  ', 'https://x.com/Pseudo', 'x.com/pseudo/', 'https://www.x.com/pseudo?lang=fr', '"@Pseudo"', '\uFEFFpseudo'])('normalise %s', value => expect(parseHandle(value)).toBe('pseudo'));
  it.each(['', '@', '@@test', 'a b', 'éclair', '<img src=x>', '=SUM(A1)', 'a'.repeat(16), 'https://evil.com/test', 'https://x.com.evil.com/test', 'https://x.com/test/status/1', 'https://x.com/home', 'https://user:pass@x.com/test', 'https://x.com:444/test', 'javascript:alert(1)', 'https://x.com/%74est', null])('rejette %s', value => expect(parseHandle(value)).toBeNull());
  it('accepte les limites et underscores', () => { expect(parseHandle('a')).toBe('a'); expect(parseHandle('a'.repeat(15))).toBe('a'.repeat(15)); expect(parseHandle('_abc123')).toBe('_abc123'); });
});
describe('import', () => {
  it('sépare lignes et virgules, dédoublonne sans tenir compte de la casse', () => {
    expect(parseList('@Alpha,alpha\r\nhttps://x.com/Beta\n<bad>\n@OLD\n\n', ['old'])).toEqual({ handles: ['alpha', 'beta'], invalid: 1, duplicates: 2, ignored: 3 });
  });
  it('ignore les lignes vides sans les compter comme invalides', () => expect(parseList(' \n,\r\n')).toEqual({ handles: [], invalid: 0, duplicates: 0, ignored: 0 }));
  it('importe un CSV simple avec guillemets et BOM', () => expect(parseList('\uFEFF"@Alpha", "Beta"\r\n')).toMatchObject({ handles: ['alpha', 'beta'], ignored: 0 }));
  it('refuse les CSV multicolonnes complexes plutôt que les interpréter comme HTML', () => expect(parseList('"bad,name",<script>alert(1)</script>')).toMatchObject({ handles: [], invalid: 3 }));
});
