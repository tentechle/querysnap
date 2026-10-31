#!/usr/bin/env node
// Run every problem in a spec file and save one result screenshot per problem.
//   node snap.js <spec.sql> [outDir]
const fs = require('fs');
const path = require('path');
const { runWeek } = require('./runsql');
const { renderAll } = require('./shots');

(async () => {
  const [spec, outDir = 'screenshots'] = process.argv.slice(2);
  if (!spec) {
    console.log('Usage: node snap.js <spec.sql> [outDir]');
    process.exit(1);
  }
  const problems = await runWeek(spec);
  fs.mkdirSync(outDir, { recursive: true });
  await renderAll(problems, outDir);
  for (const p of problems) {
    console.log(`${p.error ? 'ERROR' : 'ok   '} problem ${p.num} -> ${path.join(outDir, `p${p.num}.png`)}${p.error ? '  ' + p.error : ''}`);
  }
})().catch((e) => { console.error(e.message); process.exit(1); });
