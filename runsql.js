// Parse a week's SQL spec file and run each problem against the private MySQL server.
const fs = require('fs');
const mysql = require('mysql2/promise');

function parseSpec(file) {
  const text = fs.readFileSync(file, 'utf8');
  const blocks = text.split(/^-- @problem /m).slice(1);
  return blocks.map((b) => {
    const lines = b.split('\n');
    const num = lines.shift().trim();
    let db = null;
    const sqlLines = [];
    const verifyLines = [];
    let inVerify = false;
    for (const ln of lines) {
      if (ln.startsWith('-- @db ')) { db = ln.slice(7).trim(); continue; }
      if (ln.startsWith('-- @verify')) { inVerify = true; continue; }
      (inVerify ? verifyLines : sqlLines).push(ln);
    }
    return {
      num,
      db,
      sql: sqlLines.join('\n').trim(),
      verify: verifyLines.join('\n').trim() || null,
    };
  });
}

// Split on semicolons that end a line (our specs never put ';' mid-line inside strings).
function splitStatements(sql) {
  return sql.split(/;\s*(?:\n|$)/).map((s) => s.trim()).filter(Boolean);
}

function fmt(v) {
  if (v === null || v === undefined) return 'NULL';
  return String(v);
}

async function runStatements(conn, sql) {
  const out = [];
  for (const stmt of splitStatements(sql)) {
    const t0 = Date.now();
    const [rows, fields] = await conn.query(stmt);
    const ms = Date.now() - t0;
    if (Array.isArray(rows)) {
      out.push({ stmt, kind: 'rows', columns: fields.map((f) => f.name), rows: rows.map((r) => r.map(fmt)), ms });
    } else {
      out.push({ stmt, kind: 'ok', affected: rows.affectedRows, info: rows.info || '', ms });
    }
  }
  return out;
}

async function connect() {
  return mysql.createConnection({
    host: process.env.MYSQL_HOST || '127.0.0.1',
    port: Number(process.env.MYSQL_PORT || 3306),
    socketPath: process.env.MYSQL_SOCKET || undefined,
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    dateStrings: true,
    rowsAsArray: true,
    decimalNumbers: false,
  });
}

async function runWeek(specFile) {
  const problems = parseSpec(specFile);
  const conn = await connect();
  for (const p of problems) {
    await conn.query('USE ' + p.db);
    try {
      p.results = await runStatements(conn, p.sql);
      p.verifyResults = p.verify ? await runStatements(conn, p.verify) : null;
    } catch (e) {
      p.error = e.message;
    }
  }
  await conn.end();
  return problems;
}

module.exports = { parseSpec, runWeek, splitStatements };

if (require.main === module) {
  (async () => {
    const probs = await runWeek(process.argv[2]);
    const maxRows = Number(process.argv[3] || 8);
    for (const p of probs) {
      console.log(`\n### P${p.num} [${p.db}]`);
      if (p.error) { console.log('ERROR:', p.error); continue; }
      const all = [...p.results, ...(p.verifyResults || [])];
      for (const r of all) {
        if (r.kind === 'ok') { console.log(`  ok affected=${r.affected}`); continue; }
        console.log('  ' + r.columns.join(' | ') + `   (${r.rows.length} rows)`);
        r.rows.slice(0, maxRows).forEach((row) => console.log('  ' + row.join(' | ')));
      }
    }
  })();
}
