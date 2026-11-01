const assert = require('node:assert/strict');
const test = require('node:test');
const { chromium } = require('playwright-core');
const { renderAll } = require('../shots');

async function captureHtml(problem) {
  let html;
  const launch = chromium.launch;
  chromium.launch = async () => ({
    async newPage() {
      return {
        async setContent(content) { html = content; },
        async $() {
          return {
            async boundingBox() { return { width: 600, height: 300 }; },
            async screenshot() {},
          };
        },
      };
    },
    async close() {},
  });
  try {
    await renderAll([problem], '/unused');
    return html;
  } finally {
    chromium.launch = launch;
  }
}

test('includes an escaped database error in the screenshot content', async () => {
  const html = await captureHtml({
    num: '1', db: 'demo', sql: 'SELECT 1;',
    error: 'Unknown <schema> & invalid query',
  });

  assert.match(html, /role="alert"/);
  assert.ok(html.includes('Unknown &lt;schema&gt; &amp; invalid query'));
  assert.ok(!html.includes('Unknown <schema>'));
});

test('shows a verification error alongside successful statement results', async () => {
  const html = await captureHtml({
    num: '2', db: 'demo', sql: 'UPDATE product SET in_stock = 1;',
    verify: 'SELECT missing_column FROM product;',
    results: [{
      stmt: 'UPDATE product SET in_stock = 1', kind: 'ok',
      affected: 3, info: '', ms: 1,
    }],
    error: "Unknown column 'missing_column'",
  });

  assert.ok(html.includes("Unknown column 'missing_column'"));
  assert.ok(html.includes('3 row(s) affected'));
});

test('continues to show result grids without an error alert for successful queries', async () => {
  const html = await captureHtml({
    num: '3', db: 'demo', sql: 'SELECT 42;',
    results: [{ stmt: 'SELECT 42', kind: 'rows', columns: ['value'], rows: [['42']], ms: 1 }],
  });

  assert.ok(html.includes('1 row(s) returned'));
  assert.ok(!html.includes('role="alert"'));
});
