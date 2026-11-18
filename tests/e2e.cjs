/* Test de bout en bout des deux éditions (Chromium via Playwright).
   Usage : python3 outils/fabriquer_standard.py
           node tests/e2e.cjs chemin/vers/document.docx [dossier_captures]
   Le document source n'est pas versionné dans le dépôt.
   Les sélecteurs de dossier / fichier sont simulés avec le stockage privé du navigateur (OPFS). */
const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');

const DOCX = process.argv[2];
const SHOTS = process.argv[3] || null;
if (!DOCX || !fs.existsSync(DOCX)) { console.error('Usage : node tests/e2e.cjs document.docx [captures]'); process.exit(2); }
const DIST = path.join(__dirname, '..', 'dist');

let fails = 0;
const ok = (cond, msg) => { console.log((cond ? '  ✓ ' : '  ✗ ') + msg); if (!cond) fails++; };

const server = http.createServer((req, res) => {
  const f = path.join(DIST, decodeURIComponent(req.url.split('?')[0]));
  if (!f.startsWith(DIST) || !fs.existsSync(f)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' });
  res.end(fs.readFileSync(f));
});

const PICKERS = () => {
  window.showDirectoryPicker = async () => navigator.storage.getDirectory();
  /* Chromium sans fenêtre refuse les demandes d'autorisation : on les accepte ici (test uniquement). */
  if (window.FileSystemHandle) { FileSystemHandle.prototype.queryPermission = async () => 'granted'; FileSystemHandle.prototype.requestPermission = async () => 'granted'; }
  window.showSaveFilePicker = async (o) => (await navigator.storage.getDirectory()).getFileHandle('export-' + (o && o.suggestedName || 'x'), { create: true });
};

async function shot(page, name) { if (SHOTS) { fs.mkdirSync(SHOTS, { recursive: true }); await page.screenshot({ path: path.join(SHOTS, name + '.png'), fullPage: false }); } }

(async () => {
  await new Promise(r => server.listen(0, r));
  const base = `http://127.0.0.1:${server.address().port}/`;
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'fr-FR' });
  await ctx.addInitScript(PICKERS);
  const requests = [];
  ctx.on('request', r => { if (!r.url().startsWith(base)) requests.push(r.url()); });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('dialog', d => { console.log('     [dialogue] ' + d.message()); d.accept(); });

  console.log('Édition admin');
  await page.goto(base + 'Competitor_Analysis_admin.html');
  await page.fill('#lkName', 'Test Admin');
  await page.fill('#lkPw', 'motdepasse-test-1');
  await page.fill('#lkPw2', 'motdepasse-test-1');
  await page.click('#lkGo');
  await page.waitForSelector('#app:not(.hidden)');
  ok(await page.isVisible('text=Aucune donnée chargée'), 'écran vide avant import');

  await page.click('nav.tabs button[data-v="data"]');
  const [fc] = await Promise.all([page.waitForEvent('filechooser'), page.click('#dImp')]);
  await fc.setFiles(DOCX);
  await page.waitForSelector('#dSv', { timeout: 60000 });
  const checks = await page.$$eval('.ck', els => els.map(e => e.className.split(' ')[1] + ' ' + e.textContent));
  checks.forEach(c => console.log('     ' + c));
  ok(checks.some(c => c.includes('10 concurrents reconnus')), '10 concurrents reconnus');
  ok(checks.some(c => c.includes('193 pays importés')), '193 pays importés');
  ok(!checks.some(c => c.startsWith('err')), 'aucune erreur bloquante');
  await shot(page, '01-import');
  await page.click('#dSv');
  await page.waitForSelector('text=Historique des imports');

  await page.click('nav.tabs button[data-v="map"]');
  await page.waitForSelector('#map path.c');
  ok(await page.$$eval('#map .c', els => new Set(els.map(e => e.dataset.m)).size) === 193, '193 pays sur la carte');
  const greenish = await page.$$eval('#map .c', els => els.filter(e => e.getAttribute('fill') !== '#E7EAEC').length);
  ok(greenish > 150, 'carte colorée (' + greenish + ' pays)');
  await shot(page, '02-carte');
  await page.click('#layers [data-l="hsbc"]');
  await shot(page, '03-carte-hsbc');
  await page.click('.zoomto button[data-z="Europe"]');
  await shot(page, '04-carte-europe');
  await page.click('.zoomto button[data-z=""]');

  await page.click('#map path.c[data-m]', { position: { x: 5, y: 5 }, force: true }).catch(() => {});
  await page.evaluate(() => openCountry(M.byName.get('Nigeria')));
  await page.waitForSelector('#drawer.open');
  await page.waitForTimeout(400);
  const drawerTxt = await page.textContent('#drBd');
  ok(drawerTxt.includes('Standard Chartered') && drawerTxt.includes('Citi'), 'fiche Nigeria');
  await shot(page, '05-fiche-pays');
  await page.click('#drX');

  await page.click('nav.tabs button[data-v="countries"]');
  await page.fill('#cq', 'allem');
  ok((await page.textContent('#cn')).startsWith('1 '), 'recherche « allem » → Allemagne');
  await page.fill('#cq', '');
  await shot(page, '06-pays');

  await page.click('nav.tabs button[data-v="banks"]');
  ok((await page.$$('.bcard')).length === 10, '10 cartes concurrents');
  await shot(page, '07-concurrents');
  await page.click('.bcard[data-b="citi"]');
  await page.waitForSelector('.covrow');
  ok(await page.isVisible('img.infog'), 'visuel Citi présent');
  ok((await page.textContent('#main')).includes('recalculés'), 'écart synthèse / détail signalé');
  await shot(page, '08-fiche-citi');

  await page.click('nav.tabs button[data-v="table"]');
  ok((await page.textContent('#tn')).startsWith('193'), 'tableau : 193 pays');
  await page.selectOption('#tbk', 'scb');
  await page.selectOption('#tm', 'g:onshore');
  const n = parseInt(await page.textContent('#tn'), 10);
  ok(n === await page.evaluate(() => M.stats[M.bi.scb].tot.onshore), 'filtre SCB sur place = ' + n);
  await shot(page, '09-tableau');

  await page.click('nav.tabs button[data-v="method"]');
  ok((await page.$$('.srcl li')).length > 50, 'sources listées');
  await shot(page, '10-methode');

  for (const lg of ['en', 'nl']) {
    await page.selectOption('#hdLang', lg);
    await page.click('nav.tabs button[data-v="countries"]');
    const first = await page.textContent('.crow b');
    ok(lg === 'nl' ? first.includes('Afghanistan') : first.includes('Afghanistan'), 'langue ' + lg + ' : ' + first);
  }
  await page.selectOption('#hdLang', 'nl');
  await shot(page, '11-pays-nl');
  await page.selectOption('#hdLang', 'fr');

  console.log('Publication');
  await page.click('nav.tabs button[data-v="pub"]');
  await page.click('#pCr');
  await page.fill('#mk1', 'cle-equipe-test-123');
  await page.fill('#mk2', 'cle-equipe-test-123');
  await page.click('#mko');
  await page.waitForFunction(() => /^Connecté/.test(document.querySelector('#pSt')?.textContent || ''), null, { timeout: 20000 });
  await page.click('#pPu');
  await page.waitForSelector('#pSt:has-text("n° 1")', { timeout: 20000 });
  await shot(page, '13-publication');
  const files = await page.evaluate(async () => { const d = await navigator.storage.getDirectory(); const out = []; for await (const [k] of d.entries()) out.push(k); return out; });
  ok(files.includes('ca-equipe.json') && files.includes('edition.cae'), 'fichiers d\'équipe écrits : ' + files.join(', '));
  const edTxt = await page.evaluate(async () => { const d = await navigator.storage.getDirectory(); return (await (await d.getFileHandle('edition.cae')).getFile()).text(); });
  ok(!edTxt.includes('Nigeria') && !edTxt.includes('JPMorgan'), 'édition chiffrée (aucun nom en clair)');
  const vaultClear = await page.evaluate(async () => JSON.stringify(await kvGet('vault')).includes('Nigeria'));
  ok(!vaultClear, 'coffre chiffré dans IndexedDB');

  await page.click('#hdLock');
  await page.waitForSelector('#lkGo:has-text("Déverrouiller")');
  ok(await page.isVisible('#lkPw'), 'verrouillage');
  await page.fill('#lkPw', 'mauvais-mot-de-passe');
  await page.click('#lkGo');
  await page.waitForSelector('text=Mot de passe incorrect.');
  ok(true, 'mauvais mot de passe refusé');

  console.log('Édition standard');
  const p2 = await ctx.newPage();
  p2.on('pageerror', e => errors.push('std: ' + e.message));
  p2.on('dialog', d => d.accept());
  await p2.goto(base + 'Competitor_Analysis_standard.html');
  await p2.fill('#lkName', 'Test Std');
  await p2.fill('#lkPw', 'motdepasse-std-1');
  await p2.fill('#lkPw2', 'motdepasse-std-1');
  await p2.click('#lkGo');
  await p2.waitForSelector('#app:not(.hidden)');
  ok(!(await p2.$('nav.tabs button[data-v="data"]')), 'pas d\'onglet Données en standard');
  ok(await p2.evaluate(() => typeof docToData === 'undefined' && typeof importDocx === 'undefined'), 'code d\'import absent du standard');
  await p2.click('nav.tabs button[data-v="edition"]');
  await p2.click('#eCo');
  await p2.fill('#mk1', 'mauvaise-cle-equipe');
  await p2.click('#mko');
  await p2.waitForSelector('text=Clé d’équipe incorrecte.');
  ok(true, 'mauvaise clé d\'équipe refusée');
  await p2.click('#eCo');
  await p2.fill('#mk1', 'cle-equipe-test-123');
  await p2.click('#mko');
  await p2.waitForSelector('text=Édition chargée : n° 1', { timeout: 20000 });
  ok(true, 'édition n° 1 chargée');
  await p2.click('nav.tabs button[data-v="map"]');
  ok(await p2.$$eval('#map .c', els => new Set(els.map(e => e.dataset.m)).size) === 193, 'carte standard');
  await shot(p2, '12-standard-carte');

  ok(errors.length === 0, 'aucune erreur JavaScript' + (errors.length ? ' : ' + errors.join(' | ') : ''));
  ok(requests.length === 0, 'aucune requête réseau externe' + (requests.length ? ' : ' + requests.join(', ') : ''));

  await browser.close(); server.close();
  console.log(fails ? `\n${fails} échec(s)` : '\nTous les contrôles sont passés');
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
