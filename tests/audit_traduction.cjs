/* Audit des traductions : parcourt tous les écrans dans une langue et relève le texte anglais visible.
   Usage : node tests/audit_traduction.cjs document.docx [fr|nl] [traductions.json]
   Sans paquet de traductions, l'outil doit traduire seul (traductions intégrées). */
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const DOCX = process.argv[2], LG = process.argv[3] || 'fr', TRAD = process.argv[4] || null;
const HTML = path.join(__dirname, '..', 'dist', 'Competitor_Analysis.html');
/* Mots anglais courants, absents du français et du néerlandais */
const EN = new RegExp('\\b(the|and|' + (LG === 'nl' ? '' : 'of|') + 'with|for|across|its|which|from|through|while|including|onshore|cross-border|founded|banking|revenue|clearing|corridor|only|trade hub|branch|subsidiary|hub;|annual report|filing|regulatory)\\b', 'i');
/* Noms propres et termes conservés volontairement */
const KEEP = /(Bank of America|Standard Chartered|Goldman Sachs|Deutsche Bank|Hang Seng Bank|Global Transaction|Transaction Banking|Treasury and Trade|Treasury Services|Trade & Working Capital|Corporate & Investment|Global Payments|Global Trade|Global Banking|Global Markets|Investment Bank|International Trade|Banco |Citibank|J\.P\. Morgan|Chase|Securities and Exchange|Financial Report|Bank \(|Bank Europe|Bank Ghana|Bank \(Thai\)|Bank \(Taiwan\)|Bank Nepal|Bank Malta|Bank Polska|Bank of Italy|Bank Limited|Corporate Bank|Bank USA|Holdings|Group|Inc\.|PLC|plc|Limited|SE|DAC|Form \d|Annual Report|Universal Registration|Section 165|Resolution Plan|Corporate Bank|Platform Solutions|FICC|Equities Financing|Wealth Management|Working Capital|Asset|The Asset|Best in Treasury|Best Liquidity|Best Trade|Best Bank|Trade Finance Providers|Guide to|FINANCE Banken|World's Best|Electronic Bill|Large Customers|Other \/|Exhibit|Master_UN|The Goldman Sachs Group|Here for Good|Life, Liberty and the Pursuit of Happiness|Global Finance|Africa_54|Asia_47|Europe_43|North_America|Oceania_14|South_America|Complete Sovereign|Comparative Institutional|Granular Institutional|Global Cartography|Classification Code|Primary Evidence|Global Total|Footprint|Commercial & Investment|Global Network|Historical Origin|Latest Quantified|Core Strategic|Primary Transaction|Operational Presence|Regulatory & Operational|Historical Era|Office of Foreign|Council of the|HM Treasury|Security Council|Federal Reserve|Federal Deposit|Board of Governors|Companies Act|Regulatory News|Comisión|Autorité|Mercado|Hong Kong|New York|Santander|BBVA|HSBC|JPMorgan|Citi|https?:\/\/\S+|developer\.gs\.com)/g;

const srv = http.createServer((q, r) => { r.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); r.end(fs.readFileSync(HTML)); });
(async () => {
  await new Promise(r => srv.listen(0, r));
  const b = await chromium.launch();
  const ctx = await b.newContext({ locale: 'fr-FR', viewport: { width: 1440, height: 900 } });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(`http://127.0.0.1:${srv.address().port}/`);
  await p.click('#lkRole [data-r="admin"]'); await p.waitForSelector('#lkName');
  await p.fill('#lkPw', 'motdepasse-1'); await p.fill('#lkPw2', 'motdepasse-1'); await p.click('#lkGo');
  await p.waitForSelector('#app:not(.hidden)');
  await p.click('nav.tabs button[data-v="data"]');
  const [fc] = await Promise.all([p.waitForEvent('filechooser'), p.click('#dImp')]);
  await fc.setFiles(DOCX); await p.waitForSelector('#dSv', { timeout: 120000 }); await p.click('#dSv');
  await p.waitForSelector('#dTrSt');
  if (TRAD) { const [f2] = await Promise.all([p.waitForEvent('filechooser'), p.click('#dTr')]); await f2.setFiles(TRAD); await p.waitForTimeout(800); }
  console.log('État des traductions : ' + (await p.textContent('#dTrSt')).trim());
  await p.selectOption('#hdLang', LG);

  const found = new Map();
  const scan = async (where, sel) => {
    const texts = await p.$$eval(sel || '#main, #drawer.open, #why:not(.hidden)', els => {
      const out = [];
      for (const el of els) {
        const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
        let n; while ((n = w.nextNode())) { const s = n.textContent.trim(); if (s.length > 3 && n.parentElement && n.parentElement.checkVisibility() && !n.parentElement.closest('a[href],code')) out.push(s); }
      }
      return out;
    });
    const untr = await p.$$eval('.untr', els => els.length);
    if (untr) found.set(where + ' — textes marqués EN', untr);
    for (const s of texts) {
      const stripped = s.replace(KEEP, ' ');
      if (EN.test(stripped)) { const k = s.slice(0, 140); if (!found.has(k)) found.set(k, where); }
    }
  };
  for (const v of ['map', 'countries', 'banks', 'table', 'method', 'data']) {
    await p.click(`nav.tabs button[data-v="${v}"]`); await p.waitForTimeout(150);
    if (v === 'method') await p.$$eval('details', ds => ds.forEach(d => d.open = true));
    await scan('onglet ' + v);
  }
  const ids = await p.evaluate(() => M.banks.map(b => b.id));
  for (const id of ids) {
    await p.evaluate(i => { UI.bankOpen = i; UI.contOpen = 'Africa'; go('banks'); }, id);
    await scan('fiche ' + id);
    const ws = await p.$$('#main [data-w]');
    for (const w of ws.slice(0, 40)) { await w.click().catch(() => {}); await scan('source (' + id + ')', '#why:not(.hidden)'); }
    await p.evaluate(() => hideWhy());
  }
  const n = await p.evaluate(() => M.D.countries.length);
  for (let i = 0; i < n; i++) {
    await p.evaluate(i => openCountry(i), i);
    await p.$$eval('#drawer details', ds => ds.forEach(d => d.open = true));
    await scan('pays ' + i, '#drawer');
  }
  await p.evaluate(() => { closeDrawer(); UI.mapLayer = 'gs'; go('map'); });
  await p.click('[data-copy="map"]').catch(() => {});
  console.log(`\nLangue ${LG} : ${found.size} passage(s) suspect(s)`);
  for (const [k, v] of found) console.log(' - [' + v + '] ' + k);
  if (errs.length) console.log('Erreurs JS : ' + errs.join(' | '));
  await b.close(); srv.close();
  process.exit(found.size || errs.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
