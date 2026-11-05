/* Ayni tests: load the gallery in a headless Chromium and check the foundations (colours, light and dark, Sun mode,
   schemes, languages, icons). No dependencies: Node 22+ (its own WebSocket and fetch) and a Chromium.
     node tests/run.mjs
   Ends with "ALL GREEN" or the list of failed checks, and exits 1 on any failure. */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CHROME = ['/usr/bin/chromium', '/usr/bin/google-chrome', '/usr/bin/chromium-browser', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'];
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png' };

/* ---------- A static server over the repository ---------- */
const server = http.createServer((req, res) => {
  const file = path.join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end('Not found'); return; }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
  fs.createReadStream(file).pipe(res);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const BASE = `http://127.0.0.1:${server.address().port}`;
const GALLERY = BASE + '/gallery/index.html';

/* ---------- Headless Chromium over the DevTools protocol ---------- */
const bin = CHROME.find((p) => fs.existsSync(p));
if (!bin) { console.error('No Chromium found'); process.exit(2); }
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'ayni-test-'));
const chrome = spawn(bin, ['--headless=new', '--remote-debugging-port=0', '--no-sandbox', '--disable-gpu', '--user-data-dir=' + profile, 'about:blank'], { stdio: ['ignore', 'pipe', 'pipe'] });
const port = await new Promise((resolve, reject) => {
  let buf = ''; const t = setTimeout(() => reject(new Error('no DevTools port: ' + buf)), 20000);
  chrome.stderr.on('data', (d) => { buf += d; const m = /ws:\/\/127\.0\.0\.1:(\d+)\//.exec(buf); if (m) { clearTimeout(t); resolve(+m[1]); } });
});
const quit = async (code) => {
  server.close();
  await new Promise((r) => { if (chrome.exitCode !== null) return r(); chrome.once('exit', r); chrome.kill(); });
  fs.rmSync(profile, { recursive: true, force: true });
  process.exit(code);
};

const tab = async () => {
  const t = await (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' })).json();
  const ws = new WebSocket(t.webSocketDebuggerUrl);
  await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
  let id = 0; const waiting = new Map(), logs = [], loaded = [];
  ws.onmessage = (e) => {
    const m = JSON.parse(e.data);
    if (m.id && waiting.has(m.id)) { waiting.get(m.id)(m); waiting.delete(m.id); }
    if (m.method === 'Runtime.consoleAPICalled' && ['warning', 'error'].includes(m.params.type)) logs.push(m.params.type + ': ' + m.params.args.map((a) => a.value ?? a.description).join(' '));
    if (m.method === 'Log.entryAdded' && m.params.entry.level === 'error' && !/\/favicon\.ico$/.test(m.params.entry.url || '')) logs.push('error: ' + m.params.entry.text + ' ' + (m.params.entry.url || ''));
    if (m.method === 'Runtime.exceptionThrown') logs.push('exception: ' + (m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text));
    if (m.method === 'Page.loadEventFired') loaded.splice(0).forEach((f) => f());
  };
  const send = (method, params = {}) => new Promise((res) => { const i = ++id; waiting.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
  await send('Runtime.enable'); await send('Log.enable'); await send('Page.enable');
  await send('Emulation.setFocusEmulationEnabled', { enabled: true });   // a background tab is focused too (:focus, :focus-visible)
  const evaluate = async (expression, ms = 15000) => {
    const r = await Promise.race([send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }),
      new Promise((_, j) => setTimeout(() => j(new Error('timed out: ' + expression.slice(0, 200))), ms))]);
    if (r.result?.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description || JSON.stringify(r.result.exceptionDetails));
    return r.result?.result?.value;
  };
  /* Load a page and wait until Ayni has started */
  const open = async (url = GALLERY) => {
    const done = new Promise((r) => loaded.push(r));
    await send('Page.navigate', { url }); await done;
    await evaluate('new Promise((r) => { const t = () => (window.Ayni?.ready ? Ayni.ready.then(() => r(true)) : setTimeout(t, 20)); t(); })');
  };
  const close = () => fetch(`http://127.0.0.1:${port}/json/close/${t.id}`);
  return { send, evaluate, open, close, logs };
};

/* ---------- Checks ---------- */
const failed = []; let passed = 0;
const check = (name, ok, got) => { if (ok) passed++; else { failed.push(name + (got !== undefined ? ' — got ' + JSON.stringify(got) : '')); } console.log((ok ? '  ok   ' : '  FAIL ') + name); };
const section = (s) => console.log('\n' + s);

const LIGHT = { '--bg': '#D8D0C0', '--card': '#E3DCCC', '--card2': '#F2ECDF', '--line': '#86714B', '--text': '#242732', '--text-dim': '#484C5B', '--text-faint': '#5E6472', '--accent': '#61410A', '--on-accent': '#F9F9FB', '--danger': '#9C4150', '--ok': '#2E6B4E', '--warn': '#8A5A0B', '--busy': '#1C5FA6', '--link': '#1A4F9E' };
const DARK = { '--bg': '#1E1F23', '--card': '#25272B', '--card2': '#2F3034', '--line': '#424349', '--text': '#E7E7E9', '--text-dim': '#9597A1', '--text-faint': '#6B6E77', '--accent': '#1F80B1', '--on-accent': '#0D0F17', '--danger': '#D9707D', '--ok': '#7BA88F', '--warn': '#E0A21E', '--busy': '#2179CF', '--link': '#5B9DF9' };

/* In the page: a colour token as #RRGGBB, worked out by painting it (derived colours are color-mix() expressions) */
const RGB = `((name) => { const p = document.createElement('i'); p.style.color = 'var(' + name + ')'; document.body.append(p);
  const c = getComputedStyle(p).color; p.remove(); const x = document.createElement('canvas').getContext('2d');
  x.fillStyle = c; x.fillRect(0, 0, 1, 1); const d = x.getImageData(0, 0, 1, 1).data;
  return '#' + [d[0], d[1], d[2]].map((v) => v.toString(16).padStart(2, '0')).join('').toUpperCase(); })`;
const tokens = (t, names) => t.evaluate(`(${JSON.stringify(names)}).map((n) => [n, ${RGB}(n)])`).then(Object.fromEntries);
const lum = (h) => { const c = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((x) => (x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4)); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
const contrast = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };
/* Texts that are keys nobody translated: "ayni.something" anywhere in the page, text or attribute */
const RAW_KEYS = `(() => { const out = new Set(), re = /\\bayni\\.[a-z][\\w.]*/g;
  for (const m of document.body.innerText.matchAll(re)) out.add(m[0]);
  document.querySelectorAll('*').forEach((el) => [...el.attributes].forEach((a) => { if (a.name !== 'class' && a.name !== 'id' && a.name !== 'src' && a.name !== 'href') for (const m of a.value.matchAll(re)) out.add(m[0] + ' @' + a.name); }));
  document.querySelectorAll('[popover], dialog').forEach((el) => { for (const m of el.innerHTML.matchAll(re)) out.add(m[0]); });
  return [...out]; })()`;
const scheme = (t, value) => t.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value }] });
const clearStore = (t) => t.evaluate('localStorage.clear(), true');
/* Fix the page's clock to a moment (ms since 1970), for the sun */
const fakeClock = async (t, ms) => (await t.send('Page.addScriptToEvaluateOnNewDocument', { source:
  `(() => { const T = ${ms}, R = Date; class D extends R { constructor(...a) { super(...(a.length ? a : [T])); } static now() { return T; } } window.Date = D; })();` })).result.identifier;

let t;
try {
  t = await tab();
  await scheme(t, 'light');
  await t.open(); await clearStore(t); await t.open();

  section('Start-up');
  check('no errors or warnings on load (English, light)', t.logs.length === 0, t.logs.slice());
  check('Ayni.supported() is true in this browser', await t.evaluate('Ayni.supported()'));
  check('the page language is English', (await t.evaluate('document.documentElement.lang')) === 'en');
  check('no untranslated keys (English)', (await t.evaluate(RAW_KEYS)).length === 0, await t.evaluate(RAW_KEYS));
  check('the page is visible (the language script let it show)', (await t.evaluate('getComputedStyle(document.documentElement).visibility')) === 'visible');
  check('no font is loaded from the network', (await t.evaluate(`performance.getEntriesByType('resource').filter((r) => !r.name.startsWith(location.origin)).map((r) => r.name)`)).length === 0);

  section('Colours');
  let got = await tokens(t, Object.keys(LIGHT));
  check('System mode on a light device: every colour is Nayive\'s light value', Object.keys(LIGHT).every((k) => got[k] === LIGHT[k]), got);
  check('System mode on a light device: data-theme says light', (await t.evaluate('document.documentElement.dataset.theme')) === 'light');
  check('the browser bar takes --bg (light)', (await t.evaluate(`document.querySelector('meta[name="theme-color"]')?.content`)) === LIGHT['--bg']);
  const dTok = ['--text', '--text-dim', '--card', '--card2', '--field-line', '--accent', '--line'];
  const cl = await tokens(t, dTok);
  await scheme(t, 'dark');
  await t.evaluate('new Promise((r) => setTimeout(r, 50))');
  check('…and turns to dark with the device', (await t.evaluate('document.documentElement.dataset.theme')) === 'dark');
  got = await tokens(t, Object.keys(DARK));
  check('System mode follows the device to dark at once', Object.keys(DARK).every((k) => got[k] === DARK[k]), got);
  check('the browser bar takes --bg (dark)', (await t.evaluate(`document.querySelector('meta[name="theme-color"]')?.content`)) === DARK['--bg']);
  const cd = await tokens(t, dTok);
  for (const [name, c] of [['light', cl], ['dark', cd]]) {
    check(`contrast ${name}: text on card ≥ 4.5`, contrast(c['--text'], c['--card']) >= 4.5, contrast(c['--text'], c['--card']).toFixed(2));
    check(`contrast ${name}: text dim (placeholders) on card 2 ≥ 4.5`, contrast(c['--text-dim'], c['--card2']) >= 4.5, contrast(c['--text-dim'], c['--card2']).toFixed(2));
    check(`contrast ${name}: field border on card 2 ≥ 3`, contrast(c['--field-line'], c['--card2']) >= 3, contrast(c['--field-line'], c['--card2']).toFixed(2));
    check(`contrast ${name}: focus ring (accent) on card ≥ 3`, contrast(c['--accent'], c['--card']) >= 3, contrast(c['--accent'], c['--card']).toFixed(2));
  }
  check('placeholders use text dim', (await t.evaluate(`getComputedStyle(document.querySelector('input.input[placeholder]'), '::placeholder').color`)) === (await t.evaluate(`(() => { const p = document.createElement('i'); p.style.color = 'var(--text-dim)'; document.body.append(p); const c = getComputedStyle(p).color; p.remove(); return c; })()`)));
  check('fields sit on card 2', (await t.evaluate(`getComputedStyle(document.querySelector('input.input')).backgroundColor`)) === (await t.evaluate(`(() => { const p = document.createElement('i'); p.style.color = 'var(--card2)'; document.body.append(p); const c = getComputedStyle(p).color; p.remove(); return c; })()`)));
  check('the focus ring is accent', (await t.evaluate(`(() => { const b = document.querySelector('#theme-btn'); document.activeElement?.blur(); b.focus({ focusVisible: true }); const o = getComputedStyle(b).outlineColor; const p = document.createElement('i'); p.style.color = 'var(--accent)'; document.body.append(p); const c = getComputedStyle(p).color; p.remove(); return o === c ? true : o + ' vs ' + c; })()`)) === true, await t.evaluate(`(() => { const b = document.querySelector('#theme-btn'); return [document.activeElement?.id, b.matches(':focus'), b.matches(':focus-visible'), getComputedStyle(b).outline, getComputedStyle(b).display, b.getClientRects().length].join(' | '); })()`));
  check('corners: fields 8 px, panels 16 px', (await t.evaluate(`[getComputedStyle(document.querySelector('input.input')).borderTopLeftRadius, getComputedStyle(document.querySelector('.panel')).borderTopLeftRadius].join()`)) === '8px,16px');
  check('the system font is used', /BlinkMacSystemFont|-apple-system/.test(await t.evaluate('getComputedStyle(document.body).fontFamily')));

  section('Light and dark by hand');
  await t.evaluate(`window.__themes = []; document.addEventListener('ayni:theme', (e) => __themes.push(e.detail.theme)); true`);
  check('the toggle shows a sun while dark is on', (await t.evaluate(`document.querySelector('#theme-btn .icon').dataset.icon`)) === 'sun');
  await t.evaluate(`document.querySelector('#theme-btn').click(), true`);
  check('pressing it gives light, kept as ayni-theme', (await t.evaluate(`[document.documentElement.dataset.theme, localStorage.getItem('ayni-theme')].join()`)) === 'light,light');
  check('…and a moon on the toggle', (await t.evaluate(`document.querySelector('#theme-btn .icon').dataset.icon`)) === 'moon');
  check('…and its tooltip says what it will do', (await t.evaluate(`document.querySelector('#theme-btn').dataset.tip`)) === 'Dark mode');
  check('ayni:theme fired once, on document', JSON.stringify(await t.evaluate('__themes')) === '["light"]', await t.evaluate('__themes'));
  got = await tokens(t, Object.keys(LIGHT));
  check('the colours are light although the device is dark', Object.keys(LIGHT).every((k) => got[k] === LIGHT[k]), got);
  await t.evaluate(`Ayni.setTheme('light'), true`);
  check('no event when nothing changed', (await t.evaluate('__themes.length')) === 1);

  const t2 = await tab(); await scheme(t2, 'dark'); await t2.open();
  check('a second tab opens in the chosen mode', (await t2.evaluate('document.documentElement.dataset.theme')) === 'light');
  await t.evaluate(`Ayni.setTheme('dark'), true`);
  await t2.evaluate('new Promise((r) => setTimeout(r, 150))');
  check('a change in one tab reaches the other at once', (await t2.evaluate('document.documentElement.dataset.theme')) === 'dark');
  await t.evaluate(`Ayni.setTheme(null), true`);
  check('setTheme(null) goes back to System (dark device: data-theme dark)', (await t.evaluate(`[document.documentElement.dataset.theme ?? '-', localStorage.getItem('ayni-theme') ?? '-', Ayni.theme.mode() ?? '-'].join()`)) === 'dark,-,-');
  await t.open();
  await t.evaluate(`localStorage.setItem('ayni-theme', 'light'), true`);
  await t.open();
  check('a saved choice wins on the next load: light on a dark device', (await t.evaluate('document.documentElement.dataset.theme')) === 'light');
  await t.evaluate(`Ayni.setTheme(null), true`);

  section('Own schemes');
  await t.evaluate(`Ayni.theme.schemes = { schemes: [{ id: 'sea', tokens: { '--accent': '#123456', '--bg': '#0A1B2C' } }], activeDark: 'sea' }, true`);
  got = await tokens(t, ['--accent', '--bg', '--card']);
  check('the active dark scheme sets its colours', got['--accent'] === '#123456' && got['--bg'] === '#0A1B2C', got);
  check('…and leaves the others built-in', got['--card'] === DARK['--card'], got);
  check('…and the browser bar follows it', (await t.evaluate(`document.querySelector('meta[name="theme-color"]').content`)) === '#0A1B2C');
  await t.evaluate(`Ayni.setTheme('light'), true`);
  check('in light the scheme (dark only) is off', (await tokens(t, ['--accent']))['--accent'] === LIGHT['--accent']);
  await t.evaluate(`Ayni.theme.schemes = null, Ayni.setTheme(null), true`);
  check('no scheme: the built-in colours come back', (await tokens(t, ['--accent']))['--accent'] === DARK['--accent']);
  await t2.close();   // its clock is the real one: in Sun mode it would answer every change below with its own

  section('Sun mode');
  /* 2026-10-28 in London: 12:00 UTC is day, 00:30 UTC is night; just after sunrise (~06:55 UTC) it is still dark */
  const sunCase = async (label, when, expect, { place, zone } = {}) => {
    const id = await fakeClock(t, Date.parse(when));
    if (zone) await t.send('Emulation.setTimezoneOverride', { timezoneId: zone });
    await t.open();
    const clock = await t.evaluate('new Date().toISOString()');
    if (clock !== new Date(Date.parse(when)).toISOString()) console.log('      page clock: ' + clock);
    await t.evaluate(`localStorage.clear(); ${place ? `localStorage.setItem('ayni-place', '${JSON.stringify(place)}');` : ''} Ayni.setTheme('sun'); true`);
    await t.evaluate(`new Promise((r) => { const end = performance.now() + 3000, w = () => (localStorage.getItem('ayni-theme') || performance.now() > end ? r() : setTimeout(w, 20)); w(); })`);
    const m = await t.evaluate(`[document.documentElement.dataset.theme, localStorage.getItem('ayni-theme'), Ayni.theme.mode()].join()`);
    check(label, m === `${expect},${expect},sun`, m);
    await t.send('Page.removeScriptToEvaluateOnNewDocument', { identifier: id });
    if (zone) await t.send('Emulation.setTimezoneOverride', { timezoneId: '' });
  };
  await sunCase('London at noon is light', '2026-10-28T12:00:00Z', 'light', { place: { lat: 51.5, lon: -0.1 } });
  await sunCase('London at 00:30 is dark', '2026-10-28T00:30:00Z', 'dark', { place: { lat: 51.5, lon: -0.1 } });
  await sunCase('London just after sunrise is still dark', '2026-10-28T07:00:00Z', 'dark', { place: { lat: 51.5, lon: -0.1 } });
  await sunCase('no place: Madrid\'s time zone at 13:00 local is light', '2026-10-28T12:00:00Z', 'light', { zone: 'Europe/Madrid' });
  await sunCase('no place: Madrid\'s time zone at 07:30 local is dark (its sun rises late)', '2026-10-28T06:30:00Z', 'dark', { zone: 'Europe/Madrid' });
  await t.evaluate('localStorage.clear(), true');
  await t.open();
  await t.evaluate(`Ayni.theme.setPlace(40.4168, -3.7038), true`);
  check('setPlace keeps the place rounded to ~10 km', (await t.evaluate(`localStorage.getItem('ayni-place')`)) === '{"lat":40.4,"lon":-3.7}');
  await t.evaluate(`Ayni.setTheme('sun'), document.querySelector('#theme-btn').click(), true`);
  check('the toggle ends Sun mode', (await t.evaluate(`[localStorage.getItem('ayni-theme-sun') ?? '-', Ayni.theme.mode()].join()`)).startsWith('-,'));
  await t.evaluate('localStorage.clear(), true');

  section('Languages');
  for (const lang of ['es', 'pt', 'fr', 'de', 'en']) {
    await t.evaluate(`localStorage.setItem('ayni-lang', '${lang}'), true`);
    t.logs.length = 0;
    await t.open();
    check(`${lang}: the page language is ${lang}`, (await t.evaluate('document.documentElement.lang')) === lang);
    const raw = await t.evaluate(RAW_KEYS);
    check(`${lang}: no untranslated keys`, raw.length === 0, raw);
    check(`${lang}: no errors or warnings`, t.logs.length === 0, t.logs.slice());
  }
  await t.evaluate(`localStorage.setItem('ayni-lang', 'es'), true`); await t.open();
  check('es: the password button says "Mostrar contraseña"', (await t.evaluate(`(() => { const b = document.querySelector('#pw-toggle'); b.click(); b.click(); return b.dataset.tip; })()`)) === 'Mostrar contraseña');
  check('es: calendar days start "Lu"', (await t.evaluate(`document.querySelector('#cal-inline th')?.textContent`)) === 'lu' || (await t.evaluate(`document.querySelector('#cal-inline th')?.textContent`)) === 'Lu', await t.evaluate(`document.querySelector('#cal-inline th')?.textContent`));
  check('es: the calendar title is in Spanish', (await t.evaluate(`document.querySelector('#cal-inline .cal-title').textContent.trim()`)) === (await t.evaluate(`new Intl.DateTimeFormat('es', { month: 'long', year: 'numeric' }).format(new Date())`)));
  check('es: the theme button says "Tema claro" / "Tema oscuro"', ['Tema claro', 'Tema oscuro'].includes(await t.evaluate(`document.querySelector('#theme-btn').dataset.tip`)));
  check('es: Ayni.t reads a key', (await t.evaluate(`Ayni.t('ayni.undo')`)) === 'Deshacer');
  check('es: Ayni.tf fills its places', (await t.evaluate(`Ayni.tf('ayni.tree.nItems', { n: 3 })`)) === '3 elementos');
  check('a key no file has comes back as itself', (await t.evaluate(`Ayni.t('no.such.key')`)) === 'no.such.key');
  check('setLang to the same language does nothing', (await t.evaluate(`Ayni.i18n.setLang('es')`)) === false);
  check('setLang(null) does nothing', (await t.evaluate(`Ayni.i18n.setLang(null)`)) === false);
  check('setLang to a language not offered does nothing', (await t.evaluate(`Ayni.i18n.setLang('xx')`)) === false);
  await t.evaluate(`Ayni.i18n.setLang('fr'), true`).catch(() => {});
  await t.evaluate('new Promise((r) => setTimeout(r, 400))').catch(() => {});
  await t.open();
  check('setLang("fr") reloads the page in French', (await t.evaluate('document.documentElement.lang')) === 'fr');
  await t.evaluate(`Ayni.i18n.setLang(''), true`).catch(() => {});
  await t.evaluate('new Promise((r) => setTimeout(r, 400))').catch(() => {});
  await t.open();
  check('setLang("") follows the browser again', (await t.evaluate(`[localStorage.getItem('ayni-lang') ?? '-', document.documentElement.lang].join()`)) === '-,en');

  section('Icons');
  const icons = await t.evaluate(`[...document.querySelectorAll('.icon[data-icon]')].filter((el) => el.getClientRects().length).map((el) => [el.dataset.icon, !!el.querySelector('svg, i, img')])`);
  const blank = icons.filter(([, ok]) => !ok).map(([n]) => n);
  check(`every icon on the page is drawn (${icons.length})`, blank.length === 0, [...new Set(blank)]);
  check('every control icon has a drawing', (await t.evaluate(`Ayni.icons.names.filter((n) => !document.getElementById('i-' + n))`)).length === 0, await t.evaluate(`Ayni.icons.names.filter((n) => !document.getElementById('i-' + n))`));
  check('"more" is the vertical ⋮ (three dots one above the other)', (await t.evaluate(`[...document.querySelectorAll('#i-more circle')].map((c) => c.getAttribute('cx')).join()`)) === '12,12,12');
  check('an icon with its own stroke keeps it (check: 2.6)', (await t.evaluate(`document.querySelector('#i-check g')?.getAttribute('stroke-width')`)) === '2.6');
  await t.evaluate(`(() => { const s = document.createElement('span'); s.className = 'icon'; s.dataset.icon = 'test-logo'; s.id = 'probe'; document.body.append(s); Ayni.init(s); return true; })()`);
  await t.evaluate(`Ayni.icons.add({ 'test-logo': '<svg viewBox="0 0 512 512" fill="currentColor"><rect width="512" height="256"/></svg>', 'test-line': '<path d="M4 4h16"/>' }), true`);
  check('icons.add: a whole svg keeps its grid and fill', (await t.evaluate(`[document.getElementById('i-test-logo').getAttribute('viewBox'), document.querySelector('#i-test-logo > g').getAttribute('fill')].join()`)) === '0 0 512 512,currentColor');
  check('icons.add: a line drawing gets the 24 grid', (await t.evaluate(`document.getElementById('i-test-line').getAttribute('viewBox')`)) === '0 0 24 24');
  check('icons.add: an icon already on the page is redrawn', await t.evaluate(`!!document.querySelector('#probe svg use')`));
  check('a copy of an icon\'s svg, out of its span, still draws with lines', await t.evaluate(`(() => { const c = document.querySelector('.icon[data-icon="search"] svg').cloneNode(true); document.body.append(c); const ok = getComputedStyle(c).fill === 'none' && getComputedStyle(c).stroke !== 'none'; c.remove(); return ok; })()`));
  check('Ayni.icon() writes the span markup', /^<span class="icon" data-icon="close"/.test(await t.evaluate(`Ayni.icon('close')`)));

  section('Touch and text size');
  await t.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 800, deviceScaleFactor: 2, mobile: true });
  await t.evaluate(`Ayni.setTouchPreview(true), true`);
  check('phone, touch: fields type in 16 px', (await t.evaluate(`getComputedStyle(document.querySelector('input.input')).fontSize`)) === '16px', await t.evaluate(`getComputedStyle(document.querySelector('input.input')).fontSize`));
  await t.evaluate(`Ayni.setTouchPreview(false), true`);
  await t.send('Emulation.clearDeviceMetricsOverride');
  await t.send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
  check('desktop: fields type in .77 rem', (await t.evaluate(`getComputedStyle(document.querySelector('input.input')).fontSize`)) === '12.32px', await t.evaluate(`getComputedStyle(document.querySelector('input.input')).fontSize`));
  check('body text is .9 rem', (await t.evaluate('getComputedStyle(document.body).fontSize')) === '14.4px');

  section('Base only (no controls)');
  t.logs.length = 0;
  await t.open(BASE + '/tests/base-only.html');
  check('a page with only the base starts with no errors or warnings', t.logs.length === 0, t.logs.slice());
  check('…its icons are drawn', await t.evaluate(`!!document.querySelector('#ic svg use')`));
  check('…its texts are translated', (await t.evaluate(`document.getElementById('msg').textContent`)) === 'Undo');
  check('…and the controls are not there', (await t.evaluate('typeof Ayni.toast')) === 'undefined');
  await t.evaluate(`document.getElementById('theme').click(), true`);
  check('…and its theme button works', !!(await t.evaluate('document.documentElement.dataset.theme')));
  await t.evaluate(`Ayni.setTheme(null), true`);

  section('Buttons family (base + buttons, no other controls)');
  t.logs.length = 0;
  await t.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'light' }] });
  await t.open(BASE + '/tests/buttons-only.html');
  check('a page with the base and the buttons family starts with no errors or warnings', t.logs.length === 0, t.logs.slice());
  const cs = (id, prop, pseudo) => t.evaluate(`getComputedStyle(document.getElementById('${id}')${pseudo ? `, '${pseudo}'` : ''}).${prop}`);
  const colourOf = (v) => t.evaluate(`(() => { const p = document.createElement('i'); p.style.color = '${v}'; document.body.append(p); const c = getComputedStyle(p).color; p.remove(); return c; })()`);
  check('at rest: no fill and no border', (await cs('plain', 'backgroundColor')) === 'rgba(0, 0, 0, 0)' && (await cs('plain', 'borderTopColor')) === 'rgba(0, 0, 0, 0)');
  check('at rest: the icon is Text dim', (await cs('plain', 'color')) === (await colourOf('var(--text-dim)')));
  const r = await t.evaluate(`(() => { const b = document.getElementById('plain').getBoundingClientRect(); return [b.left + b.width / 2, b.top + b.height / 2]; })()`);
  await t.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: r[0], y: r[1] });
  await t.evaluate('new Promise((r) => setTimeout(r, 250))');
  check('on hover: a grey tint, never Accent', (await cs('plain', 'backgroundColor')) !== 'rgba(0, 0, 0, 0)' && !(await cs('plain', 'backgroundColor')).includes((await colourOf('var(--accent)')).slice(4, -1)));
  check('on hover: the icon takes the full Text colour', (await cs('plain', 'color')) === (await colourOf('var(--text)')));
  await t.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 1, y: 1 });
  check('.bordered: a Card disc with a border', (await cs('bordered', 'backgroundColor')) === (await colourOf('var(--card)')) && (await cs('bordered', 'borderTopColor')) === (await colourOf('var(--line)')));
  check('.sm: 30 px', (await cs('small', 'width')) === '30px');
  check('normal: 36 px', (await cs('plain', 'width')) === '36px');
  check('the default button is the only filled one (Accent)', (await cs('primary', 'backgroundColor')) === (await colourOf('var(--accent)')));
  check('danger colours only the icon', (await cs('danger', 'color')) === (await colourOf('var(--danger)')) && (await cs('danger', 'backgroundColor')) === 'rgba(0, 0, 0, 0)');
  check('a toggle that is on: soft tint and an Accent icon, no fill', (await cs('toggle', 'backgroundColor')) === (await colourOf('var(--accent-soft)')) && (await cs('toggle', 'color')) === (await colourOf('var(--accent)')));
  await t.evaluate(`document.getElementById('toggle').click(), true`);
  check('a toggle flips its aria-pressed', (await t.evaluate(`document.getElementById('toggle').getAttribute('aria-pressed')`)) === 'false');
  check('a menu button shows the triangle', (await cs('popup', 'content', '::after')) === '""');
  check('the ⋮ "more" button does not', (await cs('more', 'content', '::after')) === 'none');
  check('a second action shows its dot', (await cs('alt', 'content', '::after')) === '""');
  check('its tooltip names both actions', /Print · .*Print with the last settings/.test(await t.evaluate(`document.getElementById('alt').dataset.tip`)));
  check('a round button gets its aria-label from its tooltip', (await t.evaluate(`document.getElementById('plain').getAttribute('aria-label')`)) === 'Search');
  check('a disabled button is faded to 45%', (await cs('off', 'opacity')) === '0.45');
  check('…and ignores clicks', await t.evaluate(`(() => { let hit = false; const b = document.getElementById('off'); b.addEventListener('click', () => { hit = true; }); b.click(); return !hit; })()`));
  await t.evaluate(`Ayni.setBusy(document.getElementById('plain'), 'Saving…'), true`);
  check('setBusy: a spinner instead of the icon, the tooltip says what runs', (await t.evaluate(`[!!document.querySelector('#plain .btn-spin'), getComputedStyle(document.querySelector('#plain .icon')).display, document.getElementById('plain').dataset.tip].join()`)) === 'true,none,Saving…');
  await t.evaluate(`Ayni.setBusy(document.getElementById('plain'), false), true`);
  check('…and back', (await t.evaluate(`[!!document.querySelector('#plain .btn-spin'), document.getElementById('plain').dataset.tip].join()`)) === 'false,Search');
  await t.evaluate(`Ayni.setTip(document.getElementById('plain'), 'Pause'), true`);
  check('setTip: the tooltip and the round button\'s name change together', (await t.evaluate(`[document.getElementById('plain').dataset.tip, document.getElementById('plain').getAttribute('aria-label')].join()`)) === 'Pause,Pause');
  await t.evaluate(`Ayni.setTip(document.getElementById('plain'), 'Search'), true`);
  check('setBusy on a button with no tooltip: none again afterwards', await t.evaluate(`(() => { const b = document.createElement('button'); b.className = 'btn text'; document.body.append(b); Ayni.setBusy(b, 'Saving…'); const busy = b.dataset.tip; Ayni.setBusy(b, false); const r = busy === 'Saving…' && !('tip' in b.dataset) && !('idleTip' in b.dataset); b.remove(); return r; })()`));
  check('over a picture: a dark glass disc with a white icon', (await cs('media', 'color')) === 'rgb(255, 255, 255)' && (await cs('media', 'backgroundColor')).startsWith('rgba(0, 0, 0'));
  check('a text button is a pill with its label', (await t.evaluate(`[document.getElementById('text').textContent.trim(), getComputedStyle(document.getElementById('text')).borderTopLeftRadius].join()`)) === 'Extract here,999px');
  check('…and keeps no aria-label of its own (its label is the name)', (await t.evaluate(`document.getElementById('text').hasAttribute('aria-label')`)) === false);
  check('a dashed text button has a dashed border', (await cs('dashed', 'borderTopStyle')) === 'dashed');
  check('switch.end: the switch sits at the end of its row', await t.evaluate(`(() => { const l = document.getElementById('sw').getBoundingClientRect(), i = document.querySelector('#sw input').getBoundingClientRect(); return Math.abs(l.right - i.right) < 2; })()`));
  check('a tall toolbar has 36 px buttons', (await t.evaluate(`getComputedStyle(document.querySelector('#tb .btn')).width`)) === '36px');
  await t.evaluate(`Ayni.setTouchPreview(true), true`);
  check('touch: a button keeps its drawn size', (await cs('plain', 'width')) === '36px');
  check('touch: a finger 3 px outside the drawn circle still hits it (44 px area)', await t.evaluate(`(() => { const b = document.getElementById('plain').getBoundingClientRect(); const e = document.elementFromPoint(b.left - 3, b.top + b.height / 2); return e === document.getElementById('plain'); })()`));
  check('touch: a dialog\'s bottom row is drawn at 44 px', (await t.evaluate(`getComputedStyle(document.querySelector('#foot .btn')).width`)) === '44px');
  check('touch: the second action\'s tooltip says "Hold"', /Hold/.test(await t.evaluate(`document.getElementById('alt').dataset.tip`)));
  await t.evaluate(`Ayni.setTouchPreview(false), true`);
  check('back to mouse: "Double-click or Shift+Enter"', /Double-click/.test(await t.evaluate(`document.getElementById('alt').dataset.tip`)));

  section('Notifications family (base + buttons + notifications)');
  t.logs.length = 0;
  await t.send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
  await t.open(BASE + '/tests/toasts-only.html#early');
  check('a page with the notifications family starts with no errors or warnings', t.logs.length === 0, t.logs.slice());
  const ev = (js) => t.evaluate(js);
  const wait = (ms) => ev(`new Promise((r) => setTimeout(r, ${ms}))`);
  const ctrlZ = async () => { for (const type of ['keyDown', 'keyUp']) await t.send('Input.dispatchKeyEvent', { type, key: 'z', code: 'KeyZ', modifiers: 2, windowsVirtualKeyCode: 90 }); };
  const shown = () => ev(`[...document.querySelectorAll('#ayni-toasts > .toast')].map((x) => x.querySelector('p').firstChild.textContent)`);
  const reset = () => ev(`(() => { Ayni.settleUndo(); document.querySelectorAll('#ayni-toasts > .toast').forEach((x) => x.remove()); window.L = []; return true; })()`);
  /* Undo helpers: each logs what ran */
  const undoToast = (name, extra = '') => ev(`(Ayni.toast('ok', '${name}', { undo: () => L.push('undo ${name}'), final: () => L.push('final ${name}')${extra} }), true)`);
  const L = () => ev('L.join()');

  check('a notification shown before Ayni has started works', (await ev(`[...document.querySelectorAll('#ayni-toasts .toast p')].map((p) => p.textContent).join()`)) === 'Early', t.logs.slice());
  check('…and its stack gets its translated name once Ayni starts', (await ev(`document.getElementById('ayni-toasts').getAttribute('aria-label')`)) === 'Notifications');
  await reset();
  check('the stack is made by Ayni (no element in the page)', await ev(`!!document.getElementById('ayni-toasts')`));
  await ev(`(Ayni.toast('ok', 'Saved.'), true)`);
  check('a notification shows in the open stack', await ev(`document.getElementById('ayni-toasts').matches(':popover-open') && !!document.querySelector('#ayni-toasts .toast.ok')`));
  check('…with its kind\'s icon and a close button', await ev(`!!document.querySelector('.toast.ok > .icon[data-icon="ok"]') && !!document.querySelector('.toast.ok .dismiss')`));
  check('…and role="status"; an error has role="alert"', await ev(`(Ayni.toast('err', 'Failed.'), document.querySelector('.toast.ok').getAttribute('role') === 'status' && document.querySelector('.toast.err').getAttribute('role') === 'alert')`));
  check('every kind has its icon colour', await ev(`(() => { Ayni.toast('info', 'i'); Ayni.toast('warn', 'w'); const c = (k) => getComputedStyle(document.querySelector('.toast.' + k + ' > .icon')).color, v = (n) => { const p = document.createElement('i'); p.style.color = 'var(' + n + ')'; document.body.append(p); const r = getComputedStyle(p).color; p.remove(); return r; }; return c('warn') === v('--warn') && c('err') === v('--danger') && c('info') === v('--accent'); })()`));
  check('no untranslated keys in the notifications', (await t.evaluate(RAW_KEYS)).length === 0, await t.evaluate(RAW_KEYS));
  await ev(`document.querySelectorAll('#ayni-toasts .dismiss').forEach((b) => b.click()), true`);
  check('closing the last one hides the stack', await ev(`!document.getElementById('ayni-toasts').matches(':popover-open') && !document.querySelector('#ayni-toasts .toast')`));
  check('Ayni.toast returns close()', await ev(`(() => { const h = Ayni.toast('info', 'x'); h.close(); return !document.querySelector('#ayni-toasts .toast'); })()`));

  /* Undo */
  await reset(); await undoToast('A');
  check('Undo: the icon and the word "Undo", in Accent', await ev(`(() => { const b = document.querySelector('.toast.undo .act'), p = document.createElement('i'); p.style.color = 'var(--accent)'; document.body.append(p); const acc = getComputedStyle(p).color; p.remove(); return b.matches('.btn.text') && !!b.querySelector('.icon[data-icon="undo"] svg') && b.textContent.trim() === 'Undo' && getComputedStyle(b).color === acc; })()`));
  check('Undo: the hint "Ctrl+Z also undoes" shows with a mouse', await ev(`getComputedStyle(document.querySelector('.toast.undo .undo-key')).display !== 'none' && document.querySelector('.undo-key').textContent === 'Ctrl+Z also undoes'`));
  await ev(`Ayni.setTouchPreview(true), true`);
  check('…and hides on touch', await ev(`getComputedStyle(document.querySelector('.toast.undo .undo-key')).display === 'none'`));
  await ev(`Ayni.setTouchPreview(false), true`);
  await ev(`document.querySelector('.toast.undo .act').click(), true`);
  check('pressing Undo runs it, and `final` never runs', (await L()) === 'undo A' && !(await ev(`!!document.querySelector('.toast.undo')`)), await L());

  await reset(); await undoToast('B');
  await ev(`document.querySelector('.toast.undo .dismiss').click(), true`);
  check('closing an Undo makes it final: `final` runs once', (await L()) === 'final B', await L());

  await reset(); await undoToast('C'); await undoToast('D');
  check('one Undo at a time: a newer Undo makes the older one final', (await L()) === 'final C' && (await shown()).join() === 'D', [await L(), await shown()]);
  await ev(`(Ayni.toast('info', 'News'), true)`);
  check('news never makes an Undo final', (await L()) === 'final C' && (await shown()).join() === 'D,News', [await L(), await shown()]);
  await ev(`Ayni.settleUndo(), true`);
  check('settleUndo(): the Undo is final now and leaves', (await L()) === 'final C,final D' && (await shown()).join() === 'News', [await L(), await shown()]);
  await ev(`Ayni.settleUndo(), true`);
  check('…and a second settleUndo() does nothing', (await L()) === 'final C,final D');

  /* Ctrl+Z */
  await reset(); await undoToast('E'); await ev('document.activeElement.blur(), true');
  await ctrlZ();
  check('Ctrl+Z runs the Undo on show', (await L()) === 'undo E' && !(await ev(`!!document.querySelector('.toast.undo')`)), await L());
  await ctrlZ();
  check('…and does nothing once it has gone', (await L()) === 'undo E', await L());
  await reset(); await undoToast('F'); await ev(`document.getElementById('field').focus(), true`);
  await ctrlZ();
  check('Ctrl+Z in a text field is the field\'s own', (await L()) === '', await L());
  await ev(`(document.activeElement.blur(), window.addEventListener('keydown', window.own = (e) => e.preventDefault(), true), true)`);
  await ctrlZ();
  check('Ctrl+Z the page handled itself does not undo', (await L()) === '', await L());
  await ev(`(window.removeEventListener('keydown', window.own, true), true)`);

  /* A closing page */
  await reset(); await ev(`(() => { window.sent = []; window.realFetch = window.fetch; window.fetch = (u, o) => { sent.push(!!o?.keepalive); return Promise.resolve(new Response('')); }; return true; })()`);
  await ev(`(Ayni.toast('ok', 'G', { undo: () => {}, final: () => { L.push('final G'); fetch('/x', { method: 'POST', body: 'y' }); } }), true)`);
  await ev(`(dispatchEvent(new Event('pagehide')), true)`);
  check('a closing page makes the Undo final, its fetch with keepalive', (await L()) === 'final G' && (await ev('sent.join()')) === 'true', [await L(), await ev('sent.join()')]);
  await reset(); await undoToast('H', ', keepOnLeave: true');
  await ev(`(dispatchEvent(new Event('pagehide')), true)`);
  check('keepOnLeave: a closing page does not run `final`', (await L()) === '', await L());
  await ev(`(window.fetch = window.realFetch, true)`);

  /* At most 3 */
  await reset();
  await undoToast('U'); await ev(`(Ayni.toast('err', 'E1'), Ayni.toast('info', 'I1'), Ayni.toast('info', 'I2'), Ayni.toast('info', 'I3'), true)`);
  check('at most 3 show; the oldest leaves, errors and the Undo last', (await shown()).join() === 'U,E1,I3', await shown());
  check('…and the Undo kept its way back', (await L()) === '', await L());
  await ev(`(Ayni.toast('err', 'E2'), Ayni.toast('err', 'E3'), true)`);
  check('with only errors and the Undo, the oldest error goes', (await shown()).join() === 'U,E2,E3', await shown());

  /* Time on screen */
  await reset();
  await undoToast('T'); await ev(`(Ayni.toast('info', 'Plain'), Ayni.toast('err', 'Error'), true)`);
  await wait(6300);
  check('after 6 s: a plain one has gone, an error stays', (await shown()).join() === 'Error', await shown());
  check('…and the Undo has gone, final', (await L()) === 'final T', await L());
  await reset();
  await ev(`(Ayni.toast('info', 'Focused'), document.querySelector('#ayni-toasts .dismiss').focus(), true)`);
  await ev(`(Ayni.toast('info', 'Hovered'), true)`);
  const hb = await ev(`(() => { const b = [...document.querySelectorAll('#ayni-toasts .toast')].at(-1).getBoundingClientRect(); return [b.left + 20, b.top + b.height / 2]; })()`);
  await t.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: hb[0], y: hb[1] });
  await wait(6300);
  check('the time stops while the focus is inside or the pointer is on it', (await shown()).join() === 'Focused,Hovered', await shown());
  await t.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 1, y: 1 });

  /* Where */
  await reset(); await ev(`(Ayni.toast('info', 'Where'), true)`);
  const box = () => ev(`(() => { const r = document.getElementById('ayni-toasts').getBoundingClientRect(); return [Math.round(r.left), Math.round(innerWidth - r.right), Math.round(innerHeight - r.bottom), Math.round(r.width)]; })()`);
  let b = await box();
  check('wide screen: bottom right, 16 px in, 360 px wide', b[1] === 16 && b[2] === 16 && b[3] === 360, b);
  await t.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 800, deviceScaleFactor: 2, mobile: true });
  b = await box();
  check('phone: bottom centre, full width less 16 px each side', b[0] === 16 && b[1] === 16 && b[2] === 16, b);
  await ev(`(document.documentElement.style.setProperty('--toasts-lift', '64px'), true)`);
  b = await box();
  check('phone: --toasts-lift raises it above a bottom bar', b[2] === 80, b);
  await ev(`(document.documentElement.style.removeProperty('--toasts-lift'), true)`);
  await t.send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });

  /* Progress */
  await reset();
  await ev(`(window.stops = 0, window.job = Ayni.progress('Uploading 0%', { pct: 0, onStop: () => stops++ }), true)`);
  await wait(300);
  check('progress: nothing shows in the first 600 ms', !(await ev(`!!document.querySelector('.toast.progress')`)));
  await wait(450);
  check('progress: then it shows, as a progress bar', await ev(`document.querySelector('.toast.progress')?.getAttribute('role') === 'progressbar'`));
  await ev(`(job.set('Uploading 50%', 50), true)`);
  check('set(text, 50): the text, aria-valuenow and a half-full bar', await ev(`(() => { const p = document.querySelector('.toast.progress'); const f = p.querySelector('.toast-fill'), tr = p.querySelector('.toast-track'); return p.querySelector('p').textContent === 'Uploading 50%' && p.getAttribute('aria-valuenow') === '50' && Math.abs(f.getBoundingClientRect().width - tr.getBoundingClientRect().width / 2) < 2 || f.style.width === '50%'; })()`));
  await ev(`(job.set('Working…', null), true)`);
  check('set(text, null): the fill slides, no value', await ev(`document.querySelector('.toast.progress').classList.contains('sliding') && !document.querySelector('.toast.progress').hasAttribute('aria-valuenow')`));
  await ev(`(Ayni.toast('info', '1'), Ayni.toast('info', '2'), Ayni.toast('info', '3'), true)`);
  check('progress does not count towards the 3', (await shown()).join() === 'Working…,1,2,3', await shown());
  await ev(`(document.querySelector('.toast.progress .stop').click(), document.querySelector('.toast.progress .stop').click(), true)`);
  check('Stop calls onStop once', (await ev('stops')) === 1, await ev('stops'));
  await ev(`(job.end(), true)`);
  check('end() takes it away', !(await ev(`!!document.querySelector('.toast.progress')`)));
  await ev(`(window.j2 = Ayni.progress('Quick'), j2.end(), true)`);
  await wait(700);
  check('a job that ends within 600 ms never shows', !(await ev(`!!document.querySelector('.toast.progress')`)));
  check('no errors or warnings in the notifications family', t.logs.length === 0, t.logs.slice());
  await reset();

  section('Dialogs family (base + buttons + notifications + dialogs)');
  {
    t.logs.length = 0;
    await t.send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
    await t.open(BASE + '/tests/dialogs-only.html');
    check('a page with the dialogs family starts with no errors or warnings', t.logs.length === 0, t.logs.slice());
    const ev = (js) => t.evaluate(js);
    const wait = (ms) => ev(`new Promise((r) => setTimeout(r, ${ms}))`);
    const key = async (k, mods = 0) => {
      const code = { Escape: 27, Enter: 13 }[k] || 0;
      await t.send('Input.dispatchKeyEvent', { type: 'keyDown', key: k, code: k, windowsVirtualKeyCode: code, modifiers: mods, ...(k === 'Enter' ? { text: '\r' } : {}) });
      await t.send('Input.dispatchKeyEvent', { type: 'keyUp', key: k, code: k, windowsVirtualKeyCode: code, modifiers: mods });
      await wait(60);
    };
    const mouse = async (type, x, y) => t.send('Input.dispatchMouseEvent', { type, x, y, button: 'left', buttons: type === 'mouseReleased' ? 0 : 1, clickCount: 1 });
    const click = async (x, y) => { await mouse('mousePressed', x, y); await mouse('mouseReleased', x, y); await wait(60); };
    const clickEl = async (sel) => { const [x, y] = await ev(`(() => { const r = document.querySelector('${sel}').getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; })()`); await click(x, y); };
    const open = (id) => ev(`(document.getElementById('${id}').showModal(), new Promise((r) => setTimeout(() => r(true), 30)))`);
    const isOpen = (id) => ev(`document.getElementById('${id}').open`);
    const focused = () => ev(`document.activeElement.id || document.activeElement.tagName`);
    const closeAll = () => ev(`(document.querySelectorAll('dialog[open]').forEach((d) => d.close()), document.querySelectorAll('body > dialog.panel:not([id])').forEach((d) => d.remove()), L.length = 0, true)`);
    const built = (sel = '') => `document.querySelector('body > dialog.panel:not([id])[open] ${sel}')`;
    const SMALL = { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false };
    const size = (w, h = 900) => t.send('Emulation.setDeviceMetricsOverride', { ...SMALL, width: w, height: h });

    /* Opening and the first field */
    await clickEl('#opener'); await wait(60);
    check('data-open-dialog opens the dialog as modal', await ev(`document.getElementById('d-form').matches(':modal')`));
    check('the caret starts in the first field (the title row switch is skipped)', (await focused()) === 'form-name', await focused());
    check('…after the text it holds', await ev(`(() => { const i = document.getElementById('form-name'); return i.selectionStart === i.value.length && i.selectionEnd === i.value.length; })()`));
    await closeAll();
    await open('d-msg');
    check('a dialog with no field takes the focus itself, not a button', (await focused()) === 'd-msg', await focused());
    await closeAll();
    await open('d-auto');
    check('an element marked autofocus keeps the focus', (await focused()) === 'auto-2', await focused());
    await closeAll();
    await ev(`(document.getElementById('d-form').showModal(), document.getElementById('form-note').focus(), true)`); await wait(30);
    check('a focus the page set right after opening is kept', (await focused()) === 'form-note', await focused());
    await closeAll();
    await open('d-late');
    await ev(`(setTimeout(() => { document.getElementById('late-body').innerHTML = '<input class="input" id="late-in" aria-label="Late">'; }, 200), true)`); await wait(320);
    check('a field that comes after loading takes the focus when it shows up', (await focused()) === 'late-in', await focused());
    await closeAll();

    /* Closing */
    await open('d-form');
    await key('Escape');
    check('Esc presses the dialog\'s Close button (the page\'s handler runs) and closes it', (await ev('L.join()')) === 'form x' && !(await isOpen('d-form')), await ev('L.join()'));
    await closeAll(); await open('d-msg');
    await clickEl('#msg-x'); await wait(30);
    check('a click on Close closes the dialog', !(await isOpen('d-msg')));
    await open('d-msg');
    await ev(`(document.getElementById('msg-x').addEventListener('click', (e) => e.preventDefault(), { once: true }), true)`);
    await clickEl('#msg-x'); await wait(30);
    check('…unless its handler calls preventDefault()', await isOpen('d-msg'));
    await closeAll(); await open('d-msg');
    await ev(`(document.getElementById('msg-x').addEventListener('click', () => { const d = document.getElementById('d-msg'); d.close(); d.showModal(); }, { once: true }), true)`);
    await clickEl('#msg-x'); await wait(60);
    check('…and a page that closed it and opened it again keeps it open', await isOpen('d-msg'));
    await closeAll(); await open('d-bare');
    await key('Escape');
    check('Esc closes a dialog that has no Close button', !(await isOpen('d-bare')));
    await open('d-form'); await ev(`(document.getElementById('handled').focus(), true)`);
    await key('Escape');
    check('an Esc the page handled does not close the dialog', await isOpen('d-form'));
    await ev(`(document.getElementById('form-name').focus(), document.getElementById('form-pop').showPopover(), true)`); await wait(30);
    await key('Escape');
    check('an open popup takes the Esc first; the dialog stays', (await isOpen('d-form')) && !(await ev(`document.getElementById('form-pop').matches(':popover-open')`)));
    await open('d-msg');
    await key('Escape');
    check('nested: Esc closes only the innermost dialog', !(await isOpen('d-msg')) && (await isOpen('d-form')));
    await click(10, 10);
    check('a click on the dimmed page does not close the dialog', await isOpen('d-form'));
    await closeAll();

    /* Enter */
    await open('d-form');
    await key('Enter');
    check('Enter in a field runs the default button', (await ev('L.join()')) === 'form ok', await ev('L.join()'));
    await ev(`(L.length = 0, document.getElementById('form-note').focus(), true)`);
    await key('Enter');
    check('Enter in a text area does not', (await ev('L.join()')) === '');
    await closeAll();

    /* Built in code */
    await ev(`(window.R = 'pending', Ayni.confirm({ title: 'Go on?', body: 'a\\nb' }).then((v) => R = v), true)`); await wait(60);
    check('confirm: the text keeps its line break', await ev(`getComputedStyle(${built('.body > p.text')}).whiteSpace === 'pre-wrap'`));
    check('confirm: Cancel (data-close) then the default ✓ in the bottom row', await ev(`[...${built('footer')}.children].map((b) => (b.hasAttribute('data-close') ? 'x' : b.className)).join() === 'x,btn primary'`));
    await key('Enter');
    check('confirm: Enter answers true and the dialog leaves the page', (await ev('R')) === true && !(await ev(`!!document.querySelector('body > dialog.panel:not([id])')`)), await ev('R'));
    await ev(`(R = 'pending', Ayni.confirm({ title: 'Delete?', danger: true }).then((v) => R = v), true)`); await wait(60);
    check('confirm, danger: the focus starts on Cancel; Delete is no default', await ev(`document.activeElement.hasAttribute('data-close') && !${built('.btn.primary')}`));
    await key('Escape');
    check('confirm: Esc answers false', (await ev('R')) === false, await ev('R'));
    await ev(`(R = 'pending', Ayni.confirm({ title: 'Save?', other: 'Don\\'t save', otherIcon: 'trash' }).then((v) => R = v), true)`); await wait(60);
    await ev(`(${built('footer')}.children[1].click(), true)`); await wait(30);
    check('confirm: the third choice answers \'other\'', (await ev('R')) === 'other', await ev('R'));
    await ev(`(R = 'pending', Ayni.alert({ title: 'Done', body: 'Saved.' }).then(() => R = 'closed'), true)`); await wait(60);
    check('alert: a lone Close in the title row, no bottom row', await ev(`!!${built('> header > [data-close]')} && !${built('> footer')}`));
    await key('Escape');
    check('alert: Esc closes it', (await ev('R')) === 'closed');
    await ev(`(R = 'pending', Ayni.ask({ title: 'Rename', label: 'Name', value: 'old', check: (v) => (v === 'bad' ? false : v.toUpperCase()) }).then((v) => R = v), true)`); await wait(60);
    check('ask: the field starts focused with its text selected', await ev(`(() => { const i = document.activeElement; return i.tagName === 'INPUT' && i.selectionStart === 0 && i.selectionEnd === 3; })()`));
    check('ask: the label names the field', await ev(`document.activeElement.labels[0].textContent === 'Name'`));
    await ev(`(document.activeElement.value = '', document.activeElement.dispatchEvent(new Event('input')), true)`);
    check('ask: Accept is faded while the field is empty, and says why', await ev(`${built('.btn.primary')}.getAttribute('aria-disabled') === 'true' && ${built('.btn.primary')}.dataset.tip === 'OK: type something first'`), await ev(`${built('.btn.primary')}.dataset.tip`));
    await key('Enter');
    check('ask: Enter on an empty field does nothing', (await ev('R')) === 'pending');
    await t.send('Input.insertText', { text: 'bad' });
    await key('Enter');
    check('ask: check() false keeps it open, with the text selected', (await ev('R')) === 'pending' && await ev(`document.activeElement.selectionEnd - document.activeElement.selectionStart === 3`));
    await t.send('Input.insertText', { text: 'good' });
    check('ask: Accept is on once there is text', await ev(`${built('.btn.primary')}.getAttribute('aria-disabled') === 'false' && ${built('.btn.primary')}.dataset.tip === 'OK'`));
    await key('Enter');
    check('ask: Enter answers what check() returns', (await ev('R')) === 'GOOD', await ev('R'));
    await ev(`(R = 'pending', Ayni.ask({ title: 'x' }).then((v) => R = v), true)`); await wait(60);
    await key('Escape');
    check('ask: Esc answers null', (await ev('R')) === null);
    check('dialogButton: roles, icons and names', await ev(`(() => {
      const x = Ayni.dialogButton('close', 'Cancel'), p = Ayni.dialogButton('primary', 'Save'), d = Ayni.dialogButton('danger', 'Delete'), o = Ayni.dialogButton('', 'Copy', 'copy');
      return x.hasAttribute('data-close') && x.className === 'btn' && p.className === 'btn primary' && d.className === 'btn danger' && o.className === 'btn'
        && x.querySelector('[data-icon="close"]') && p.querySelector('[data-icon="check"]') && d.querySelector('[data-icon="trash"]') && o.querySelector('[data-icon="copy"]')
        && p.getAttribute('aria-label') === 'Save' && p.dataset.tip === 'Save' && x.type === 'button'; })()`));

    /* autoSave */
    await ev(`(() => { window.S = []; window.fail = false;
      const b = document.createElement('div'); b.id = 'as'; b.innerHTML = '<input type="checkbox" id="as-box"><input id="as-text"><p id="as-msg" hidden></p>'; document.body.append(b);
      window.box = Ayni.autoSave(document.getElementById('as-box'), (v) => (S.push('box ' + v), fail ? Promise.reject() : Promise.resolve()), { msg: document.getElementById('as-msg') });
      Ayni.autoSave(document.getElementById('as-text'), (v) => (S.push('text ' + v), Promise.resolve()), { wait: 200 });
      return true; })()`);
    await ev(`(document.getElementById('as-box').click(), true)`); await wait(30);
    check('autoSave: a switch saves on change', (await ev('S.join()')) === 'box true', await ev('S.join()'));
    await ev(`(fail = true, document.getElementById('as-box').click(), true)`); await wait(30);
    check('autoSave: a failed save puts the value back and says so', await ev(`document.getElementById('as-box').checked === true && !document.getElementById('as-msg').hidden && document.getElementById('as-msg').textContent === 'Could not save.'`));
    await ev(`(() => { const i = document.getElementById('as-text'); i.value = 'a'; i.dispatchEvent(new Event('input')); i.value = 'ab'; i.dispatchEvent(new Event('input')); return true; })()`);
    await wait(80);
    check('autoSave: typing waits', !(await ev(`S.some((x) => x.startsWith('text'))`)));
    await wait(250);
    check('autoSave: …then saves once, the last text', (await ev(`S.filter((x) => x.startsWith('text')).join()`)) === 'text ab', await ev('S.join()'));
    await ev(`(document.getElementById('as').remove(), true)`);

    /* Size and look */
    const box = (id) => ev(`(() => { const d = document.getElementById('${id}'); d.showModal(); const r = d.getBoundingClientRect(); const h = getComputedStyle(d.querySelector('header')).backgroundColor; d.close(); return { w: Math.round(r.width), h: Math.round(r.height), head: h }; })()`);
    let b = await box('d-msg');
    check('a small dialog is as wide as its content, 300 to 460 px', b.w >= 300 && b.w < 460, b);
    check('a floating dialog\'s title row is plain', b.head === 'rgba(0, 0, 0, 0)', b);
    b = await box('d-long');
    check('a long text stops a small dialog at 460 px', b.w === 460, b);
    b = await box('d-big');
    check('a big dialog is 880 x 640 from 1024 px', b.w === 880 && b.h === 640, b);
    await size(800);
    b = await box('d-big');
    check('a big dialog fills the screen below 1024 px, its title row a strip', b.w >= 780 && b.h === 900 && b.head !== 'rgba(0, 0, 0, 0)', b);
    b = await box('d-msg');
    check('a small dialog still floats below 1024 px', b.w < 460, b);
    await size(390, 700);
    b = await box('d-msg');
    check('on a phone a small dialog floats, the width less the margins at most', b.w <= 358 && b.h < 700, b);
    check('on a phone a line marks the bottom row', await ev(`(() => { const d = document.getElementById('d-form'); d.showModal(); const w = getComputedStyle(d.querySelector('footer')).borderTopWidth; d.close(); return w === '1px'; })()`));
    await size(1280);

    /* Moving */
    const head = async (id) => ev(`(() => { const r = document.querySelector('#${id} h2').getBoundingClientRect(); return [r.left + 4, r.top + r.height / 2]; })()`);
    const left = (id) => ev(`Math.round(document.getElementById('${id}').getBoundingClientRect().left)`);
    const dragFrom = async ([x, y], dx, dy) => { await mouse('mousePressed', x, y); for (let i = 1; i <= 5; i++) await mouse('mouseMoved', x + dx * i / 5, y + dy * i / 5); await mouse('mouseReleased', x + dx, y + dy); await wait(30); };
    await open('d-msg');
    let l0 = await left('d-msg');
    await dragFrom(await head('d-msg'), 100, 40);
    check('a floating dialog moves by its title row', (await left('d-msg')) - l0 === 100, (await left('d-msg')) - l0);
    l0 = await left('d-msg');
    await dragFrom(await ev(`(() => { const r = document.getElementById('msg-p').getBoundingClientRect(); return [r.left + 4, r.top + 4]; })()`), 80, 0);
    check('…not by its body', (await left('d-msg')) === l0);
    await dragFrom(await head('d-msg'), -3000, 0);
    check('…and stays inside the window', (await left('d-msg')) === 8, await left('d-msg'));
    await closeAll(); await open('d-msg');
    check('it opens centred again', Math.abs((await ev(`(() => { const r = document.getElementById('d-msg').getBoundingClientRect(); return r.left + r.width / 2 - document.documentElement.clientWidth / 2; })()`))) < 2);
    await closeAll();
    await size(600, 800); await open('d-msg');
    l0 = await left('d-msg');
    await dragFrom(await head('d-msg'), 60, 0);
    check('on a phone a dialog does not move', (await left('d-msg')) === l0);
    await closeAll(); await size(1280);

    /* What stays above a dialog */
    await ev(`(window.lifts = 0, Ayni.toast('info', 'News', { persist: true }), document.getElementById('ayni-toasts').addEventListener('toggle', (e) => { if (e.newState === 'open') lifts++; }), true)`); await wait(60);
    await open('d-msg'); await wait(60);
    check('the notifications are shown again over a dialog opened after them', (await ev('lifts')) >= 1 && await ev(`document.getElementById('ayni-toasts').matches(':popover-open')`), await ev('lifts'));
    await closeAll();
    await ev(`(() => { const l = document.createElement('dialog'); l.className = 'panel lock'; l.id = 'lock'; l.style.cssText = 'width: 100vw; max-width: none; height: 100vh; max-height: none';
      l.innerHTML = '<div class="body"><input class="input" id="lock-pw" aria-label="Password"></div>'; document.body.append(l); window.lockCloses = 0; l.addEventListener('close', () => lockCloses++); l.showModal(); return true; })()`); await wait(60);
    await open('d-msg'); await wait(60);
    const hit = (x, y) => ev(`!!document.elementFromPoint(${x}, ${y})?.closest('#lock')`);
    check('a lock screen stays above a dialog opened later', await hit(640, 450));
    await ev(`(Ayni.toast('info', 'While locked', { persist: true }), true)`); await wait(80);
    const tb = await ev(`(() => { const r = [...document.querySelectorAll('#ayni-toasts .toast')].at(-1).getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; })()`);
    check('…and above a notification shown while locked', await hit(tb[0], tb[1]));
    await wait(60);
    check('…and the page never hears those re-shows as a close', (await ev('lockCloses')) === 0, await ev('lockCloses'));
    await ev(`(document.getElementById('lock').close(), document.getElementById('lock').remove(), Ayni.settleUndo(), document.querySelectorAll('#ayni-toasts > .toast').forEach((x) => x.remove()), true)`);
    await closeAll();

    /* Modeless */
    await ev(`(document.getElementById('d-modeless').show(), true)`); await wait(30);
    check('a modeless dialog opens with the caret in its field', (await focused()) === 'modeless-q');
    await key('Escape');
    check('Esc closes a modeless dialog too', !(await isOpen('d-modeless')));
    check('no errors or warnings in the dialogs family', t.logs.length === 0, t.logs.slice());
  }

  section('Menus family (base + buttons + notifications + dialogs + menus)');
  {
    t.logs.length = 0;
    await t.send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
    await t.open(BASE + '/tests/menus-only.html');
    check('a page with the menus family starts with no errors or warnings', t.logs.length === 0, t.logs.slice());
    const ev = (js) => t.evaluate(js);
    const wait = (ms) => ev(`new Promise((r) => setTimeout(r, ${ms}))`);
    const KEYS = { Escape: 27, Enter: 13, Tab: 9, ArrowDown: 40, ArrowUp: 38, ArrowRight: 39, ArrowLeft: 37, Home: 36, End: 35, F10: 121 };
    const key = async (k, mods = 0) => {
      await t.send('Input.dispatchKeyEvent', { type: 'keyDown', key: k, code: k, windowsVirtualKeyCode: KEYS[k] || 0, modifiers: mods, ...(k === 'Enter' ? { text: '\r' } : {}) });
      await t.send('Input.dispatchKeyEvent', { type: 'keyUp', key: k, code: k, windowsVirtualKeyCode: KEYS[k] || 0, modifiers: mods });
      await wait(60);
    };
    const mouse = (type, x, y, button = 'left') => t.send('Input.dispatchMouseEvent', { type, x, y, button: type === 'mouseMoved' ? 'none' : button,
      buttons: type === 'mousePressed' ? (button === 'right' ? 2 : 1) : 0, clickCount: 1 });
    const mid = (sel) => ev(`(() => { const r = document.querySelector(${JSON.stringify(sel)}).getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; })()`);
    const click = async (sel, button = 'left') => { const [x, y] = await mid(sel); await mouse('mouseMoved', x, y); await mouse('mousePressed', x, y, button); await mouse('mouseReleased', x, y, button); await wait(80); };
    const hover = async (sel) => { const [x, y] = await mid(sel); await mouse('mouseMoved', x, y); await wait(120); };
    const isOpen = (id) => ev(`document.getElementById('${id}').matches(':popover-open')`);
    const focused = () => ev(`document.activeElement.id || document.activeElement.dataset.act || document.activeElement.tagName`);
    const log = () => ev(`L.join()`);
    const reset = () => ev(`(document.querySelectorAll(':popover-open').forEach((p) => p.id !== 'ayni-toasts' && p.hidePopover()), document.querySelectorAll('dialog[open]').forEach((d) => d.close()), L.length = 0, document.getElementById('fld').focus(), true)`);
    const color = (v) => ev(`(() => { const p = document.createElement('i'); p.style.color = 'var(${v})'; document.body.append(p); const c = getComputedStyle(p).color; p.remove(); return c; })()`);
    await reset();

    /* A menu in the page: opening with the mouse leaves the focus alone */
    check('a submenu moves inside its menu', (await ev(`document.getElementById('ms').parentElement.id`)) === 'mm');
    check('its item says it opens a menu', (await ev(`document.querySelector('#mm [data-act="more"]').getAttribute('aria-haspopup')`)) === 'menu');
    await click('#mb');
    check('a click on the button opens the menu', await isOpen('mm'));
    check('…and the focus stays in the field', (await focused()) === 'fld', await focused());
    check('every row gets the tick column (the menu has check items)', await ev(`[...document.querySelectorAll('#mm > [role^="menuitem"]')].every((b) => b.firstElementChild.classList.contains('tick'))`));
    check('a row without an icon keeps an empty slot after its tick', await ev(`!!document.querySelector('#mm [data-act="chk"] > .tick + .icon.none')`));
    check('the tick shows only on checked rows', (await ev(`[...document.querySelectorAll('#mm .tick')].filter((x) => getComputedStyle(x).visibility === 'visible').length`)) === 1);
    check('the submenu row shows its arrow', (await ev(`getComputedStyle(document.querySelector('#mm [data-act="more"]'), '::after').content`)) === '"›"');
    check('a disabled row still takes the pointer, so its tooltip says why', (await ev(`getComputedStyle(document.querySelector('#mm [data-act="nope"]')).pointerEvents`)) !== 'none');
    check('rows are compact with a mouse', (await ev(`document.querySelector('#mm [data-act="a"]').getBoundingClientRect().height`)) < 40);
    await hover('#mm [data-act="a"]');
    const bg = await ev(`getComputedStyle(document.querySelector('#mm [data-act="a"]')).backgroundColor`), acc = await color('--accent');
    check('hover is a grey tint, never Accent', bg !== 'rgba(0, 0, 0, 0)' && !bg.includes(acc.slice(4, -1)), bg);
    await click('#mm [data-act="nope"]');
    check('a click on a disabled row does nothing', (await isOpen('mm')) && (await log()) === '');
    await click('#mm [data-act="chk"]');
    check('a check item flips and reports', (await ev(`document.querySelector('#mm [data-act="chk"]').getAttribute('aria-checked')`)) === 'true' && (await log()) === 'action chk @Main menu', await log());
    check('…and the menu closes; the focus is still in the field', !(await isOpen('mm')) && (await focused()) === 'fld');
    await ev('(L.length = 0, true)');
    await click('#mb'); await click('#mm [data-act="r2"]');
    check('a radio item moves the choice and fires ayni:choose', (await ev(`[...document.querySelectorAll('#mm [role="menuitemradio"]')].map((b) => b.getAttribute('aria-checked')).join()`)) === 'false,true' && (await log()).startsWith('choose r2'), await log());
    await reset();

    /* Submenus */
    await click('#mb'); await hover('#mm [data-act="more"]');
    check('resting on a submenu item opens it; its menu stays open', (await isOpen('ms')) && (await isOpen('mm')));
    check('the submenu sits at the right of its row', await ev(`document.getElementById('ms').getBoundingClientRect().left >= document.querySelector('#mm [data-act="more"]').getBoundingClientRect().right - 4`));
    check('its row says it is expanded', (await ev(`document.querySelector('#mm [data-act="more"]').getAttribute('aria-expanded')`)) === 'true');
    await hover('#mm [data-act="a"]');
    check('resting on another item closes it', !(await isOpen('ms')) && (await isOpen('mm')));
    await click('#mm [data-act="more"]');
    check('a click on the item opens it too', await isOpen('ms'));
    await click('#ms [data-act="s2"]');
    check('a pick in the submenu reports once, with the submenu\'s name', (await log()) === 'action s2 @Sub menu', await log());
    check('…and both close', !(await isOpen('mm')) && !(await isOpen('ms')));
    await reset();

    /* The keyboard */
    await ev(`document.getElementById('mb').focus(), true`); await key('Enter'); await wait(60);
    check('opened from the keyboard, the first item takes the focus', (await focused()) === 'a', await focused());
    await key('ArrowDown'); await key('ArrowDown'); await key('ArrowDown'); await key('ArrowDown');
    check('the arrows skip a disabled item', (await focused()) === 'more', await focused());
    await key('ArrowRight'); await wait(60);
    check('Right opens the submenu, its first item focused', (await isOpen('ms')) && (await focused()) === 's1');
    await key('ArrowLeft'); await wait(60);
    check('Left closes it, the focus back on its item', !(await isOpen('ms')) && (await focused()) === 'more');
    await key('ArrowRight'); await key('Escape'); await wait(60);
    check('Esc closes only the submenu', !(await isOpen('ms')) && (await isOpen('mm')));
    await key('Home');
    check('Home goes to the first item', (await focused()) === 'a');
    await key('ArrowUp');
    check('Up from the first wraps to the last', (await focused()) === 'more');
    await key('Tab'); await wait(60);
    check('Tab closes the menu; the focus goes back to its button', !(await isOpen('mm')) && (await focused()) === 'mb', await focused());
    await reset();
    await click('#mb'); await key('ArrowDown');
    check('Down moves into a menu the mouse opened', (await focused()) === 'a', await focused());
    await reset();

    /* The menu bar */
    await key('F10');
    check('F10 focuses the menu bar', (await ev(`document.activeElement.textContent`)) === 'File');
    await key('ArrowRight');
    check('Right moves along the bar', (await ev(`document.activeElement.textContent`)) === 'View');
    await key('ArrowDown'); await wait(60);
    check('Down opens its menu, first item focused', (await isOpen('m-view')) && (await focused()) === 'zoom');
    await key('ArrowLeft'); await wait(60);
    check('Left switches to the menu before it', (await isOpen('m-file')) && !(await isOpen('m-view')));
    await reset();
    await click('#bar [popovertarget="m-file"]');
    check('a click on the bar opens a menu; the focus stays in the field', (await isOpen('m-file')) && (await focused()) === 'fld');
    await hover('#bar [popovertarget="m-view"]');
    check('moving along the bar switches the open menu', (await isOpen('m-view')) && !(await isOpen('m-file')));
    await reset();

    /* Menus built in code */
    await ev(`(window.closes = 0, Ayni.menuAt(items(), { anchor: document.getElementById('anc'), onClose: () => closes++ }), true)`); await wait(60);
    const rows = await ev(`[...document.querySelectorAll('#ayni-menu > *')].map((e) => e.getAttribute('role') || e.className).join()`);
    check('Ayni.menuAt builds rows, separators and captions, and drops a separator at the end', rows === 'menuitem,separator,caption,menuitemcheckbox,menuitem,menuitem,menuitem,menu', rows);
    check('…the shortcut, in words', (await ev(`document.querySelector('#ayni-menu kbd').textContent`)) === 'Ctrl+X');
    check('…a disabled row with its why as tooltip', (await ev(`(() => { const b = document.querySelector('#ayni-menu [data-act="off"]'); return b.getAttribute('aria-disabled') + '|' + b.dataset.tip; })()`)) === 'true|Off: not now');
    check('…a danger row in the Danger colour', (await ev(`getComputedStyle(document.querySelector('#ayni-menu [data-act="del"]')).color`)) === (await color('--danger')));
    check('…the button says its menu is open', (await ev(`document.getElementById('anc').getAttribute('aria-expanded')`)) === 'true');
    check('…and the focus stays in the field', (await focused()) === 'fld');
    await click('#ayni-menu [data-act="font"]');
    check('a submenu from a function, filled when it opens', (await ev(`[...document.querySelectorAll('#ayni-menu-sub [role^="menuitem"]')].map((b) => b.textContent).join()`)) === 'Serif,Sans');
    await click('#ayni-menu-sub [data-act="sans"]'); await wait(60);
    check('an item runs after the menu has closed', (await log()).endsWith('sans') && !(await isOpen('ayni-menu')), await log());
    check('…onClose ran and the button says closed', (await ev(`closes + '|' + document.getElementById('anc').getAttribute('aria-expanded')`)) === '1|false');
    await reset();
    const [fx, fy] = await mid('#fld');
    await mouse('mouseMoved', fx, fy); await mouse('mousePressed', fx, fy);
    await ev(`(Ayni.menuAt(items(), { x: 300, y: 200 }), true)`); await wait(60);
    check('opened while a button is down (a right-click on Linux), it waits for the release', !(await isOpen('ayni-menu')));
    await mouse('mouseReleased', fx, fy); await wait(80);
    check('…and shows once it is lifted, and stays', await isOpen('ayni-menu'));
    await reset();
    await ev(`(() => { document.body.insertAdjacentHTML('beforeend', '<button class="btn" id="fm-b" popovertarget="fm" data-tip="Filled">F</button><div class="panel menu" popover id="fm" role="menu" aria-label="Filled"></div>');
      const m = document.getElementById('fm'); m.addEventListener('beforetoggle', (e) => { if (e.newState === 'open') Ayni.fillMenu(m, items()); }); return true; })()`);
    await click('#fm-b');
    check('Ayni.fillMenu fills a page menu as it opens, with its own submenu', (await isOpen('fm')) && await ev(`!!document.querySelector('#fm [data-act="font"][data-submenu="fm-sub"]') && document.getElementById('fm-sub').parentElement.id === 'fm'`));
    await click('#fm [data-act="font"]'); await click('#fm-sub [data-act="serif"]'); await wait(60);
    check('…its rows run after it has closed, and keep their place', (await log()).endsWith('serif') && !(await isOpen('fm')) && await ev(`document.querySelector('#fm-sub [data-act="serif"]').ayniRect?.width > 0`), await log());
    await reset();
    await ev(`(document.getElementById('bar').insertAdjacentHTML('beforeend', '<button popovertarget="m-file" aria-haspopup="menu" aria-expanded="false" id="bar-x">Extra</button>'), true)`); await wait(30);
    await key('F10'); await key('End');
    check('a menu bar built again: the keys see its new items', (await focused()) === 'bar-x');
    await ev(`(document.getElementById('bar-x').remove(), true)`); await reset();
    await ev(`(Ayni.menuAt(items(), { x: 300, y: 200 }), true)`); await wait(60);
    check('Ayni.menuAt at a point', (await ev(`(() => { const r = document.getElementById('ayni-menu').getBoundingClientRect(); return Math.round(r.left) + ',' + Math.round(r.top); })()`)) === '300,200');
    await ev(`(dispatchEvent(new Event('blur')), true)`); await wait(60);
    check('the window losing the focus closes it', !(await isOpen('ayni-menu')));
    await ev(`(Ayni.menuAt(items(), { x: 300, y: 200 }), true)`); await wait(400);
    await ev(`scrollBy(0, 40)`); await wait(100);
    check('a page scroll closes it', !(await isOpen('ayni-menu')));
    await ev(`scrollTo(0, 0)`); await reset();
    await ev(`(() => { const b = document.getElementById('anc'); b.style.cssText = 'position: fixed; right: 20px; top: 20px'; return true; })()`);
    await ev(`(Ayni.menuAt(items(), { anchor: document.getElementById('anc') }), true)`); await wait(60);
    check('under a button in the right half, the menu ends where the button ends', await ev(`Math.abs(document.getElementById('ayni-menu').getBoundingClientRect().right - document.getElementById('anc').getBoundingClientRect().right) < 1.5`));
    await ev(`(document.getElementById('anc').style.cssText = '', true)`); await reset();
    check('Ayni.keyLabel', (await ev(`[Ayni.keyLabel('Ctrl+C'), Ayni.keyLabel(['Shift+Del', 'x']), Ayni.keyLabel('F2'), Ayni.keyLabel('Esc')].join('|')`)) === (await ev('Ayni.isMac')) ? '⌘C|⇧Del|F2|Esc' : 'Ctrl+C|Shift+Del|F2|Esc');
    /* setLang reloads the page: wait for the new one, however long a busy machine takes */
    const lang = async (code) => { await ev(`Ayni.i18n.setLang('${code}')`).catch(() => {}); for (let i = 0; i < 100; i++) { await new Promise((r) => setTimeout(r, 50)); if (await ev(`window.Ayni?.keyLabel && document.documentElement.lang === '${code}' ? Ayni.ready.then(() => true) : false`).catch(() => false)) return; } };
    await lang('de');
    check('…in the page\'s language', (await ev(`Ayni.keyLabel('Ctrl+Del')`)) === (await ev('Ayni.isMac') ? '⌘Entf' : 'Strg+Entf'), await ev(`Ayni.keyLabel('Ctrl+Del')`));
    await lang('en');

    /* Pop-up menu and long tap */
    await click('#ctx', 'right'); await wait(60);
    check('a right-click opens the pop-up menu at the pointer', (await isOpen('mctx')) && await ev(`(() => { const m = document.getElementById('mctx').getBoundingClientRect(), a = document.getElementById('ctx').getBoundingClientRect(); return Math.abs(m.left - (a.left + a.width / 2)) < 2; })()`));
    await click('#mctx [data-act="copy"]');
    check('…and names the thing it was opened on', (await log()) === 'action copy @Area', await log());
    await reset();
    await ev(`document.getElementById('ctx').focus(), true`); await key('F10', 8); await wait(60);
    check('Shift+F10 opens it from the keyboard, first item focused', (await isOpen('mctx')) && (await focused()) === 'copy');
    await reset();
    await ev(`(Ayni.setTouchPreview(true), true)`);
    const [lx, ly] = await mid('#lt .row');
    await t.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: lx, y: ly }] }); await wait(250);
    check('long tap: nothing before the hold time; the ring fills', (await log()) === '' && await ev(`!!document.querySelector('.hold-ring')`));
    await wait(400);
    check('long tap: it acts while the finger is still down', (await log()) === 'hold One', await log());
    await t.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await wait(100);
    check('long tap: the click its release leaves is swallowed', (await log()) === 'hold One', await log());
    await ev('(L.length = 0, true)');
    await t.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: lx, y: ly }] }); await wait(150);
    await t.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: lx, y: ly + 30 }] }); await wait(500);
    await t.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await wait(80);
    check('long tap: moving the finger cancels it', !(await log()).includes('hold'), await log());
    await ev(`(Ayni.menuAt(items(), { x: 100, y: 100 }), true)`); await wait(60);
    check('touch: menu rows are 44 px high and hide their shortcuts', await ev(`document.querySelector('#ayni-menu [data-act="cut"]').getBoundingClientRect().height >= 44 && getComputedStyle(document.querySelector('#ayni-menu kbd')).display === 'none'`));
    await reset();
    await t.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 800, deviceScaleFactor: 1, mobile: false });
    await ev(`(Ayni.menuAt(items(), { anchor: document.getElementById('anc') }), true)`); await wait(60);
    await click('#ayni-menu [data-act="font"]');
    check('on a phone a submenu opens below its item, which stays in sight', await ev(`(() => { const s = document.getElementById('ayni-menu-sub').getBoundingClientRect(), r = document.querySelector('#ayni-menu [data-act="font"]').getBoundingClientRect(); return s.top >= r.bottom - 1 && s.right <= innerWidth; })()`));
    await reset(); await ev(`(Ayni.setTouchPreview(false), true)`);
    await t.send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });

    /* Tool group and popup with controls */
    check('a tool group button is off while its toggle is off', (await ev(`document.getElementById('gb').getAttribute('aria-pressed')`)) === 'false');
    await ev(`(document.getElementById('w1').setAttribute('aria-pressed', 'true'), true)`); await wait(30);
    check('…and lights up when the toggle inside is on (data-lit-by)', (await ev(`document.getElementById('gb').getAttribute('aria-pressed')`)) === 'true');
    await click('#gb');
    check('the tool group opens; the focus stays in the field', (await isOpen('gp')) && (await focused()) === 'fld');
    check('…its button says it is expanded', (await ev(`document.getElementById('gb').getAttribute('aria-expanded')`)) === 'true');
    await click('#w2');
    check('a tool press closes the group; the focus is still in the field', !(await isOpen('gp')) && (await focused()) === 'fld');
    await click('#cb');
    check('a popup with controls puts the focus in its first control', (await isOpen('cp')) && (await focused()) === 'cp-in');
    await key('Escape');
    check('Esc closes it, the focus back on its button', !(await isOpen('cp')) && (await focused()) === 'cb');
    await reset();

    /* Toolbars */
    check('every toolbar is one Tab stop (a field inside keeps its own)', (await ev(`[...document.querySelectorAll('#rt button')].map((b) => b.tabIndex).join()`)) === '0,-1,-1,0');
    await ev(`(document.querySelector('#rt .tb-group').insertAdjacentHTML('beforeend', '<button class="btn" id="r0">0</button>'), true)`); await wait(30);
    check('a tool added later is not a Tab stop', (await ev(`document.getElementById('r0').tabIndex`)) === -1);
    await ev(`(document.getElementById('r1').hidden = true, true)`); await wait(30);
    check('the Tab stop moves off a hidden tool', (await ev(`document.getElementById('r2').tabIndex`)) === 0);
    await ev(`(document.getElementById('r2').focus(), true)`); await key('ArrowRight');
    check('Right moves to the next tool, which becomes the Tab stop', (await focused()) === 'r0' && (await ev(`document.getElementById('r2').tabIndex`)) === -1);
    await key('End');
    check('End goes to the last tool, past the field', (await focused()) === 'r3');
    await ev(`(document.getElementById('r1').hidden = false, document.getElementById('r0').remove(), true)`);
    check('a line is drawn between two groups', (await ev(`getComputedStyle(document.querySelector('#rt .tb-group:last-child'), '::before').width`)) === '1px');
    check('a toolbar on its own is a strip; in a title row it sits plain', (await ev(`getComputedStyle(document.getElementById('rt')).borderTopStyle`)) !== 'none'
      && (await ev(`getComputedStyle(document.querySelector('#hd [role="toolbar"]')).borderTopStyle`)) === 'none');

    /* A title row that fits */
    check('a wide title row: every tool shows; More only for the app\'s own items', (await ev(`document.querySelectorAll('#hd .fit-out').length + '|' + !fb.button.hidden`)) === '0|true');
    check('More is made at the start of the system group', await ev(`fb.button.parentElement.matches('.tb-group.tb-sys') && fb.button === fb.button.parentElement.firstElementChild`));
    /* Narrow the row until Alpha (rank 22) has left */
    await ev(`new Promise((r) => { const h = document.getElementById('hd'); let w = 700; const step = () => { if (document.getElementById('h-a').classList.contains('fit-out') || w < 200) return r(w); h.style.width = (w -= 10) + 'px'; requestAnimationFrame(() => requestAnimationFrame(step)); }; step(); })`); await wait(100);
    const outs = await ev(`[...document.querySelectorAll('#hd .fit-out')].map((e) => e.id).join()`);
    check('a narrow row: the highest ranks leave first; search stays', outs === 'h-a,h-b,h-c', outs);
    const its = await ev(`fb.items().map((i) => i.sep ? '-' : i.label + (i.checked ? '*' : '')).join()`);
    check('More lists them in toolbar order (a toggle as a check item), then the app\'s own', its === 'Alpha,Beta,Gamma*,-,Own item', its);
    await click('#hd .fit-more');
    check('More opens its menu', await isOpen('ayni-menu'));
    await click('#hd .fit-more'); await wait(60);
    check('a second press on More closes it (it does not open again)', !(await isOpen('ayni-menu')));
    await click('#hd .fit-more'); await click('#ayni-menu [data-act="h-a"]'); await wait(60);
    check('a tool run from More comes back to the row while in use', !(await ev(`document.getElementById('h-a').classList.contains('fit-out')`)));
    await click('#fld'); await wait(80);
    check('…and leaves again on the next press elsewhere', await ev(`document.getElementById('h-a').classList.contains('fit-out')`));
    await ev(`(document.getElementById('hd').style.width = '230px', document.getElementById('hd').classList.add('has-selection'), true)`); await wait(150);
    check('while picking, search may leave too', await ev(`document.getElementById('h-search').classList.contains('fit-out')`));
    await ev(`(document.getElementById('hd').style.width = '700px', document.getElementById('hd').classList.remove('has-selection'), true)`); await wait(150);
    check('a wide row again: all come back', (await ev(`document.querySelectorAll('#hd .fit-out').length`)) === 0);
    await reset();

    /* Above dialogs */
    await click('#open-dlg'); await click('#dlg-menu');
    check('a menu opened from inside a modal dialog shows above it', (await isOpen('ayni-menu')) && await ev(`(() => { const r = document.querySelector('#ayni-menu [data-act="cut"]').getBoundingClientRect(); return document.elementFromPoint(r.left + 20, r.top + r.height / 2)?.closest('[data-act]')?.dataset.act === 'cut'; })()`));
    await click('#ayni-menu [data-act="cut"]'); await wait(60);
    check('…and its items can be picked; the dialog stays open', (await log()).endsWith('cut') && await ev(`document.getElementById('dlg').open`), await log());
    await reset();
    check('…and back in the page once no dialog is open', await ev(`(Ayni.menuAt(items(), { x: 100, y: 100 }), document.getElementById('ayni-menu').parentElement === document.body)`));
    await reset();
    await click('#mb');
    await ev(`(() => { const l = document.createElement('dialog'); l.className = 'panel lock'; l.id = 'lock'; l.innerHTML = '<div class="body">Locked</div>'; document.body.append(l); l.showModal(); return true; })()`); await wait(60);
    check('an open menu closes when a lock screen shows', !(await isOpen('mm')));
    await ev(`(document.getElementById('lock').close(), document.getElementById('lock').remove(), true)`); await reset();
    check('no untranslated keys in the menus family', (await ev(RAW_KEYS)).length === 0, await ev(RAW_KEYS));
    check('no errors or warnings in the menus family', t.logs.length === 0, t.logs.slice());
  }

  section('Menu bar from a list');
  {
    t.logs.length = 0;
    await t.open(BASE + '/tests/menus-only.html');
    const ev = (js) => t.evaluate(js), wait = (ms) => ev(`new Promise((r) => setTimeout(r, ${ms}))`);
    await ev(`(document.body.insertAdjacentHTML('afterbegin', '<div id="mb"></div>'), window.mbN = 0, window.mbRan = '', window.mb = Ayni.menuBar('#mb', { menus: () => [{ label: 'File', items: () => [{ id: 'n', label: 'Opened ' + (++mbN), run: () => { mbRan = 'n'; } }, { sep: true }, { id: 'o', label: 'Off', disabled: true, why: 'No' }] }, { label: 'Edit', items: [{ id: 'u', label: 'Undo', key: 'Ctrl+Z' }] }] }), true)`);
    check('menu bar: role, one button per menu, one Tab stop', await ev(`mbEl = document.getElementById('mb'), mbEl.getAttribute('role') === 'menubar' && [...mbEl.children].map((b) => b.textContent).join() === 'File,Edit' && [...mbEl.children].map((b) => b.tabIndex).join() === '0,-1'`));
    check('menu bar: each menu named by the bar', await ev(`document.getElementById('mb-0').dataset.bar === 'mb' && document.getElementById('mb-1').matches('.panel.menu[popover][role="menu"]')`));
    await ev(`(mb.openAt(0), true)`); await wait(80);
    check('openAt opens that menu, filled as it opens', await ev(`document.getElementById('mb-0').matches(':popover-open') && /Opened 1/.test(document.getElementById('mb-0').textContent) && mb.isOpen()`));
    check('…with its name from the bar', await ev(`document.getElementById('mb-0').getAttribute('aria-label') === 'File'`));
    await ev(`(mb.openAt(0), true)`); await wait(40);
    check('openAt on an open menu leaves it', await ev(`document.getElementById('mb-0').matches(':popover-open')`));
    await ev(`(mb.close(), true)`); await wait(60);
    check('close() closes it', !(await ev(`mb.isOpen()`)));
    await ev(`(mb.openAt(0), true)`); await wait(80);
    check('it is filled again, so its rows show what is true now', await ev(`/Opened 2/.test(document.getElementById('mb-0').textContent)`));
    await ev(`([...document.querySelectorAll('#mb-0 [role^="menuitem"]')][0].click(), true)`); await wait(60);
    check('a row runs', (await ev(`mbRan`)) === 'n');
    await ev(`(mb.build(), true)`); await wait(40);
    check('build() starts again, with nothing doubled', await ev(`document.querySelectorAll('#mb > button').length === 2 && document.querySelectorAll('.panel.menu[data-bar="mb"]').length === 2`));
    await ev(`(document.getElementById('mb').remove(), true)`);
    check('no errors or warnings on the menu bar', t.logs.length === 0, t.logs.slice());
  }

  section('Choosing a folder or a file');
  {
    t.logs.length = 0;
    await t.open(BASE + '/tests/lists-only.html');
    const ev = (js) => t.evaluate(js), wait = (ms) => ev(`new Promise((r) => setTimeout(r, ${ms}))`);
    const until = async (js) => { for (let i = 0; i < 60; i++) { if (await ev(js)) return true; await wait(25); } return false; };
    const P = `dialog.panel[open]`, OK = `document.querySelector('${P} footer .btn.primary')`, NO = `document.querySelector('${P} footer [data-close]')`;
    const row = (name) => `[...document.querySelectorAll('${P} .fp-tree .ti')].find((x) => x.textContent.trim().startsWith(${JSON.stringify(name)}))`;
    await ev(`(window.T = [{ id: 'f/a', name: 'a', children: [{ id: 'f/a/b', name: 'b', children: [] }] }, { id: 'f/c', name: 'c', children: [] }], window.L = [], window.ctl = null,
      window.fold = (o) => { window.got = 'waiting'; Ayni.pickFolder(Object.assign({ title: 'Pick', root: 'f', load: () => { L.push('load'); return JSON.parse(JSON.stringify(T)); },
        create: (p, n) => { L.push('create ' + p + ' ' + n); return p + '/' + n; }, rename: (id, n) => { L.push('rename ' + id + ' ' + n); return id.replace(/[^/]+$/, n); },
        remove: (id) => { L.push('remove ' + id); }, onOpen: (c) => { window.ctl = c; } }, o)).then((v) => { window.got = v; }); }, true)`);
    await ev(`(fold({ note: 'A note' }), true)`);
    check('folder: the tree loads, the note on top', await until(`!!${row('a')}`) && await ev(`document.querySelector('${P} .text').textContent === 'A note'`));
    check('folder: nothing lit: choose, delete and rename are off, new folder on', await ev(`(() => { const b = document.querySelectorAll('${P} footer .extra .btn'); return ${OK}.ariaDisabled === 'true' && b[0].ariaDisabled === 'true' && b[1].ariaDisabled === 'true' && b[2].ariaDisabled === 'false'; })()`));
    await ev(`(${row('a')}.click(), true)`); await wait(40);
    check('folder: a click lights it, and the buttons wake', await ev(`${OK}.ariaDisabled === 'false' && document.querySelector('${P} footer .extra .btn').ariaDisabled === 'false'`));
    await ev(`(document.querySelectorAll('${P} footer .extra .btn')[2].click(), true)`); await wait(40);
    check('folder: new folder turns it into the name form', await ev(`document.querySelector('${P} .field input').id !== undefined && document.activeElement === document.querySelector('${P} .field input') && ${OK}.ariaDisabled === 'true' && !document.querySelector('${P} footer .extra')`));
    await ev(`(${NO}.click(), true)`); await wait(40);
    check('folder: × drops the name, the dialog stays', await ev(`!!document.querySelector('${P}') && !document.querySelector('${P} .field')`) && (await ev(`got`)) === 'waiting');
    await ev(`(document.querySelectorAll('${P} footer .extra .btn')[2].click(), true)`); await wait(40);
    const type = (v) => ev(`(() => { const i = document.querySelector('${P} .field input'); i.value = ${JSON.stringify(v)}; i.dispatchEvent(new Event('input', { bubbles: true })); return true; })()`);
    for (const bad of ['', 'x/y', '..']) { await type(bad); check(`folder: the name "${bad}" is refused`, await ev(`${OK}.ariaDisabled === 'true'`)); }
    await ev(`(L.length = 0, true)`);
    await type('new'); await ev(`(${OK}.click(), T[0].children.push({ id: 'f/a/new', name: 'new', children: [] }), true)`);
    check('folder: created in the lit folder, the tree read again, the new one lit', await until(`L.join() === 'create f/a new,load' && !!${row('new')}`) && await ev(`${row('new')}.closest('li').getAttribute('aria-current') !== null || !!document.querySelector('${P} [aria-current]')`), await ev(`L`));
    await ev(`(document.querySelectorAll('${P} footer .extra .btn')[1].click(), true)`); await wait(40);
    check('folder: rename starts with its name, picked', await ev(`(() => { const i = document.querySelector('${P} .field input'); return i.value === 'new' && i.selectionEnd === 3; })()`));
    await ev(`(L.length = 0, ${OK}.click(), true)`); await wait(40);
    check('folder: the same name changes nothing', (await ev(`L.length`)) === 0 && !(await ev(`!!document.querySelector('${P} .field')`)));
    await ev(`(document.querySelectorAll('${P} footer .extra .btn')[1].click(), true)`); await wait(40);
    await type('old'); await ev(`(T[0].children[1] = { id: 'f/a/old', name: 'old', children: [] }, ${OK}.click(), true)`);
    check('folder: renamed, the new id stays lit', await until(`L.join() === 'rename f/a/new old,load' && !!${row('old')}`), await ev(`L`));
    await ev(`(L.length = 0, T[0].children.pop(), document.querySelector('${P} footer .extra .btn').click(), true)`);
    check('folder: delete acts at once, nothing lit after it', await until(`L.join() === 'remove f/a/old,load' && ${OK}.ariaDisabled === 'true'`), await ev(`L`));
    await ev(`(L.length = 0, ctl.task(Promise.resolve('f/c')), true)`);
    check('task(): a later job shows, then the tree is read again and its answer lit', await until(`L.join() === 'load' && ${OK}.ariaDisabled === 'false'`));
    await ev(`(ctl.task(Promise.reject(new Error('Nope'))), true)`);
    check('a job that fails says so', await until(`[...document.querySelectorAll('#ayni-toasts .toast')].some((x) => /Nope/.test(x.textContent))`));
    await ev(`(${row('c')}.click(), true)`); await wait(40); await ev(`(${OK}.click(), true)`);
    check('folder: choose answers its id, the dialog goes', await until(`got === 'f/c' && !document.querySelector('${P}')`), await ev(`got`));
    check('…and the job told after that knows', !(await ev(`ctl.isOpen()`)));
    await ev(`(fold({ rootName: 'Home' }), true)`);
    check('folder: rootName shows the root, open', await until(`!!${row('Home')} && !!${row('a')}`));
    await ev(`(${row('Home')}.click(), true)`); await wait(40);
    check('folder: the root can be chosen, never deleted', await ev(`${OK}.ariaDisabled === 'false' && document.querySelector('${P} footer .extra .btn').ariaDisabled === 'true'`));
    await ev(`(${NO}.click(), true)`);
    check('folder: cancelled, it answers null', await until(`got === null`));
    await ev(`(fold({ load: () => [] }), true)`);
    check('folder: none, says so', await until(`/no folders/.test(document.querySelector('${P} .fp-msg')?.textContent || '')`));
    await ev(`(${NO}.click(), true)`); await wait(40);
    await ev(`(fold({ load: () => { throw new Error('x'); } }), true)`);
    check('folder: unreadable, says so', await until(`/could not be loaded/.test(document.querySelector('${P} .fp-msg')?.textContent || '')`));
    await ev(`(${NO}.click(), true)`); await wait(40);
    await ev(`(window.F = { 'f': [{ id: 'f/z.txt', name: 'z.txt', size: 5 }, { id: 'f/a10.txt', name: 'a10.txt', size: 1 }, { id: 'f/a2.txt', name: 'a2.txt', size: 2 }, { id: 'f/sub', name: 'sub', dir: true }], 'f/sub': [] },
      window.file = (o) => { window.got = 'waiting'; Ayni.pickFile(Object.assign({ title: 'File', dir: 'f', rootName: 'Home', list: (d) => F[d], sizeText: (n) => n + ' B' }, o)).then((v) => { window.got = v; }); }, file(), true)`);
    check('file: folders first, then the names in number order', await until(`[...document.querySelectorAll('${P} .fp-name')].map((x) => x.textContent).join() === 'sub,a2.txt,a10.txt,z.txt'`));
    check('file: a size on the files, the first crumb named', await ev(`document.querySelector('${P} .fp-row:nth-child(2) .fp-size').textContent === '2 B' && document.querySelector('${P} .fp-crumbs b').textContent === 'Home'`));
    const frow = (n) => `[...document.querySelectorAll('${P} .fp-row')].find((x) => x.querySelector('.fp-name').textContent === '${n}')`;
    check('file: nothing lit, the button is off', await ev(`${OK}.ariaDisabled === 'true'`));
    await ev(`(${frow('sub')}.click(), true)`);
    check('file: a click opens a folder, the crumb goes back', await until(`/empty/.test(document.querySelector('${P} .fp-msg')?.textContent || '') && !!document.querySelector('${P} .fp-crumbs button')`));
    await ev(`(document.querySelector('${P} .fp-crumbs button').click(), true)`);
    await until(`!!${frow('a2.txt')}`);
    await ev(`(${frow('a2.txt')}.click(), true)`); await wait(30);
    check('file: a click lights a file', await ev(`${frow('a2.txt')}.getAttribute('aria-selected') === 'true' && ${OK}.ariaDisabled === 'false'`));
    await ev(`(${OK}.click(), true)`);
    check('file: the button answers its node', await until(`got && got.id === 'f/a2.txt'`));
    await ev(`(file(), true)`); await until(`!!${frow('z.txt')}`);
    await ev(`(${frow('z.txt')}.dispatchEvent(new MouseEvent('dblclick', { bubbles: true })), true)`);
    check('file: a double click too', await until(`got && got.id === 'f/z.txt'`));
    await ev(`(file({ list: () => Promise.reject(new Error('x')) }), true)`);
    check('file: unreadable, says so', await until(`/could not be loaded/.test(document.querySelector('${P} .fp-msg')?.textContent || '')`));
    await ev(`(${NO}.click(), true)`);
    check('file: cancelled, it answers null', await until(`got === null`));
    check('no errors or warnings choosing a folder or a file', t.logs.length === 0, t.logs.slice());
  }

  section('Search family (base + buttons + notifications + dialogs + menus + search)');
  {
    t.logs.length = 0;
    await t.send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
    await t.open(BASE + '/tests/search-only.html');
    check('a page with the search family starts with no errors or warnings', t.logs.length === 0, t.logs.slice());
    const ev = (js) => t.evaluate(js);
    const wait = (ms) => ev(`new Promise((r) => setTimeout(r, ${ms}))`);
    const KEYS = { Escape: 27, Enter: 13, f: 70, h: 72 };
    const CODES = { f: 'KeyF', h: 'KeyH' };
    const key = async (k, mods = 0) => {
      await t.send('Input.dispatchKeyEvent', { type: 'keyDown', key: k, code: CODES[k] || k, windowsVirtualKeyCode: KEYS[k] || 0, modifiers: mods, ...(k === 'Enter' ? { text: '\r' } : {}) });
      await t.send('Input.dispatchKeyEvent', { type: 'keyUp', key: k, code: CODES[k] || k, windowsVirtualKeyCode: KEYS[k] || 0, modifiers: mods });
      await wait(60);
    };
    const CTRL = 2, SHIFT = 8;
    const type = async (s) => { await t.send('Input.insertText', { text: s }); await wait(60); };
    const mouse = (type, x, y) => t.send('Input.dispatchMouseEvent', { type, x, y, button: type === 'mouseMoved' ? 'none' : 'left', buttons: type === 'mousePressed' ? 1 : 0, clickCount: 1 });
    const mid = (sel) => ev(`(() => { const r = document.querySelector(${JSON.stringify(sel)}).getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; })()`);
    const click = async (sel) => { const [x, y] = await mid(sel); await mouse('mouseMoved', x, y); await mouse('mousePressed', x, y); await mouse('mouseReleased', x, y); await wait(80); };
    const focus = (sel) => ev(`(document.querySelector(${JSON.stringify(sel)}).focus(), true)`);
    const focused = () => ev(`(() => { const a = document.activeElement; return a.closest('[id]')?.id + (a.matches('input') ? ':input' : ''); })()`);
    const val = (sel) => ev(`document.querySelector(${JSON.stringify(sel)}).value`);
    const shows = (sel) => ev(`(() => { const e = document.querySelector(${JSON.stringify(sel)}); return !!e && e.checkVisibility(); })()`);
    const log = () => ev(`L.join('|')`);
    const tip = (sel) => ev(`document.querySelector(${JSON.stringify(sel)}).dataset.tip`);
    const isOpenFold = (id) => ev(`document.getElementById('${id}').classList.contains('is-open')`);
    const color = (v) => ev(`(() => { const p = document.createElement('i'); p.style.color = 'var(${v})'; document.body.append(p); const c = getComputedStyle(p).color; p.remove(); return c; })()`);
    const reset = () => ev(`(document.querySelectorAll(':popover-open').forEach((p) => p.id !== 'ayni-toasts' && p.hidePopover()), document.querySelectorAll('dialog[open]').forEach((d) => d.close()), L.length = 0, document.getElementById('fld').focus(), true)`);
    const docs = (on) => ev(`(['docbox', 'docbox2'].forEach((id) => (document.getElementById(id).style.display = ${on ? "''" : "'none'"})), true)`);
    const TIP = await ev(`Ayni.t('ayni.searchTip')`);

    /* A plain field that filters as the user types */
    check('a live field has no magnifier inside', !(await ev(`!!document.querySelector('#plain [data-icon="search"], #plain [data-go]')`)));
    check('its clear button hides while the field is empty', !(await shows('#plain [data-clear]')));
    check('its tooltip says how to search', (await tip('#plain input')) === TIP);
    check('tip: false drops it', !(await tip('#notip input')));
    check('the count is read out by screen readers', (await ev(`document.querySelector('#plain .search-count').getAttribute('aria-live')`)) === 'polite');
    await focus('#plain input'); await type('a'); await type('p');
    check('typing fires ayni:search { text, test } at once', (await log()) === 'search plain:a:test|search plain:ap:test', await log());
    check('…with the search rule as its test', await ev(`(() => { let ok; const f = (e) => { ok = e.detail.test('Grape and APPLE') && !e.detail.test('pear'); }; const p = document.getElementById('plain'); p.addEventListener('ayni:search', f, { once: true }); const i = p.querySelector('input'); i.value = '"and ápple" -pear'; i.dispatchEvent(new Event('input', { bubbles: true })); return ok; })()`));
    check('its clear button shows once there is text', await shows('#plain [data-clear]'));
    await ev(`(plain.count('3 / 11'), true)`);
    check('count("3 / 11") shows the count inside', (await ev(`document.querySelector('#plain .search-count').textContent`)) === '3 / 11' && await shows('#plain .search-count'));
    check('…before the filter button and Clear', await ev(`(() => { const k = [...document.getElementById('plain').children].map((x) => x.matches('.search-count') ? 'count' : x.matches('.filter-btn') ? 'filter' : x.matches('[data-clear]') ? 'clear' : x.tagName); return k.join() === 'INPUT,count,filter,clear'; })()`));
    await ev('(L.length = 0, true)');
    await key('Escape');
    check('Esc with text only clears; the cursor stays', (await val('#plain input')) === '' && (await focused()) === 'plain:input' && !(await shows('#plain .search-count')));
    check('…and never reaches the page', !(await log()).includes('esc reached'), await log());
    check('…and tells the page at once', (await log()).startsWith('search plain::null'), await log());
    await ev('(L.length = 0, true)');
    await key('Escape');
    check('Esc on an empty plain field goes on to what is around it', (await log()).includes('esc reached'), await log());
    await focus('#plain input'); await type('kiwi'); await ev('(L.length = 0, true)');
    await click('#plain [data-clear]');
    check('Clear empties the field and keeps the cursor in it', (await val('#plain input')) === '' && (await focused()) === 'plain:input' && (await log()) === 'search plain::null', await log());

    /* The filter button */
    check('filter: a filter button is made, grey, "Filter"', (await shows('#plain .filter-btn')) && (await tip('#plain .filter-btn')) === 'Filter');
    const dim = await color('--text-dim'), acc = await color('--accent');
    const filterColor = () => ev(`getComputedStyle(document.querySelector('#plain .filter-btn')).color`);
    await mouse('mouseMoved', 5, 890); await wait(250);
    check('…its icon is grey with no filter', (await filterColor()) === dim, [await filterColor(), dim]);
    await ev('(plain.filtered(2), true)'); await wait(250);
    check('filtered(2): Accent, "Filters: 2"', (await filterColor()) === acc && (await tip('#plain .filter-btn')) === 'Filters: 2', [await filterColor(), acc]);
    await ev(`(plain.filtered('fruits'), true)`);
    check(`filtered('fruits'): "Filter: fruits"`, (await tip('#plain .filter-btn')) === 'Filter: fruits' && await ev(`document.querySelector('#plain .filter-btn').classList.contains('is-active')`));
    await ev('(plain.filtered(0), true)');
    check('filtered(0): grey again, "Filter"', !(await ev(`document.querySelector('#plain .filter-btn').classList.contains('is-active')`)) && (await tip('#plain .filter-btn')) === 'Filter');
    await ev('(L.length = 0, true)'); await click('#plain .filter-btn');
    check('a press on it runs filter()', (await log()) === 'filter pressed', await log());
    await reset();

    /* Up / down through hits in place */
    check('steps: the up / down pair sits before Close, faded at first', await ev(`(() => { const s = [...document.querySelectorAll('#step .search-step')]; return s.length === 2 && s.every((b) => b.getAttribute('aria-disabled') === 'true') && s[1].nextElementSibling.matches('[data-clear]'); })()`));
    await focus('#step input'); await type('train'); await ev('(L.length = 0, true)');
    await key('Enter');
    check('…while faded, Enter steps nowhere', (await log()) === '', await log());
    await ev('(step.canStep(true), true)');
    await key('Enter'); await key('Enter', SHIFT);
    check('Enter goes to the next hit, Shift+Enter to the previous one', (await log()) === 'step 1|step -1', await log());
    await click('#step .search-step + .search-step');
    check('the down button steps too, and the cursor stays in the field', (await log()).endsWith('step 1') && (await focused()) === 'step:input', await log());
    await reset();

    /* Search on Enter */
    check('data-enter: a Go button (magnifier) is made at the end', await ev(`(() => { const g = document.querySelector('#enter [data-go]'); return !!g && !!g.querySelector('[data-icon="search"]') && g === document.getElementById('enter').lastElementChild; })()`));
    check('…and the page\'s own Go is used, not a second one', (await ev(`document.querySelectorAll('#enter2 [data-go]').length`)) === 1);
    await focus('#enter input'); await type('casa');
    check('typing does not search', (await log()) === '', await log());
    await key('Enter');
    check('Enter searches', (await log()) === 'search enter:casa:test', await log());
    await ev('(L.length = 0, true)'); await click('#own-go');
    check('Go searches the field it sits in', (await log()) === 'search enter2::null', await log());
    await focus('#enter input'); await ev('(L.length = 0, true)'); await key('Escape');
    check('clearing it tells the page at once (its results are stale)', (await log()) === 'search enter::null', await log());
    await reset();

    /* Folded in a title row */
    check('folded: only its Search button shows at rest', (await shows('#fold-btn')) && !(await shows('#fold')));
    check('a folded field with no Search button gets one', await ev(`(() => { const b = document.getElementById('fold2').previousElementSibling; return !!b && b.matches('.btn[data-search]') && !!b.querySelector('[data-icon="search"]'); })()`));
    await click('#fold-btn');
    check('its Search button opens it in its place, with the cursor in it', (await isOpenFold('fold')) && (await focused()) === 'fold:input' && !(await shows('#fold-btn')));
    check('its × shows even while empty', await shows('#fold [data-clear]'));
    check('the × says Close', (await tip('#fold [data-clear]')) === 'Close');
    const w = await ev(`document.getElementById('fold').getBoundingClientRect().width`);
    check('it takes the room left, up to 360 px', w > 300 && w <= 360, w);
    await type('invoice'); await ev('(L.length = 0, true)');
    await key('Escape');
    check('Esc with text clears it and keeps it open', (await isOpenFold('fold')) && (await val('#fold input')) === '' && (await focused()) === 'fold:input');
    await key('Escape');
    check('Esc on the empty field folds it; the cursor goes back to Search', !(await isOpenFold('fold')) && (await focused()) === 'fold-btn', await focused());
    check('…and ayni:searchclose fires, then an empty search', (await log()).endsWith('close fold|search fold::null') && !(await log()).includes('esc reached'), await log());
    await click('#fold-btn'); await type('bill'); await ev('(L.length = 0, true)');
    await click('#fold [data-clear]');
    check('the × clears and folds in one press', !(await isOpenFold('fold')) && (await val('#fold input')) === '' && (await log()) === 'close fold|search fold::null', await log());
    await ev('(L.length = 0, fold2.open(), true)'); await type('x'); await ev('(L.length = 0, true)'); await ev(`(document.querySelector('#fold2 [data-clear]').click(), true)`);
    check('onClose replaces the empty search', (await log()) === 'close fold2|onClose fold2', await log());
    await ev('(fold.open(true), true)');
    check('open(true): opened by the app, without the cursor (no phone keyboard)', (await isOpenFold('fold')) && (await focused()) !== 'fold:input');
    await ev(`(document.getElementById('hd').style.width = '305px', true)`); await wait(200);
    const nw = await ev(`document.getElementById('fold').getBoundingClientRect().width`);
    check('a narrow row: the open search keeps 180 px', nw >= 180, nw);
    check('…and the tools leave into More by rank, the highest first', (await ev(`document.getElementById('h-b').classList.contains('fit-out') && !document.getElementById('h-new').classList.contains('fit-out')`)) && await shows('#hd .fit-more'), await ev(`[...document.querySelectorAll('#hd .fit-out')].map((e) => e.id).join()`));
    check('…never the search', !(await ev(`document.querySelector('#hd .tb-group:has(#fold)').classList.contains('fit-out')`)));
    await ev(`(fold.close(true), true)`); await wait(200);
    check('folded again, the tools come back', (await ev(`document.querySelectorAll('#hd .fit-out').length`)) === 0, await ev(`[...document.querySelectorAll('#hd .fit-out')].map((e) => e.id).join()`));
    await ev(`(document.getElementById('hd').style.width = '700px', true)`); await wait(150);
    await reset();

    /* Ctrl+F */
    await docs(false);
    await key('f', CTRL);
    check('Ctrl+F opens the first folded search and puts the cursor in it', (await isOpenFold('fold2')) && (await focused()) === 'fold2:input');
    await ev('(fold2.close(true), true)'); await focus('#fld');
    await key('f', CTRL);
    check('…from inside another text field too', (await focused()) === 'fold2:input');
    await ev('(fold2.close(true), document.getElementById("fold2").previousElementSibling.hidden = true, true)'); await focus('#fld');
    await key('f', CTRL);
    check('…a folded one whose button is hidden is skipped', (await isOpenFold('fold')) && (await focused()) === 'fold:input');
    await ev(`(fold.close(true), document.getElementById('fold-btn').hidden = true, true)`); await focus('#fld');
    await key('f', CTRL);
    check('no folded one: the first plain search field, its text selected', (await focused()) === 'plain:input');
    await ev(`(document.getElementById('fold-btn').hidden = false, document.getElementById("fold2").previousElementSibling.hidden = false, true)`);
    await ev(`(window.stopF = (e) => { if (e.key === 'f') e.preventDefault(); }, document.addEventListener('keydown', stopF), true)`); await focus('#fld');
    await key('f', CTRL);
    check('a page that handles Ctrl+F itself is left alone', (await focused()) === 'fld:input' && !(await isOpenFold('fold2')));
    await ev(`(document.removeEventListener('keydown', stopF), true)`);
    await click('#pp-btn'); await focus('#pp-sf input'); await focus('#pp');
    await ev(`(document.getElementById('pp').setAttribute('tabindex', '-1'), document.getElementById('pp').focus(), true)`);
    await key('f', CTRL);
    check('in an open popup: its own search field', (await focused()) === 'pp-sf:input');
    await key('Escape'); await wait(60);
    check('…Esc on its empty field closes the popup', !(await ev(`document.getElementById('pp').matches(':popover-open')`)));
    await reset();
    await click('#open-dlg'); await focus('#dlg-other');
    await key('f', CTRL);
    check('with a modal dialog open: the dialog\'s search field', (await focused()) === 'dlg-sf:input');
    await type('ann'); await key('Escape');
    check('…Esc with text clears it; the dialog stays', (await ev(`document.getElementById('dlg').open`)) && (await val('#dlg-sf input')) === '');
    await key('Escape'); await wait(80);
    check('…a second Esc closes the dialog', !(await ev(`document.getElementById('dlg').open`)));
    await reset(); await docs(true);

    /* The find bar */
    check('find bar: a search strip, hidden until opened', await ev(`(() => { const b = document.getElementById('fb'); return b.hidden && b.classList.contains('find-bar') && b.getAttribute('role') === 'search' && b.getAttribute('aria-label') === 'Find'; })()`));
    await focus('#doc'); await key('f', CTRL);
    check('Ctrl+F opens it, with the cursor in its field', (await ev(`!document.getElementById('fb').hidden`)) && (await focused()) === 'fb:input');
    check('…the replace row stays hidden', !(await shows('#fb .find-replace')));
    check('…its parts in order: field, Match case, ▾, Close', await ev(`(() => { const r = document.querySelector('#fb .find-row'); const k = [...r.children].map((x) => x.matches('.search-field') ? 'field' : x.querySelector('[data-icon]')?.dataset.icon); return k.join() === 'field,case,chev-down,close'; })()`));
    check('…Close is its only ×', (await ev(`[...document.querySelectorAll('#fb [data-icon="close"]')].filter((i) => i.checkVisibility()).length`)) === 1);
    check('…no how-to-search tooltip (a document is found word for word)', !(await tip('#fb input')));
    await type('fish');
    check('typing asks the page to find; the count shows "1 / 4"', (await log()).endsWith('find fish:false') && (await ev(`document.querySelector('#fb .search-count').textContent`)) === '1 / 4', await log());
    check('…the up / down pair is live', await ev(`[...document.querySelectorAll('#fb .search-step')].every((b) => b.getAttribute('aria-disabled') === 'false')`));
    await key('Enter'); await key('Enter'); await key('Enter', SHIFT);
    check('Enter steps forward, Shift+Enter back; the cursor stays in the bar', (await ev(`document.querySelector('#fb .search-count').textContent`)) === '2 / 4' && (await focused()) === 'fb:input');
    await click('#fb [aria-pressed]');
    check('Match case is a toggle; the page finds again with it', (await ev(`document.querySelector('#fb [aria-pressed]').getAttribute('aria-pressed')`)) === 'true' && (await log()).endsWith('find fish:true'), await log());
    check('…a press on a bar button leaves the cursor in the field', (await focused()) === 'fb:input', await focused());
    await click('#fb [aria-pressed]');
    await ev(`(bar.count(0, 0), true)`);
    check('nothing found: a red "0", the pair faded', (await ev(`document.querySelector('#fb .search-count').textContent`)) === '0' && (await ev(`getComputedStyle(document.querySelector('#fb .search-count')).color`)) === await color('--danger') && await ev(`document.querySelector('#fb .search-step').getAttribute('aria-disabled') === 'true'`));
    await key('h', CTRL);
    check('Ctrl+H shows the replace row, the cursor in the replacement', (await shows('#fb .find-replace')) && (await focused()) === 'fb:input' && await ev(`document.activeElement === document.querySelector('#fb .find-replace input')`));
    check('…the ▾ says it is open and turns up', (await ev(`document.querySelector('#fb .find-more').getAttribute('aria-expanded')`)) === 'true' && (await ev(`getComputedStyle(document.querySelector('#fb .find-more .icon')).transform`)) !== 'none');
    await type('cat'); await key('Enter');
    check('Enter in the replacement replaces one', (await log()).endsWith('replace cat:false'), await log());
    await click('#fb .find-replace .btn.text:last-child');
    check('Replace all replaces every match', (await log()).endsWith('replace cat:true'), await log());
    await key('f', CTRL);
    check('Ctrl+F in the bar hides the replace row and goes back to the field', !(await shows('#fb .find-replace')) && await ev(`document.activeElement === document.querySelector('#fb .find-row input')`));
    await click('#fb .find-more');
    check('the ▾ opens the replace row too', await shows('#fb .find-replace'));
    await focus('#fb .find-row input'); await ev('(L.length = 0, true)');
    await key('Escape');
    check('Esc with text clears the field; the bar stays', (await val('#fb .find-row input')) === '' && (await ev(`!document.getElementById('fb').hidden`)) && (await log()).endsWith('find :false'), await log());
    await key('Escape');
    check('Esc on the empty field closes the bar; the cursor goes back to the document', (await ev(`document.getElementById('fb').hidden`)) && (await log()).endsWith('fb closed') && (await focused()) === 'doc', await log());
    check('…and never reaches the page', !(await log()).includes('esc reached'), await log());
    await ev(`(SEL = 'red', true)`); await key('f', CTRL);
    check('opening puts the document\'s selected words in the field, selected', (await val('#fb .find-row input')) === 'red' && await ev(`document.activeElement.selectionStart === 0 && document.activeElement.selectionEnd === 3`));
    await ev(`(SEL = 'two\\nlines', bar.close(), bar.open(false), true)`);
    check('…but not a selection over several lines', (await val('#fb .find-row input')) === 'red');
    await ev(`(SEL = '', bar.close(), true)`); await click('#fb2 ~ *, #docbox2'); 
    await ev(`(bare.open(), true)`);
    check('a find bar with no replace has no ▾ and no replace row', !(await ev(`!!document.querySelector('#fb2 .find-more, #fb2 .find-replace')`)));
    await ev(`(bare.close(), true)`);
    check('close() leaves the bar hidden', await ev(`document.getElementById('fb').hidden`));
    await reset();

    /* Touch: the bar and field buttons keep a finger-sized hit area */
    await ev('(Ayni.setTouchPreview(true), bar.open(true, "fish"), true)'); await wait(80);
    check('touch: the bar\'s buttons are 44 px targets', await ev(`[...document.querySelectorAll('#fb .find-row > .btn')].every((b) => { const a = getComputedStyle(b, '::before'); const r = b.getBoundingClientRect(); return Math.max(r.height, parseFloat(a.height) || 0) >= 44 || r.height >= 44; })`));
    await ev('(Ayni.setTouchPreview(false), bar.close(), true)');
    await reset();
    check('no untranslated keys in the search family', (await ev(RAW_KEYS)).length === 0, await ev(RAW_KEYS));
    check('no errors or warnings in the search family', t.logs.length === 0, t.logs.slice());

    /* The search rule in the other controls */
    t.logs.length = 0;
    await t.open();
    const combo = async (q) => ev(`(() => { const f = document.getElementById('combo'); f.value = ${JSON.stringify(q)}; f.dispatchEvent(new Event('input', { bubbles: true })); return [...document.querySelectorAll('#combo-list [role="option"]')].filter((o) => !o.hidden).map((o) => o.dataset.value).join(); })()`);
    check('combo box: words in any order, accents ignored', (await combo('mal a')) === 'Málaga', await combo('mal a'));
    check('combo box: -word leaves out', (await combo('ma -pal')) === 'Madrid,Málaga', await combo('ma -pal'));
    check('combo box: a quoted phrase', (await combo('"a co"')) === 'A Coruña', await combo('"a co"'));
    await ev(`(document.getElementById('combo').value = '', document.getElementById('combo').dispatchEvent(new Event('input', { bubbles: true })), document.querySelectorAll(':popover-open').forEach((p) => p.id !== 'ayni-toasts' && p.hidePopover()), true)`);
    await t.open(BASE + '/gallery/desktop.html');
    check('launcher: a live search, no magnifier inside', !(await ev(`!!document.querySelector('#apps .search-field [data-icon="search"]')`)));
    const apps = async (q) => ev(`(() => { if (!document.getElementById('apps').matches(':popover-open')) document.querySelector('[popovertarget="apps"]').click(); const f = document.getElementById('app-q'); f.value = ${JSON.stringify(q)}; f.dispatchEvent(new Event('input', { bubbles: true })); return [...document.querySelectorAll('#apps .apps > button')].filter((b) => !b.hidden).map((b) => b.dataset.app).join(); })()`);
    check('launcher: finds by the search rule', (await apps('sheet spread')) === 'table' && (await apps('-files e')) !== '' && !(await apps('-files e')).includes('files'), await apps('-files e'));
    await ev(`(document.getElementById('apps').hidePopover(), true)`);
    check('no errors or warnings on the combo box and launcher', t.logs.length === 0, t.logs.slice());
  }

  section('Lists family (base + buttons + notifications + dialogs + menus + lists)');
  {
    t.logs.length = 0;
    await t.send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
    await t.open(BASE + '/tests/lists-only.html');
    const ev = (js) => t.evaluate(js);
    const wait = (ms) => ev(`new Promise((r) => setTimeout(r, ${ms}))`);
    await ev(`new Promise((r) => { const w = () => (window.READY ? r(true) : setTimeout(w, 20)); w(); })`);
    check('a page with the lists family (no ayni.js) starts with no errors or warnings', t.logs.length === 0, t.logs.slice());
    const KEYS = { Escape: 27, Enter: 13, Delete: 46, F2: 113, Tab: 9, ArrowDown: 40, ArrowUp: 38, ArrowLeft: 37, ArrowRight: 39, Home: 36, End: 35, PageDown: 34, PageUp: 33, ' ': 32, '*': 56 };
    const CODES = { ' ': 'Space', '*': 'Digit8' };
    const key = async (k, mods = 0) => {
      const ch = k.length === 1 ? k : null, code = CODES[k] || (ch && /[a-z]/i.test(ch) ? 'Key' + ch.toUpperCase() : k);
      const vk = KEYS[k] || (ch ? ch.toUpperCase().charCodeAt(0) : 0);
      await t.send('Input.dispatchKeyEvent', { type: ch && !(mods & 3) ? 'keyDown' : 'rawKeyDown', key: k, code, windowsVirtualKeyCode: vk, modifiers: mods, ...(ch && !(mods & 3) ? { text: k } : {}), ...(k === 'Enter' ? { text: '\r' } : {}) });
      await t.send('Input.dispatchKeyEvent', { type: 'keyUp', key: k, code, windowsVirtualKeyCode: vk, modifiers: mods });
      await wait(50);
    };
    const ALT = 1, CTRL = 2, SHIFT = 8;
    const mid = (sel) => ev(`(() => { const e = document.querySelector(${JSON.stringify(sel)}); e.scrollIntoView({ block: 'nearest' }); const r = e.getBoundingClientRect(); return [r.left + Math.min(r.width / 2, 60), r.top + r.height / 2]; })()`);
    const mouse = (type, x, y, button = 'left', mods = 0, count = 1) => t.send('Input.dispatchMouseEvent', { type, x, y, modifiers: mods, button: type === 'mouseMoved' ? 'none' : button,
      buttons: type === 'mousePressed' ? (button === 'right' ? 2 : button === 'middle' ? 4 : 1) : 0, clickCount: count });
    const click = async (sel, mods = 0, button = 'left') => { const [x, y] = await mid(sel); await mouse('mouseMoved', x, y); await mouse('mousePressed', x, y, button, mods); await mouse('mouseReleased', x, y, button, mods); await wait(70); };
    const dbl = async (sel) => { const [x, y] = await mid(sel); for (const c of [1, 2]) { await mouse('mousePressed', x, y, 'left', 0, c); await mouse('mouseReleased', x, y, 'left', 0, c); } await wait(70); };
    const tap = async (sel) => { const [x, y] = await mid(sel); await t.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] }); await wait(30); await t.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await wait(120); };
    const hold = async (sel) => { const [x, y] = await mid(sel); await t.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] }); await wait(650); await t.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await wait(150); };
    const picked = (box = '#rows') => ev(`[...document.querySelectorAll('${box} [aria-selected="true"]')].map((r) => r.dataset.id).join('')`);
    const log = () => ev(`L.splice(0).filter((x) => !x.startsWith('sel ')).join('|')`);
    const focusedId = () => ev(`document.activeElement?.dataset?.id || document.activeElement?.id || ''`);
    const accent = await ev(`(() => { const p = document.createElement('i'); p.style.background = 'var(--accent)'; document.body.append(p); const c = getComputedStyle(p).backgroundColor; p.remove(); return c; })()`);
    const bg = (sel, pseudo) => ev(`getComputedStyle(document.querySelector(${JSON.stringify(sel)})${pseudo ? `, '${pseudo}'` : ''}).backgroundColor`);
    const menuRows = () => ev(`[...document.querySelectorAll('.panel.menu:popover-open [role^="menuitem"]')].map((b) => b.querySelector('.label')?.textContent.trim() || b.textContent.trim()).join(',')`);
    const reset = async () => { await ev(`(document.querySelectorAll('.panel.menu:popover-open').forEach((p) => p.hidePopover()), document.querySelectorAll('dialog[open]').forEach((d) => d.close()), list.clear(), grid.clear(), L.length = 0, document.activeElement?.blur(), true)`); await wait(40); };

    /* Item list: picking like a file manager */
    check('every pickable row gets a tick; a heading row does not', await ev(`document.querySelectorAll('#rows [data-id] .pick-tick').length === 12 && !document.querySelector('#rows [data-id="hdr"] .pick-tick')`));
    await click('#rows [data-id="a"]');
    check('a click picks that row alone', (await picked()) === 'a', await picked());
    await click('#rows [data-id="c"]', CTRL);
    check('Ctrl+click adds a row', (await picked()) === 'ac', await picked());
    await click('#rows [data-id="a"]', CTRL);
    check('Ctrl+click takes a row out', (await picked()) === 'c', await picked());
    await ev(`(list.set(['b', 'd']), true)`); await click('#rows [data-id="f"]');
    check('a plain click with rows picked keeps only that row', (await picked()) === 'f', await picked());
    await ev(`(list.set(['c']), true)`); await click('#rows [data-id="a"]', CTRL); await click('#rows [data-id="a"]', CTRL);
    await click('#rows [data-id="e"]', SHIFT);
    check('Shift+click picks the range from the last clicked row', (await picked()) === 'abcde', await picked());
    await click('#rows [data-id="c"]'); await click('#rows [data-id="e"]', SHIFT);
    check('Shift+click from a plain click: the range', (await picked()) === 'cde', await picked());
    await click('#rows [data-id="a"]', CTRL | SHIFT);
    check('Ctrl+Shift+click adds the range', (await picked()) === 'abcde', await picked());
    await click('#inner');
    check('a button inside a row does its own job, the picks stay', (await picked()) === 'abcde', await picked());
    await ev(`(document.querySelector('#rows [data-id="g"] .pick-tick').click(), true)`);
    check('a press on the tick adds that row', (await picked()) === 'abcdeg', await picked());
    await ev(`(document.querySelector('#rows [data-id="g"] .pick-tick').click(), true)`);
    check('…and takes it out again', (await picked()) === 'abcde', await picked());
    await ev(`(document.getElementById('rows').append(Object.assign(document.createElement('p'), { id: 'gap', style: 'height:40px;margin:0' })), true)`);
    const [gx, gy] = await mid('#gap');
    await mouse('mousePressed', gx, gy); await mouse('mouseReleased', gx, gy); await wait(60);
    check('a mouse click on empty space clears the picks', (await picked()) === '', await picked());
    await ev(`(document.getElementById('gap').remove(), document.getElementById('rows').scrollTop = 0, true)`);
    check('a picked row has the soft tint, not full Accent', await ev(`(list.set(['b']), true)`) && (await bg('#rows [data-id="b"]')) !== accent && (await bg('#rows [data-id="b"]')) !== 'rgba(0, 0, 0, 0)');
    check('aria-selected marks the picks, no other state class', await ev(`document.querySelector('#rows [data-id="b"]').getAttribute('aria-selected') === 'true' && document.querySelector('#rows [data-id="a"]').getAttribute('aria-selected') === 'false' && !document.querySelector('#rows .is-selected')`));

    /* The picked group in the title row */
    await reset(); await click('#rows [data-id="a"]'); await click('#rows [data-id="b"]', CTRL);
    check('the picked group shows the count with its ×', !(await ev(`document.getElementById('bar').hidden`)) && (await ev(`document.querySelector('#bar [data-pick="jump"]').textContent`)) === '2');
    check('…then Select all and every action but Open (not noBar, not hideOff when off), in menu order', (await ev(`[...document.querySelectorAll('#bar [data-pick-act]')].map((b) => b.dataset.pickAct).join()`)) === 'ren,star,del', await ev(`[...document.querySelectorAll('#bar [data-pick-act]')].map((b) => b.dataset.pickAct).join()`));
    check('an action that cannot run is disabled (Rename with two picks)', (await ev(`document.querySelector('#bar [data-pick-act="ren"]').ariaDisabled`)) === 'true');
    check('a label can follow the picks (Unstar while Apple is picked)', (await ev(`document.querySelector('#bar [data-pick-act="star"]').getAttribute('aria-label')`)) === 'Unstar');
    check('a gap starts each new menu section; danger shows', await ev(`!document.querySelector('#bar [data-pick-act="star"]').classList.contains('pick-gap') && document.querySelector('#bar [data-pick-act="del"]').classList.contains('pick-gap') && document.querySelector('#bar [data-pick-act="del"]').classList.contains('danger')`));
    check('the tooltip names the key', (await ev(`document.querySelector('#bar [data-pick-act="del"]').dataset.tip`)).includes('('), await ev(`document.querySelector('#bar [data-pick-act="del"]').dataset.tip`));
    check('the title row is marked while something is picked', await ev(`document.querySelector('#hd [role="toolbar"]').classList.contains('has-selection')`));
    await click('#bar [data-pick-act="del"]');
    check('a group button runs its action on the picks', (await log()) === 'del a,b', await log());
    await click('#bar [data-pick="all"]');
    check('Select all picks every row shown, not the heading', (await picked()) === 'abcdefghijkz', await picked());
    check('…and becomes Unselect all', (await ev(`document.querySelector('#bar [data-pick="all"]').getAttribute('aria-label')`)) === (await ev(`Ayni.t('ayni.unselectAll')`)));
    await click('#bar [data-pick="all"]');
    check('Unselect all clears', (await picked()) === '', await picked());
    check('nothing picked: the group hides, the row is unmarked', await ev(`document.getElementById('bar').hidden && !document.querySelector('#hd .has-selection, #hd.has-selection')`));
    await ev(`(list.set(['a', 'k']), document.getElementById('rows').scrollTop = 0, true)`);
    await click('#bar [data-pick="jump"]'); await click('#bar [data-pick="jump"]');
    check('the number goes to the next pick, which flashes', await ev(`document.querySelector('#rows [data-id="k"]').classList.contains('flash') && document.getElementById('rows').scrollTop > 0`));
    await click('#bar [data-pick="clear"]');
    check('the × clears the picks', (await picked()) === '');
    await ev(`(list.set(['z']), true)`);
    check('an action for one kind only shows when it applies (Extract for the .zip)', await ev(`!!document.querySelector('#bar [data-pick-act="zip"]')`));
    await ev(`(document.getElementById('rows').style.width = '0px', document.getElementById('hd').style.maxWidth = '330px', true)`); await wait(150);
    const more = await ev(`[...document.querySelectorAll('#bar .fit-out')].map((b) => b.dataset.pickAct || b.dataset.pick).join()`);
    check('a narrow title row: picked actions go into More by rank, least important first', more.length > 0 && !more.split(',').includes('del'), more);
    await ev(`(document.getElementById('rows').style.width = '', document.getElementById('hd').style.maxWidth = '', true)`); await wait(150);

    /* Keys */
    await reset(); await click('#rows [data-id="b"]');
    await key('ArrowDown');
    check('ArrowDown picks the next row alone', (await picked()) === 'c', await picked());
    await key('ArrowDown', SHIFT);
    check('Shift+ArrowDown extends', (await picked()) === 'cd', await picked());
    await key('ArrowDown', CTRL); await key(' ');
    check('Ctrl+ArrowDown moves only the focus; Space adds the focused row', (await picked()) === 'cde', await picked());
    await key('Home');
    check('Home goes to the first pickable row', (await picked()) === 'a', await picked());
    await key('PageDown');
    check('Page Down jumps a screenful', (await picked()).length === 1 && (await picked()) > 'c', await picked());
    await key('PageUp');
    check('Page Up jumps back', (await picked()) === 'a', await picked());
    await key('a', CTRL);
    check('Ctrl+A picks every row shown', (await picked()) === 'abcdefghijkz', await picked());
    await key('Escape');
    check('Esc clears the picks', (await picked()) === '', await picked());
    await click('#rows [data-id="c"]'); await ev(`(document.getElementById('help').focus(), true)`);
    await key('Delete');
    check('a main list takes its keys while a title-row button has the focus', (await log()) === 'del c', await log());
    await key('s');
    check('a plain-letter action key runs (S), so typing does not jump here', (await log()) === 'star c' && (await picked()) === 'c', await log());
    await key('n', ALT);
    check('an area key (Alt+N) runs with the picks or without', (await log()) === 'new', await log());
    await key('c', CTRL);
    check('a noBar action keeps its key (Ctrl+C)', (await log()) === 'copy c', await log());
    await key('Enter');
    check('Enter on a title-row button presses the button, not the list', (await log()) === '', await log());
    await ev(`(list.focus('c'), true)`); await key('Enter');
    check('Enter opens the row', (await log()) === 'opened c', await log());
    await dbl('#rows [data-id="d"]');
    check('a double-click opens', (await log()).includes('opened d'), await log());
    const [mx, my] = await mid('#rows [data-id="e"]');
    await mouse('mousePressed', mx, my, 'middle'); await mouse('mouseReleased', mx, my, 'middle'); await wait(60);
    check('a middle click opens in a new tab (openMiddle)', (await log()).includes('middle e'), await log());
    await ev(`(L.length = 0, document.querySelector('#hd input')?.focus(), true)`);
    await ev(`(() => { const i = document.createElement('input'); i.id = 'tf'; document.body.append(i); i.focus(); return true; })()`);
    await key('Delete');
    check('no list keys while a text field has the focus', (await log()) === '', await log());
    await ev(`(document.getElementById('tf').remove(), true)`);

    /* Menus */
    await reset(); await click('#rows [data-id="a"]'); await click('#rows [data-id="b"]', CTRL);
    await click('#rows [data-id="d"]', 0, 'right'); await wait(80);
    check('right-click on a row not picked picks it alone, then the menu', (await picked()) === 'd' && /Open.*Rename.*Copy.*Delete/.test(await menuRows()), await menuRows());
    await key('Escape'); await wait(60);
    await click('#rows [data-id="d"]', 0, 'right'); await wait(80);
    await ev(`(document.querySelector('.panel.menu:popover-open [data-act="del"]').click(), true)`); await wait(80);
    check('a menu row runs on the picks', (await log()) === 'del d', await log());
    await reset();
    await ev(`(document.getElementById('rows').append(Object.assign(document.createElement('p'), { id: 'gap', style: 'height:40px;margin:0' })), true)`);
    await click('#gap', 0, 'right'); await wait(80);
    check('right-click on empty space: the area actions and Select all', /New.*Select all/.test(await menuRows()), await menuRows());
    await key('Escape'); await ev(`(document.getElementById('gap').remove(), true)`);
    await click('#rows [data-id="b"]'); await key('F10', SHIFT); await wait(80);
    check('Shift+F10 opens the menu from the keyboard', (await menuRows()).includes('Delete'), await menuRows());
    await reset();

    /* Grid of cards: arrows by place, type-ahead (no letter keys) */
    await click('#grid [data-id="p1"]'); await key('ArrowRight');
    check('grid: Right goes to the next card', (await picked('#grid')) === 'p2', await picked('#grid'));
    await key('ArrowDown');
    check('grid: Down goes to the card below', (await picked('#grid')) === 'p5', await picked('#grid'));
    await key('h');
    check('type-ahead: a letter jumps to the card by name', (await picked('#grid')) === 'p6', await picked('#grid'));
    await wait(600); await key('d'); await key('u');
    check('type-ahead: letters typed quickly build one search ("du")', (await picked('#grid')) === 'p3', await picked('#grid'));
    await wait(600); await key('Delete');
    check('a list that is not main takes keys only while it has the focus', (await log()) === 'gdel p3', await log());
    await ev(`(document.getElementById('help').focus(), true)`); await key('Delete');
    check('…and not from a title-row button', (await log()) === '', await log());
    await reset();

    /* Touch: tap opens, long tap starts picking */
    await ev(`(Ayni.setTouchPreview(true), true)`);
    check('touch: no ticks until picking starts', await ev(`getComputedStyle(document.querySelector('#rows [data-id="a"] .pick-tick')).display === 'none' || matchMedia('(hover: hover) and (pointer: fine)').matches`));
    await tap('#rows [data-id="c"]');
    check('touch: a tap opens the row and picks nothing', (await log()) === 'opened c' && (await picked()) === '', await log());
    await hold('#rows [data-id="d"]');
    check('touch: a long tap starts picking with that row', (await picked()) === 'd' && await ev(`document.getElementById('rows').classList.contains('picking')`));
    await tap('#rows [data-id="f"]');
    check('touch: while picking a tap adds a row', (await picked()) === 'df', await picked());
    await tap('#rows [data-id="d"]');
    check('touch: …and takes one out', (await picked()) === 'f', await picked());
    check('touch: rows are at least 44 px tall', await ev(`document.querySelector('#rows [data-id="a"]').getBoundingClientRect().height >= 44`));
    await key('Escape');
    check('touch: Esc stops picking', (await picked()) === '' && !(await ev(`document.getElementById('rows').classList.contains('picking')`)));
    await ev(`(Ayni.setTouchPreview(false), true)`); await reset();

    /* Redraws and drag and drop */
    await ev(`(list.set(['b', 'c']), true)`);
    await ev(`(() => { const r = document.getElementById('rows'); const b = r.querySelector('[data-id="b"]'); const n = document.createElement('div'); n.dataset.id = 'b'; n.dataset.name = 'Banana'; n.textContent = 'Banana'; b.replaceWith(n); r.querySelector('[data-id="c"]').remove(); return true; })()`); await wait(60);
    check('a redraw keeps the picks still there, drops the rest, and puts the ticks back', (await picked()) === 'b' && await ev(`!!document.querySelector('#rows [data-id="b"] .pick-tick')`), await picked());
    const drop = (from, to, sel = '#rows') => ev(`(() => { const dt = new DataTransfer(); document.querySelector('${sel} [data-id="${from}"]${sel === '#nav' ? ' > .ti' : ''}').dispatchEvent(new DragEvent('dragstart', { bubbles: true, cancelable: true, dataTransfer: dt }));
      const ti = document.querySelector('#nav [data-id="${to}"] > .ti'); ti.dispatchEvent(new DragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer: dt }));
      const marked = ti.classList.contains('drop-in'); ti.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: dt })); document.dispatchEvent(new DragEvent('dragend')); return marked; })()`);
    await ev('(L.length = 0, true)');
    check('a row dragged onto a folder outlines it, and the page gets the picks', (await drop('b', 'pics')) && (await log()) === 'drop b on pics true', await log());
    await ev(`(list.set(['d', 'e']), L.length = 0, true)`);
    check('dragging a picked row drags all the picks', (await drop('d', 'docs')) && (await log()) === 'drop d,e on docs true', await log());
    await ev(`(OPEN.docs = true, nav.build(), L.length = 0, true)`);
    check('a folder that refuses: no marker, the drop still comes with ok false', !(await drop('a', 'old')) && (await log()) === 'drop a on old false', await log());
    check('a tree row drags too (drag(id) gives its ids)', (await drop('pics', 'docs', '#nav')) && (await log()) === 'drop pics on docs true', await log());
    check('during a drag Ayni.dragIds() names them; after, null', (await ev(`Ayni.dragIds()`)) === null);
    check('drop markers: a line with a dot between rows', await ev(`(() => { const r = document.querySelector('#rows [data-id="a"]'); r.classList.add('drop-before'); const d = getComputedStyle(r, '::before'); const ok = d.content !== 'none' && d.borderRadius === '50%'; r.classList.remove('drop-before'); return ok; })()`));
    await ev(`(OPEN.docs = false, nav.build(), true)`); await reset();

    /* Navigation tree */
    check('nav tree: Ayni tree markup, nested groups, plain on its pane', await ev(`(() => { const n = document.getElementById('nav'); return n.getAttribute('role') === 'tree' && n.hasAttribute('data-nav') && !!n.querySelector(':scope > li[role="treeitem"] > ul[role="group"] > li[data-id="docs"] > .ti > .tn') && getComputedStyle(n).borderTopWidth === '0px'; })()`));
    check('where you are is full Accent (aria-current)', (await bg('#nav [aria-current="true"] > .ti')) === accent && (await ev(`document.querySelector('#nav [aria-current="true"]').dataset.id`)) === 'home');
    check('a count after the name, an end button, a heading row', await ev(`document.querySelector('#nav [data-id="docs"] > .ti > .count').textContent === '3' && !!document.querySelector('#nav [data-id="pics"] > .ti > .tail') && document.querySelector('#nav [data-id="lab"]').hasAttribute('data-heading')`));
    await click('#nav [data-id="docs"] > .ti .tn');
    check('a click goes there', (await log()) === 'go docs' && (await ev(`document.querySelector('#nav [data-id="docs"]').getAttribute('aria-current')`)) === 'true', await log());
    check('…and stays full Accent under the mouse', (await bg('#nav [data-id="docs"] > .ti')) === accent && (await ev(`document.querySelector('#nav [data-id="docs"] > .ti').matches(':hover')`)));
    await key('ArrowDown');
    check('the arrows only move the focus', (await log()) === '' && (await focusedId()) === 'pics', await focusedId());
    await key('ArrowDown');
    check('the keys skip a disabled folder', (await focusedId()) === 'lab', await focusedId());
    await key('Enter');
    check('Enter on a heading only opens it', (await log()) === 'open lab true', await log());
    await key('ArrowUp'); await key(' ');
    check('Space goes', (await log()) === 'go pics', await log());
    await ev(`(document.querySelector('#nav [data-id="docs"]').focus(), true)`); await key('ArrowRight');
    check('Right opens a folder (the page keeps the state)', (await log()) === 'open docs true' && await ev(`!!document.querySelector('#nav [data-id="old"]')`), await log());
    await key('ArrowRight');
    check('Right again steps in', (await focusedId()) === 'old', await focusedId());
    await key('ArrowLeft');
    check('Left goes up to the parent', (await focusedId()) === 'docs', await focusedId());
    await key('ArrowLeft');
    check('Left on an open folder closes it', (await log()) === 'open docs false', await log());
    await ev(`(document.querySelector('#nav [data-id="home"]').focus(), true)`); await key('p');
    check('nav tree: a letter jumps by name (P: Pictures)', (await focusedId()) === 'pics', await focusedId());
    await key('End');
    check('End goes to the last row', (await focusedId()) === 'red', await focusedId());
    await key('Home');
    check('Home goes to the first row', (await focusedId()) === 'home', await focusedId());
    await ev(`(document.querySelector('#nav [data-id="docs"]').focus(), true)`); await key('*'); await wait(40);
    check('* opens every folder at that level', (await ev(`document.querySelector('#nav [data-id="docs"]').getAttribute('aria-expanded')`)) === 'true', await log());
    await ev('(L.length = 0, true)');
    await click('#nav [data-id="pics"] > .ti .tail');
    check('the end button tells the page', (await log()) === 'tail pics', await log());
    await ev(`(document.querySelector('#nav [data-id="docs"]').focus(), true)`); await key('F2');
    check('keys: true: the list\'s F2 acts on the focused folder', (await log()) === 'ren docs', await log());
    await click('#nav [data-id="docs"] > .ti .tn', 0, 'right');
    check('right-click: the page\'s menu for that folder', (await log()).includes('menu docs'), await log());
    await ev('(L.length = 0, true)');
    await click('#nav [data-id="lab"] > .ti .tn', 0, 'right');
    check('a row with noMenu has none', !(await log()).includes('menu'), await log());
    await ev(`(document.querySelector('#nav [data-id="docs"]').focus(), true)`); await key('Tab');
    check('Tab goes from the tree to the list', await ev(`document.getElementById('rows').contains(document.activeElement)`));
    await click('#rows [data-id="a"]'); await key('Tab');
    check('Tab goes back from the list to the tree', await ev(`document.getElementById('nav').contains(document.activeElement)`));
    await ev(`(OPEN.docs = false, OPEN.lab = false, nav.build(), true)`); await reset();
    const holdOpen = await ev(`new Promise((r) => { const dt = new DataTransfer(); document.querySelector('#rows [data-id="a"]').dispatchEvent(new DragEvent('dragstart', { bubbles: true, dataTransfer: dt }));
      document.querySelector('#nav [data-id="docs"] > .ti').dispatchEvent(new DragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer: dt }));
      setTimeout(() => { const open = document.querySelector('#nav [data-id="docs"]').getAttribute('aria-expanded'); document.dispatchEvent(new DragEvent('dragend')); r(open); }, 850); })`);
    check('holding a drag over a closed folder for 0.7 s opens it', holdOpen === 'true', holdOpen);
    await ev(`(OPEN.docs = false, nav.build(), true)`); await reset();

    /* Phone: the side pane slides in */
    await t.send('Emulation.setDeviceMetricsOverride', { width: 400, height: 800, deviceScaleFactor: 1, mobile: true }); await wait(450);
    check('phone: the pane is a sheet off the screen', await ev(`(() => { const p = document.getElementById('pane'); return getComputedStyle(p).position === 'fixed' && p.getBoundingClientRect().right <= 0; })()`));
    await ev(`(nav.openSheet(), true)`); await wait(300);
    check('phone: openSheet slides it in over a dimmed page', await ev(`document.getElementById('pane').getBoundingClientRect().left >= -1 && !!document.querySelector('.tree-backdrop.open')`));
    await key('Escape'); await wait(250);
    check('phone: Esc closes it', !(await ev(`document.getElementById('pane').classList.contains('open')`)));
    await ev(`(nav.openSheet(), true)`); await wait(300); await click('#nav [data-id="pics"] > .ti .tn'); await wait(250);
    check('phone: going to a folder closes it', !(await ev(`document.getElementById('pane').classList.contains('open')`)) && (await log()).includes('go pics'));
    await t.send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false }); await reset();

    /* Move to… */
    await ev(`(window.PICKED = Ayni.pickNode({ title: 'Move to', items: () => [FOLDERS], current: 'old', disabled: (id) => id === 'docs', note: (lit) => 'Into ' + (lit || '-') }).then((v) => { window.PICKED = v; }), true)`); await wait(150);
    check('Move to…: a modal dialog with the tree boxed, opened down to where they are', await ev(`!!document.querySelector('dialog.pick-node-dialog[open] ul.pick-node [data-id="old"][aria-current="true"]') && getComputedStyle(document.querySelector('ul.pick-node')).borderTopWidth !== '0px'`));
    check('Move to…: the note follows the lit folder', (await ev(`document.querySelector('dialog.pick-node-dialog .text').textContent`)) === 'Into old');
    await click('dialog.pick-node-dialog [data-id="docs"] > .ti .tn');
    check('Move to…: a disabled folder cannot be lit', (await ev(`document.querySelector('dialog.pick-node-dialog .text').textContent`)) === 'Into old');
    await click('dialog.pick-node-dialog [data-id="pics"] > .ti .tn');
    check('Move to…: a click lights a folder', (await ev(`document.querySelector('dialog.pick-node-dialog .text').textContent`)) === 'Into pics');
    await key('ArrowUp');
    check('Move to…: the keys skip the disabled folder', (await focusedId()) === 'tax', await focusedId());
    await key('Enter'); await wait(100);
    check('Move to…: Enter picks the focused folder and closes', (await ev('window.PICKED')) === 'tax' && !(await ev(`!!document.querySelector('dialog.pick-node-dialog[open]')`)), await ev('window.PICKED'));
    await ev(`(window.PICKED = Ayni.pickNode({ title: 'Move to', items: [FOLDERS], current: 'home' }).then((v) => { window.PICKED = v; }), true)`); await wait(150);
    await click('dialog.pick-node-dialog .pick-cancel'); await wait(100);
    check('Move to…: Cancel gives null', (await ev('window.PICKED')) === null);
    await reset();

    /* Editable tree without ayni.js: Alt+N, rename check */
    await ev(`(document.querySelector('#ed [role="treeitem"]').focus(), true)`); await key('n', ALT); await wait(60);
    check('editable tree: Alt+N starts a new folder in rename mode', await ev(`!!document.querySelector('#ed .tree-edit')`));
    await ev(`(document.querySelector('#ed .tree-edit').value = '', true)`); await key('Enter');
    check('editable tree: an empty name keeps the field open and marks it, even without ayni.js', await ev(`(() => { const i = document.querySelector('#ed .tree-edit'); return !!i && i.getAttribute('aria-invalid') === 'true'; })()`));
    await ev(`(document.querySelector('#ed .tree-edit').value = 'Music', true)`); await key('Enter');
    check('editable tree: Enter saves a good name', (await log()).includes('insert Music'), await log());
    await key('Insert');
    check('editable tree: the Insert key no longer makes an item', !(await ev(`!!document.querySelector('#ed .tree-edit')`)));
    await click('#ed [role="treeitem"] > .ti', 0, 'right'); await wait(80);
    check('editable tree: its menu shows Alt+N for New', (await ev(`document.querySelector('.panel.menu:popover-open [data-tree-act="new"] kbd')?.textContent`)) === (await ev(`Ayni.keyLabel('Alt+N')`)), await ev(`document.querySelector('.panel.menu:popover-open [data-tree-act="new"] kbd')?.textContent`));
    await reset();

    /* Pick lists */
    await click('#pick [role="option"]:nth-child(2)'); await click('#pick [role="option"]:nth-child(3)');
    check('pick list: a click toggles each item', (await ev(`[...document.querySelectorAll('#pick [aria-selected="true"]')].map((o) => o.textContent).join()`)) === 'Bruno,Carmen');
    check('pick list: the square shows on every item, Accent when chosen', await ev(`getComputedStyle(document.querySelector('#pick [role="option"]'), '::before').content !== 'none'`) && (await bg('#pick [aria-selected="true"]', '::before')) === accent);
    check('pick list: a chosen item has the soft tint', (await bg('#pick [aria-selected="true"]')) !== accent);
    check('single-choice list: the chosen item is soft too, no square', (await bg('#one [aria-selected="true"]')) !== accent && (await ev(`getComputedStyle(document.querySelector('#one [role="option"]'), '::before').content`)) === 'none');
    await ev(`(document.getElementById('one').focus(), true)`); await key('m');
    check('pick list: type-ahead', (await ev(`document.querySelector('#one [aria-selected="true"]').textContent`)) === 'México');
    await click('#all');
    check('Everybody: the switch greys the list out', (await ev(`getComputedStyle(document.getElementById('pick')).opacity`)) === '0.45');
    await ev(`(document.getElementById('pick').focus(), true)`); await key(' ');
    check('a disabled pick list: Space changes nothing', (await ev(`[...document.querySelectorAll('#pick [aria-selected="true"]')].map((o) => o.textContent).join()`)) === 'Bruno,Carmen');
    await click('#all');
    check('a page\'s own [role=listbox] (not .lb) keeps its look', await ev(`(() => { const d = document.createElement('div'); d.setAttribute('role', 'listbox'); d.innerHTML = '<div role="option">x</div>'; document.body.append(d); const ok = getComputedStyle(d).borderTopStyle === 'none' && getComputedStyle(d.firstChild).cursor !== 'pointer'; d.remove(); return ok; })()`));
    check('Ayni.pickTick() gives the tick square', await ev(`/class="pick-tick"/.test(Ayni.pickTick()) && /data-tick/.test(Ayni.pickTick())`));
    check('an action icon may be markup (an <svg>)', await ev(`(() => { const a = list.actions(); list.setActions(a.concat([{ id: 'mk', label: 'Mk', icon: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="5"/></svg>', run: () => {} }])); list.set(['a']); const ok = !!document.querySelector('#bar [data-pick-act="mk"] > span.icon > svg circle'); list.setActions(a); list.clear(); return ok; })()`));
    check('navigation tree: the triangle is a 24 px target', await ev(`document.querySelector('#nav [aria-expanded] > .ti > .tw').getBoundingClientRect().width >= 24`));
    await ev(`(Ayni.setTouchPreview(true), true)`);
    check('touch: pick list and tree rows are 44 px tall', await ev(`document.querySelector('#one [role="option"]').getBoundingClientRect().height >= 44 && document.querySelector('#nav [role="treeitem"] > .ti').getBoundingClientRect().height >= 44 && document.querySelector('#ed [role="treeitem"] > .ti').getBoundingClientRect().height >= 44`));
    check('touch: the tick has a finger-sized press', await ev(`(() => { const a = getComputedStyle(document.querySelector('#rows .pick-tick'), '::after'); return a.content !== 'none' && parseFloat(a.inset || a.top) <= -10; })()`));
    await ev(`(Ayni.setTouchPreview(false), true)`);
    check('dark: picked tint and where-you-are still differ', await ev(`(Ayni.setTheme('dark'), list.set(['a']), true)`) && (await bg('#rows [data-id="a"]')) !== (await bg('#nav [aria-current="true"] > .ti')));
    await ev(`(Ayni.setTheme(null), true)`);
    check('API: Ayni.list, tree, pickNode, dropZone, keyMatches, makeTypeAhead, dragIds', await ev(`['list', 'tree', 'pickNode', 'dropZone', 'keyMatches', 'makeTypeAhead', 'dragIds'].every((k) => typeof Ayni[k] === 'function')`));
    check('keyMatches: Ctrl+C, Del, a letter and Shift', await ev(`(() => { const k = (o) => new KeyboardEvent('keydown', o); const mac = /Mac/.test(navigator.platform); return Ayni.keyMatches('Ctrl+C', k({ key: 'c', [mac ? 'metaKey' : 'ctrlKey']: true })) && Ayni.keyMatches('Del', k({ key: 'Delete' })) && Ayni.keyMatches('S', k({ key: 's' })) && !Ayni.keyMatches('S', k({ key: 'S', shiftKey: true })) && Ayni.keyMatches('Shift+Del', k({ key: 'Delete', shiftKey: true })); })()`));
    await reset();
    check('no untranslated keys in the lists family', (await ev(RAW_KEYS)).length === 0, await ev(RAW_KEYS));
    check('no errors or warnings in the lists family', t.logs.length === 0, t.logs.slice());
  }

  section('Help family (base + buttons + notifications + dialogs + menus + help)');
  {
    t.logs.length = 0;
    await t.send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
    await t.open(BASE + '/tests/help-only.html');
    await t.evaluate('(localStorage.clear(), true)');
    /* Headless Chromium does not always finish a CSS move (the tour's ring sliding to its next target): Ayni's
       reduced-motion setting takes the moves away, as on a desktop that asks for less motion */
    await t.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
    await t.open(BASE + '/tests/help-only.html?clean');
    check('a page with the help family starts with no errors or warnings', t.logs.length === 0, t.logs.slice());
    const ev = (js) => t.evaluate(js);
    const wait = (ms) => ev(`new Promise((r) => setTimeout(r, ${ms}))`);
    const KEYS = { Escape: 27, Enter: 13, ArrowRight: 39, ArrowLeft: 37 };
    const key = async (k) => {
      await t.send('Input.dispatchKeyEvent', { type: 'keyDown', key: k, code: k, windowsVirtualKeyCode: KEYS[k] || 0, ...(k === 'Enter' ? { text: '\r' } : {}) });
      await t.send('Input.dispatchKeyEvent', { type: 'keyUp', key: k, code: k, windowsVirtualKeyCode: KEYS[k] || 0 });
      await wait(60);
    };
    const mouse = (type, x, y) => t.send('Input.dispatchMouseEvent', { type, x, y, button: type === 'mouseMoved' ? 'none' : 'left', buttons: type === 'mousePressed' ? 1 : 0, clickCount: 1 });
    const mid = (sel) => ev(`(() => { const r = document.querySelector(${JSON.stringify(sel)}).getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; })()`);
    const press = async (x, y) => { await mouse('mouseMoved', x, y); await mouse('mousePressed', x, y); await mouse('mouseReleased', x, y); await wait(80); };
    const click = async (sel) => { const [x, y] = await mid(sel); await press(x, y); };
    const log = () => ev(`L.join('|')`);
    const has = (sel) => ev(`!!document.querySelector(${JSON.stringify(sel)})`);
    /* A dialog closes a moment after its Close is pressed: wait for it, up to a limit */
    const until = async (js, ms = 1500) => { for (const end = Date.now() + ms; Date.now() < end; await wait(50)) if (await ev(js)) return true; return false; };
    const gone = (sel) => until(`!document.querySelector(${JSON.stringify(sel)})`);
    const popOpen = (id) => ev(`!!document.getElementById('${id}')?.matches(':popover-open')`);
    const color = (v) => ev(`(() => { const p = document.createElement('i'); p.style.color = 'var(${v})'; document.body.append(p); const c = getComputedStyle(p).color; p.remove(); return c; })()`);
    const fg = (sel) => ev(`getComputedStyle(document.querySelector(${JSON.stringify(sel)})).color`);
    const T = (k) => ev(`Ayni.t('ayni.${k}')`);
    const count = () => ev(`document.querySelector('.tour-overlay .tour-count')?.textContent`);
    const bubble = () => ev(`[...document.querySelectorAll('.tour-overlay .tour-bubble > p')].map((p) => p.textContent).join('/')`);
    const next = () => click('.tour-overlay .tour-row .primary');
    /* The ring slides to its target (a short move): wait for it to arrive */
    const ringOn = (sel) => until(`(() => { const r = document.querySelector('.tour-ring').getBoundingClientRect(), e = document.querySelector(${JSON.stringify(sel)}).getBoundingClientRect(); return !document.querySelector('.tour-ring').hidden && Math.abs(r.left + 5 - e.left) < 2 && Math.abs(r.top + 5 - e.top) < 2; })()`);
    const endTour = () => ev(`(document.querySelector('.tour-overlay .coach-close')?.click(), true)`);
    const reset = () => ev(`(document.querySelectorAll('.tour-overlay .coach-close').forEach((b) => b.click()), document.querySelectorAll(':popover-open').forEach((p) => p.id !== 'ayni-toasts' && p.hidePopover()), document.querySelectorAll('dialog[open]').forEach((d) => d.close()), L.length = 0, true)`).then(() => gone('dialog.help-card'));

    /* ---------- Info label ---------- */
    check('info label: Ayni draws the "i" icon, 16 px', await ev(`(() => { const d = document.getElementById('i1'), r = d.getBoundingClientRect(); return !!d.querySelector('.icon[data-icon="info"] svg') && r.width === 16 && r.height === 16; })()`));
    check('info label: in the link colour at rest', (await fg('#i1')) === (await color('--link')));
    check('info label: a label of its own is kept; none gets "What is this?"', (await ev(`document.getElementById('i1').getAttribute('aria-label')`)) === 'About Delivery slot' && (await ev(`document.getElementById('i2').getAttribute('aria-label')`)) === (await T('whatIsThis')));
    check('info label: no tooltip of its own (the popup is the tip), closed at rest', await ev(`!document.getElementById('i1').dataset.tip && document.getElementById('i1').getAttribute('aria-expanded') === 'false'`));
    await click('#i1'); await wait(200);
    check('a click opens its popup with the text', await popOpen('ayni-info') && (await ev(`document.getElementById('ayni-info').textContent.startsWith('Morning is 9 to 13.')`)));
    check('…the "i" says it is open and turns Accent', (await ev(`document.getElementById('i1').getAttribute('aria-expanded')`)) === 'true' && (await fg('#i1')) === (await color('--accent')));
    check('…the popup sits under the "i"', await ev(`(() => { const p = document.getElementById('ayni-info').getBoundingClientRect(), d = document.getElementById('i1').getBoundingClientRect(); return p.top >= d.bottom && p.top - d.bottom < 12; })()`));
    check('line breaks are kept', await ev(`getComputedStyle(document.getElementById('ayni-info')).whiteSpace === 'pre-wrap' && document.getElementById('ayni-info').textContent.includes('\\n')`));
    check('a web address becomes a link to a new tab', await ev(`(() => { const a = document.querySelector('#ayni-info a'); return !!a && a.href === 'https://example.org/routes' && a.target === '_blank' && a.rel === 'noopener'; })()`));
    check('the text is never markup', await ev(`(() => { const d = document.getElementById('i2'), was = d.dataset.help; d.dataset.help = '<b>bold</b>'; d.click(); const ok = !document.querySelector('#ayni-info b') && document.getElementById('ayni-info').textContent === '<b>bold</b>'; d.click(); d.dataset.help = was; return ok; })()`));
    await click('#i1'); await click('#i1');
    check('a second click closes it', !(await popOpen('ayni-info')) && (await ev(`document.getElementById('i1').getAttribute('aria-expanded')`)) === 'false');
    await click('#i1'); await click('#ayni-info');
    check('a press on the popup itself keeps it', await popOpen('ayni-info'));
    await press(900, 600);
    check('a press elsewhere closes it', !(await popOpen('ayni-info')));
    await click('#i1'); await click('#i2');
    check('another "i" takes the one popup over', await popOpen('ayni-info') && (await ev(`document.getElementById('ayni-info').textContent`)) === 'An info label with no name of its own.' && (await ev(`document.getElementById('i1').getAttribute('aria-expanded')`)) === 'false');
    await ev('(L.length = 0, true)'); await key('Escape');
    check('Esc closes it and never reaches the page', !(await popOpen('ayni-info')) && !(await log()).includes('esc reached'), await log());
    await click('#i1'); await ev(`(document.dispatchEvent(new Event('scroll')), true)`); await wait(60);   // headless sends no scroll event of its own
    check('a scroll closes it', !(await popOpen('ayni-info')));
    await ev(`(document.getElementById('i1').focus(), true)`); await key('Enter'); await wait(60);
    check('Enter on the "i" opens it from the keyboard', await popOpen('ayni-info'));
    await key('Escape');
    /* With a mouse it opens on hover; a click pins it */
    /* Headless Chromium has no hovering pointer: the page is told it has one */
    await ev(`(window.MM = window.matchMedia, window.matchMedia = (q) => (/hover: hover/.test(q) ? { matches: true } : MM.call(window, q)), true)`);
    const hoverable = await ev(`matchMedia('(hover: hover) and (pointer: fine)').matches`);
    const [ix, iy] = await mid('#i1');
    await mouse('mouseMoved', 600, 600); await mouse('mouseMoved', ix, iy); await wait(60);
    check('mouse: hover opens it', hoverable && await popOpen('ayni-info'), hoverable);
    const [px, py] = await mid('#ayni-info');
    await mouse('mouseMoved', ix, iy + 10); await mouse('mouseMoved', px, py); await wait(250);
    check('mouse: it stays while the pointer is on the popup', await popOpen('ayni-info'));
    await mouse('mouseMoved', 900, 600); await wait(250);
    check('mouse: leaving closes it after a moment', !(await popOpen('ayni-info')));
    await mouse('mouseMoved', ix, iy); await wait(40); await mouse('mousePressed', ix, iy); await mouse('mouseReleased', ix, iy); await wait(40);
    await mouse('mouseMoved', 900, 600); await wait(300);
    check('mouse: a click pins it (leaving no longer closes it)', await popOpen('ayni-info'));
    await key('Escape');
    await ev(`(window.matchMedia = MM, true)`);
    /* In a dialog */
    await click('#open-dlg'); await wait(100);
    await click('#i3');
    check('in a dialog: the popup lives in the dialog', (await ev(`document.getElementById('ayni-info').parentNode.id`)) === 'dlg' && await popOpen('ayni-info'));
    check('in a switch row: the "i" does not flip the switch', !(await ev(`document.getElementById('sw').checked`)));
    await key('Escape');
    check('in a dialog: Esc closes only the popup', !(await popOpen('ayni-info')) && await ev(`document.getElementById('dlg').open`));
    await click('#i3'); await click('#dlg-x'); await wait(80);
    check('closing the dialog closes its popup', !(await popOpen('ayni-info')));
    await ev(`(Ayni.setTouchPreview(true), true)`);
    check('touch: the "i" keeps its look with a 44 px press', await ev(`(() => { const d = document.getElementById('i1'), a = getComputedStyle(d, '::after'); return d.getBoundingClientRect().width === 16 && 16 - 2 * parseFloat(a.top) >= 44; })()`));
    await ev(`(Ayni.setTouchPreview(false), true)`);
    check('Ayni.init wires an "i" added later', await ev(`(() => { const b = document.createElement('button'); b.className = 'info-tip'; b.dataset.help = 'Late'; document.body.append(b); Ayni.init(b); const ok = !!b.querySelector('.icon svg') && b.type === 'button'; b.click(); const ok2 = document.getElementById('ayni-info').textContent === 'Late'; b.click(); b.remove(); return ok && ok2; })()`));
    await reset();

    /* ---------- Help card ---------- */
    await click('#help'); await wait(100);
    check('the Help button opens the card', await has('dialog.help-card[open]'));
    check('…titled with the view name, Close in the title row', (await ev(`document.querySelector('dialog.help-card h2').textContent`)) === 'Photos' && await has('dialog.help-card header [data-close]'));
    check('…the lead, one paragraph each', (await ev(`[...document.querySelectorAll('dialog.help-card .body > p.text:not(.help-tip)')].map((p) => p.textContent).join('|')`)) === 'Your photos, newest first.|A second paragraph.');
    check('…See the tour under the lead, a primary text button with the play icon', await ev(`(() => { const b = document.querySelector('dialog.help-card .help-tour'); return !!b && b.matches('.btn.text.primary') && !!b.querySelector('[data-icon="play"] svg') && b.previousElementSibling.matches('p.text'); })()`));
    const names = await ev(`[...document.querySelectorAll('dialog.help-card .help-list li .help-t b')].map((b) => b.textContent).join('|')`);
    check('…one row per button on screen, in order; a missing button left out', names === 'Add photos|Slide show|Photo menu|More → Export|Delete all|Pick photos|Just an idea', names);
    check('…a row\'s name is the button\'s tooltip, its text written by hand', await ev(`(() => { const li = document.querySelector('dialog.help-card .help-list li'); return li.querySelector('b').textContent === 'Add photos' && li.querySelector('.help-t span').textContent === 'Adds photos.'; })()`));
    check('…the glyph is a copy of the round button, in its colour', await ev(`(() => { const g = [...document.querySelectorAll('dialog.help-card .help-ico')]; return g[0].matches('.btn.primary') && !!g[0].querySelector('[data-icon="plus"] svg') && g[4].matches('.btn.danger') && g[0].getAttribute('aria-hidden') === 'true'; })()`));
    check('…a popup button\'s copy keeps the triangle', await ev(`(() => { const g = document.querySelectorAll('dialog.help-card .help-ico')[2]; return g.getAttribute('aria-haspopup') === 'true' && getComputedStyle(g, '::after').content !== 'none'; })()`));
    check('…the copies take no press', await ev(`getComputedStyle(document.querySelector('dialog.help-card .help-ico')).pointerEvents === 'none'`));
    check('…a row with no button shows its own icon', await ev(`!!document.querySelectorAll('dialog.help-card .help-list li')[5].querySelector('.help-ico [data-icon="check"] svg')`));
    check('…a section is a line and a subtitle, then a new list', await ev(`(() => { const h = document.querySelector('dialog.help-card h3.help-group'); return !!h && h.textContent === 'In the list' && h.previousElementSibling.matches('hr.help-sep') && h.nextElementSibling.matches('ul.help-list'); })()`));
    check('…the tip line comes last', await ev(`document.querySelector('dialog.help-card .body').lastElementChild.matches('p.help-tip') && document.querySelector('dialog.help-card .help-tip').textContent === 'Tip: drag photos in.'`));
    check('…no Don\'t show again on a view\'s card', !(await has('dialog.help-card .help-dismiss')));
    check('…a small dialog', await ev(`(() => { const w = document.querySelector('dialog.help-card').getBoundingClientRect().width; return w >= 300 && w <= 460; })()`));
    await key('Escape');
    check('Esc closes the card', await gone('dialog.help-card'));
    await ev(`(Ayni.help.show({ title: 'Other', rows: [{ icon: 'plus', name: 'X', text: 'Y' }] }), true)`); await wait(60);
    check('help.show(card) opens another card; the view\'s stays set', (await ev(`document.querySelector('dialog.help-card h2').textContent`)) === 'Other' && !(await has('dialog.help-card .help-tour')));
    await reset();
    check('help.items(): the card and the tour, for a Help menu', (await ev(`Ayni.help.items().map((i) => i.id + ':' + i.label + ':' + i.icon).join()`)) === `help-card:${await T('help.card')}:help,help-tour:${await T('tour.open')}:play`);
    await ev(`(Ayni.help({ ...CARD, menu: true }), true)`);
    await click('#help'); await wait(100);
    check('menu: true: the Help button leaves the card to its menu', !(await has('dialog.help-card')));
    check('…and the card has no See the tour (the menu has it)', await ev(`(Ayni.help.show(), document.querySelector('dialog.help-card') && !document.querySelector('dialog.help-card .help-tour'))`));
    await reset();
    await ev(`(Ayni.help({ title: 'No tour', rows: [] }), true)`);
    check('help.items() without a tour: only the card', (await ev(`Ayni.help.items().map((i) => i.id).join()`)) === 'help-card');
    await ev(`(Ayni.help({ title: 'Home', lead: 'Welcome', autoShow: true, key: 'k-home' }), true)`); await wait(600);
    check('autoShow: a home page\'s card opens by itself', await has('dialog.help-card[open]'));
    check('…with Don\'t show again alone in the bottom row', (await ev(`[...document.querySelectorAll('dialog.help-card footer > *')].map((b) => b.textContent).join()`)) === (await T('dontShowAgain')));
    await click('dialog.help-card .help-dismiss');
    check('Don\'t show again closes it and keeps the flag', await gone('dialog.help-card') && (await ev(`localStorage.getItem('k-home')`)) === '1');
    await ev(`(Ayni.help({ title: 'Home', autoShow: true, key: 'k-home' }), true)`); await wait(600);
    check('…so it no longer opens by itself', !(await has('dialog.help-card')));
    await click('#open-dlg'); await wait(60);
    await ev(`(Ayni.help({ title: 'Later', autoShow: true, key: 'k-later' }), true)`); await wait(700);
    check('autoShow waits while another dialog holds the screen', !(await has('dialog.help-card')));
    await click('#dlg-x'); await wait(1000);
    check('…and opens once it closes', await has('dialog.help-card[open]'));
    await reset();
    await ev(`(Ayni.help(CARD), true)`);

    /* ---------- Guided tour ---------- */
    await click('#help'); await wait(80); await click('dialog.help-card .help-tour'); await wait(500);
    check('See the tour closes the card and starts the tour', await gone('dialog.help-card') && await ev(`!!document.querySelector('.tour-overlay')?.matches(':popover-open')`));
    check('…a modal layer with its name', await ev(`(() => { const o = document.querySelector('.tour-overlay'); return o.getAttribute('role') === 'dialog' && o.getAttribute('aria-modal') === 'true' && !!o.getAttribute('aria-label'); })()`));
    const total = await ev(`+document.querySelector('.tour-count').textContent.match(/\\d+/g)[1]`);
    check('the steps: the card\'s rows (not tour: false, not ideas), then the Help button', total === 6, total);
    check('step 1 lights the first row\'s button, its name as the title', await ringOn('#add') && (await ev(`document.querySelector('.tour-head b').textContent`)) === '' && (await bubble()).startsWith('Adds photos.'));
    check('…"1 of 6", no Back, Next has the focus', (await count()) === (await ev(`Ayni.tf('ayni.tour.step', { n: 1, m: 6 })`)) && await ev(`document.querySelector('.tour-row .bordered').hidden && document.activeElement === document.querySelector('.tour-row .primary')`));
    check('…four dim panes frame the hole; the lid covers it', await ev(`(() => { const p = [...document.querySelectorAll('.tour-pane')].map((x) => x.getBoundingClientRect()), lid = document.querySelector('.tour-lid'), a = document.getElementById('add').getBoundingClientRect(); return p.length === 4 && Math.abs(p[0].height - (a.top - 5)) < 2 && !lid.hidden && getComputedStyle(lid).display !== 'none'; })()`));
    check('…the bubble hangs under the target, inside the screen', await ev(`(() => { const b = document.querySelector('.tour-bubble').getBoundingClientRect(), a = document.getElementById('add').getBoundingClientRect(); return b.top > a.bottom && b.right <= innerWidth && b.left >= 0; })()`));
    await ev('(L.length = 0, true)');
    await click('#add');
    check('a press on the lit (not tap) button does not reach the page', !(await log()).includes('click add'), await log());
    await press(100, 600);
    check('a press on the dimmed page does not reach the page', (await log()) === '', await log());
    await key('ArrowRight'); await wait(150);
    check('→ goes on: a tap step lifts the lid and says "tap it"', (await bubble()).includes(await T('tour.tapIt')) && await ev(`document.querySelector('.tour-overlay').classList.contains('is-tap')`) && await ringOn('#tog'));
    await click('#tog'); await wait(120);
    check('…the user\'s own tap runs the button and goes on', (await log()).includes('click tog') && (await ev(`document.getElementById('tog').getAttribute('aria-pressed')`)) === 'true' && await ringOn('#pm'));
    await key('ArrowLeft'); await wait(120);
    check('← goes back', await ringOn('#tog'));
    await ev('(L.length = 0, true)'); await next(); await wait(120);
    check('Next on a tap step taps it for the user', (await log()).includes('click tog') && (await ev(`document.getElementById('tog').getAttribute('aria-pressed')`)) === 'false' && await ringOn('#pm'));
    await next(); await wait(600);
    check('a row inside a menu: the tour opens the menu and lights the row', await popOpen('pm-menu') && await ringOn('#exp'));
    check('…over the menu (the tour stays on top)', await ev(`(() => { const r = document.getElementById('exp').getBoundingClientRect(); const e = document.elementFromPoint(r.left + 5, r.top + 5); return !!e.closest('.tour-overlay'); })()`));
    await next(); await wait(600);
    check('leaving the step closes the menu it opened', !(await popOpen('pm-menu')));
    check('a thing not there yet: a dashed ring where it will appear', await ev(`document.querySelector('.tour-ring').classList.contains('is-ghost')`) && await ringOn('#empty'));
    check('…its icon in the bubble and the "not here yet" note', await ev(`!document.querySelector('.tour-head .help-ico').hidden && !!document.querySelector('.tour-head .help-ico [data-icon="check"] svg')`) && (await bubble()).includes(await T('tour.ghost')));
    await next(); await wait(200);
    check('the last step is the Help button, with Finish', await ringOn('#help') && (await bubble()).startsWith(await T('tour.helpAgain')) && (await ev(`document.querySelector('.tour-row .primary').textContent`)) === (await T('tour.done')));
    await next(); await wait(80);
    check('Finish ends the tour and leaves nothing behind', !(await has('.tour-overlay')) && (await ev(`[...document.querySelectorAll(':popover-open')].filter((p) => p.id !== 'ayni-toasts').length`)) === 0);
    check('Ayni.tour() runs the card\'s tour', await ev(`Ayni.tour()`));
    check('…only one at a time', !(await ev(`Ayni.tour()`)));
    await ev('(L.length = 0, true)'); await key('Escape'); await wait(60);
    check('Esc ends the tour and never reaches the page', !(await has('.tour-overlay')) && !(await log()).includes('esc reached'));
    await ev(`(Ayni.tour(['rows']), true)`); await wait(100); await click('.tour-overlay .coach-close'); await wait(60);
    check('the × ends it too', !(await has('.tour-overlay')));
    /* Steps from code */
    await ev(`(Ayni.tour([{ sel: '#hid', open: '#pm', text: 'twin' }]), true)`); await wait(600);
    check('a hidden button with a menu twin (data-menu): the tour lights the twin', await ringOn('[data-menu="hid"]'));
    await endTour(); await reset();
    await ev(`(Ayni.tour([{ sel: '#nothing', text: 'Middle' }]), true)`); await wait(700);
    check('nothing to point at: the bubble sits in the middle, no ring', await ev(`(() => { const b = document.querySelector('.tour-bubble').getBoundingClientRect(); return document.querySelector('.tour-ring').hidden && Math.abs(b.left + b.width / 2 - innerWidth / 2) < 2; })()`));
    await endTour();
    check('an optional step this layout lacks is left out', await ev(`(Ayni.tour([{ sel: '#nothing', optional: true, text: 'x' }, { sel: '#add', text: 'a' }]), document.querySelector('.tour-count').textContent)`) === (await ev(`Ayni.tf('ayni.tour.step', { n: 1, m: 2 })`)));
    await endTour();
    check('a step\'s title and before / after run', await ev(`(window.BA = [], Ayni.tour([{ sel: '#add', title: 'Plus', text: 'a', before: () => BA.push('before'), after: () => BA.push('after') }]), document.querySelector('.tour-head b').textContent === 'Plus' && !document.querySelector('.tour-head').hidden)`));
    await next(); await wait(60);
    check('…before on the way in, after on the way out', (await ev(`BA.join()`)) === 'before,after');
    await endTour();
    await ev(`(document.getElementById('hd').style.width = '150px', fb.fit(), true)`); await wait(100);
    const moved = await until(`!!document.getElementById('wide').closest('.fit-out')`);
    await ev(`(Ayni.tour([{ sel: '#wide', text: 'In More' }]), true)`); await wait(800);
    check('a tool fitBar moved into More: the tour opens More and lights its row', moved && await ev(`(() => { const r = document.querySelector('#ayni-menu:popover-open [data-act="wide"]') || [...document.querySelectorAll('#ayni-menu:popover-open [role^="menuitem"]')].find((x) => x.textContent.includes('Wide')); return !!r && Math.abs(document.querySelector('.tour-ring').getBoundingClientRect().top + 5 - r.getBoundingClientRect().top) < 2; })()`), moved);
    check('…and says so', (await bubble()).includes(await T('tour.inMore')));
    await endTour(); await wait(100);
    check('…closing More again', !(await popOpen('ayni-menu')));
    await ev(`(document.getElementById('hd').style.width = '', fb.fit(), true)`); await wait(100);
    await click('#open-dlg'); await wait(80);
    await ev(`(Ayni.tour([{ sel: '#dlg-btn', text: 'In the dialog' }]), true)`); await wait(200);
    check('over a modal dialog the tour lives in it, and takes presses', (await ev(`document.querySelector('.tour-overlay').parentNode.id`)) === 'dlg' && await ringOn('#dlg-btn'));
    await next(); await wait(100);
    check('…Next works there', (await count()) === (await ev(`Ayni.tf('ayni.tour.step', { n: 2, m: 2 })`)) && await ev(`document.getElementById('dlg').open`));
    await endTour();
    await reset();
    check('tour(steps, card): \'rows\' reads that card', await ev(`(Ayni.tour(['rows'], { rows: [{ sel: '#add', text: 'From the other card' }, { sel: '#tog', text: 'b', tour: false }] }), document.querySelector('.tour-bubble > p').textContent === 'From the other card' && /\\b2\\b/.test(document.querySelector('.tour-count').textContent))`));
    await endTour();
    await ev(`(Ayni.tour(['search', { use: 'search', text: 'Changed' }]), true)`); await wait(700);
    check('shared steps: \'search\' (here with no Search button: in the middle), and { use } with fields changed', (await bubble()).startsWith(await T('tour.search')) && /\b3\b/.test(await count()));
    await next(); await wait(700);
    check('…the changed one has its own text', (await bubble()).startsWith('Changed'));
    await endTour();
    check('tour.add(name, fn, \'first\') starts every tour', await ev(`(Ayni.tour.add('home', () => ({ sel: '#hd h2', text: 'Home' }), 'first'), Ayni.tour([{ sel: '#add', text: 'a' }]), document.querySelector('.tour-bubble > p').textContent === 'Home')`));
    await endTour();
    await ev(`(Ayni.setTheme('dark'), Ayni.tour([{ sel: '#add', text: 'a' }]), true)`); await wait(100);
    check('dark: the bubble stands out on the dimmed page', await ev(`getComputedStyle(document.querySelector('.tour-bubble')).backgroundColor !== getComputedStyle(document.querySelector('.tour-pane')).backgroundColor`));
    await endTour(); await ev(`(Ayni.setTheme(null), true)`);
    await t.send('Emulation.setDeviceMetricsOverride', { width: 360, height: 700, deviceScaleFactor: 1, mobile: true });
    await ev(`(Ayni.tour([{ sel: '#help', text: 'A long sentence that wraps over several lines on a phone, to see the bubble stays on the screen.' }]), true)`); await wait(200);
    check('phone: the bubble stays inside the screen', await ev(`(() => { const b = document.querySelector('.tour-bubble').getBoundingClientRect(); return b.left >= 8 && b.right <= innerWidth - 8 + 0.5; })()`));
    await endTour();
    await t.send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
    await reset();

    /* ---------- First-visit marks ---------- */
    check('coach: shows when not seen yet', await ev(`Ayni.coach([{ sel: '#add', text: 'Add here' }, { els: [document.getElementById('help')], text: 'Help here' }], { key: 'k-coach', secs: 2 })`));
    await wait(150);
    check('…a ring and a bubble on each target', (await ev(`document.querySelectorAll('.coach-overlay .coach-ring').length`)) === 2 && (await ev(`[...document.querySelectorAll('.coach-bubble p')].map((p) => p.textContent).join('|')`)) === 'Add here|Help here');
    check('…the × counts down first, dead, saying to read', await ev(`[...document.querySelectorAll('.coach-close')].every((b) => b.textContent === '2' && b.getAttribute('aria-disabled') === 'true')`) && (await ev(`document.querySelector('.coach-close').dataset.tip`)) === (await T('coach.wait')));
    check('…bubbles keep clear of each other and of the targets', await ev(`(() => { const r = [...document.querySelectorAll('.coach-bubble')].map((b) => b.getBoundingClientRect()), t = ['add', 'help'].map((i) => document.getElementById(i).getBoundingClientRect()); const hit = (a, b) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom; return !hit(r[0], r[1]) && !r.some((b) => t.some((x) => hit(b, x))); })()`));
    await ev('(L.length = 0, true)');
    await key('Escape'); await click('.coach-close');
    check('…Esc and the × do nothing while counting; Esc never reaches the page', (await ev(`document.querySelectorAll('.coach-bubble').length`)) === 2 && !(await log()).includes('esc reached'));
    check('…not seen yet while counting', (await ev(`localStorage.getItem('k-coach')`)) === null);
    await click('#help'); await wait(60);
    check('…nothing under the layer takes a press', !(await has('dialog.help-card')));
    await wait(2100);
    check('count over: the × is a real Close, and the marks count as seen', await ev(`[...document.querySelectorAll('.coach-close')].every((b) => b.getAttribute('aria-disabled') === 'false' && !!b.querySelector('[data-icon="close"] svg'))`) && (await ev(`localStorage.getItem('k-coach')`)) === '1');
    await click('.coach-close'); await wait(60);
    check('closing one leaves the other', (await ev(`document.querySelectorAll('.coach-bubble').length`)) === 1);
    await key('Escape'); await wait(60);
    check('Esc then closes them all', !(await has('.coach-overlay')));
    check('seen: not again', !(await ev(`Ayni.coach([{ sel: '#add', text: 'x' }], { key: 'k-coach' })`)));
    check('force: shows them anyway (a demo)', await ev(`Ayni.coach([{ sel: '#add', text: 'x' }], { key: 'k-coach', secs: 1, force: true })`));
    await wait(1300); await key('Escape'); await wait(60);
    check('…and closes', !(await has('.coach-overlay')));
    await ev(`(Ayni.coach([{ sel: '#late', text: 'Late' }], { key: 'k-late', secs: 1 }), true)`); await wait(800);
    check('a target not on the page yet: they wait, without using the flag', !(await has('.coach-overlay')) && (await ev(`localStorage.getItem('k-late')`)) === null);
    await ev(`(document.getElementById('hd').insertAdjacentHTML('afterend', '<button class="btn" id="late" data-tip="Late"><span class="icon" data-icon="plus"></span></button>'), true)`); await wait(800);
    check('…and show once it is there', await has('.coach-overlay'));
    await wait(1100); await key('Escape');
    await click('#open-dlg'); await wait(60);
    await ev(`(Ayni.coach([{ sel: '#add', text: 'a' }], { key: 'k-dlg', secs: 1 }), true)`); await wait(800);
    check('they wait while a dialog holds the screen', !(await has('.coach-overlay')));
    await click('#dlg-x'); await wait(800);
    check('…and show after it', await has('.coach-overlay'));
    await wait(1100); await key('Escape'); await reset();
    check('the default key is ayni-coach-seen', await ev(`(Ayni.coach([{ sel: '#add', text: 'a' }], { secs: 0 }), new Promise((r) => setTimeout(() => { const ok = localStorage.getItem('ayni-coach-seen') === '1'; document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })); r(ok); }, 200)))`));
    await wait(100);
    await ev(`(Ayni.help.show(), Ayni.help.hold(), true)`);
    check('help.hold() closes an open card', await gone('dialog.help-card'));
    await click('#help'); await wait(100);
    check('…and keeps the card and the marks away for this page load', !(await has('dialog.help-card')) && (await ev(`Ayni.coach([{ sel: '#add', text: 'a' }], { key: 'k-hold', force: true })`)) === false);
    check('API: Ayni.help (show, hold, items), Ayni.tour (add), Ayni.coach; no fillHelp', await ev(`typeof Ayni.help === 'function' && ['show', 'hold', 'items'].every((k) => typeof Ayni.help[k] === 'function') && typeof Ayni.tour.add === 'function' && typeof Ayni.coach === 'function' && !('fillHelp' in Ayni)`));
    await reset();
    check('no untranslated keys in the help family', (await ev(RAW_KEYS)).length === 0, await ev(RAW_KEYS));
    check('no errors or warnings in the help family', t.logs.length === 0, t.logs.slice());
    await t.send('Emulation.setEmulatedMedia', { features: [] });
  }

  section('Fields family (base + buttons + notifications + dialogs + menus + fields)');
  {
    t.logs.length = 0;
    await t.send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
    await t.evaluate(`(() => { try { localStorage.removeItem('ayni-lang'); } catch { /* about:blank */ } return true; })()`);
    await t.open(BASE + '/tests/fields-only.html');
    check('a page with the fields family starts with no errors or warnings', t.logs.length === 0, t.logs.slice());
    const ev = (js) => t.evaluate(js);
    const wait = (ms) => ev(`new Promise((r) => setTimeout(r, ${ms}))`);
    const KEYS = { Escape: 27, Enter: 13, Tab: 9, F4: 115, ArrowUp: 38, ArrowDown: 40, ArrowRight: 39, ArrowLeft: 37, PageUp: 33, PageDown: 34, Home: 36, End: 35 };
    const key = async (k, mods = 0) => {
      await t.send('Input.dispatchKeyEvent', { type: 'keyDown', key: k, code: k, windowsVirtualKeyCode: KEYS[k] || 0, modifiers: mods, ...(k === 'Enter' ? { text: '\r' } : {}) });
      await t.send('Input.dispatchKeyEvent', { type: 'keyUp', key: k, code: k, windowsVirtualKeyCode: KEYS[k] || 0, modifiers: mods });
      await wait(60);
    };
    const ALT = 1;
    const type = async (s) => { await t.send('Input.insertText', { text: s }); await wait(40); };
    const mouse = (kind, x, y) => t.send('Input.dispatchMouseEvent', { type: kind, x, y, button: kind === 'mouseMoved' ? 'none' : 'left', buttons: kind === 'mousePressed' ? 1 : 0, clickCount: 1 });
    /* The page is scrolled to the element first, and waits: a scroll closes open popups, so it must be over */
    const into = async (sel) => { await ev(`(document.querySelector(${JSON.stringify(sel)}).scrollIntoView({ block: 'center' }), true)`); await wait(120); };
    const mid = (sel) => ev(`(() => { const r = document.querySelector(${JSON.stringify(sel)}).getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; })()`);
    const click = async (sel) => { await into(sel); const [x, y] = await mid(sel); await mouse('mouseMoved', x, y); await mouse('mousePressed', x, y); await mouse('mouseReleased', x, y); await wait(100); };
    const focus = async (sel) => { await into(sel); await ev(`(document.querySelector(${JSON.stringify(sel)}).focus(), true)`); };
    const val = (sel) => ev(`document.querySelector(${JSON.stringify(sel)}).value`);
    const attr = (sel, a) => ev(`document.querySelector(${JSON.stringify(sel)}).getAttribute(${JSON.stringify(a)})`);
    const height = (sel) => ev(`Math.round(document.querySelector(${JSON.stringify(sel)}).getBoundingClientRect().height)`);
    const css = (sel, p) => ev(`getComputedStyle(document.querySelector(${JSON.stringify(sel)})).${p}`);
    const btnOf = (id) => `#${id} ~ button:not(.err-mark)`;
    const popOf = (id) => ev(`document.querySelector('${btnOf(id)}').getAttribute('popovertarget')`);
    const openPop = () => ev(`[...document.querySelectorAll('.panel.popup:popover-open')].map((p) => p.id).join()`);
    const errText = (id) => ev(`(() => { const i = document.getElementById('${id}'); return i.getAttribute('aria-describedby').split(' ').map((x) => document.getElementById(x)).find((e) => e?.classList.contains('error'))?.textContent; })()`);
    const blur = async (sel, text) => { await focus(sel); await ev(`(document.querySelector(${JSON.stringify(sel)}).value = '', true)`); await type(text); await ev(`(document.querySelector(${JSON.stringify(sel)}).blur(), true)`); await wait(40); };
    const log = () => ev(`L.join('|')`);
    const reset = () => ev(`(document.querySelectorAll(':popover-open').forEach((p) => p.id !== 'ayni-toasts' && p.id !== 'ayni-tip' && p.hidePopover()), document.querySelectorAll('dialog[open]').forEach((d) => d.close()), L.length = 0, document.activeElement?.blur?.(), true)`);

    check('the family works without ayni.css and ayni.js', await ev(`!document.querySelector('link[href$="/ayni.css"], script[src$="/ayni.js"]') && typeof Ayni.status === 'undefined' && ['dateField', 'timeField', 'dateTimeField', 'calendar', 'focusFirstError'].every((k) => typeof Ayni[k] === 'function') && typeof Ayni.dates.iso === 'function'`));

    /* Look */
    check('a text field is 32 px tall and border-box', (await height('#name')) === 32 && (await css('#name', 'boxSizing')) === 'border-box');
    check('a field group (password) is 32 px too', (await height('#pw-eye')) <= 26 && (await height('#pw')) <= 32 && (await ev(`Math.round(document.querySelector('#pw').closest('.input-group').getBoundingClientRect().height)`)) === 32);
    check('.fields stacks its fields 12 px apart', await ev(`(() => { const a = document.querySelector('#name').closest('.field').getBoundingClientRect(), b = document.querySelector('#nick').closest('.field').getBoundingClientRect(); return Math.round(b.top - a.bottom); })()`) === 12);
    check('a label sits 4 px over its field', await ev(`(() => { const l = document.querySelector('label[for="name"]').getBoundingClientRect(), f = document.querySelector('#name').getBoundingClientRect(); return Math.round(f.top - l.bottom); })()`) === 4);
    check('the required mark is Danger', (await css('.req', 'color')) === (await ev(`(() => { const p = document.createElement('i'); p.style.color = 'var(--danger)'; document.body.append(p); const c = getComputedStyle(p).color; p.remove(); return c; })()`)));
    check('autofill keeps the field colours (rule present)', await ev(`[...document.styleSheets].some((s) => { try { return [...s.cssRules].some((r) => /\\.input:autofill|\\.input:-webkit-autofill/.test(r.selectorText || '')); } catch { return false; } })`));
    check('read-only: no border, tint; disabled: faded', (await css('#ro', 'borderTopColor')) === 'rgba(0, 0, 0, 0)' && (await css('#dis', 'opacity')) === '0.45');
    await click('label[for="name"]');
    check('a click on a label focuses its field', await ev(`document.activeElement.id`) === 'name');

    /* Errors */
    check('a field with aria-invalid shows the red "!"', await ev(`(() => { const m = document.querySelector('#email').parentElement.querySelector('.err-mark'); return !!m && !m.hidden; })()`));
    await focus('#email'); await wait(60);
    check('…and its message pops up while it has focus', await ev(`document.getElementById('ayni-err').matches(':popover-open') && document.getElementById('ayni-err').textContent.includes('full address')`));
    await ev(`(document.getElementById('email').setAttribute('aria-invalid', 'false'), true)`); await wait(60);
    check('fixed: the "!" and the popup go', await ev(`document.querySelector('#email').parentElement.querySelector('.err-mark').hidden && !document.getElementById('ayni-err').matches(':popover-open')`));
    check('a group with an error: "!" next to its legend', await ev(`!!document.querySelector('#ship > legend > .err-mark:not([hidden])')`));
    await reset(); await ev(`(document.getElementById('email').setAttribute('aria-invalid', 'true'), true)`);
    check('focusFirstError checks a typed date that never left its field', await ev(`(() => { const i = document.querySelector('#day'); i.value = '2026-13-01'; const r = Ayni.focusFirstError(i.closest('.col')) && document.activeElement === i && i.getAttribute('aria-invalid') === 'true'; day.set('2026-11-02'); return r; })()`));
    check('…and a good one is no error', await ev(`(() => { const i = document.querySelector('#time'); i.value = '8:15'; const r = !Ayni.focusFirstError(i.closest('.col')) && i.value === '08:15'; time.set('09:30'); return r; })()`));
    check('focusFirstError goes to the first wrong field', await ev(`Ayni.focusFirstError(document.querySelector('.cols')) && document.activeElement.id === 'email'`));
    await ev(`(document.getElementById('email').setAttribute('aria-invalid', 'false'), true)`); await reset();

    /* Password */
    await click('#pw-eye');
    check('show password: text shown, button pressed, its tooltip says Hide', (await attr('#pw', 'type')) === 'text' && (await attr('#pw-eye', 'aria-pressed')) === 'true' && (await attr('#pw-eye', 'data-tip')) === 'Hide password');
    check('…and the cursor is in the field', await ev(`document.activeElement.id`) === 'pw');
    await click('#pw-eye');
    check('hide again: back to dots, eye icon', (await attr('#pw', 'type')) === 'password' && await ev(`!!document.querySelector('#pw-eye [data-icon="eye"], #pw-eye .icon')`));
    await reset();

    check('a bare show-password button gets its eye, tooltip and pressed state', await ev(`(() => { const b = document.querySelector('#dlg-eye'); return !!b.querySelector('svg') && b.dataset.tip === 'Show password' && b.getAttribute('aria-label') === 'Show password' && b.getAttribute('aria-pressed') === 'false' && b.type === 'button'; })()`));

    /* Text areas */
    check('a text area is at least 80 px high', (await height('#ta')) >= 80);
    check('the count shows on a text area with a limit', await ev(`document.querySelector('.ta-count').textContent`) === '5 / 50');
    await focus('#ta'); await ev(`(document.querySelector('#ta').setSelectionRange(5, 5), true)`); await type('!!');
    check('…and follows the typing', await ev(`document.querySelector('.ta-count').textContent`) === '7 / 50');
    const g0 = await height('#grow'); await focus('#grow'); await type('a\nb\nc\nd\ne\nf\ng');
    check('auto-grow: the field grows with its text', (await height('#grow')) > g0);
    await reset();

    /* Number field */
    check('no ayni:change on load', (await log()) === '');
    await focus('#copies'); await key('ArrowUp');
    check('Up steps by one, and ayni:change gives the number', (await val('#copies')) === '3' && (await log()).startsWith('change copies-g:3'), await log());
    await key('PageUp'); check('Page Up steps by 10', (await val('#copies')) === '13');
    await key('End'); check('End goes to the maximum, and + is disabled there', (await val('#copies')) === '99' && (await attr('#copies-inc', 'aria-disabled')) === 'true');
    await key('Home'); check('Home goes to the minimum, and − is disabled there', (await val('#copies')) === '1' && (await attr('#copies-dec', 'aria-disabled')) === 'true');
    await ev(`(L.length = 0, true)`);
    await click('#copies-inc');
    check('a press on + steps once', (await val('#copies')) === '2' && (await log()) === 'change copies-g:2|native change copies:2', await log());
    await focus('#copies'); await ev(`(document.querySelector('#copies').select(), true)`); await type('500');
    check('out of range is not corrected: error "Between 1 and 99."', (await val('#copies')) === '500' && (await attr('#copies', 'aria-invalid')) === 'true' && (await errText('copies')) === 'Between 1 and 99.');
    await ev(`(L.length = 0, true)`);
    await focus('#kg'); await ev(`(document.querySelector('#kg').select(), true)`); await type('3,5');
    check('a comma decimal works, and the page gets the number', (await log()).includes('change kg-g:3.5'), await log());
    await key('ArrowUp'); check('…the comma is kept for display', (await val('#kg')) === '4');
    await ev(`(document.querySelector('#kg').value = '4,5', document.querySelector('#kg').dispatchEvent(new Event('input')), true)`);
    check('a number field with no .error gets one from Ayni', await ev(`(() => { const i = document.querySelector('#kg'); i.value = '99'; i.dispatchEvent(new Event('input')); return i.getAttribute('aria-invalid') === 'true' && !!document.getElementById(i.getAttribute('aria-describedby'))?.classList.contains('error'); })()`));
    await reset();

    check('a bare number group: Ayni made − and + (tooltips), a text box, spinbutton role', await ev(`(() => { const g = document.querySelector('#bare-g'), [a, b] = g.querySelectorAll('button[data-step]'); const i = document.querySelector('#bare'); return a?.dataset.tip === 'Decrease' && b?.dataset.tip === 'Increase' && !!a.querySelector('svg') && i.type === 'text' && i.getAttribute('role') === 'spinbutton' && i.inputMode === 'numeric'; })()`));
    check('…empty is a value when data-optional; the page gets null', await ev(`new Promise((r) => { const i = document.querySelector('#bare'); i.value = '5'; i.dispatchEvent(new Event('input')); document.querySelector('#bare-g').addEventListener('ayni:change', (e) => r(e.detail.value === null && i.getAttribute('aria-invalid') === 'false'), { once: true }); i.value = ''; i.dispatchEvent(new Event('input')); })`));
    check('…only a minimum: "At least 0."', await ev(`(() => { const i = document.querySelector('#bare'); i.value = '-1'; i.dispatchEvent(new Event('input')); const t = document.getElementById(i.getAttribute('aria-describedby')).textContent; i.value = '3'; i.dispatchEvent(new Event('input')); return t; })()`) === 'At least 0.');
    check('no limits: "Type a number." for letters; Home does nothing', await ev(`(() => { const i = document.querySelector('#free'); i.value = 'abc'; i.dispatchEvent(new Event('input')); const t = document.getElementById(i.getAttribute('aria-describedby')).textContent; i.value = '7'; i.dispatchEvent(new Event('input')); i.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true })); return t + '|' + i.value; })()`) === 'Type a number.|7');
    await ev(`(L.length = 0, true)`);
    await focus('#bare'); await key('ArrowUp');
    check('a step fires the native change event too', (await log()).includes('native change bare:4'));
    await ev(`(L.length = 0, true)`);
    { await into('#bare-g button[data-step="1"]'); const [x, y] = await mid('#bare-g button[data-step="1"]'); await mouse('mouseMoved', x, y); await mouse('mousePressed', x, y); await wait(900); await mouse('mouseReleased', x, y); await wait(60); }
    check('holding + repeats, and change fires once, when it is let go', (await ev(`+document.querySelector('#bare').value`)) >= 7 && (await ev(`L.filter((x) => x.startsWith('native change')).length`)) === 1, await log());
    await reset();

    /* Date field made by Ayni from a bare group */
    check('date: Ayni made its button (calendar icon, tooltip), popup, error and placeholder', await ev(`(() => { const i = document.querySelector('#day'), b = document.querySelector('${btnOf('day')}'), p = document.getElementById(b?.getAttribute('popovertarget') || ''); return !!b.querySelector('svg') && b.dataset.tip === 'Choose date' && b.getAttribute('aria-label') === 'Choose date' && !!p?.querySelector('.cal') && p.previousElementSibling?.classList.contains('error') && i.placeholder === 'YYYY-MM-DD' && i.closest('.input-group').classList.contains('date-field'); })()`));
    check('…the "!" sits before the button', await ev(`(() => { const g = document.querySelector('#day').closest('.input-group'); const kids = [...g.children]; return kids.indexOf(g.querySelector('.err-mark')) < kids.indexOf(document.querySelector('${btnOf('day')}')); })()`));
    await focus('#day'); await key('F4'); await wait(150);
    check('F4 opens the calendar, the focus on the field\'s day', (await openPop()) === (await popOf('day')) && (await ev(`document.activeElement.dataset.d`)) === '2026-11-02');
    await key('ArrowRight'); await key('Enter'); await wait(60);
    check('Right then Enter picks the next day, closes, and tells the page', (await val('#day')) === '2026-11-03' && (await openPop()) === '' && (await log()) === 'day 2026-11-03');
    check('…the focus goes back to the button', await ev(`document.activeElement === document.querySelector('${btnOf('day')}')`));
    await focus('#day'); await key('ArrowDown', ALT); await wait(150);
    check('Alt+Down opens it too', (await openPop()) === (await popOf('day')));
    await key('Escape'); await wait(60);
    check('Esc closes it', (await openPop()) === '');
    await blur('#day', '2026-02-30');
    check('a wrong date shows the error, in the page\'s language', (await attr('#day', 'aria-invalid')) === 'true' && (await errText('day')) === 'Use the form YYYY-MM-DD, like 2026-10-20.');
    await ev(`(L.length = 0, true)`); await blur('#day', '2026-12-24');
    check('fixed: no error, controller value, and the typed date is told to the page', (await attr('#day', 'aria-invalid')) === 'false' && (await ev(`day.value`)) === '2026-12-24' && (await log()) === 'day 2026-12-24');
    check('set() puts a date in, without telling the page', await ev(`(L.length = 0, day.set('2027-01-05'), document.querySelector('#day').value === '2027-01-05' && L.length === 0)`));
    check('read-only date: the button goes; disabled: faded', (await css('#ro-day ~ button', 'display')) === 'none' && (await ev(`getComputedStyle(document.querySelector('#dis-day').closest('.input-group')).opacity`)) === '0.45');
    await focus('#dis-day'); check('a disabled date field cannot be focused', await ev(`document.activeElement.id !== 'dis-day'`));
    await reset();

    check('a date the page put in itself is seen: picking the old value again is still told', await ev(`new Promise((r) => { L.length = 0; const i = document.querySelector('#day'); i.value = '2026-11-02'; i.dispatchEvent(new Event('blur')); L.length = 0; i.value = '2026-11-05'; const b = document.querySelector('${btnOf('day')}'); b.click(); setTimeout(() => { document.querySelector('#' + b.getAttribute('popovertarget') + ' .cal td button[data-d="2026-11-02"]').click(); r(L.join('|')); }, 150); })`) === 'day 2026-11-02', await log());
    await reset();
    check('a number field emptied from code is not marked wrong; a wrong one put right from code loses its "!"', await ev(`(() => { const i = document.querySelector('#copies'); i.value = ''; const a = i.getAttribute('aria-invalid') !== 'true'; i.value = '500'; const b = i.getAttribute('aria-invalid') === 'true'; i.value = '5'; const c = i.getAttribute('aria-invalid') === 'false' && !document.querySelector('#copies-dec').hasAttribute('aria-disabled'); return a && b && c; })()`));
    check('…but sent empty it is wrong', await ev(`(() => { const i = document.querySelector('#copies'); i.value = ''; const r = Ayni.focusFirstError(i.closest('.col')) && i.getAttribute('aria-invalid') === 'true'; i.value = '2'; return r; })()`));
    check('a date or time with a "!" put right from code loses it', await ev(`(() => { const d = document.querySelector('#day'), t = document.querySelector('#time'); d.value = 'x'; d.dispatchEvent(new Event('blur')); t.value = '99'; t.dispatchEvent(new Event('blur')); const bad = d.getAttribute('aria-invalid') === 'true' && t.getAttribute('aria-invalid') === 'true'; d.value = '2026-11-02'; t.value = '10:15'; return bad && d.getAttribute('aria-invalid') === 'false' && t.getAttribute('aria-invalid') === 'false' && time.value === '10:15'; })()`));
    await ev(`(time.set('09:30'), L.length = 0, true)`);
    /* Time field */
    check('time: Ayni made its clock button, popup with two boxes, error and placeholder', await ev(`(() => { const i = document.querySelector('#time'), b = document.querySelector('${btnOf('time')}'), p = document.getElementById(b.getAttribute('popovertarget')); return !!b.querySelector('svg') && b.dataset.tip === 'Choose time' && p.querySelectorAll('.time-row .input').length === 2 && !p.querySelector('input[type="number"]') && i.placeholder === 'HH:MM' && i.closest('.input-group').classList.contains('time-field'); })()`));
    check('…a typed 9:30 on load shows as 09:30', (await val('#time')) === '09:30');
    await blur('#time', '7.05');
    check('typed 7.05 becomes 07:05 and tells the page', (await val('#time')) === '07:05' && (await log()) === 'time 07:05');
    await blur('#time', '25:00');
    check('25:00 shows the error', (await attr('#time', 'aria-invalid')) === 'true' && (await errText('time')) === 'Use the form HH:MM, like 09:30.');
    await blur('#time', '09:55'); await ev(`(L.length = 0, true)`);
    await focus('#time'); await key('F4'); await wait(150);
    check('F4 opens the popup with the cursor in the hours', (await openPop()) === (await popOf('time')) && await ev(`document.activeElement.matches('.time-row .input') && document.activeElement.value === '09'`));
    await click(`#${await popOf('time')} [data-tstep="m,5"]`);
    check('+5 minutes carries over the hour, live', (await val('#time')) === '10:00' && (await log()) === 'time 10:00');
    await ev(`(document.querySelectorAll('#${await popOf('time')} .time-row .input')[1].focus(), true)`); await key('ArrowUp');
    check('Up in the minutes box steps 5', (await val('#time')) === '10:05');
    await key('Escape'); await wait(60);
    check('Esc closes it, the focus back on its button', (await openPop()) === '' && await ev(`document.activeElement === document.querySelector('${btnOf('time')}')`));
    await ev(`(time.set('23:30'), true)`); await focus('#time'); await key('F4'); await wait(150);
    await click(`#${await popOf('time')} [data-tstep="h,1"]`);
    check('23:30 + 1 hour is 00:30', (await val('#time')) === '00:30');
    await reset();
    check('controller: value and a quiet set()', await ev(`(time.set('6:00'), time.value === '06:00' && L.length === 0)`));
    check('an empty time is no error, and its value is empty', await ev(`(() => { const i = document.querySelector('#time'); i.value = ''; i.dispatchEvent(new Event('blur')); return i.getAttribute('aria-invalid') !== 'true' && time.value === ''; })()`));

    /* A date without a year */
    check('birthday: 05-14 is kept, the page gets --05-14', (await val('#bday')) === '05-14' && (await ev(`bday.value`)) === '--05-14');
    check('…its placeholder says both forms', (await attr('#bday', 'placeholder')) === 'YYYY-MM-DD or MM-DD');
    await blur('#bday', '--07-02');
    check('typed --07-02 shows 07-02', (await val('#bday')) === '07-02' && (await attr('#bday', 'aria-invalid')) === 'false');
    await blur('#bday', '02-29'); check('02-29 is a day', (await attr('#bday', 'aria-invalid')) === 'false');
    await blur('#bday', '13-01');
    check('13-01 is wrong, with its own message', (await attr('#bday', 'aria-invalid')) === 'true' && (await errText('bday')).includes('MM-DD'));
    await blur('#bday', '05-14'); await ev(`(L.length = 0, true)`);
    await click(btnOf('bday')); await wait(100);
    const ny = `#${await popOf('bday')} .no-year input`;
    check('opened on 05-14: the No year switch is on, the calendar on May 14', await ev(`document.querySelector('${ny}').checked && document.activeElement.dataset.d?.endsWith('-05-14')`));
    await click(ny);
    const Y = new Date().getFullYear();
    check('No year off: the date takes this year', (await val('#bday')) === `${Y}-05-14` && (await log()) === `bday ${Y}-05-14`);
    await click(ny);
    check('…on again: MM-DD', (await val('#bday')) === '05-14');
    await click(`#${await popOf('bday')} .cal td button[data-d$="-05-20"]`);
    check('picking a day with No year on gives --MM-DD', (await val('#bday')) === '05-20' && (await ev(`bday.value`)) === '--05-20');
    check('a field without noYear refuses MM-DD', await ev(`(() => { const i = document.querySelector('#day'); i.value = '05-14'; i.dispatchEvent(new Event('blur')); const r = i.getAttribute('aria-invalid') === 'true'; day.set('2026-11-02'); return r; })()`));
    await reset();

    /* Date and time made by Ayni */
    check('date and time: Ayni made its popup with the calendar and two time boxes', await ev(`(() => { const p = document.getElementById(document.querySelector('${btnOf('dt')}').getAttribute('popovertarget')); return !!p.querySelector('.cal') && p.querySelectorAll('.time-row .input').length === 2; })()`) && (await val('#dt')) === '2026-11-01 23:55');
    await click(btnOf('dt')); await wait(100);
    await click(`#${await popOf('dt')} [data-tstep="m,5"]`);
    check('…23:55 + 5 minutes moves to the next day', (await val('#dt')) === '2026-11-02 00:00');
    await reset();

    /* Sliders */
    check('a slider is drawn by Ayni: a thin line and a dot', (await css('#vol', 'appearance')) === 'none' && (await css('#vol', 'backgroundColor')) === 'rgba(0, 0, 0, 0)');
    await focus('#vol'); await key('ArrowRight');
    check('a keyboard focus ring goes round the dot, not the whole line', (await css('#vol', 'outlineStyle')) === 'none' && await ev(`[...document.styleSheets].some((s) => { try { return [...s.cssRules].some((r) => (r.selectorText || '').includes('range"]:focus-visible::-webkit-slider-thumb')); } catch { return false; } })`));
    check('arrow keys step it', (await val('#vol')) === '61');
    await focus('#ro-vol'); await key('ArrowRight');
    check('a read-only slider does not move', (await val('#ro-vol')) === '70');
    check('a disabled slider is faded', (await css('#dis-vol', 'opacity')) === '0.45');
    await reset();

    /* Toolbar fields and editing in place */
    check('fields in a toolbar take its 30 px; their inside buttons stay 26', (await height('#tb-cell')) === 30 && (await height('#tb-spin')) === 30 && (await ev(`Math.round(document.querySelector('#tb-spin .btn').getBoundingClientRect().height)`)) === 26);
    check('a toolbar button next to them keeps 30 px', (await height('#tb-bold')) === 30);
    const ieH = await height('#ie');
    await click('#ie');
    check('editing in place: the field has the same height as the text, with an Accent border', (await height('#ie-f')) === ieH && (await css('#ie-f', 'borderTopColor')) === (await ev(`(() => { const p = document.createElement('i'); p.style.color = 'var(--accent)'; document.body.append(p); const c = getComputedStyle(p).color; p.remove(); return c; })()`)));
    await reset();
    check('text that cannot be renamed has no text cursor', (await css('#ie-done', 'cursor')) === 'default' && (await css('#ie', 'cursor')) === 'text');

    /* In a dialog */
    await click('#open-dlg'); await wait(100);
    check('a dialog: its lead paragraph sits above the fields', await ev(`(() => { const h = document.querySelector('#dlg-lead').getBoundingClientRect(), r = document.querySelector('#dlg-row').getBoundingClientRect(); return h.bottom <= r.top; })()`));
    check('fields in a .field-row sit side by side', await ev(`(() => { const [a, b] = document.querySelectorAll('#dlg-row > .field'); return Math.abs(a.getBoundingClientRect().top - b.getBoundingClientRect().top) < 1 && a.getBoundingClientRect().right < b.getBoundingClientRect().left; })()`));
    check('a date field\'s popup lives inside the dialog', await ev(`document.getElementById(document.querySelector('${btnOf('dlg-day')}').getAttribute('popovertarget')).closest('dialog')?.id === 'dlg'`));
    await click(btnOf('dlg-day')); await wait(100);
    await click(`#${await popOf('dlg-day')} .cal td button[data-d="2026-11-10"]`);
    check('…and takes a pick while the dialog is modal', (await val('#dlg-day')) === '2026-11-10' && (await log()).includes('dlg-day 2026-11-10') && await ev(`document.getElementById('dlg').open`));
    await click('#dlg-go');
    check('a message about no single field: a Danger line at the bottom', await ev(`(() => { const e = document.querySelector('#dlg-err'), r = document.querySelector('#dlg-row'); return !e.hidden && e.getBoundingClientRect().top > r.getBoundingClientRect().bottom && getComputedStyle(e).color === getComputedStyle(document.querySelector('.req')).color; })()`));
    await focus('#srv'); await type('x');
    check('…it goes as soon as something changes', await ev(`document.querySelector('#dlg-err').hidden`));
    await reset();

    /* Touch */
    await ev(`(Ayni.setTouchPreview(true), true)`); await wait(100);
    check('touch: fields 44 px, sliders 44 px', (await height('#name')) === 44 && (await height('#vol')) === 44);
    check('touch: a toolbar field stays 30 px', (await height('#tb-cell')) === 30);
    await click(btnOf('day')); await wait(100);
    check('touch: calendar days are 44 px', (await ev(`Math.round(document.querySelector('#${await popOf('day')} .cal td button').getBoundingClientRect().height)`)) === 44);
    await reset();
    check('touch: the slider dot is drawn 20 px (rule present)', await ev(`[...document.styleSheets].some((s) => { try { return [...s.cssRules].some((r) => (r.selectorText || '').includes('html.touch input[type="range"]::-webkit-slider-thumb') && r.style.width === '20px'); } catch { return false; } })`));
    await ev(`(Ayni.setTouchPreview(false), true)`);

    check('no untranslated keys in the fields family', (await ev(RAW_KEYS)).length === 0, await ev(RAW_KEYS));
    /* ---------- Asking for a password ---------- */
    {
      const pwd = (o) => ev(`(window.pw = 'waiting', Ayni.ask(Object.assign({ password: true, title: 'Lock' }, ${JSON.stringify(o)})).then((v) => { window.pw = v; }), true)`);
      const open = () => ev(`!!document.querySelector('dialog.panel[open] #ayni-ask-pw')`);
      const type = (id, v) => ev(`(document.getElementById('${id}').value = ${JSON.stringify(v)}, true)`);
      const okBtn = `document.querySelector('dialog.panel[open] footer .btn.primary')`;
      await pwd({ lead: 'For the file', okTip: 'Open' }); await wait(80);
      check('password: a dialog with its lead, a password box and an eye', await ev(`(() => { const d = document.querySelector('dialog.panel[open]'), i = d.querySelector('#ayni-ask-pw'); return i.type === 'password' && i.autocomplete === 'current-password' && d.querySelector('p.hint').textContent === 'For the file' && !!d.querySelector('[data-reveal] .icon svg') && !d.querySelector('#ayni-ask-repeat'); })()`));
      check('password: the words are translated, the first box has the focus', await ev(`document.querySelector('dialog.panel[open] label').textContent === 'Password' && document.activeElement.id === 'ayni-ask-pw'`));
      check('password: the default button says what the page asked', await ev(`${okBtn}.dataset.tip === 'Open'`));
      await ev(`(${okBtn}.click(), true)`); await wait(40);
      check('password: an empty box is refused, with no message', await open() && await ev(`document.querySelector('dialog.panel[open] .form-error').hidden`));
      await type('ayni-ask-pw', ' a b '); await ev(`(${okBtn}.click(), true)`); await wait(60);
      check('password: it comes back exactly as typed, spaces too', (await ev(`window.pw`)) === ' a b ');
      check('password: the dialog is gone from the page', !(await ev(`!!document.getElementById('ayni-ask-pw')`)));
      await pwd({}); await wait(60); await ev(`(document.querySelector('dialog.panel[open] [data-close]').click(), true)`); await wait(60);
      check('password: cancelled, it answers null', (await ev(`window.pw`)) === null);
      await pwd({}); await wait(60); await ev(`(document.querySelector('dialog.panel[open]').close(), true)`); await wait(60);
      check('password: Esc answers null too', (await ev(`window.pw`)) === null);
      await pwd({ verify: true, min: 6 }); await wait(60);
      check('password: a new one asks twice, for the manager to make one', await ev(`document.getElementById('ayni-ask-repeat').type === 'password' && document.getElementById('ayni-ask-pw').autocomplete === 'new-password'`));
      await type('ayni-ask-pw', 'abc'); await type('ayni-ask-repeat', 'abc'); await ev(`(${okBtn}.click(), true)`); await wait(40);
      check('password: too short is refused and says how long', await open() && /6/.test(await ev(`document.querySelector('dialog.panel[open] .form-error').textContent`)));
      await type('ayni-ask-pw', 'abcdefg'); await type('ayni-ask-repeat', 'abcdefh'); await ev(`(${okBtn}.click(), true)`); await wait(40);
      check('password: two that differ are refused, the second box emptied', await open() && (await ev(`document.getElementById('ayni-ask-repeat').value`)) === '' && await ev(`document.activeElement.id`) === 'ayni-ask-repeat');
      await type('ayni-ask-repeat', 'abcdefg'); await ev(`(${okBtn}.click(), true)`); await wait(60);
      check('password: two the same go through', (await ev(`window.pw`)) === 'abcdefg');
      await pwd({ min: 20 }); await wait(60); await type('ayni-ask-pw', 'x'); await ev(`(${okBtn}.click(), true)`); await wait(60);
      check('password: one that exists is whatever it is', (await ev(`window.pw`)) === 'x');
    }
    check('no errors or warnings in the fields family', t.logs.length === 0, t.logs.slice());

    /* In another language */
    await ev(`(localStorage.setItem('ayni-lang', 'es'), true)`);
    await t.open(BASE + '/tests/fields-only.html');
    check('es: placeholders, tooltips and messages follow the page\'s language', await ev(`(() => { const i = document.querySelector('#copies'); i.value = '500'; i.dispatchEvent(new Event('input')); return [document.querySelector('#day').placeholder, document.querySelector('${btnOf('time')}').dataset.tip, document.getElementById('copies-err').textContent, document.querySelector('#bday').placeholder].join('|'); })()`) === 'AAAA-MM-DD|Elegir hora|Entre 1 y 99.|AAAA-MM-DD o MM-DD', await ev(`[document.querySelector('#day').placeholder, document.querySelector('${btnOf('time')}').dataset.tip, document.getElementById('copies-err').textContent]`));
    check('es: no untranslated keys', (await ev(RAW_KEYS)).length === 0, await ev(RAW_KEYS));
    await ev(`(localStorage.removeItem('ayni-lang'), true)`);
  }

  section('Pickers family (base + buttons + notifications + dialogs + menus + lists + fields + pickers)');
  {
    t.logs.length = 0;
    await t.send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
    await t.evaluate(`(() => { try { localStorage.removeItem('ayni-lang'); } catch { /* about:blank */ } return true; })()`);
    await t.open(BASE + '/tests/pickers-only.html');
    check('a page with the pickers family starts with no errors or warnings', t.logs.length === 0, t.logs.slice());
    const ev = (js) => t.evaluate(js);
    const wait = (ms) => ev(`new Promise((r) => setTimeout(r, ${ms}))`);
    const KEYS = { Escape: 27, Enter: 13, Tab: 9, F4: 115, ArrowUp: 38, ArrowDown: 40, Home: 36, End: 35, ' ': 32 };
    const key = async (k, mods = 0) => {
      const code = k === ' ' ? 'Space' : k.length === 1 ? 'Key' + k.toUpperCase() : k, text = k === 'Enter' ? '\r' : k.length === 1 ? k : undefined;
      await t.send('Input.dispatchKeyEvent', { type: 'keyDown', key: k, code, windowsVirtualKeyCode: KEYS[k] || (k.length === 1 ? k.toUpperCase().charCodeAt(0) : 0), modifiers: mods, ...(text ? { text } : {}) });
      await t.send('Input.dispatchKeyEvent', { type: 'keyUp', key: k, code, windowsVirtualKeyCode: KEYS[k] || 0, modifiers: mods });
      await wait(60);
    };
    const ALT = 1;
    const type = async (s) => { await t.send('Input.insertText', { text: s }); await wait(40); };
    const mouse = (kind, x, y) => t.send('Input.dispatchMouseEvent', { type: kind, x, y, button: kind === 'mouseMoved' ? 'none' : 'left', buttons: kind === 'mousePressed' ? 1 : 0, clickCount: 1 });
    /* The page is scrolled to the element first, and waits: a scroll moves open popups */
    const into = async (sel) => { await ev(`(document.querySelector(${JSON.stringify(sel)}).scrollIntoView({ block: 'center' }), true)`); await wait(120); };
    const mid = (sel) => ev(`(() => { const r = document.querySelector(${JSON.stringify(sel)}).getBoundingClientRect(); return [r.left + Math.min(r.width / 2, 20), r.top + r.height / 2]; })()`);
    const click = async (sel, scroll = true) => { if (scroll) await into(sel); const [x, y] = await mid(sel); await mouse('mouseMoved', x, y); await mouse('mousePressed', x, y); await mouse('mouseReleased', x, y); await wait(100); };
    const option = (id, text) => ev(`(() => { const o = [...document.querySelectorAll('#${id} [role="option"]')].find((x) => x.textContent === ${JSON.stringify(text)}); o.id ||= 'tmp-o'; return '#' + CSS.escape(o.id); })()`);
    const pickByMouse = async (id, text) => click(await option(id, text), false);
    const focus = async (sel) => { await into(sel); await ev(`(document.querySelector(${JSON.stringify(sel)}).focus(), true)`); };
    const isOpen = (id) => ev(`document.querySelector('#${id} .picker-pop').matches(':popover-open')`);
    const fieldText = (id) => ev(`(() => { const f = document.querySelector('#${id} > .input'); return f.tagName === 'INPUT' ? f.value : f.textContent; })()`);
    const active = (id) => ev(`document.querySelector('#${id} [role="option"].active')?.textContent || ''`);
    const height = (sel) => ev(`Math.round(document.querySelector(${JSON.stringify(sel)}).getBoundingClientRect().height)`);
    const css = (sel, p, pseudo) => ev(`getComputedStyle(document.querySelector(${JSON.stringify(sel)})${pseudo ? `, '${pseudo}'` : ''}).${p}`);
    const color = (v) => ev(`(() => { const p = document.createElement('i'); p.style.color = '${v}'; document.body.append(p); const c = getComputedStyle(p).color; p.remove(); return c; })()`);
    const bg = (v) => ev(`(() => { const p = document.createElement('i'); p.style.background = '${v}'; document.body.append(p); const c = getComputedStyle(p).backgroundColor; p.remove(); return c; })()`);
    const log = () => ev(`L.join('|')`);
    const reset = () => ev(`(document.querySelectorAll(':popover-open').forEach((p) => p.id !== 'ayni-toasts' && p.id !== 'ayni-tip' && p.hidePopover()), document.querySelectorAll('dialog[open]').forEach((d) => d.close()), L.length = 0, document.activeElement?.blur?.(), true)`);

    check('the family works without ayni.css and ayni.js', await ev(`!document.querySelector('link[href$="/ayni.css"], script[src$="/ayni.js"]') && typeof Ayni.status === 'undefined' && typeof Ayni.picker === 'function'`));

    /* A picker written in the page, with the least markup */
    check('written: Ayni adds the combobox role, the list link and the name', await ev(`(() => { const f = document.querySelector('#dd-f'); return f.getAttribute('role') === 'combobox' && f.getAttribute('aria-controls') === 'dd-list' && f.getAttribute('aria-expanded') === 'false' && f.getAttribute('aria-labelledby') && document.getElementById(f.getAttribute('aria-labelledby')).textContent === 'Priority'; })()`));
    check('the field shows the item\'s text, the form gets its value', (await fieldText('dd')) === 'Normal' && await ev(`new FormData(document.getElementById('form')).get('priority')`) === 'n');
    check('look: 32 px field, Accent triangle at its end', (await height('#dd-f')) === 32 && (await css('#dd', 'backgroundColor', '::after')) === (await bg('var(--accent)')) && (await css('#dd', 'right', '::after')) === '10px');
    await click('#dd-f');
    check('a click opens the list below the field', (await isOpen('dd')) && await ev(`document.querySelector('#dd .picker-pop').getBoundingClientRect().top >= document.querySelector('#dd-f').getBoundingClientRect().bottom`) && (await ev(`document.querySelector('#dd-f').getAttribute('aria-expanded')`)) === 'true');
    check('the chosen item is full Accent and highlighted', (await css('#dd [aria-selected="true"]', 'backgroundColor')) === (await bg('var(--accent)')) && (await active('dd')) === 'Normal');
    check('a click on the field closes it again', (await click('#dd-f', false), !(await isOpen('dd'))));
    await click('#dd-f'); await pickByMouse('dd', 'High');
    check('pick with the mouse: text, value, event with value, text and name', (await fieldText('dd')) === 'High' && (await ev(`document.querySelector('#dd input[type=hidden]').value`)) === 'h' && (await log()) === 'dd:h/High/Priority', await log());
    check('…the list closes and the focus is in the field', !(await isOpen('dd')) && (await ev(`document.activeElement.id`)) === 'dd-f');
    await reset(); await focus('#dd-f');
    await key('u');
    check('type-ahead while closed picks the match', (await fieldText('dd')) === 'Urgent' && (await log()) === 'dd:u/Urgent/Priority');
    await key('ArrowDown');
    check('Down on a closed list opens it (the value stays)', (await isOpen('dd')) && (await fieldText('dd')) === 'Urgent');
    await key('Home'); check('Home goes to the first item', (await active('dd')) === 'Low');
    await key('End'); check('End goes to the last', (await active('dd')) === 'Urgent');
    await key('ArrowUp'); await key('Escape');
    check('Esc closes and keeps the value', !(await isOpen('dd')) && (await fieldText('dd')) === 'Urgent' && (await ev(`document.activeElement.id`)) === 'dd-f');
    await key('ArrowDown', ALT); check('Alt+Down opens', await isOpen('dd'));
    await key('ArrowUp'); await key('Enter');
    check('arrows move, Enter picks', (await fieldText('dd')) === 'High' && !(await isOpen('dd')));
    await key('F4'); check('F4 opens', await isOpen('dd')); await key('F4'); check('…and closes', !(await isOpen('dd')));
    await key(' '); check('Space opens a drop-down list', await isOpen('dd')); await key('Escape');
    await ev(`(L.length = 0, true)`);
    await ev(`(document.querySelector('#dd').ayniTest = 1, true)`);
    check('Ayni.picker on a written picker gives its controller', await ev(`(() => { const p = Ayni.picker('#dd'); return p.value === 'h' && p.text === 'High' && p.mode === 'list' && p.options.length === 4 && p.name === 'Priority'; })()`));
    await reset();

    /* Combo box */
    await focus('#city-f'); await type('mal');
    check('combo: typing filters by the search rule (accents aside)', (await isOpen('city')) && await ev(`[...document.querySelectorAll('#city [role=option]')].filter((o) => !o.hidden).map((o) => o.textContent).join()`) === 'Málaga');
    await key('Enter');
    check('combo: Enter picks the suggestion', (await fieldText('city')) === 'Málaga' && (await log()) === 'city:Málaga/Málaga/City');
    await ev(`(document.querySelector('#city-f').select(), true)`); await type('Teruel');
    check('combo: nothing matches = the line, in words', await ev(`!document.querySelector('#city .picker-empty').hidden && document.querySelector('#city .picker-empty').textContent`) === 'Nothing matches. Enter keeps what you typed.');
    await key('Enter');
    check('combo: Enter keeps what was typed', (await ev(`Ayni.picker('#city').value`)) === 'Teruel' && (await log()).endsWith('city:Teruel/Teruel/City'));
    await reset();

    /* Filtered list */
    check('filtered list made in code: a typing field, labelled by the label that named the picker', await ev(`(() => { const f = document.querySelector('#tz > .input'); return f.tagName === 'INPUT' && f.id === 'tz-field' && document.querySelector('label[for="tz-field"]')?.textContent === 'Time zone' && f.value === 'Europe/Madrid'; })()`));
    await focus('#tz-field'); await ev(`(document.querySelector('#tz-field').select(), true)`); await type('lon');
    check('filtered: typing narrows the list', await ev(`[...document.querySelectorAll('#tz [role=option]')].filter((o) => !o.hidden).map((o) => o.textContent).join()`) === 'Europe/London' && (await active('tz')) === 'Europe/London');
    await key('Enter');
    check('filtered: Enter takes the first match', (await ev(`tz.value`)) === 'Europe/London' && !(await isOpen('tz')));
    await ev(`(document.querySelector('#tz-field').select(), true)`); await type('Atlantis');
    check('filtered: nothing matches = the line', await ev(`document.querySelector('#tz .picker-empty').textContent`) === 'Nothing matches.');
    await key('Escape'); check('filtered: Esc closes the list and puts the text back', !(await isOpen('tz')) && (await fieldText('tz')) === 'Europe/London');
    await ev(`(document.querySelector('#tz-field').select(), true)`); await type('Atlantis'); await ev(`(tz.close(), true)`); await key('Enter');
    check('filtered: free text is refused with the red "!" and its message', await ev(`(() => { const f = document.querySelector('#tz-field'), m = document.querySelector('#tz > .err-mark'); return f.getAttribute('aria-invalid') === 'true' && m && !m.hidden && document.getElementById('tz-field-err').textContent === 'Pick one from the list.'; })()`));
    check('…the value stays as it was, no event', (await ev(`tz.value`)) === 'Europe/London' && !(await log()).includes('Atlantis'));
    check('…the message pops up while the field has the focus', await ev(`document.getElementById('ayni-err').matches(':popover-open') && document.getElementById('ayni-err').textContent === 'Pick one from the list.'`));
    check('…and the "!" sits inside the field, before the triangle', await ev(`(() => { const m = document.querySelector('#tz > .err-mark').getBoundingClientRect(), f = document.querySelector('#tz-field').getBoundingClientRect(); return m.right < f.right - 15 && m.left > f.left && m.top > f.top && m.bottom < f.bottom; })()`));
    check('focusFirstError finds it', await ev(`(document.activeElement.blur(), Ayni.focusFirstError(document.getElementById('form')) && document.activeElement.id === 'tz-field')`));
    await ev(`(document.querySelector('#tz-field').select(), true)`); await type('europe/PARIS'); await ev(`(tz.close(), true)`);
    await ev(`(document.querySelector('#tz-field').blur(), true)`); await wait(60);
    check('filtered: an item\'s text in another case is taken on leaving, and the "!" goes', (await ev(`tz.value`)) === 'Europe/Paris' && (await fieldText('tz')) === 'Europe/Paris' && (await ev(`document.querySelector('#tz-field').getAttribute('aria-invalid')`)) === null && await ev(`document.querySelector('#tz > .err-mark').hidden`));
    check('focusFirstError then finds nothing', await ev(`!Ayni.focusFirstError(document.getElementById('form'))`));
    await reset();

    /* Built in code: headings, short text, placeholder, set */
    check('the closed field shows the short text, text gives the full one', (await fieldText('cur')) === 'EUR' && (await ev(`cur.text`)) === 'EUR · Euro');
    check('headings are drawn, are not items, look dim', (await ev(`document.querySelectorAll('#cur li.heading').length`)) === 2 && (await ev(`cur.options.length`)) === 5 && (await css('#cur li.heading', 'color')) === (await color('var(--text-dim)')) && (await ev(`document.querySelector('#cur li.heading').getAttribute('role')`)) === 'presentation');
    await focus('#cur > .input'); await key('ArrowDown');
    check('the list is at least as wide as the field and shows full texts', await ev(`document.querySelector('#cur .picker-pop').getBoundingClientRect().width >= document.querySelector('#cur > .input').getBoundingClientRect().width`) && (await active('cur')) === 'EUR · Euro');
    await key('ArrowDown'); await key('ArrowDown');
    check('the keys skip the headings', (await active('cur')) === 'CHF · Swiss franc');
    await key('Enter');
    check('a user pick calls onChange(value, text) and fires the event', (await log()) === 'cur:CHF/CHF · Swiss franc/Currency|onChange CHF/CHF · Swiss franc', await log());
    await ev(`(L.length = 0, cur.set('XAU', 'Gold'), true)`);
    check('set(value, text) shows a value the list does not hold, without adding it', (await fieldText('cur')) === 'Gold' && (await ev(`cur.value + '|' + cur.options.length + '|' + document.querySelectorAll('#cur [aria-selected="true"]').length`)) === 'XAU|5|0');
    await ev(`cur.set('')`);
    check('nothing chosen: the dim placeholder', (await fieldText('cur')) === '' && (await css('#cur > .input', 'content', '::before')) === '"Pick a currency"' && (await css('#cur > .input', 'color', '::before')) === (await color('var(--text-dim)')));
    check('set never fires the event', (await log()) === '');
    await ev(`(cur.options = [{ value: 'SEK', text: 'SEK · Swedish krona', short: 'SEK' }, 'NOK'], cur.value = 'NOK', true)`);
    check('options replaced at any time', (await ev(`[...document.querySelectorAll('#cur [role=option]')].map((o) => o.textContent).join()`)) === 'SEK · Swedish krona,NOK' && (await fieldText('cur')) === 'NOK');
    await ev(`(L.length = 0, cur.options = [{ value: 'A', text: 'Alpha' }, { value: 'B', text: 'Beta', disabled: true }, { value: 'C', text: 'Gamma' }], cur.set('A'), true)`);
    await focus('#cur > .input'); await key('ArrowDown'); await key('ArrowDown');
    check('a disabled item shows faded and the keys pass over it', (await active('cur')) === 'Gamma' && (await css('#cur [aria-disabled="true"]', 'opacity')) === '0.45');
    await ev(`(document.querySelector('#cur [aria-disabled="true"]').click(), true)`);
    check('…a click on it picks nothing', (await ev(`cur.value`)) === 'A' && (await log()) === '');
    await key('Escape');
    await ev(`(cur.choose('C'), true)`);
    check('choose(value) picks as the user would: the event and onChange', (await ev(`cur.value`)) === 'C' && (await log()) === 'cur:C/Gamma/Currency|onChange C/Gamma', await log());
    await ev(`(L.length = 0, true)`);
    await reset();

    /* States */
    check('disabled: faded, not focusable, never opens', (await css('#dis', 'opacity')) === '0.45' && (await ev(`document.querySelector('#dis-f').tabIndex`)) === -1 && (await ev(`(Ayni.picker('#dis').open(), Ayni.picker('#dis').isOpen)`)) === false);
    await ev(`(Ayni.picker('#cur').disabled = true, true)`);
    check('controller disabled = the same look', (await css('#cur', 'opacity')) === '0.45' && (await ev(`document.querySelector('#cur > .input').getAttribute('aria-disabled')`)) === 'true');
    await ev(`(Ayni.picker('#cur').disabled = false, true)`);
    await click('#ro-f');
    check('read-only: tint, no border, no triangle, does not open', (await css('#ro-f', 'borderTopColor')) === 'rgba(0, 0, 0, 0)' && (await css('#ro', 'display', '::after')) === 'none' && !(await isOpen('ro')) && (await fieldText('ro')) === 'B');
    await focus('#ro-f'); await key('a');
    check('read-only: type-ahead changes nothing', (await fieldText('ro')) === 'B');
    await reset();

    /* Placing */
    await ev(`(window.scrollTo(0, 0), true)`); await wait(80);
    await click('#low > .input', false);
    check('no room below: the list opens above the field', (await isOpen('low')) && await ev(`document.querySelector('#low .picker-pop').getBoundingClientRect().bottom <= document.querySelector('#low > .input').getBoundingClientRect().top`));
    check('a picker with no label is named by its aria-label', (await ev(`document.querySelector('#low > .input').getAttribute('aria-label')`)) === 'Near the bottom');
    await reset();

    /* In a toolbar */
    check('toolbar: 30 px, no fill, a thin line', (await height('#font > .input')) === 30 && (await css('#font > .input', 'backgroundColor')) === 'rgba(0, 0, 0, 0)' && (await css('#font > .input', 'borderTopColor')) === (await color('var(--line)')));
    check('toolbar: named by its tooltip', (await ev(`document.querySelector('#font > .input').getAttribute('aria-label')`)) === 'Font');
    await into('#font'); { const [x, y] = await mid('#font > .input'); await mouse('mouseMoved', x, y); await wait(80); }
    check('toolbar: grey tint under the pointer, not Accent', (await css('#font > .input', 'backgroundColor')) === (await bg('color-mix(in srgb, var(--text) 9%, transparent)')));
    await ev(`(() => { const d = document.getElementById('doc'); d.focus(); const r = document.createRange(); r.setStart(d.firstChild, 5); r.collapse(true); getSelection().removeAllRanges(); getSelection().addRange(r); return true; })()`);
    await click('#font > .input', false);
    check('toolbar: the pointer opens the list and the document keeps the focus', (await isOpen('font')) && (await ev(`document.activeElement.id`)) === 'doc');
    await pickByMouse('font', 'Georgia');
    check('toolbar: after a pick the focus and the caret are where they were', (await ev(`font.value`)) === 'Georgia' && (await ev(`document.activeElement.id + '|' + getSelection().anchorOffset`)) === 'doc|5');
    await click('#size > .input', false); await ev(`(document.querySelector('#size > .input').select(), true)`); await type('13'); await key('Enter');
    check('toolbar combo: typed 13 + Enter, the focus goes back to the document', (await ev(`size.value`)) === '13' && (await ev(`document.activeElement.id`)) === 'doc');
    await click('#size > .input', false); await key('Escape'); await key('Escape');
    check('toolbar: Esc gives the focus back too', (await ev(`document.activeElement.id`)) === 'doc' && (await fieldText('size')) === '13');
    await reset();

    /* More, in an overfull title row */
    check('fitBar: a picker leaves first by its rank', await ev(`document.getElementById('fit-size').classList.contains('fit-out')`));
    check('More: the picker is a submenu of its items, the chosen one ticked', await ev(`(() => { const it = fb.items().find((i) => i.label === 'Size'); const s = it && it.sub(); return !!s && s.map((x) => x.label + (x.checked ? '*' : '')).join() === '10,12*,14'; })()`));
    await click('#fit .fit-more'); await wait(60);
    await ev(`(() => { const r = [...document.querySelectorAll('#ayni-menu [role^="menuitem"]')].find((x) => x.textContent.includes('Size')); r.click(); return true; })()`); await wait(120);
    await ev(`(() => { const r = [...document.querySelectorAll('#ayni-menu-sub [role^="menuitem"]')].find((x) => x.textContent.trim() === '14'); r.click(); return true; })()`); await wait(80);
    check('…a row picked there sets it and fires the event', (await ev(`fitSize.value`)) === '14' && (await log()) === 'fit-size:14/14/Size', await log());
    await reset();

    /* In a menu row */
    await click('#menu-btn'); await wait(60);
    await click('#dow > .input', false);
    check('menu row: the list opens over the menu, the menu stays', (await isOpen('dow')) && await ev(`document.getElementById('menu').matches(':popover-open')`));
    await pickByMouse('dow', 'Sunday');
    check('menu row: a pick sets it and leaves the menu open', (await ev(`dow.value`)) === '0' && await ev(`document.getElementById('menu').matches(':popover-open')`));
    await focus('#dow > .input'); await key('ArrowDown');
    check('menu row: Down opens the list, not the next menu row', (await isOpen('dow')) && (await ev(`document.activeElement.id`)) === 'dow-field');
    await key('Escape');
    check('menu row: Esc closes only the list', !(await isOpen('dow')) && await ev(`document.getElementById('menu').matches(':popover-open')`));
    await ev(`(document.activeElement.blur(), true)`); await wait(40); await click('#dow > .input', false);
    check('menu row: opened by the pointer, the list does not take the focus', (await isOpen('dow')) && (await ev(`document.activeElement.id`)) !== 'dow-field');
    await ev(`(document.getElementById('menu').hidePopover(), true)`); await wait(40);
    check('menu row: closing the menu closes the list', !(await isOpen('dow')));
    await reset();

    /* In a modal dialog */
    await click('#dlg-open'); await wait(80);
    await click('#dlg-pk > .input', false);
    check('dialog: the list opens inside the modal dialog and takes clicks', (await isOpen('dlg-pk')) && await ev(`document.getElementById('dlg').contains(document.querySelector('#dlg-pk .picker-pop'))`));
    await pickByMouse('dlg-pk', 'Landscape');
    check('dialog: picked', (await ev(`dlgPk.value`)) === 'Landscape' && await ev(`document.getElementById('dlg').open`));
    await key('ArrowDown'); await key('Escape');
    check('dialog: Esc closes the list, not the dialog', !(await isOpen('dlg-pk')) && await ev(`document.getElementById('dlg').open`));
    await key('Escape'); await wait(80);
    check('dialog: the next Esc closes the dialog', !(await ev(`document.getElementById('dlg').open`)));
    await reset();

    /* Saved as it changes */
    await click('#auto > .input'); await pickByMouse('auto', 'Dark'); await wait(80);
    check('autoSave: a pick saves its value', (await ev(`S.join()`)) === 'Dark' && (await ev(`auto.value`)) === 'Dark' && !(await ev(`auto.disabled`)));
    await click('#auto > .input'); await pickByMouse('auto', 'Broken'); await wait(120);
    check('autoSave: a failed save puts the old value back and says so', (await ev(`S.join()`)) === 'Dark,Broken' && (await ev(`auto.value`)) === 'Dark' && (await fieldText('auto')) === 'Dark' && await ev(`!document.getElementById('auto-msg').hidden && document.getElementById('auto-msg').textContent.length > 0`));
    await reset();

    /* Touch and phones */
    await ev(`(Ayni.setTouchPreview(true), true)`);
    check('touch: the field is 44 px, a toolbar picker stays 30 px', (await height('#dd-f')) === 44 && (await height('#font > .input')) === 30);
    check('touch: a toolbar picker takes a press 6 px above and below it (44 px hit area)', await ev(`(() => { const f = document.querySelector('#font > .input'); f.scrollIntoView({ block: 'center' }); const r = f.getBoundingClientRect(), x = r.left + r.width / 2; return [r.top - 6, r.bottom + 6].every((y) => document.elementFromPoint(x, y) === f); })()`));
    await click('#dd-f');
    check('touch: rows are 44 px', (await height('#dd [role="option"]')) >= 44);
    await reset();
    await t.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 760, deviceScaleFactor: 1, mobile: true });
    await wait(150);
    await click('#tz-field');
    check('phone: the list is a bottom sheet the width of the screen, the field above it', (await isOpen('tz')) && await ev(`(() => { const p = document.querySelector('#tz .picker-pop'), r = p.getBoundingClientRect(), f = document.querySelector('#tz-field').getBoundingClientRect(); return p.classList.contains('sheet') && Math.round(r.bottom) === innerHeight && Math.round(r.width) === innerWidth && f.bottom <= r.top; })()`));
    await reset();
    await ev(`(Ayni.setTouchPreview(false), true)`);
    await t.send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });

    check('no untranslated keys in the pickers family', (await ev(RAW_KEYS)).length === 0, await ev(RAW_KEYS));
    check('no errors or warnings in the pickers family', t.logs.length === 0, t.logs.slice());

    /* In another language */
    await ev(`(localStorage.setItem('ayni-lang', 'es'), true)`);
    await t.open(BASE + '/tests/pickers-only.html');
    await ev(`(() => { const f = document.querySelector('#tz-field'); f.value = 'Atlantis'; f.dispatchEvent(new Event('input')); tz.close(); f.dispatchEvent(new FocusEvent('blur')); return true; })()`); await wait(60);
    check('es: the empty lines and the message follow the page\'s language', await ev(`[document.querySelector('#city .picker-empty').textContent, document.querySelector('#tz .picker-empty').textContent, document.getElementById('tz-field-err').textContent].join('|')`) === 'Nada coincide. Intro guarda lo que has escrito.|Nada coincide.|Elige uno de la lista.');
    check('es: no untranslated keys', (await ev(RAW_KEYS)).length === 0, await ev(RAW_KEYS));
    await ev(`(localStorage.removeItem('ayni-lang'), true)`);
  }

  section('Layout family (base + buttons + notifications + dialogs + layout)');
  {
    t.logs.length = 0;
    await t.send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
    const PAGE = BASE + '/tests/layout-only.html';
    await t.open(PAGE); await t.evaluate(`(localStorage.clear(), true)`); await t.open(PAGE);
    check('a page with the layout family starts with no errors or warnings', t.logs.length === 0, t.logs.slice());
    check('no ayni.css, no ayni.js', await t.evaluate(`![...document.scripts].some((s) => /\\/ayni\\.js$/.test(s.src)) && ![...document.styleSheets].some((s) => /\\/ayni\\.css$/.test(s.href || ''))`));
    const ev = (js) => t.evaluate(js);
    const wait = (ms) => ev(`new Promise((r) => setTimeout(r, ${ms}))`);
    const KEYS = { Enter: 13, Delete: 46, ArrowLeft: 37, ArrowUp: 38, ArrowRight: 39, ArrowDown: 40, Home: 36, End: 35, PageUp: 33, PageDown: 34 };
    const CTRL = 2;
    const key = async (k, mods = 0) => {
      await t.send('Input.dispatchKeyEvent', { type: 'keyDown', key: k, code: k, windowsVirtualKeyCode: KEYS[k], modifiers: mods });
      await t.send('Input.dispatchKeyEvent', { type: 'keyUp', key: k, code: k, windowsVirtualKeyCode: KEYS[k], modifiers: mods });
      await wait(30);
    };
    let held = false;   /* A move while the button is down says so, or Chromium ends the drag */
    const mouse = (kind, x, y, button = 'left') => {
      if (kind === 'mousePressed') held = true; if (kind === 'mouseReleased') held = false;
      return t.send('Input.dispatchMouseEvent', { type: kind, x, y, button: kind === 'mouseMoved' && !held ? 'none' : button, buttons: held ? (button === 'middle' ? 4 : 1) : 0, clickCount: 1 });
    };
    const into = async (sel) => { await ev(`(document.querySelector(${JSON.stringify(sel)}).scrollIntoView({ block: 'center' }), true)`); await wait(60); };
    const mid = (sel) => ev(`(() => { const r = document.querySelector(${JSON.stringify(sel)}).getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; })()`);
    const click = async (sel, button = 'left') => { await into(sel); const [x, y] = await mid(sel); await mouse('mouseMoved', x, y); await mouse('mousePressed', x, y, button); await mouse('mouseReleased', x, y, button); await wait(30); };
    const log = () => ev(`L.splice(0).join('|')`);
    const sel = (list) => ev(`Ayni.tabs(${JSON.stringify(list)}).tabs.find((t) => t.getAttribute('aria-selected') === 'true')?.textContent.trim()`);
    const focused = () => ev(`document.activeElement.textContent.trim()`);
    const TAB = (list, i) => `${list} > [role="tab"]:nth-of-type(${i})`;
    const tip = (sel2) => ev(`document.querySelector(${JSON.stringify(sel2)}).dataset.tip ?? null`);

    /* ---------- Tabs written in the page ---------- */
    check('load: the first tab is selected, the others\' panels hidden', (await sel('#t1')) === 'One' && await ev(`!p1.hidden && p2.hidden && p3.hidden`));
    check('load: nothing is told (only a user\'s pick is)', (await log()) === '');
    check('load: panels get their role and name their tab', await ev(`p1.getAttribute('role') === 'tabpanel' && p1.getAttribute('aria-labelledby') === document.querySelector('#t1 > [role="tab"]').id`));
    check('load: one Tab stop in the row', await ev(`[...document.querySelectorAll('#t1 > [role="tab"]')].map((t) => t.tabIndex).join()`) === '0,-1,-1,-1,-1,-1');
    check('a name sits in .tab-text, the icon stays out of it', await ev(`(() => { const t = document.querySelector('#t1 > [role="tab"]'); return t.querySelector('.tab-text').textContent === 'One' && t.querySelector('.tab-text .icon') === null && t.querySelector('.icon') !== null; })()`));
    await click(TAB('#t1', 3));
    check('a click selects, shows its panel and focuses the tab', (await sel('#t1')) === 'Three' && await ev(`!p3.hidden && p1.hidden`) && (await focused()) === 'Three');
    check('…and tells it once', (await log()) === 'select t1:Three');
    await click(TAB('#t1', 3));
    check('a click on the selected tab tells nothing', (await log()) === '');
    await click(TAB('#t1', 2));
    check('a click on a disabled tab does nothing', (await sel('#t1')) === 'Three' && (await log()) === '');
    check('a disabled tab says why', (await tip(TAB('#t1', 2))) === 'Needs an account');
    check('a disabled tab is faded', (await ev(`getComputedStyle(document.querySelector(${JSON.stringify(TAB('#t1', 2))})).opacity`)) === '0.45');
    await click(TAB('#t1', 1)); await log();
    await key('ArrowRight');
    check('Right skips the disabled tab', (await sel('#t1')) === 'Three' && (await focused()) === 'Three');
    await key('ArrowLeft');
    check('Left comes back', (await sel('#t1')) === 'One');
    await key('ArrowLeft');
    check('Left wraps to the last', (await sel('#t1')) === 'Six');
    await key('ArrowRight');
    check('Right wraps to the first', (await sel('#t1')) === 'One');
    await key('End'); check('End = the last', (await sel('#t1')) === 'Six');
    await key('Home'); check('Home = the first', (await sel('#t1')) === 'One');
    await key('ArrowRight', CTRL);
    check('Ctrl+Right is left alone', (await sel('#t1')) === 'One');
    await log();
    await click('#in1'); await key('ArrowRight');
    check('arrows in a field of the panel stay in the field', (await sel('#t1')) === 'One');
    await key('PageDown', CTRL);
    check('Ctrl+Page Down from a field in the panel: next tab', (await sel('#t1')) === 'Three');
    await key('PageUp', CTRL);
    check('Ctrl+Page Up: previous tab', (await sel('#t1')) === 'One');
    await key('PageUp', CTRL);
    check('Ctrl+Page Up wraps', (await sel('#t1')) === 'Six');
    await ev(`(Ayni.tabs('#t1').select('p3'), true)`);
    await click('#in2'); await key('PageDown', CTRL);
    check('tabs inside tabs: the innermost set wins', (await sel('#t5')) === 'In two' && (await sel('#t1')) === 'Three');
    await log();

    await ev(`(Ayni.tabs('#t1').select('p4'), document.querySelector(${JSON.stringify(TAB('#t1', 4))}).focus(), true)`);
    await key('Delete');
    check('Delete closes a closable tab: the neighbour takes over, with the focus', (await sel('#t1')) === 'Five' && (await focused()) === 'Five' && await ev(`document.querySelector(${JSON.stringify(TAB('#t1', 4))}).hidden && p4.hidden`));
    check('…and tells both', (await log()) === 'select t1:Five|close t1:Four');
    await ev(`(document.querySelector(${JSON.stringify(TAB('#t1', 4))}).hidden = false, Ayni.tabs('#t1').select('p1'), true)`);
    await click(TAB('#t1', 5) + ' .tab-close');
    check('the (x) closes a tab that is not selected; the selection stays and has the focus', (await sel('#t1')) === 'One' && (await focused()) === 'One' && await ev(`document.querySelector(${JSON.stringify(TAB('#t1', 5))}).hidden`));
    await log();
    await click(TAB('#t1', 6), 'middle');
    check('a middle click closes a closable tab', await ev(`document.querySelector(${JSON.stringify(TAB('#t1', 6))}).hidden`) && (await log()) === 'close t1:Six');
    await ev(`(document.querySelector(${JSON.stringify(TAB('#t1', 3))}).focus(), true)`);
    await key('Delete');
    check('Delete leaves a tab that is not closable', await ev(`!document.querySelector(${JSON.stringify(TAB('#t1', 3))}).hidden`));
    await click(TAB('#t1', 1), 'middle');
    check('a middle click leaves a tab that is not closable', await ev(`!document.querySelector(${JSON.stringify(TAB('#t1', 1))}).hidden`));
    await log();

    /* ---------- The controller ---------- */
    await ev(`(window.c1 = Ayni.tabs('#t1'), true)`);
    check('Ayni.tabs on a wired row gives the same controller', await ev(`Ayni.tabs(document.getElementById('t1')) === c1`));
    check('value = the panel\'s id; a tab with no panel its data-value', (await ev(`c1.value`)) === 'p1' && (await ev(`sheets.value`)) === 'a');
    await ev(`(c1.select('p3'), true)`);
    check('select() changes the tab and tells nothing', (await sel('#t1')) === 'Three' && (await log()) === '');
    await ev(`(c1.value = 'p1', true)`);
    check('value = does the same', (await sel('#t1')) === 'One' && (await log()) === '');
    await ev(`(c1.setTabEnabled('p3', false, 'Not now'), true)`);
    check('setTabEnabled(false, why): disabled, the tooltip says why', await ev(`document.querySelector(${JSON.stringify(TAB('#t1', 3))}).getAttribute('aria-disabled') === 'true'`) && (await tip(TAB('#t1', 3))) === 'Not now');
    await ev(`(c1.setTabEnabled('p3', true), true)`);
    check('setTabEnabled(true): back, and the tooltip goes', await ev(`!document.querySelector(${JSON.stringify(TAB('#t1', 3))}).hasAttribute('aria-disabled')`) && (await tip(TAB('#t1', 3))) === null);
    await ev(`(c1.setTabEnabled('p2', true), c1.setTabEnabled('p2', false, 'Other'), c1.setTabEnabled('p2', true), true)`);
    check('a tab\'s own tooltip comes back after "why"', (await tip(TAB('#t1', 2))) === 'Needs an account');
    await ev(`(c1.select('p3'), c1.setTabEnabled('p3', false), true)`);
    check('disabling the selected tab moves off it', (await sel('#t1')) !== 'Three');
    await ev(`(c1.setTabEnabled('p3', true), c1.close('p1'), true)`);
    check('close() closes it', await ev(`document.querySelector(${JSON.stringify(TAB('#t1', 1))}).hidden`));
    await log();

    /* ---------- Hash, many tabs ---------- */
    await into('#t4'); await click(TAB('#t4', 2));
    check('data-hash: the tab goes in the address', (await ev(`location.hash`)) === '#h2');
    await ev(`(document.getElementById('t4').scrollLeft = 0, true)`);
    await key('End'); await wait(60);
    check('the selected tab scrolls into view', await ev(`(() => { const l = document.getElementById('t4').getBoundingClientRect(), r = document.querySelector(${JSON.stringify(TAB('#t4', 5))}).getBoundingClientRect(); return r.right <= l.right + 1; })()`));
    await ev(`(document.getElementById('t4').scrollLeft = 0, true)`);
    { const [x, y] = await mid('#t4');
      await t.send('Input.dispatchMouseEvent', { type: 'mouseWheel', x, y, deltaX: 0, deltaY: 120 }); await wait(120); }
    check('the mouse wheel scrolls the row sideways', (await ev(`document.getElementById('t4').scrollLeft`)) > 0);
    check('the row never wraps', await ev(`(() => { const t = [...document.querySelectorAll('#t4 > [role="tab"]')].map((x) => x.getBoundingClientRect().top); return t.every((v) => v === t[0]); })()`));
    await t.send('Page.navigate', { url: 'about:blank' }); await new Promise((r) => setTimeout(r, 150));   // the same page with another hash fires no load
    await t.open(PAGE + '#h3');
    check('data-hash: the address picks the tab at load', (await sel('#t4')) === 'Third tab' && await ev(`!h3.hidden && h1.hidden`));
    await t.open(PAGE); await wait(30);

    /* ---------- Tabs from a list ---------- */
    check('items: every tab is built, in order, with no panel of its own', await ev(`sheets.tabs.map((t) => t.textContent.trim()).join('|')`) === 'Summary|Sales|A sheet whose name is far too long for one tab|Off|Temp' && await ev(`sheets.tabs.every((t) => t.getAttribute('role') === 'tab' && !t.hasAttribute('aria-controls') && t.type === 'button')`));
    check('items: the first is selected and nothing is told', (await sel('#sheets')) === 'Summary' && (await log()) === '' && (await ev(`S.length`)) === 0);
    check('items: an icon, a tip', await ev(`!!sheets.tabs[0].querySelector('.icon') && sheets.tabs[0].dataset.tip === 'The summary'`));
    check('items: disabled says why', await ev(`sheets.tabs[3].getAttribute('aria-disabled') === 'true' && sheets.tabs[3].dataset.tip === 'Needs an account'`));
    check('items: closable has its (x), named after the tab', await ev(`sheets.tabs[4].hasAttribute('data-closable') && sheets.tabs[4].querySelector('.tab-close[data-close]').dataset.tip === 'Close Temp'`));
    await click('#sheets > [role="tab"]:nth-of-type(2)');
    check('a pick on a tab with no panel: onSelect gets its value', (await ev(`S.join()`)) === 'pick b' && (await sel('#sheets')) === 'Sales');
    await log(); await ev(`(S.length = 0, true)`);
    await click('#page'); await key('PageDown', CTRL);
    check('scope: Ctrl+Page Down works from the page around the row', (await sel('#sheets')) !== 'Sales');
    await ev(`(() => { const box = document.createElement('div'); box.id = 'lateBox'; box.tabIndex = 0; box.innerHTML = '<span><i id="late"></i></span>'; document.body.append(box); window.late = Ayni.tabs('#late', { scope: box, items: [{ value: '1', label: 'One' }, { value: '2', label: 'Two' }] }); box.focus(); return true; })()`);
    await key('PageDown', CTRL);
    check('scope: a row first wired from code takes it too', (await ev(`late.value`)) === '2');
    await ev(`(document.getElementById('lateBox').innerHTML = '<div role="tablist" id="divs"><div role="tab" data-value="1">One</div><div role="tab" data-value="2" aria-disabled="true">Two</div></div>', Ayni.init(document.getElementById('lateBox')), document.querySelector('#divs > [data-value="2"]').click(), true)`);
    check('a disabled tab that is no button stays unpicked too', (await ev(`Ayni.tabs('#divs').value`)) === '1');
    await ev(`(document.getElementById('lateBox').remove(), true)`); await log();
    await ev(`(sheets.select('b'), sheets.tabs[1].focus(), window.was = sheets.tabs[1], true)`);
    await ev(`(document.getElementById('sheets').scrollLeft = 40, true)`);
    await ev(`(sheets.set([{ value: 'a', label: 'Summary' }, { value: 'b', label: 'Renamed' }, { value: 'c', label: 'A sheet whose name is far too long for one tab' }, { value: 'd', label: 'Off' }, { value: 'e', label: 'Temp' }, { value: 'f', label: 'New' }]), true)`);
    check('set(): a tab that stays keeps its element, the focus and its selection', await ev(`sheets.tabs[1] === was && document.activeElement === was`) && (await sel('#sheets')) === 'Renamed');
    check('set(): the row keeps its scroll', (await ev(`document.getElementById('sheets').scrollLeft`)) === 40);
    check('set(): the name is new, and a removed disabled mark goes', await ev(`sheets.tabs[3].getAttribute('aria-disabled') === null && sheets.tabs[5].textContent === 'New'`));
    await ev(`(sheets.set([{ value: 'f', label: 'New' }, { value: 'a', label: 'Summary' }], 'a'), true)`);
    check('set(items, value): order, removed tabs and the selection follow', await ev(`sheets.tabs.map((t) => t.dataset.value).join()`) === 'f,a' && (await sel('#sheets')) === 'Summary');
    await ev(`(sheets.set([{ value: 'f', label: 'New' }]), true)`);
    check('set(): the selected tab left, the first one takes over', (await sel('#sheets')) === 'New');
    await log(); await ev(`(window.nt = sheets.add({ value: 'z', label: 'Zed', closable: true }, 0), true)`);
    check('add(item, index) puts it there, leaving the selection', await ev(`sheets.tabs[0] === nt`) && (await sel('#sheets')) === 'New' && (await log()) === '' );
    await ev(`(nt.querySelector('[data-close]').click(), true)`);
    check('onClose gets the value', (await ev(`S.at(-1)`)) === 'closed z');
    await ev(`(window.xp = document.createElement('div'), document.getElementById('sheetbox').append(xp), sheets.add({ value: 'p', label: 'With page', panel: xp }), true)`);
    check('add with a panel: linked, named and hidden until picked', await ev(`(() => { const t = sheets.tabs.at(-1); return t.getAttribute('aria-controls') === xp.id && xp.getAttribute('role') === 'tabpanel' && xp.getAttribute('aria-labelledby') === t.id && xp.hidden; })()`));
    await ev(`(sheets.select('p'), true)`);
    check('…and shown when selected', await ev(`!xp.hidden`));
    await ev(`(sheets.set([{ value: 'f', label: 'New' }]), true)`);
    check('set(): the panel of a removed tab is hidden', await ev(`xp.hidden`));
    await ev(`(Ayni.tabs('#sheets', { items: [{ value: 'a', label: 'Summary' }, { value: 'c', label: 'A sheet whose name is far too long for one tab' }], value: 'c' }), true)`);
    check('Ayni.tabs(row, { items, value }) again: same controller, new tabs', await ev(`Ayni.tabs('#sheets') === sheets`) && (await sel('#sheets')) === 'A sheet whose name is far too long for one tab');
    check('a tab is 190 px wide at most', (await ev(`sheets.tabs[1].getBoundingClientRect().width`)) === 190);
    check('a long name ends in an ellipsis', await ev(`(() => { const x = sheets.tabs[1].querySelector('.tab-text'); return x.scrollWidth > x.clientWidth && getComputedStyle(x).textOverflow === 'ellipsis'; })()`));
    await into('#sheets'); { const [x, y] = await mid('#sheets > [role="tab"]:nth-of-type(2)'); await mouse('mouseMoved', x, y); await wait(40); }
    check('the tooltip of a name cut short gives it in full', (await tip('#sheets > [role="tab"]:nth-of-type(2)')) === 'A sheet whose name is far too long for one tab');
    { const [x, y] = await mid('#sheets > [role="tab"]:nth-of-type(1)'); await mouse('mouseMoved', x, y); await wait(40); }
    check('a short name has no such tooltip', (await tip('#sheets > [role="tab"]:nth-of-type(1)')) === null);
    await ev(`(sheets.set([{ value: 'a', label: 'Summary' }, { value: 'c', label: 'A sheet whose name is far too long for one tab', tip: 'Double-click to rename' }]), true)`);
    { const [x, y] = await mid('#sheets > [role="tab"]:nth-of-type(2)'); await mouse('mouseMoved', x, y); await wait(40); await mouse('mouseMoved', 1, 1); }
    check('a tab\'s own tooltip stays over the full name', (await tip('#sheets > [role="tab"]:nth-of-type(2)')) === 'Double-click to rename');

    /* ---------- Under the page, in the status bar ---------- */
    const S2 = '#sheets > [role="tab"][aria-selected="true"]';
    check('.bottom: the tabs hang from the page, no top border', (await ev(`getComputedStyle(document.querySelector(${JSON.stringify(S2)})).borderTopWidth`)) === '0px');
    check('.bottom: the Accent edge is below', /0px -3px 0px 0px inset/.test(await ev(`getComputedStyle(document.querySelector(${JSON.stringify(S2)})).boxShadow`)), await ev(`getComputedStyle(document.querySelector(${JSON.stringify(S2)})).boxShadow`));
    check('.bottom: no scrollbar takes room', (await ev(`getComputedStyle(document.getElementById('sheets')).scrollbarWidth`)) === 'none');
    check('the row is the first thing in the status bar, the cells follow', await ev(`document.getElementById('bar1').firstElementChild.id === 'sheets' && document.getElementById('sheets').getBoundingClientRect().right <= document.getElementById('totals').getBoundingClientRect().left + 1`));
    check('the selected tab covers the bar\'s line, joining the page', await ev(`document.querySelector(${JSON.stringify(S2)}).getBoundingClientRect().top === document.getElementById('bar1').getBoundingClientRect().top`));
    check('--tab-page tints the selected tab', await ev(`(() => { const b = document.getElementById('sheetbox'), o = getComputedStyle(document.querySelector(${JSON.stringify(S2)})).backgroundColor; b.style.setProperty('--tab-page', 'rgb(1, 2, 3)'); const n = getComputedStyle(document.querySelector(${JSON.stringify(S2)})).backgroundColor; b.style.removeProperty('--tab-page'); return n === 'rgb(1, 2, 3)' && o !== n; })()`));
    await ev(`(document.getElementById('sheets').hidden = true, true)`);
    check('with the row hidden the cells stay on the right, with no line', await ev(`(() => { const b = document.getElementById('bar1').getBoundingClientRect(), c = document.getElementById('totals'), r = c.getBoundingClientRect(); return Math.abs(b.right - r.right) < 1 && r.left > b.left + 50 && getComputedStyle(c).borderLeftWidth === '0px'; })()`));
    await ev(`(document.getElementById('sheets').hidden = false, true)`);
    check('status bar: the first cell takes the room, the others keep theirs and a line', await ev(`(() => { const [a, b, c] = document.getElementById('bar2').children; const w = getComputedStyle(a); return w.flexGrow === '1' && w.borderLeftWidth === '0px' && getComputedStyle(b).borderLeftWidth === '1px' && getComputedStyle(b).flexGrow === '0' && c.getBoundingClientRect().right <= document.getElementById('bar2').getBoundingClientRect().right + 1; })()`));
    await ev(`(Ayni.status('Saved'), true)`);
    check('Ayni.status writes in the marked cell', (await ev(`document.querySelector('[data-ayni-status]').textContent`)) === 'Saved');

    /* ---------- In a dialog ---------- */
    await ev(`(document.getElementById('dlg').showModal(), true)`); await wait(60);
    await ev(`(Ayni.tabs('#t3').select('d2'), true)`); await wait(30);
    check('dialog: the row runs edge to edge of the body', await ev(`(() => { const r = document.getElementById('t3').getBoundingClientRect(), b = document.querySelector('#dlg .body').getBoundingClientRect(); return Math.abs(r.left - b.left) < 1 && Math.abs(r.right - b.right) < 1; })()`));
    check('dialog: the row touches the title row', await ev(`Math.abs(document.getElementById('t3').getBoundingClientRect().top - document.querySelector('#dlg .body').getBoundingClientRect().top) < 1`));
    await ev(`(() => { const p = document.getElementById('d2'), b = document.querySelector('#dlg .body'); window.rowY = () => document.getElementById('t3').getBoundingClientRect().top - document.getElementById('dlg').getBoundingClientRect().top; window.t0 = rowY(); p.scrollTop = 300; b.scrollTop = 300; return true; })()`); await wait(30);
    check('dialog: a long page scrolls, the row stays', await ev(`(document.getElementById('d2').scrollTop > 0 || document.querySelector('#dlg .body').scrollTop > 0) && Math.abs(rowY() - t0) < 1`), await ev(`[rowY(), t0]`));
    check('dialog: the page has no padding of its own (the body has it)', (await ev(`getComputedStyle(document.getElementById('d2')).paddingLeft`)) === '0px');
    await ev(`(document.getElementById('dlg').close(), true)`);

    /* ---------- Splitter: panes the bar owns ---------- */
    await log();
    const size = (id) => ev(`Ayni.splitter('#${id}').size`);
    const drag = async (sel2, dx, dy = 0) => { await into(sel2); const [x, y] = await ev(`(() => { const r = document.querySelector(${JSON.stringify(sel2)}).getBoundingClientRect(); return [r.left + r.width / 2, r.top + 6 + (r.height > 100 ? 0 : 0)]; })()`);
      await mouse('mouseMoved', x, y); await mouse('mousePressed', x, y); await mouse('mouseMoved', x + dx, y + dy); await mouse('mouseReleased', x + dx, y + dy); await wait(30); };
    const BAR = '#s1 > .splitter';
    check('a bar needs no ARIA or tooltip in the page', await ev(`(() => { const b = document.querySelector(${JSON.stringify(BAR)}); return b.getAttribute('role') === 'separator' && b.tabIndex === 0 && b.getAttribute('aria-orientation') === 'vertical' && b.getAttribute('aria-label') === 'Drag to resize' && b.dataset.tip === 'Drag to resize' && b.getAttribute('aria-valuemin') === '15' && b.getAttribute('aria-valuemax') === '85' && b.getAttribute('aria-valuenow') === '35'; })()`));
    check('the top and bottom bar says so', await ev(`document.querySelector('#s2 > .splitter').getAttribute('aria-orientation') === 'horizontal' && document.querySelector('#s2 > .splitter').classList.contains('rows')`));
    check('three glyphs, each named', await ev(`[...document.querySelectorAll(${JSON.stringify(BAR + ' .split-ctl button')})].map((b) => b.getAttribute('aria-label')).join('|')`) === 'Collapse left pane|Reset sizes|Collapse right pane');
    check('.split: data-default is the first pane\'s size', (await size('s1')) === 35 && (await size('s2')) === 50);
    check('the bar is 7 px', (await ev(`getComputedStyle(document.querySelector(${JSON.stringify(BAR)})).width`)) === '7px');
    { await into('#s1'); const w = await ev(`document.getElementById('s1').getBoundingClientRect().width`);
      const [x, y] = await ev(`(() => { const r = document.querySelector(${JSON.stringify(BAR)}).getBoundingClientRect(); return [r.left + 3, r.top + 6]; })()`);
      await mouse('mouseMoved', x, y); await mouse('mousePressed', x, y); await mouse('mouseMoved', x + w * .2, y);
      check('a drag marks the page: no selecting, frames ignore the pointer', await ev(`document.documentElement.classList.contains('ayni-dragging') && getComputedStyle(document.documentElement).userSelect === 'none' && getComputedStyle(document.getElementById('frame')).pointerEvents === 'none'`));
      check('…and the bar', await ev(`document.querySelector(${JSON.stringify(BAR)}).classList.contains('dragging')`));
      await mouse('mouseReleased', x + w * .2, y); await wait(30);
      check('a drag moves the bar', Math.abs(await size('s1') - 55) < 1.5, await size('s1'));
      check('after it the marks go', await ev(`!document.documentElement.classList.contains('ayni-dragging') && !document.querySelector(${JSON.stringify(BAR)}).classList.contains('dragging') && getComputedStyle(document.getElementById('frame')).pointerEvents !== 'none'`)); }
    await drag(BAR, 3000);
    check('a drag stops at the limit', (await size('s1')) === 85);
    await drag(BAR, -3000);
    check('…at both ends', (await size('s1')) === 15);
    await ev(`Ayni.splitter('#s1').reset()`);
    check('a drag tells nothing (no event)', (await log()) === '', await ev(`L.join()`));
    await click(BAR + ' [data-to="first"]');
    check('the arrow collapses that pane; the other takes the room', await ev(`(() => { const [a, b] = document.querySelectorAll('#s1 > .pane'), h = document.getElementById('s1').getBoundingClientRect().width; return a.hidden && b.getBoundingClientRect().width > h - 10; })()`));
    check('…the arrow is disabled, the other is not', await ev(`document.querySelector(${JSON.stringify(BAR + ' [data-to="first"]')}).getAttribute('aria-disabled') === 'true' && document.querySelector(${JSON.stringify(BAR + ' [data-to="last"]')}).getAttribute('aria-disabled') === 'false'`));
    check('…and it is told', (await log()) === 'split collapse/left/Left pane collapsed');
    check('collapsed = first', (await ev(`Ayni.splitter('#s1').collapsed`)) === 'first');
    await click(BAR + ' [data-to="first"]');
    check('a disabled arrow does nothing', (await log()) === '');
    await click(BAR + ' [data-to="reset"]');
    check('the dot resets both', await ev(`[...document.querySelectorAll('#s1 > .pane')].every((p) => !p.hidden && !p.classList.contains('split-fill'))`) && (await size('s1')) === 35);
    check('…and is told', (await log()) === 'split reset/null/Panes reset');
    await ev(`(Ayni.splitter('#s1').size = 40, true)`);
    await ev(`(document.querySelector(${JSON.stringify(BAR)}).focus(), true)`);
    await key('Enter');
    check('Enter collapses the first pane', await ev(`document.querySelector('#s1 > .pane').hidden`) && (await log()) === 'split collapse/left/Pane collapsed');
    await key('Enter');
    check('Enter brings it back, at its size', await ev(`!document.querySelector('#s1 > .pane').hidden`) && (await size('s1')) === 40 && (await log()) === 'split restore/left/Pane restored');
    await key('ArrowRight'); check('Right moves the bar', (await size('s1')) === 45);
    await key('ArrowLeft'); await key('ArrowLeft'); check('Left moves it back', (await size('s1')) === 35);
    await key('ArrowUp'); check('Up does nothing on a side-by-side bar', (await size('s1')) === 35);
    await key('Home'); check('Home = the small limit', (await size('s1')) === 15);
    await key('End'); check('End = the large limit', (await size('s1')) === 85);
    await click(BAR + ' [data-to="last"]'); await log();
    await key('ArrowLeft');
    check('a key on a collapsed bar brings the pane back', await ev(`document.querySelectorAll('#s1 > .pane')[1].hidden === false`));
    await ev(`(document.querySelector('#s2 > .splitter').focus(), true)`);
    await key('ArrowDown'); check('a top and bottom bar: Down moves it', (await size('s2')) === 55);
    await key('ArrowRight'); check('…Right does nothing', (await size('s2')) === 55);
    await click('#s2 > .splitter [data-to="last"]');
    check('…the bottom pane collapses', await ev(`document.querySelectorAll('#s2 > .pane')[1].hidden`) && (await log()) === 'split collapse/bottom/Bottom pane collapsed');
    await ev(`(Ayni.splitter('#s1').size = 60, Ayni.splitter('#s2').restore(), true)`);
    await ev(`document.querySelector(${JSON.stringify(BAR)}).dispatchEvent(new MouseEvent('dblclick', { bubbles: true }))`);
    check('a double-click on the bar resets', (await size('s1')) === 35 && (await log()) === 'split reset/null/Panes reset');
    await ev(`(Ayni.splitter('#s1').size = 60, document.querySelector(${JSON.stringify(BAR + ' [data-to="last"]')}).dispatchEvent(new MouseEvent('dblclick', { bubbles: true })), true)`);
    check('a double-click on a glyph does not', (await size('s1')) === 60);
    await ev(`(window.touchTap = (b) => { for (const type of ['pointerdown', 'pointerup']) b.dispatchEvent(new PointerEvent(type, { bubbles: true, button: 0, pointerType: 'touch', pointerId: 7 })); }, touchTap(document.querySelector(${JSON.stringify(BAR)})), touchTap(document.querySelector(${JSON.stringify(BAR)})), true)`);
    check('a double tap on the bar resets', (await size('s1')) === 35 && (await log()) === 'split reset/null/Panes reset');
    await ev(`(touchTap(document.querySelector(${JSON.stringify(BAR)})), true)`); await wait(350);
    await ev(`(Ayni.splitter('#s1').size = 60, touchTap(document.querySelector(${JSON.stringify(BAR)})), true)`);
    check('two slow taps do not', (await size('s1')) === 60);
    check('a bar too short for three glyphs shows only the dot', await ev(`(() => { const c = document.querySelector('#short .split-ctl'); return c.classList.contains('short') && getComputedStyle(c.querySelector('[data-to="first"]')).display === 'none' && getComputedStyle(c.querySelector('[data-to="reset"]')).display !== 'none'; })()`));
    check('a class of the same name with no bar is left alone', await ev(`!document.querySelector('#notours .split-ctl') && !document.getElementById('notours').hasAttribute('style')`));

    /* ---------- Splitter: a bar in the page's own layout ---------- */
    await ev(`(localStorage.clear(), L.length = 0, true)`);
    await ev(`(window.m = mk({ min: 200, max: 500, def: 300, key: 'w1' }), true)`);
    check('nothing saved: the page\'s CSS keeps the size', await ev(`m.c.size === null && m.a.style.width === '' && m.a.getBoundingClientRect().width === 300`));
    check('bar alone: ARIA in pixels', await ev(`m.bar.getAttribute('aria-valuemin') === '200' && m.bar.getAttribute('aria-valuemax') === '500' && m.bar.getAttribute('aria-valuenow') === '300'`));
    await drag('#host1 > .splitter', 50);
    check('a drag sizes the pane in px', await ev(`m.c.size === 350 && m.a.style.width === '350px'`), await ev(`m.c.size`));
    check('…and it is saved when it ends', (await ev(`localStorage.getItem('w1')`)) === '350');
    { await into('#host1 > .splitter'); const [x, y] = await ev(`(() => { const r = m.bar.getBoundingClientRect(); return [r.left + 3, r.top + 6]; })()`);
      await mouse('mouseMoved', x, y); await mouse('mousePressed', x, y); await mouse('mouseMoved', x + 20, y);
      check('while dragging nothing is saved', (await ev(`localStorage.getItem('w1')`)) === '350');
      await mouse('mouseReleased', x + 20, y); await wait(30); }
    await drag('#host1 > .splitter', 2000);
    check('px limits hold', await ev(`m.c.size === 500`));
    await click('#host1 > .splitter [data-to="last"]');
    check('collapse on a bare bar: hidden, the other fills whatever the page sized it to', await ev(`m.b.hidden && m.a.classList.contains('split-fill') && Math.abs(m.a.getBoundingClientRect().width - m.host.clientWidth + 7) < 2`), await ev(`m.a.getBoundingClientRect().width`));
    check('the collapsed pane is saved beside the size', (await ev(`localStorage.getItem('w1.fold')`)) === 'last');
    await ev(`(window.m2 = mk({ min: 200, max: 500, def: 300, key: 'w1' }), true)`);
    check('a new page puts both back', await ev(`m2.c.size === 500 && m2.c.collapsed === 'last' && m2.b.hidden`));
    await click('#host1 > .splitter [data-to="reset"]');
    check('a reset goes to def, saved; the mark goes', await ev(`m.c.size === 300 && localStorage.getItem('w1') === '300' && localStorage.getItem('w1.fold') === null`));
    await ev(`(localStorage.setItem('w2', 'junk'), localStorage.setItem('w3', '9999'), localStorage.setItem('w2.fold', 'x'), window.j = mk({ min: 200, max: 500, key: 'w2' }), window.k = mk({ min: 200, max: 500, key: 'w3' }), true)`);
    check('a bad saved value is ignored', await ev(`j.c.size === null && j.c.collapsed === null && k.c.size === null`));
    await ev(`(window.r = mk({ side: 'last', min: 200, max: 500, def: 300 }, true), true)`);
    check('side last: the pane is after the bar', await ev(`r.b.getBoundingClientRect().width === 300`));
    await drag('#' + await ev(`r.host.id`) + ' > .splitter', -50);
    check('side last: a drag left widens it', await ev(`r.c.size === 350`), await ev(`r.c.size`));
    await ev(`(r.bar.focus(), true)`);
    await key('ArrowLeft'); check('side last: Left widens it too', await ev(`r.c.size === 370`));
    await key('Home'); check('side last: Home takes the bar to the start, the pane to its largest', await ev(`r.c.size === 500`));
    await key('End'); check('side last: End = the smallest', await ev(`r.c.size === 200`));
    await click('#' + await ev(`r.host.id`) + ' > .splitter [data-to="first"]');
    check('side last: first is still the pane before the bar', await ev(`r.a.hidden && !r.b.hidden && r.b.classList.contains('split-fill')`));
    await ev(`(r.c.restore(), true)`);
    await ev(`(window.saves = [], window.sets = [], window.ch = [], window.z = mk({ min: 100, max: 600, size: 240, save: (s, f) => saves.push(s + '/' + f), set: (s, f) => sets.push(s + '/' + f), onChange: (s, f) => ch.push(s + '/' + f) }), true)`);
    check('size: where to start from; set gets it', await ev(`z.c.size === 240 && sets.at(-1) === '240/null'`));
    check('set: the page sizes it, Ayni leaves its style alone', await ev(`z.a.style.width === ''`));
    await ev(`(z.c.collapse('first'), true)`);
    check('save and set hear a collapse; onChange does not (code)', await ev(`saves.at(-1) === '240/first' && sets.at(-1) === '240/first' && ch.length === 0`));
    check('with set, Ayni still hides the pane', await ev(`z.a.hidden`));
    await ev(`(z.c.restore(), true)`);
    await click('#' + await ev(`z.host.id`) + ' > .splitter [data-to="reset"]');
    check('no def: a reset gives null to the page', await ev(`sets.at(-1) === 'null/null' && saves.at(-1) === 'null/null'`));
    check('onChange hears the user', await ev(`ch.join()`) === 'null/null');
    await ev(`(window.free = mk({ min: 100, max: 600, size: 240, key: 'w4' }), free.c.reset(), true)`);
    check('no def: the saved size goes and the CSS takes over', await ev(`free.a.style.width === '' && localStorage.getItem('w4') === null`));
    await ev(`(window.off = false, window.o = mk({ min: 100, max: 500, off: () => off }), window.oid = o.host.id, true)`);
    await ev(`(o.c.collapse('first'), true)`);
    check('off(): collapsed while there is a layout to collapse', await ev(`o.a.hidden`));
    await ev(`(off = true, dispatchEvent(new Event('resize')), true)`);
    check('off(): a phone layout shows no collapsed pane', await ev(`!o.a.hidden && o.c.collapsed === 'first'`));
    await ev(`(o.c.size = 300, true)`);
    await drag('#' + await ev(`oid`) + ' > .splitter', 40);
    await ev(`(o.bar.focus(), true)`); await key('ArrowRight');
    check('off(): no drag, no keys', await ev(`o.c.size === 300`));
    await ev(`(off = false, o.c.collapse('first'), dispatchEvent(new Event('resize')), true)`);
    check('off() over: it comes back', await ev(`o.a.hidden`));
    await ev(`(window.n = mk({ min: 100, max: 500, def: 300, glyphs: false }), true)`);
    check('glyphs: false: no glyphs', await ev(`!n.bar.querySelector('.split-ctl')`));
    await drag('#' + await ev(`n.host.id`) + ' > .splitter', 40);
    check('…the drag stays', await ev(`n.c.size === 340`));
    await ev(`(n.bar.focus(), true)`); await key('ArrowRight');
    check('…the keys stay', await ev(`n.c.size === 360`));
    await ev(`n.bar.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }))`);
    check('…the double-click stays', await ev(`n.c.size === 300`));
    await ev(`(n.bar.focus(), true)`); await key('Enter');
    check('…Enter folds nothing: the view has its own button', await ev(`!n.a.hidden && n.c.collapsed === null`));
    await ev(`(window.own = mk({ min: 100, max: 500, size: 200 }), own.b.hidden = true, own.c.size = 250, true)`);
    check('a pane the page hides itself stays hidden', await ev(`own.b.hidden`));
    await ev(`(own.c.collapse('first'), own.c.restore(), true)`);
    check('…and only what the fold hid comes back', await ev(`!own.a.hidden && own.b.hidden && !own.a.classList.contains('split-fill') && !own.b.classList.contains('split-fill')`));
    await ev(`(window.scr = 'p', localStorage.setItem('k.p', '220'), localStorage.setItem('k.l', '400'), window.f = mk({ min: 100, max: 500, def: 300, key: () => 'k.' + scr }), true)`);
    check('key may be a function', await ev(`f.c.size === 220`));
    await ev(`(scr = 'l', f.c.reload(), true)`);
    check('reload(): the saved size of the new key', await ev(`f.c.size === 400`));
    await ev(`(scr = 'x', f.c.reload(), true)`);
    check('reload(): nothing saved there: back to def', await ev(`f.c.size === 300`));
    await ev(`(window.p = mk({ unit: '%', min: 20, max: 80, def: 30 }), p.c.reset(), true)`);
    check('unit %: the pane in percent', await ev(`p.a.style.width === '30%'`));
    await drag('#' + await ev(`p.host.id`) + ' > .splitter', 80);
    check('unit %: a drag in percent of the parent', await ev(`Math.abs(p.c.size - 40) < 1.5`), await ev(`p.c.size`));
    check('Ayni.splitter twice: same controller, one set of glyphs', await ev(`Ayni.splitter(p.bar) === p.c && p.bar.querySelectorAll('.split-ctl').length === 1`));
    await ev(`(localStorage.setItem('w9', '250'), Ayni.splitter(p.bar, { key: 'w9', unit: '%', min: 20, max: 300 }), true)`);
    check('Ayni.splitter again with a key reads it', await ev(`p.c.size === 250`));
    await ev(`(window.rw = mk({ rows: true, min: 50, max: 150 }), rw.host.style.flexDirection = 'column', rw.host.style.width = '300px', rw.a.style.width = 'auto', rw.c.size = 80, true)`);
    check('rows: the pane\'s height, a horizontal bar', await ev(`rw.a.style.height === '80px' && rw.bar.getAttribute('aria-orientation') === 'horizontal' && rw.bar.classList.contains('rows')`));
    check('a bar stays where it is on no storage', await ev(`(() => { const s = Object.getOwnPropertyDescriptor(Storage.prototype, 'getItem'); Storage.prototype.getItem = () => { throw new Error('blocked'); }; let ok = true; try { const b = mk({ key: 'w7', size: 222 }); ok = b.c.size === 222; } catch { ok = false; } Object.defineProperty(Storage.prototype, 'getItem', s); return ok; })()`));

    /* ---------- More fields ---------- */
    check('More fields: Ayni writes its parts and names it', await ev(`mf1.querySelector('.more-pill .more-chevron') && mf1.querySelector('.more-line') && mf1.textContent.includes('More fields')`));
    check('folded at first: its part is hidden', await ev(`document.getElementById('mf1-box').hidden`));
    await log();
    await click('#mf1');
    check('pressed: open, Fewer fields, the chevron turns', await ev(`!document.getElementById('mf1-box').hidden && mf1.getAttribute('aria-expanded') === 'true' && mf1.textContent.includes('Fewer fields') && getComputedStyle(mf1.querySelector('.more-chevron')).transform !== 'none'`));
    check('…and tells it', (await log()) === 'more true');
    await click('#mf1');
    check('pressed again: closed', await ev(`document.getElementById('mf1-box').hidden`) && (await log()) === 'more false');
    await ev(`(more.set(false), true)`);
    check('set() from code folds it and tells nothing', await ev(`document.getElementById('mf2-box').hidden && !more.open`) && (await log()) === '' && (await ev(`S.filter((x) => x.startsWith('toggle')).length`)) === 0);
    check('Ayni.moreFields adds the class and takes its own words', await ev(`mf2.classList.contains('more-toggle') && mf2.textContent.includes('Show extras')`));
    await click('#mf2');
    check('onToggle hears the user; its own word for open', (await ev(`S.at(-1)`)) === 'toggle true' && await ev(`mf2.textContent.includes('Hide extras')`));
    check('a line written open stays open at load', await ev(`more.open`));

    /* ---------- Choice rows, tags ---------- */
    check('a choice row wraps', (await ev(`getComputedStyle(document.getElementById('ch')).flexWrap`)) === 'wrap');
    check('on is the soft tint, not a fill', await ev(`(() => { const a = getComputedStyle(ch1), b = getComputedStyle(ch2); return a.backgroundColor !== b.backgroundColor && a.color !== b.color; })()`) && await ev(`(() => { const p = document.createElement('i'); p.style.background = 'var(--accent-soft)'; document.body.append(p); const c = getComputedStyle(p).backgroundColor; p.remove(); return getComputedStyle(ch1).backgroundColor === c; })()`));
    check('a tag is no control', await ev(`(() => { const c = getComputedStyle(tag); return tag.tabIndex === -1 && c.cursor !== 'pointer'; })()`));

    /* ---------- Touch ---------- */
    await ev(`(Ayni.setTouchPreview(true), true)`); await wait(40);
    check('touch: tabs are 44 px high', (await ev(`document.querySelector('#t4 > [role="tab"]').getBoundingClientRect().height`)) >= 44);
    check('touch: the bar keeps 7 px, with a 19 px hit area each way', (await ev(`getComputedStyle(document.querySelector(${JSON.stringify(BAR)})).width`)) === '7px' && (await ev(`getComputedStyle(document.querySelector(${JSON.stringify(BAR)}), '::before').left`)) === '-19px');
    check('touch: a top and bottom bar the same, across', (await ev(`getComputedStyle(document.querySelector('#s2 > .splitter'), '::before').top`)) === '-19px');
    check('touch: the arrows reach 34 px past the ends', (await ev(`getComputedStyle(document.querySelector(${JSON.stringify(BAR + ' [data-to="first"]')}), '::before').top`)) === '-34px');
    check('touch: a choice row keeps 8 px between targets', (await ev(`getComputedStyle(document.getElementById('ch')).gap`)) === '8px');
    check('touch: a choice button has a 44 px hit area', (await ev(`(() => { const r = ch2.getBoundingClientRect(), s = getComputedStyle(ch2, '::before'); return r.height + 2 * Math.max(0, -parseFloat(s.top)); })()`)) >= 44);
    await ev(`(Ayni.setTouchPreview(false), true)`);

    /* ---------- Languages ---------- */
    check('no untranslated keys in the layout family', (await ev(RAW_KEYS)).length === 0, await ev(RAW_KEYS));
    await ev(`(document.body.insertAdjacentHTML('beforeend', '<div class="empty-state" id="es"><span class="icon" data-icon="file"></span><p class="empty-title">None</p><p>Press +</p></div><p class="section-label" id="sl">Group</p><div class="card-row" id="cr">Row</div>'), Ayni.init(document.body), true)`); await wait(40);
    check('empty state: centred, its glyph 44 px and faint', await ev(`(() => { const s = getComputedStyle(es), g = es.querySelector('svg').getBoundingClientRect(); return s.alignItems === 'center' && g.width === 44 && getComputedStyle(es.querySelector('svg')).opacity === '0.6'; })()`));
    check('empty state: the first line bold, the second smaller', await ev(`(() => { const a = getComputedStyle(es.querySelector('.empty-title')), b = getComputedStyle(es.querySelector('p:last-child')); return +a.fontWeight === 600 && parseFloat(a.fontSize) > parseFloat(b.fontSize); })()`));
    check('section label: uppercase, small', await ev(`(() => { const s = getComputedStyle(sl); return s.textTransform === 'uppercase' && parseFloat(s.fontSize) < 12; })()`));
    check('card row: a row on its own card', await ev(`(() => { const s = getComputedStyle(cr); return s.display === 'flex' && s.borderTopStyle === 'solid' && parseFloat(s.borderTopLeftRadius) > 0; })()`));
    await ev(`(es.remove(), sl.remove(), cr.remove(), true)`);
    check('no errors or warnings in the layout family', t.logs.length === 0, t.logs.slice());
    const NEW = ['ayni.fp.choose', 'ayni.fp.chooseFile', 'ayni.fp.delete', 'ayni.fp.emptyFolder', 'ayni.fp.loadError', 'ayni.fp.loading', 'ayni.fp.newFolder', 'ayni.fp.noFolders', 'ayni.fp.pickFile', 'ayni.fp.pickFolder', 'ayni.fp.rename', 'ayni.split.drag', 'ayni.more.show', 'ayni.more.hide', 'ayni.tab.close', 'ayni.password', 'ayni.password.repeat', 'ayni.password.tooShort', 'ayni.password.noMatch'];
    for (const lang of ['en', 'es', 'pt', 'fr', 'de']) {
      const j = JSON.parse(fs.readFileSync(path.join(ROOT, 'i18n', lang + '.json'), 'utf8'));
      check(`${lang}: the layout family's texts are all there`, NEW.every((k) => j[k]), NEW.filter((k) => !j[k]));
    }
    await ev(`(localStorage.clear(), localStorage.setItem('ayni-lang', 'es'), true)`); await t.open(PAGE);
    check('es: the bar and More fields follow the page\'s language', await ev(`document.querySelector('#s1 > .splitter').dataset.tip === 'Arrastra para cambiar el tamaño' && mf1.textContent.includes('Más campos')`));
    check('es: the (x) of a tab', await ev(`(sheets.set([{ value: 'a', label: 'Hoja', closable: true }]), sheets.tabs[0].querySelector('.tab-close').dataset.tip === 'Cerrar Hoja')`));
    check('es: no untranslated keys', (await ev(RAW_KEYS)).length === 0, await ev(RAW_KEYS));
    await ev(`(localStorage.removeItem('ayni-lang'), true)`);
    await t.open(GALLERY);
    check('the gallery shows the new parts', await ev(`Ayni.tabs('#sheets').tabs.length === 3 && !!document.querySelector('.choices') && !!document.querySelector('.tag') && document.getElementById('mf-btn').textContent.includes('More fields')`));
  }

  section('Desktop family (base + buttons + notifications + dialogs + menus + search + fields + desktop)');
  {
    t.logs.length = 0;
    await t.send('Page.bringToFront');   /* A tab behind another makes no frames, and media changes wait for a frame */
    const size = (width, height) => t.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false });
    await size(1280, 760);
    const PAGE = BASE + '/tests/desktop-only.html';
    const ev = (js) => t.evaluate(js);
    const wait = (ms) => ev(`new Promise((r) => setTimeout(r, ${ms}))`);
    const fresh = async (url = PAGE) => { await t.open(url); await ev(`(localStorage.clear(), true)`); await t.open(url); await wait(50); };
    await fresh();
    check('a page with the desktop family starts with no errors or warnings', t.logs.length === 0, t.logs.slice());
    check('no ayni.css, no ayni.js', await ev(`![...document.scripts].some((s) => /\\/ayni\\.js$/.test(s.src)) && ![...document.styleSheets].some((s) => /\\/ayni\\.css$/.test(s.href || ''))`));
    let held = 0;   /* A move while the button is down says so, or Chromium ends the drag */
    const mouse = (type, x, y, button = 'left', clickCount = 1) => {
      if (type === 'mousePressed') held = button === 'right' ? 2 : 1; if (type === 'mouseReleased') held = 0;
      return t.send('Input.dispatchMouseEvent', { type, x, y, button: type === 'mouseMoved' && !held ? 'none' : button, buttons: held, clickCount });
    };
    const box = (sel) => ev(`(() => { const r = document.querySelector(${JSON.stringify(sel)}).getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom, w: r.width, h: r.height }; })()`);
    const mid = async (sel) => { const r = await box(sel); return [r.l + r.w / 2, r.t + r.h / 2]; };
    const click = async (sel, button = 'left') => { const [x, y] = await mid(sel); await mouse('mouseMoved', x, y); await mouse('mousePressed', x, y, button); await mouse('mouseReleased', x, y, button); await wait(60); };
    const drag = async ([x, y], dx, dy) => { await mouse('mouseMoved', x, y); await mouse('mousePressed', x, y); for (let i = 1; i <= 5; i++) await mouse('mouseMoved', x + dx * i / 5, y + dy * i / 5); await mouse('mouseReleased', x + dx, y + dy); await wait(40); };
    const KEYS = { F10: 121, Escape: 27, Enter: 13, PageUp: 33, PageDown: 34, ArrowDown: 40 };
    const key = async (k, mods = 0) => {
      await t.send('Input.dispatchKeyEvent', { type: 'keyDown', key: k, code: k, windowsVirtualKeyCode: KEYS[k], modifiers: mods });
      await t.send('Input.dispatchKeyEvent', { type: 'keyUp', key: k, code: k, windowsVirtualKeyCode: KEYS[k], modifiers: mods });
      await wait(40);
    };
    const log = () => ev(`L.splice(0).join('|')`);
    const FRONT = '.chip[aria-current="true"]';
    const CHIP = (i) => `.chips > .chip:nth-child(${i})`;
    const frontName = () => ev(`document.querySelector(${JSON.stringify(FRONT + ' .chip-main')}).textContent.trim()`);
    const style = (sel, prop, pseudo = '') => ev(`getComputedStyle(document.querySelector(${JSON.stringify(sel)})${pseudo ? `, '${pseudo}'` : ''})[${JSON.stringify(prop)}]`);
    const setEdge = async (e) => { await ev(`(Ayni.setTaskbarEdge(document.querySelector('.desktop'), '${e}'), true)`); await wait(40); };
    const closePops = () => ev(`(document.querySelectorAll('[popover]').forEach((p) => p.matches(':popover-open') && p.hidePopover()), true)`);

    /* ---------- Chips ---------- */
    check('one chip per window, in order', await ev(`[...document.querySelectorAll('.chips > .chip')].map((c) => c.getAttribute('aria-label')).join()`) === 'Files,Notes');
    check('the last window opened is selected', (await frontName()) === 'Notes' && await ev(`w2.classList.contains('active') && !w1.classList.contains('active')`));
    check('a chip is a group of real buttons', await ev(`document.querySelector('.chip').getAttribute('role') === 'group' && [...document.querySelectorAll('.chip button')].every((b) => b.tagName === 'BUTTON') && !document.querySelector('.chip button button')`));
    check('the selected chip shows its name and three buttons', (await style(FRONT + ' .chip-main > span:not(.icon)', 'display')) !== 'none' && (await style(FRONT + ' .chip-ctl', 'display')) === 'flex' && await ev(`document.querySelectorAll(${JSON.stringify(FRONT + ' [data-win]')}).length === 3`));
    check('another chip shows only its icon, its name in the tooltip', (await style(CHIP(1) + ' .chip-main > span:not(.icon)', 'display')) === 'none' && (await style(CHIP(1) + ' .chip-ctl', 'display')) === 'none' && await ev(`document.querySelector(${JSON.stringify(CHIP(1) + ' .chip-main')}).dataset.tip === 'Files'`));
    check('the selected chip has an Accent edge at the bottom', /inset/.test(await style(FRONT, 'boxShadow')) && /0px -3px/.test(await style(FRONT, 'boxShadow')), await style(FRONT, 'boxShadow'));
    check('the selected chip is drawn on the card colour', (await style(FRONT, 'backgroundColor')) === await ev(`(() => { const p = document.createElement('i'); p.style.background = 'var(--card)'; document.body.append(p); const c = getComputedStyle(p).backgroundColor; p.remove(); return c; })()`));
    await log();
    await click(CHIP(1) + ' .chip-main');
    check('a click on a chip selects its window', (await frontName()) === 'Files' && await ev(`w1.classList.contains('active') && +w1.style.zIndex > +w2.style.zIndex`));
    check('…and tells it', (await log()) === 'select Files');
    await click(CHIP(1) + ' .chip-main');
    check('a click on the selected chip minimises', await ev(`w1.classList.contains('min') && getComputedStyle(w1).display === 'none'`) && (await log()).startsWith('minimise Files'));
    check('…the next window comes to the front', (await frontName()) === 'Notes');
    check('a minimised window\'s icon is greyed', (await style(CHIP(1) + ' .chip-main', 'color')) === await ev(`(() => { const p = document.createElement('i'); p.style.color = 'var(--text-dim)'; document.body.append(p); const c = getComputedStyle(p).color; p.remove(); return c; })()`));
    await click(CHIP(1) + ' .chip-main');
    check('a click brings it back', await ev(`!w1.classList.contains('min') && w1.classList.contains('active')`));
    await log(); const w2b = await box('#w2'); await mouse('mouseMoved', w2b.r - 30, w2b.b - 30); await mouse('mousePressed', w2b.r - 30, w2b.b - 30); await mouse('mouseReleased', w2b.r - 30, w2b.b - 30); await wait(40);
    check('a click in a window selects it', (await frontName()) === 'Notes');
    await ev(`(w1f.focus(), true)`); await wait(30);
    check('the focus moving into a window selects it', (await frontName()) === 'Files');
    await ev(`(document.activeElement.blur(), true)`);
    await ev(`(Ayni.windows.select(w2), true)`); await log();

    /* ---------- The window buttons ---------- */
    await click(FRONT + ' [data-win="max"]');
    check('maximise fills the area', await ev(`w2.classList.contains('max')`) && JSON.stringify(await box('#w2')) === JSON.stringify(await box('.area')), await box('#w2'));
    check('…the button now says restore', await ev(`document.querySelector(${JSON.stringify(FRONT + ' [data-win="max"]')}).getAttribute('aria-label') === 'Restore'`));
    check('…no resize grips while maximised', (await style('#w2 > .win-grip', 'display')) === 'none');
    const maxBox = await box('#w2');
    await drag(await mid('#w2 > header h2'), 40, 40);
    check('…and the title row does not move it', JSON.stringify(await box('#w2')) === JSON.stringify(maxBox));
    await click(FRONT + ' [data-win="max"]');
    check('restore gives it back', await ev(`!w2.classList.contains('max') && w2.offsetWidth === 560`));
    check('…and tells both', (await log()) === 'maximise Notes|restore Notes');
    const [hx, hy] = await mid('#w2 > header h2');
    await mouse('mouseMoved', hx, hy); await mouse('mousePressed', hx, hy); await mouse('mouseReleased', hx, hy); await mouse('mousePressed', hx, hy, 'left', 2); await mouse('mouseReleased', hx, hy, 'left', 2); await wait(40);
    check('a double click on the title row maximises', await ev(`w2.classList.contains('max')`));
    await ev(`(Ayni.windows.restore(w2), true)`); await log();

    /* ---------- Moving and resizing ---------- */
    let before = await box('#w2');
    await drag(await mid('#w2 > header h2'), 60, 30);
    let now = await box('#w2');
    check('the title row moves a window', now.l === before.l + 60 && now.t === before.t + 30, { before, now });
    before = now;
    await drag(await mid('#w2 [role="toolbar"] .btn'), 60, 30);
    check('a toolbar button does not', JSON.stringify(await box('#w2')) === JSON.stringify(before));
    await drag(await mid('#w2 > header h2'), -2000, -2000);
    now = await box('#w2');
    check('it stops at the top left of the area', now.l === 0 && now.t === 0, now);
    await drag(await mid('#w2 > header h2'), 3000, 3000);
    now = await box('#w2');
    let ar = await box('.area');
    check('its title row stays inside the area', now.t + 44 <= ar.b + 1 && now.r <= ar.r + 1, { now, ar });
    await ev(`(Object.assign(w2.style, { left: '120px', top: '90px' }), true)`);
    before = await box('#w2');
    await drag([before.r - 6, before.b - 6], 50, 40);
    now = await box('#w2');
    check('a corner resizes it', now.w === before.w + 50 && now.h === before.h + 40, { before, now });
    before = now;
    await drag([before.l + 1, before.t + 100], 30, 0);
    now = await box('#w2');
    check('the left edge keeps the right edge still', now.r === before.r && now.l === before.l + 30, { before, now });
    now = await box('#w2');
    await drag([now.r - 6, now.b - 6], -2000, -2000);
    now = await box('#w2');
    check('it stops at the smallest size', now.w === 260 && now.h === 160, now);
    await drag([now.r - 6, now.b - 6], 3000, 3000);
    now = await box('#w2'); ar = await box('.area');
    check('it never grows past the area', now.r <= ar.r + .5 && now.b <= ar.b + .5, { now, ar });
    await ev(`(Object.assign(w2.style, { left: '120px', top: '90px', width: '560px', height: '280px' }), true)`);

    /* ---------- Closing ---------- */
    await fresh();
    await ev(`(keep = true, true)`); await click(FRONT + ' [data-win="close"]');
    check('ayni:close can keep a window open', await ev(`!!document.getElementById('w2')`) && (await log()) === 'asks Notes');
    await ev(`(keep = false, true)`); await click(FRONT + ' [data-win="close"]');
    check('closing takes the window and its chip', await ev(`!document.getElementById('w2') && document.querySelectorAll('.chip').length === 1`));
    check('…and selects the next', (await frontName()) === 'Files');
    check('…and tells it', /close Notes/.test(await log()));

    /* ---------- Windows added later, title and chip ---------- */
    await fresh();
    await ev(`(add('A'), add('B'), true)`);
    check('a window added later gets its chip and comes to the front', (await frontName()) === 'B' && await ev(`document.querySelectorAll('.chip').length === 4`));
    check('new windows cascade', await ev(`(() => { const w = document.querySelectorAll('.panel.window'); return parseInt(w[3].style.left) - parseInt(w[2].style.left); })()`) === 28);
    await ev(`(Ayni.windows.title(document.querySelector('.panel.window.active'), 'Report.docx'), true)`);
    check('title() names the title row, the chip and its tooltip', (await frontName()) === 'Report.docx' && await ev(`(() => { const c = document.querySelector(${JSON.stringify(FRONT)}); return c.getAttribute('aria-label') === 'Report.docx' && c.querySelector('.chip-main').dataset.tip === 'Report.docx' && document.querySelector('.panel.window.active h2').textContent === 'Report.docx'; })()`));
    await ev(`(() => { const b = document.createElement('button'); b.className = 'btn'; b.id = 'mine'; b.setAttribute('aria-label', 'Mine'); Ayni.windows.chip(document.querySelector('.panel.window.active')).querySelector('.chip-ctl').prepend(b); return true; })()`);
    check('chip() lets an app add a window button', await ev(`document.querySelector(${JSON.stringify(FRONT + ' .chip-ctl')}).children.length === 4 && mine.getBoundingClientRect().width > 0`));

    /* ---------- A modeless dialog belongs to its window ---------- */
    await fresh();
    await ev(`(fd.show(), true)`); await wait(50);
    check('a modeless dialog moves into the area, above its window', await ev(`fd.parentElement.classList.contains('area') && fd.classList.contains('owned') && +fd.style.zIndex > +w2.style.zIndex`));
    check('…it has no chip', await ev(`document.querySelectorAll('.chip').length === 2`));
    await click(FRONT + ' [data-win="min"]'); await wait(40);
    check('…it hides with its window', await ev(`fd.hidden`));
    await click(CHIP(2) + ' .chip-main'); await wait(40);
    check('…and comes back with it', await ev(`!fd.hidden && fd.open`));
    await drag(await mid('#fd > header h2'), 30, 20);
    check('…it moves by its title row', await ev(`parseInt(fd.style.left) > 0`));
    await click(FRONT + ' [data-win="close"]'); await wait(40);
    check('…and closes with its window', await ev(`!fd.open`));

    /* ---------- Tools that do not fit ---------- */
    await fresh();
    const out = () => ev(`[...document.querySelectorAll('#w2 [role="toolbar"] .fit-out')].map((b) => b.getAttribute('aria-label')).join()`);
    check('a wide window keeps every tool, no More', (await out()) === '' && await ev(`document.querySelector('#w2 .fit-more').hidden`));
    check('tools with no rank got their place as rank', await ev(`[...document.querySelectorAll('#w2 [role="toolbar"] > .btn')].map((b) => b.dataset.rank).join()`) === '1,2,3,4,5,1');
    await ev(`(w2.style.width = '270px', true)`); await wait(120);
    check('narrow: tools leave, the highest rank first, the name stays', (await out()).startsWith('Bold') === false && /Share/.test(await out()) && !/Save|Print/.test(await out()) && await ev(`!document.querySelector('#w2 .fit-more').hidden && document.querySelector('#w2 h2').getBoundingClientRect().width > 30`), await out());
    check('…nothing is clipped', await ev(`(() => { const b = document.querySelector('#w2 .fit-more').getBoundingClientRect(), w = w2.getBoundingClientRect(); return b.right <= w.right; })()`));
    await click('#w2 .fit-more'); await wait(120);
    check('More lists what left', await ev(`/Share/.test(document.getElementById('ayni-menu').textContent)`), await ev(`document.getElementById('ayni-menu')?.textContent`));
    await ev(`([...document.querySelectorAll('#ayni-menu [role="menuitem"]')].find((b) => /Share/.test(b.textContent)).click(), true)`); await wait(60);
    check('…and runs the tool', await ev(`R.includes('Share')`), await ev(`R`));
    await ev(`(w2.style.width = '640px', true)`); await click('#w2 .body'); await wait(150);
    check('they come back as it widens', (await out()) === '' && await ev(`document.querySelector('#w2 .fit-more').hidden`), await out());

    /* ---------- The four edges ---------- */
    await fresh();
    const off = (e, p, b) => (e === 'bottom' ? p.b <= b.t : e === 'top' ? p.t >= b.b : e === 'left' ? p.l >= b.r : p.r <= b.l);
    for (const e of ['bottom', 'top', 'left', 'right']) {
      await setEdge(e);
      const b = await box('.taskbar'), a = await box('.area'), side = e === 'left' || e === 'right';
      check(`${e}: the bar sits on that edge`, e === 'bottom' ? b.b === 760 && b.w === 1280 : e === 'top' ? b.t === 0 && b.w === 1280 : e === 'left' ? b.l === 0 && b.h === 760 : b.r === 1280 && b.h === 760, b);
      check(`${e}: 48 px`, (side ? b.w : b.h) === 48, b);
      check(`${e}: the area takes the rest and never lies under it`, off(e === 'bottom' ? 'bottom' : e, a, b) && a.w * a.h === (side ? 1232 * 760 : 1280 * 712), { a, b });
      check(`${e}: launcher, chips, gadgets in order`, side ? (await box('#go')).b <= (await box('.chips')).t + 1 && (await box('.chips')).b <= (await box('.widgets')).t + 1 : (await box('#go')).r <= (await box('.chips')).l + 1 && (await box('.chips')).r <= (await box('.widgets')).l + 1);
      check(`${e}: the selected chip ${side ? 'hides' : 'shows'} its name`, ((await style(FRONT + ' .chip-main > span:not(.icon)', 'display')) === 'none') === side);
      check(`${e}: the chip stays inside the bar`, await ev(`(() => { const c = document.querySelector(${JSON.stringify(FRONT)}).getBoundingClientRect(), b = document.querySelector('.taskbar').getBoundingClientRect(); return c.left >= b.left - .5 && c.right <= b.right + .5 && c.top >= b.top - .5 && c.bottom <= b.bottom + .5; })()`));
      check(`${e}: its buttons ${side ? 'stack under the icon' : 'sit in a row'}`, (await style(FRONT + ' .chip-ctl', 'flexDirection')) === (side ? 'column' : 'row'));
      const shadow = await style(FRONT, 'boxShadow'), want = { bottom: '0px -3px', top: '0px 3px', left: '3px 0px', right: '-3px 0px' }[e];
      check(`${e}: the Accent edge is on the side of the screen`, shadow.includes(want + ' 0px 0px'), shadow);
      await click('#s-btn'); await wait(60);
      check(`${e}: a popup opens off the bar`, off(e, await box('#tall'), await box('.taskbar')), await box('#tall'));
      await closePops();
      await click('#m-btn'); await wait(60);
      const m = await box('#month');
      check(`${e}: and stays on the screen`, off(e, m, await box('.taskbar')) && m.l >= 0 && m.t >= 0 && m.r <= 1280 && m.b <= 760, m);
      await closePops();
      await click('#go'); await wait(60);
      check(`${e}: the launcher too`, off(e, await box('#apps'), await box('.taskbar')), await box('#apps'));
      await closePops();
    }
    await setEdge('bottom'); await log();
    await ev(`(Ayni.setTaskbarEdge(document.querySelector('.desktop'), 'middle'), true)`);
    check('an edge that does not exist is ignored', await ev(`document.querySelector('.desktop').dataset.edge`) === 'bottom' && (await log()) === '');
    await ev(`(document.querySelector('.taskbar').scrollIntoView(), true)`);
    const gap = await box('.chips');
    const [gx, gy] = [gap.r - 10, gap.t + gap.h / 2];
    await mouse('mouseMoved', gx, gy); await mouse('mousePressed', gx, gy, 'right'); await mouse('mouseReleased', gx, gy, 'right'); await wait(120);
    check('right-click on the bar offers the four edges', await ev(`[...document.querySelectorAll('#ayni-edge [role="menuitemradio"]')].map((b) => b.dataset.edge).join()`) === 'bottom,top,left,right' && await ev(`document.getElementById('ayni-edge').matches(':popover-open')`));
    check('…with a word for each', await ev(`[...document.querySelectorAll('#ayni-edge [role="menuitemradio"]')].map((b) => b.textContent.trim()).join()`) === 'Taskbar at the bottom,Taskbar at the top,Taskbar on the left,Taskbar on the right');
    check('…the current one ticked', await ev(`document.querySelector('#ayni-edge [data-edge="bottom"]').getAttribute('aria-checked')`) === 'true');
    await ev(`(document.querySelector('#ayni-edge [data-edge="right"]').click(), true)`); await wait(60);
    check('picking one moves the bar and tells it', await ev(`document.querySelector('.desktop').dataset.edge`) === 'right' && (await log()) === 'edge right');
    check('…and it is kept', await ev(`localStorage.getItem('ayni-taskbar-edge')`) === 'right');
    await t.open(PAGE); await wait(40);
    check('…for next time', await ev(`document.querySelector('.desktop').dataset.edge`) === 'right');
    await ev(`(localStorage.setItem('ayni-taskbar-edge', 'nowhere'), true)`); await t.open(PAGE); await wait(40);
    check('a saved edge that does not exist falls back to the markup', await ev(`document.querySelector('.desktop').dataset.edge`) === 'bottom');
    await click('#m-btn'); await wait(60);
    const mb = await box('#m-btn');
    await mouse('mouseMoved', mb.l + 4, mb.t + 4); await closePops();
    await mouse('mousePressed', mb.l + 4, mb.t + 4, 'right'); await mouse('mouseReleased', mb.l + 4, mb.t + 4, 'right'); await wait(120);
    check('right-click on a gadget does not', !(await ev(`document.getElementById('ayni-edge')?.matches(':popover-open')`)));

    /* ---------- The bar's size ---------- */
    await fresh();
    for (const n of [36, 72]) {
      await ev(`(document.querySelector('.desktop').style.setProperty('--bar-h', '${n}px'), true)`); await wait(40);
      const b = await box('.taskbar');
      check(`${n} px: the bar`, b.h === n, b);
      check(`${n} px: the launcher button leaves a margin, the window buttons follow the bar`, n === 36 ? (await box('#go')).h === 28 && (await box(FRONT + ' [data-win="min"]')).w === 22 : (await box('#go')).h === 36 && (await box(FRONT + ' [data-win="min"]')).w === 30, [await box('#go'), await box(FRONT + ' [data-win="min"]')]);
      check(`${n} px: the launcher button and the chip fit inside`, await ev(`[document.getElementById('go'), document.querySelector(${JSON.stringify(FRONT)})].every((el) => { const r = el.getBoundingClientRect(), a = document.querySelector('.taskbar').getBoundingClientRect(); return r.top >= a.top - .5 && r.bottom <= a.bottom + .5; })`));
    }
    await ev(`(document.querySelector('.desktop').style.setProperty('--bar-h', '36px'), Ayni.setTouchPreview(true), true)`); await wait(60);
    check('touch: at least 56 px, whatever the size', (await box('.taskbar')).h === 56, await box('.taskbar'));
    await ev(`(document.querySelector('.desktop').style.setProperty('--bar-h', '72px'), true)`); await wait(40);
    check('touch: more when the size says so', (await box('.taskbar')).h === 72);
    await ev(`(document.querySelector('.desktop').style.removeProperty('--bar-h'), true)`); await wait(40);
    check('touch: window buttons are 36 px, 8 px apart', (await box(FRONT + ' [data-win="min"]')).w === 36 && (await style(FRONT + ' .chip-ctl', 'gap')) === '8px');
    check('touch: each has a 44 px hit area', await ev(`(() => { const b = document.querySelector(${JSON.stringify(FRONT + ' [data-win="min"]')}), s = getComputedStyle(b, '::before'); return b.getBoundingClientRect().width - parseFloat(s.left) - parseFloat(s.right) >= 44; })()`));
    check('touch: a window\'s grips are 12 px', (await style('#w2 > .win-grip[data-dir="e"]', 'width')) === '12px');
    await setEdge('left');
    check('touch: a side bar is 56 px wide', (await box('.taskbar')).w === 56);
    await setEdge('bottom');
    await ev(`(Ayni.setTouchPreview(false), true)`); await wait(40);

    /* ---------- Many chips ---------- */
    await fresh();
    await ev(`(() => { for (let i = 0; i < 26; i++) add('W' + i); return true; })()`); await wait(80);
    const inView = () => ev(`(() => { const c = document.querySelector('.chips').getBoundingClientRect(), f = document.querySelector(${JSON.stringify(FRONT)}).getBoundingClientRect(); return f.left >= c.left - 1 && f.right <= c.right + 1 && f.top >= c.top - 1 && f.bottom <= c.bottom + 1; })()`);
    check('too many chips: the row scrolls, no chip is cut off for good', await ev(`(() => { const c = document.querySelector('.chips'); return c.scrollWidth > c.clientWidth && getComputedStyle(c).overflowX === 'auto'; })()`));
    check('the selected chip is in view', await inView());
    await ev(`(document.querySelector('.chips').scrollLeft = 0, true)`);
    const c0 = await box('.chips');
    await t.send('Input.dispatchMouseEvent', { type: 'mouseWheel', x: c0.l + 100, y: c0.t + c0.h / 2, deltaX: 0, deltaY: 120 }); await wait(120);
    check('the wheel moves the row along the bar', (await ev(`document.querySelector('.chips').scrollLeft`)) === 120, await ev(`document.querySelector('.chips').scrollLeft`));
    await ev(`(Ayni.windows.select(document.querySelector('.panel.window')), true)`); await wait(60);
    check('selecting a window brings its chip into view', await inView());
    await setEdge('left'); await ev(`(Ayni.windows.select(document.querySelectorAll('.panel.window')[20]), true)`); await wait(60);
    check('on a side bar the column scrolls, and the chip comes into view', await ev(`(() => { const c = document.querySelector('.chips'); return c.scrollHeight > c.clientHeight; })()`) && await inView(), await ev(`(() => { const c = document.querySelector('.chips'), r = c.getBoundingClientRect(), f = document.querySelector(${JSON.stringify(FRONT)}).getBoundingClientRect(); return [c.scrollHeight, c.clientHeight, r.top, r.bottom, f.top, f.bottom, r.left, r.right, f.left, f.right]; })()`));
    await setEdge('bottom');

    /* ---------- A tall popup ---------- */
    await fresh();
    await size(1280, 620);
    await click('#s-btn'); await wait(80);
    let p = await box('#tall'), b2 = await box('.taskbar');
    check('a popup taller than the room stops above the bar', p.b <= b2.t && p.t >= 0, { p, b2 });
    check('…and scrolls', await ev(`(() => { const e = document.getElementById('tall'); return e.scrollHeight > e.clientHeight && getComputedStyle(e).overflowY === 'auto'; })()`));
    await closePops();
    await size(1280, 760);
    await click('#s-btn'); await wait(80);
    check('a .tall popup goes past the 320 px of others', (await box('#tall')).h > 320, await box('#tall'));
    await closePops(); await click('#l-btn'); await wait(80);
    check('…another keeps its 320 px, the room on the bar never lifts it', (await box('#long')).h === 320, await box('#long'));
    await closePops(); await click('#s-btn'); await wait(80);
    await ev(`(() => { const s = document.getElementById('size'); s.value = 60; s.dispatchEvent(new Event('input', { bubbles: true })); return true; })()`); await wait(40);
    check('a press inside leaves it open, and the bar follows the slider', await ev(`document.getElementById('tall').matches(':popover-open')`) && (await box('.taskbar')).h === 60);
    await closePops();
    await ev(`(document.querySelector('.desktop').style.removeProperty('--bar-h'), true)`);
    await ev(`(Ayni.showPopup(document.getElementById('month'), document.getElementById('m-btn')), true)`); await wait(80);
    check('showPopup: a popup opened from code is placed by that button', off('bottom', await box('#month'), await box('.taskbar')) && Math.abs((await box('#month')).r - (await box('#m-btn')).r) < 1, await box('#month'));
    await ev(`(document.getElementById('w1f').focus(), document.getElementById('month').hidePopover(), true)`); await wait(60);
    check('a popup closed while the focus is elsewhere leaves the focus there', await ev(`document.activeElement.id`) === 'w1f', await ev(`document.activeElement.id`));
    await ev(`(document.activeElement.blur(), true)`);
    { const open = () => ev(`document.getElementById('month').matches(':popover-open')`), r = await box('.area'), x = r.r - 20, y = r.b - 20;
      await mouse('mouseMoved', x, y); await mouse('mousePressed', x, y);
      await ev(`(Ayni.showPopup(document.getElementById('month'), document.getElementById('m-btn')), true)`); await wait(40);
      check('showPopup while a press is held: it waits for the release', !(await open()));
      await mouse('mouseReleased', x, y); await wait(80);
      check('…then opens, and that release does not close it', await open());
      await closePops(); }

    /* ---------- The launcher and the clock ---------- */
    await fresh();
    await click('#go'); await wait(80);
    check('the launcher opens with the focus in its search field', await ev(`document.activeElement.id`) === 'app-q');
    await ev(`(() => { const i = document.getElementById('app-q'); i.value = 'not'; i.dispatchEvent(new Event('input', { bubbles: true })); return true; })()`); await wait(30);
    check('typing filters by the search rule', await ev(`[...document.querySelectorAll('.apps > button')].filter((b) => !b.hidden).map((b) => b.dataset.app).join()`) === 'notes');
    await key('Enter'); await wait(60);
    check('Enter opens the first match and closes it', (await log()).endsWith('launch notes') && await ev(`!document.getElementById('apps').matches(':popover-open')`));
    await click('#go'); await wait(80);
    check('the most used app comes first', await ev(`document.querySelector('.apps > button').dataset.app`) === 'notes');
    await closePops();
    check('the clock shows the time and has a long date in its tooltip', await ev(`/\\d/.test(clk.textContent) && clk.dataset.tip.length > 8 && clk.tabIndex === 0`));

    /* ---------- When it is on ---------- */
    await fresh();
    check('wide: it is on', await ev(`Ayni.isDesktop()`) && (await style('#small', 'display')) === 'none');
    await size(900, 900); await wait(80);
    check('below 1024 px it hides, and .no-desktop shows', (await style('.desktop', 'display')) === 'none' && (await style('#small', 'display')) === 'block');
    check('…Ayni.isDesktop() says so', !(await ev(`Ayni.isDesktop()`)));
    check('…and the page is told', /mode false/.test(await log()));
    await ev(`(document.querySelector('.desktop').dataset.mode = 'app', true)`); await wait(30);
    check('data-mode="app": the app has its own rule, it shows', (await style('.desktop', 'display')) === 'grid' && await ev(`Ayni.isDesktop()`));
    await ev(`(delete document.querySelector('.desktop').dataset.mode, true)`);
    await size(1280, 760); await wait(80);
    check('wide again: the page is told', /mode true/.test(await log()));

    /* ---------- The calendar: week numbers and view only ---------- */
    await fresh();
    await click('#m-btn'); await wait(60);
    const firstWeeks = (y, m) => ev(`(view.set(new Date(${y}, ${m}, 15)), [...document.querySelectorAll('#view tbody th.cal-wk')].map((c) => c.textContent).join())`);
    check('week numbers: January 2026 starts in week 1', (await firstWeeks(2026, 0)) === '1,2,3,4,5,6', await firstWeeks(2026, 0));
    check('week numbers: January 2021 starts in week 53', (await firstWeeks(2021, 0)) === '53,1,2,3,4,5', await firstWeeks(2021, 0));
    check('week numbers: December 2024 ends in week 1', (await firstWeeks(2024, 11)) === '48,49,50,51,52,1', await firstWeeks(2024, 11));
    check('week numbers: over a summer-time change', (await firstWeeks(2026, 2)) === '9,10,11,12,13,14', await firstWeeks(2026, 2));
    check('week numbers: a header cell over them, 8 columns', await ev(`document.querySelectorAll('#view thead th').length === 8 && document.querySelector('#view tbody tr').children.length === 8`));
    check('view only: days are no buttons and take no focus', await ev(`document.querySelectorAll('#view td button').length === 0 && document.querySelectorAll('#view td span').length === 42 && !document.querySelector('#view td [tabindex]')`));
    const title = () => ev(`document.querySelector('#view .cal-title').textContent.trim()`);
    await ev(`(view.set(new Date()), true)`); await wait(30);
    const today = await title();
    check('view only: today is marked', await ev(`document.querySelectorAll('#view td span.today').length`) === 1);
    check('view only: nothing is shown as picked', !(await ev(`!!document.querySelector('#view [aria-selected="true"]')`)));
    await click('#view [data-nav="1"]');
    check('view only: the arrow moves it', (await title()) !== today);
    await click('#view [data-today]');
    check('view only: Today goes back to this month', (await title()) === today);
    await ev(`(document.querySelector('#view .cal-title').focus(), true)`);
    await key('PageDown');
    check('view only: Page Down moves a month', (await title()) !== today);
    await key('PageUp');
    check('view only: Page Up comes back', (await title()) === today);
    await click('#view .cal-title'); await wait(30);
    check('view only: the title opens the months', await ev(`document.querySelectorAll('#view .cal-grid button').length === 12`));
    check('view only: the grid is as wide as the days with week numbers', (await box('#view .cal-grid')).w === 272, await box('#view .cal-grid'));
    await click('#view .cal-title'); await wait(30);
    check('view only: then the years', await ev(`/\\d{4}.*\\d{4}/.test(document.querySelector('#view .cal-title').textContent)`));
    await click('#view .cal-grid button:nth-child(2)'); await wait(30);
    check('view only: picking a year goes back to the days, with no crash', await ev(`document.querySelectorAll('#view td span').length`) === 42);
    await closePops();
    check('a calendar with a function still picks, week numbers or not', await ev(`(() => { document.getElementById('pickp').showPopover(); document.querySelector('#pick td button[data-d]').click(); return R.some((x) => x.startsWith('picked')) && !!document.querySelector('#pick .cal-wk'); })()`));
    await closePops();
    await ev(`(Ayni.setTouchPreview(true), document.getElementById('month').showPopover(), true)`); await wait(40);
    check('touch: a view-only day is a 44 px cell', (await ev(`document.querySelector('#view td span').offsetWidth`)) === 44 && (await ev(`document.querySelector('#view td span').offsetHeight`)) === 44);
    await closePops(); await ev(`(Ayni.setTouchPreview(false), true)`);

    /* ---------- Dark ---------- */
    await scheme(t, 'dark'); await wait(60);
    check('dark: the selected chip takes the dark card colour', (await style(FRONT, 'backgroundColor')) === 'rgb(37, 39, 43)', await style(FRONT, 'backgroundColor'));
    await scheme(t, 'light'); await wait(60);

    /* ---------- Languages ---------- */
    check('no untranslated keys in the desktop family', (await ev(RAW_KEYS)).length === 0, await ev(RAW_KEYS));
    check('no errors or warnings in the desktop family', t.logs.length === 0, t.logs.slice());
    const NEW = ['ayni.desk.edge.left', 'ayni.desk.edge.right'];
    for (const lang of ['en', 'es', 'pt', 'fr', 'de']) {
      const j = JSON.parse(fs.readFileSync(path.join(ROOT, 'i18n', lang + '.json'), 'utf8'));
      check(`${lang}: the desktop family's texts are all there`, NEW.every((k) => j[k]) && !j['ayni.win.more'], NEW.filter((k) => !j[k]));
    }
    await ev(`(localStorage.clear(), localStorage.setItem('ayni-lang', 'es'), true)`); await t.open(PAGE); await wait(40);
    check('es: the edge menu', await ev(`document.querySelector('#ayni-edge [data-edge="left"]').textContent.trim()`) === 'Barra de tareas a la izquierda');
    check('es: no untranslated keys', (await ev(RAW_KEYS)).length === 0, await ev(RAW_KEYS));
    await ev(`(localStorage.clear(), true)`);

    /* ---------- An app with its own windows: the look only ---------- */
    t.logs.length = 0;
    await size(900, 1000);
    const CSS = BASE + '/tests/desktop-css-only.html';
    await t.open(CSS); await wait(40);
    check('look only: starts clean, with no ayni-desktop.js', t.logs.length === 0 && await ev(`![...document.scripts].some((s) => /ayni-desktop\\.js$/.test(s.src)) && !window.Ayni.windows`), t.logs.slice());
    check('look only: data-mode="app" shows it below 1024 px', (await style('.desktop', 'display')) === 'grid');
    check('look only: the bar is 48 px', (await box('.taskbar')).h === 48);
    check('look only: boxes size as Ayni\'s, with no reset from ayni.css', await ev(`['.desktop', '.taskbar', '.chips', '.chip', '.chip-main', '.widget'].every((s) => getComputedStyle(document.querySelector(s)).boxSizing === 'border-box')`));
    check('look only: a written chip looks selected', (await style('#c1 .chip-main > span:not(.icon)', 'display')) !== 'none' && await ev(`document.querySelectorAll('#c1 .chip-ctl .btn').length === 4 && [...document.querySelectorAll('#c1 .chip-ctl .btn')].every((b) => b.getBoundingClientRect().width === 30)`));
    check('look only: the other shows its icon, minimised grey', (await style('#c2 .chip-main > span:not(.icon)', 'display')) === 'none' && (await style('#c2 .chip-ctl', 'display')) === 'none');
    check('look only: a button gadget has no browser look', (await style('#clock', 'borderTopWidth')) === '0px' && (await style('#clock', 'backgroundColor')) === 'rgba(0, 0, 0, 0)');
    for (const e of ['top', 'left', 'right', 'bottom']) {
      await ev(`(document.querySelector('.desktop').dataset.edge = '${e}', true)`); await wait(30);
      await click('#wx'); await wait(60);
      check(`look only: ${e}: Ayni.place opens the popup off the bar`, off(e, await box('#pop'), await box('.taskbar')), await box('#pop'));
      await closePops();
    }
    check('look only: no errors or warnings', t.logs.length === 0, t.logs.slice());
    await size(1280, 900);
  }

  section('Desktop page');
  t.logs.length = 0;
  await t.open(BASE + '/gallery/desktop.html');
  check('desktop.html loads with no errors or warnings', t.logs.length === 0, t.logs.slice());
  check('desktop.html: no untranslated keys', (await t.evaluate(RAW_KEYS)).length === 0, await t.evaluate(RAW_KEYS));
  check('desktop.html: the month and the settings gadgets', await t.evaluate(`!!document.querySelector('#month-view[data-weeks] .cal-title') && document.querySelectorAll('button.widget').length === 2 && !!document.querySelector('.panel.popup.controls.tall')`));
  await t.open(BASE + '/gallery/index.html');
  check('the gallery shows week numbers and a view-only calendar', await t.evaluate(`!!document.querySelector('#cal-view .cal-wk') && !document.querySelector('#cal-view td button')`));
} catch (e) {
  failed.push('the run stopped: ' + e.message);
  console.error(e);
}

console.log(`\n${passed} passed, ${failed.length} failed`);
if (failed.length) { console.log('\nFAILED:\n- ' + failed.join('\n- ')); await quit(1); }
console.log('ALL GREEN');
await quit(0);
