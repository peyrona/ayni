/* The proof: the sample app runs on Ayni alone, saves, and keeps a note made offline. node sample/test.mjs */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { browser, attach } from '../tools/cdp.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url)), PORT = 8765, DATA = fs.mkdtempSync(path.join(os.tmpdir(), 'ayni-sample-'));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const server = spawn('node', [path.join(HERE, 'server.mjs'), String(PORT), DATA], { stdio: 'ignore' });
await sleep(400);
let bad = 0;
const check = (name, ok, info) => { console.log((ok ? 'ok   ' : 'FAIL ') + name + (ok || info === undefined ? '' : '  ' + JSON.stringify(info))); if (!ok) bad++; };
const b = await browser();
try {
  const tab = await b.newTab('about:blank'), c = await attach(tab.webSocketDebuggerUrl);
  await c.send('Page.bringToFront');
  const go = async () => { await c.send('Page.navigate', { url: `http://127.0.0.1:${PORT}/sample/` }); await sleep(900); };
  const add = async (text) => {
    await c.evaluate(`document.getElementById('newBtn').click(), true`); await sleep(200);
    await c.evaluate(`(() => { const i = document.querySelector('dialog.panel[open] input'); i.value = ${JSON.stringify(text)}; i.dispatchEvent(new Event('input', { bubbles: true })); document.querySelector('dialog.panel[open] .btn.primary').click(); return true; })()`);
    await sleep(500);
  };
  const file = () => { try { return JSON.parse(fs.readFileSync(path.join(DATA, 'data/notes.json'), 'utf8')); } catch { return []; } };
  await go();
  check('the app opens with no errors', c.logs.filter((l) => /^EXCEPTION/.test(l)).length === 0, c.logs);
  check('the page uses nothing but Ayni', await c.evaluate(`[...document.scripts].every((s) => !s.src || /\\/ayni-|\\/notes\\.js/.test(s.src))`));
  await add('first');
  check('a note shows', await c.evaluate(`document.querySelectorAll('#notes .note').length`) === 1);
  await sleep(600);
  check('it reached the disk', file().length === 1, file());
  await go();
  check('it is there after a reload', await c.evaluate(`document.querySelector('#notes .note')?.textContent`) === 'first');
  await c.send('Network.enable');
  await c.send('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
  await add('offline');
  check('offline a note still shows', await c.evaluate(`document.querySelectorAll('#notes .note').length`) === 2);
  check('...and the disk does not have it yet', file().length === 1);
  await c.send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
  await c.evaluate(`dispatchEvent(new Event('online')), true`);
  for (let i = 0; i < 40 && file().length < 2; i++) await sleep(250);
  check('back online it is saved', file().length === 2, file());
  /* A read while a save waits (offline): a save made DURING that read is what the read gives - never the older one.
     Save 2 starts 0 to 30 promise steps after the read, so it lands at every point of the read's own look */
  await c.send('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
  const race = await c.evaluate(`(async () => {
    const s = AyniStore.createStore({}), P = 'data/race.json', stale = [];
    for (let i = 0; i < 31; i++) {
      await s.write(P, 'one-' + i);
      let over = false; const r = s.read(P); r.then(() => { over = true; });
      for (let k = 0; k < i; k++) await Promise.resolve();
      const during = !over, w = s.write(P, 'two-' + i), got = (await r).body; await w;
      if (during && got !== 'two-' + i) stale.push(got);
    }
    return stale;
  })()`);
  check('a save made while a read runs is what that read gives', race.length === 0, race);
  await c.send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
} finally { await b.kill(); server.kill(); fs.rmSync(DATA, { recursive: true, force: true }); }
console.log(bad ? `${bad} failed` : 'ALL GREEN');
process.exit(bad ? 1 : 0);
