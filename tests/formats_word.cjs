/* Vérifie l'import des variantes Word fabriquées par tests/variantes_word.py.
   Usage : node tests/formats_word.cjs dossier_variantes [traductions.json] */
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const DIR = process.argv[2], TRAD = process.argv[3] || null;
const HTML = path.join(__dirname, '..', 'dist', 'Competitor_Analysis.html');
const LISIBLES = ['original.docx', 'word_sdt.docx', 'resave.docx'];
const REFUS = { 'protected.docx': 'chiffré', 'original.doc': 'Word 97-2003', 'original.rtf': 'RTF', 'original.odt': 'OpenDocument' };
let fails = 0;
const ok = (c, m) => { console.log((c ? '  ✓ ' : '  ✗ ') + m); if (!c) fails++; };
const srv = http.createServer((q, r) => { r.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); r.end(fs.readFileSync(HTML)); });

(async () => {
  await new Promise(r => srv.listen(0, r));
  const b = await chromium.launch();
  for (const f of [...LISIBLES, ...Object.keys(REFUS)]) {
    const file = path.join(DIR, f);
    if (!fs.existsSync(file)) { ok(false, f + ' absent'); continue; }
    const ctx = await b.newContext({ locale: 'fr-FR' }); const p = await ctx.newPage(); const errs = [];
    p.on('pageerror', e => errs.push(e.message));
    await p.goto(`http://127.0.0.1:${srv.address().port}/`);
    await p.click('#lkRole [data-r="admin"]'); await p.waitForSelector('#lkName');
    await p.fill('#lkPw', 'motdepasse-1'); await p.fill('#lkPw2', 'motdepasse-1'); await p.click('#lkGo');
    await p.waitForSelector('#app:not(.hidden)');
    await p.click('nav.tabs button[data-v="data"]');
    const [fc] = await Promise.all([p.waitForEvent('filechooser'), p.click('#dImp')]);
    await fc.setFiles(file);
    await p.waitForFunction(() => document.querySelector('#dSv') || document.querySelector('#dRep .callout'), null, { timeout: 120000 });
    const txt = await p.textContent('#dRep');
    if (LISIBLES.includes(f)) {
      ok(txt.includes('193 pays importés') && txt.includes('10 concurrents reconnus') && txt.includes('72 sources lues'), f + ' : 193 pays, 10 concurrents, 72 sources');
      await p.click('#dSv'); await p.waitForSelector('#dTrSt');
      const m0 = (await p.textContent('#dTrSt')).match(/(\d+) textes sur (\d+)/);
      ok(m0 && m0[1] === m0[2], f + ' : traduction automatique (' + (m0 ? m0[1] + '/' + m0[2] : '?') + ')');
      if (TRAD) {
        await p.waitForSelector('#dTr');
        const [fc2] = await Promise.all([p.waitForEvent('filechooser'), p.click('#dTr')]);
        await fc2.setFiles(TRAD);
        await p.waitForSelector('#dTrSt:has-text("Traductions FR / NL")');
        const m = (await p.textContent('#dTrSt')).match(/(\d+) textes sur (\d+)/);
        ok(m && m[1] === m[2], f + ' : traductions appliquées (' + (m ? m[1] + '/' + m[2] : '?') + ')');
      }
    } else {
      ok(txt.includes(REFUS[f]) && txt.includes('Enregistrer sous') || (f === 'protected.docx' && txt.includes('sans mot de passe')), f + ' : message « ' + REFUS[f] + ' » et marche à suivre');
    }
    ok(errs.length === 0, f + ' : aucune erreur JavaScript' + (errs.length ? ' (' + errs.join(' | ') + ')' : ''));
    await ctx.close();
  }
  await b.close(); srv.close();
  console.log(fails ? `\n${fails} échec(s)` : '\nTous les contrôles sont passés');
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
