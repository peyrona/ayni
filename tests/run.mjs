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

  section('Desktop page');
  t.logs.length = 0;
  await t.open(BASE + '/gallery/desktop.html');
  check('desktop.html loads with no errors or warnings', t.logs.length === 0, t.logs.slice());
  check('desktop.html: no untranslated keys', (await t.evaluate(RAW_KEYS)).length === 0, await t.evaluate(RAW_KEYS));
} catch (e) {
  failed.push('the run stopped: ' + e.message);
  console.error(e);
}

console.log(`\n${passed} passed, ${failed.length} failed`);
if (failed.length) { console.log('\nFAILED:\n- ' + failed.join('\n- ')); await quit(1); }
console.log('ALL GREEN');
await quit(0);
