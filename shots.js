// Render query results as PNG "result window" images with headless Chromium.
const { chromium } = require('playwright-core');
const path = require('path');

// Uses Playwright's Chromium (npx playwright install chromium) unless CHROMIUM_PATH is set.
const CHROME = process.env.CHROMIUM_PATH || undefined;
const MAX_ROWS = 25;

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const KW = /\b(SELECT|FROM|WHERE|JOIN|LEFT|ON|AND|OR|NOT|IN|GROUP|BY|ORDER|HAVING|AS|DISTINCT|COUNT|SUM|AVG|MIN|MAX|ROUND|IFNULL|LOWER|BETWEEN|LIKE|IS|NULL|DESC|ASC|INSERT|INTO|VALUES|UPDATE|SET|DELETE|CREATE|TABLE|ALTER|ADD|PRIMARY|KEY|FOREIGN|REFERENCES|COMMIT|DESCRIBE|INT|VARCHAR|CHAR|DATE|DECIMAL)\b/g;

function highlight(sql) {
  return sql.split('\n').map((ln) => {
    // split out string literals so keywords inside them are not coloured
    const parts = ln.split(/('[^']*'|`[^`]*`)/);
    return parts.map((p, i) => {
      if (i % 2 === 1) return `<span class="str">${esc(p)}</span>`;
      return esc(p).replace(KW, '<span class="kw">$1</span>').replace(/\b(\d+(?:\.\d+)?)\b/g, '<span class="num">$1</span>');
    }).join('');
  });
}

const isNum = (v) => /^-?\d+(\.\d+)?$/.test(v);

function grid(res) {
  const shown = res.rows.slice(0, MAX_ROWS);
  const numCols = res.columns.map((_, c) => res.rows.length > 0 && res.rows.every((r) => r[c] === 'NULL' || isNum(r[c])));
  let h = '<table class="grid"><thead><tr><th class="rn"></th>';
  res.columns.forEach((c) => { h += `<th>${esc(c)}</th>`; });
  h += '</tr></thead><tbody>';
  shown.forEach((r, i) => {
    h += `<tr><td class="rn">${i === 0 ? '&#9654;' : ''}</td>`;
    r.forEach((v, c) => {
      const cls = [v === 'NULL' ? 'null' : '', numCols[c] ? 'r' : ''].join(' ').trim();
      h += `<td${cls ? ` class="${cls}"` : ''}>${esc(v)}</td>`;
    });
    h += '</tr>';
  });
  h += '</tbody></table>';
  return h;
}

function actionLog(entries) {
  let h = '<table class="log"><thead><tr><th></th><th>#</th><th>Action</th><th>Message</th><th>Duration</th></tr></thead><tbody>';
  entries.forEach((e, i) => {
    const action = e.stmt.replace(/\s+/g, ' ');
    const msg = e.kind === 'ok'
      ? `${e.affected} row(s) affected${e.info ? ' ' + e.info.trim() : ''}`
      : `${e.rows.length} row(s) returned`;
    h += `<tr><td class="ok">&#10004;</td><td>${i + 1}</td><td class="act">${esc(action.length > 90 ? action.slice(0, 87) + '...' : action)}</td><td>${esc(msg)}</td><td>${(e.ms / 1000).toFixed(3)} sec</td></tr>`;
  });
  return h + '</tbody></table>';
}

const CSS = `
*{box-sizing:border-box} body{margin:0;background:#fff;font-family:"Segoe UI","DejaVu Sans",Arial,sans-serif}
.win{display:inline-block;border:1px solid #9aa4b1;background:#f3f4f6;min-width:520px;max-width:1500px}
.bar{background:linear-gradient(#e9edf2,#d6dce4);border-bottom:1px solid #9aa4b1;padding:5px 10px;font-size:12px;color:#222;display:flex;gap:16px;align-items:center}
.bar b{color:#0b5394} .dot{width:10px;height:10px;border-radius:50%;background:#e06666;display:inline-block;margin-right:3px}
.editor{background:#fff;border-bottom:1px solid #c5ccd6;padding:6px 0;font:12.5px/1.45 "DejaVu Sans Mono",Consolas,monospace;color:#1d1d1d}
.editor .ln{display:inline-block;width:34px;text-align:right;color:#9aa0a6;padding-right:10px;user-select:none}
.editor pre{margin:0;white-space:pre} .kw{color:#0033b3;font-weight:bold} .str{color:#067d17} .num{color:#1750eb}
.tabs{font-size:12px;padding:4px 10px 0;background:#e4e8ee;border-bottom:1px solid #c5ccd6}
.tabs span{display:inline-block;padding:3px 12px;background:#fff;border:1px solid #c5ccd6;border-bottom:none;border-radius:3px 3px 0 0}
.res{padding:6px 8px;background:#fff}
.error{margin:0;padding:8px;background:#fff2f0;color:#9c1717;border:1px solid #e4aaa5;font:12.5px/1.45 "DejaVu Sans Mono",Consolas,monospace;white-space:pre-wrap;overflow-wrap:anywhere}
table{border-collapse:collapse;font-size:12.5px}
.grid th{background:#eef1f5;border:1px solid #c9ced6;padding:3px 8px;font-weight:600;text-align:left;white-space:nowrap}
.grid td{border:1px solid #dde1e7;padding:2px 8px;white-space:nowrap;font-family:"DejaVu Sans","Segoe UI",sans-serif}
.grid tr:nth-child(even) td{background:#f7f9fb} .grid td.r{text-align:right} .grid td.null{color:#fff;background:#8a8f98 !important;font-size:10px;text-align:center}
.grid .rn{width:16px;background:#eef1f5;color:#555;font-size:9px;text-align:center;border-color:#c9ced6}
.foot{font-size:11.5px;color:#333;padding:4px 10px;background:#e4e8ee;border-top:1px solid #c5ccd6}
.log th{background:#eef1f5;border:1px solid #c9ced6;padding:3px 8px;font-weight:600;text-align:left;font-size:11.5px}
.log td{border:1px solid #dde1e7;padding:2px 8px;font-size:11.5px;white-space:nowrap} .log .ok{color:#2e7d32;font-weight:bold}
.log .act{font-family:"DejaVu Sans Mono",Consolas,monospace;font-size:11px}
.sect{font-size:11.5px;font-weight:600;color:#444;padding:6px 10px 2px;background:#fff}
`;

function pageHtml(p) {
  const all = [...(p.results || []), ...(p.verifyResults || [])];
  const answerRows = (p.results || []).filter((r) => r.kind === 'rows');
  const sqlShown = p.verify ? p.sql + '\n\n-- verification\n' + p.verify : p.sql;
  const lines = highlight(sqlShown);
  let body = `<div class="win"><div class="bar"><span><span class="dot"></span><span class="dot" style="background:#f6b26b"></span><span class="dot" style="background:#93c47d"></span></span><span>MySQL 8.0 &nbsp;|&nbsp; root@localhost &nbsp;|&nbsp; Schema: <b>${esc(p.db)}</b></span></div>`;
  body += '<div class="editor">' + lines.map((l, i) => `<pre><span class="ln">${i + 1}</span>${l}</pre>`).join('') + '</div>';

  if (p.error) {
    body += '<div class="tabs"><span>Error</span></div><div class="res"><pre class="error" role="alert">' + esc(p.error) + '</pre></div>';
  }

  const hasAction = all.some((r) => r.kind === 'ok');
  if (hasAction) {
    body += '<div class="tabs"><span>Action Output</span></div><div class="res">' + actionLog(all) + '</div>';
  }
  const grids = p.verifyResults ? p.verifyResults.filter((r) => r.kind === 'rows') : answerRows;
  grids.forEach((g) => {
    body += `<div class="tabs"><span>Result Grid</span></div><div class="res">${grid(g)}</div>`;
    const more = g.rows.length > MAX_ROWS ? ` &nbsp;(first ${MAX_ROWS} shown)` : '';
    body += `<div class="foot">${g.rows.length} row(s) returned${more} &nbsp;&nbsp; ${(g.ms / 1000).toFixed(3)} sec</div>`;
  });
  body += '</div>';
  return `<!doctype html><html><head><meta charset="utf-8"><style>${CSS}</style></head><body>${body}</body></html>`;
}

async function renderAll(problems, outDir) {
  const browser = await chromium.launch({ executablePath: CHROME });
  const page = await browser.newPage({ deviceScaleFactor: 2, viewport: { width: 1600, height: 900 } });
  for (const p of problems) {
    await page.setContent(pageHtml(p));
    const el = await page.$('.win');
    const box = await el.boundingBox();
    p.shot = path.join(outDir, `p${p.num}.png`);
    p.shotSize = { w: Math.ceil(box.width), h: Math.ceil(box.height) };
    await el.screenshot({ path: p.shot });
  }
  await browser.close();
}

// Render arbitrary HTML snippets (diagrams) to PNG.
async function renderHtmlList(items) {
  const browser = await chromium.launch({ executablePath: CHROME });
  const page = await browser.newPage({ deviceScaleFactor: 2, viewport: { width: 1600, height: 1200 } });
  for (const it of items) {
    await page.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>body{margin:0;background:#fff;font-family:"DejaVu Sans",Arial,sans-serif} #c{display:inline-block;padding:8px;background:#fff}</style></head><body><div id="c">${it.html}</div></body></html>`);
    const el = await page.$('#c');
    const box = await el.boundingBox();
    it.size = { w: Math.ceil(box.width), h: Math.ceil(box.height) };
    await el.screenshot({ path: it.out });
  }
  await browser.close();
}

module.exports = { renderAll, renderHtmlList };
