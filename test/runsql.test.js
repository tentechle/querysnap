const assert = require('node:assert/strict');
const path = require('node:path');
const test = require('node:test');
const mysql = require('mysql2/promise');
const { runWeek } = require('../runsql');

const spec = path.join(__dirname, 'fixtures', 'two-problems.sql');

async function runWithConnection(conn) {
  const createConnection = mysql.createConnection;
  mysql.createConnection = async () => conn;
  try {
    return await runWeek(spec);
  } finally {
    mysql.createConnection = createConnection;
  }
}

test('records connection failures for every problem', async () => {
  const createConnection = mysql.createConnection;
  mysql.createConnection = async () => {
    throw new Error('connect ECONNREFUSED 127.0.0.1:3306');
  };

  try {
    const problems = await runWeek(spec);
    assert.equal(problems.length, 2);
    for (const problem of problems) {
      assert.equal(
        problem.error,
        'Database connection failed: connect ECONNREFUSED 127.0.0.1:3306',
      );
    }
  } finally {
    mysql.createConnection = createConnection;
  }
});

test('records database selection failures and continues with later problems', async () => {
  let selections = 0;
  let closed = false;
  const problems = await runWithConnection({
    async query(sql) {
      if (sql.startsWith('USE ')) {
        if (selections++ === 0) throw new Error("Unknown database 'missing_db'");
        return [];
      }
      return [[[2]], [{ name: 'value' }]];
    },
    async end() { closed = true; },
  });

  assert.equal(problems[0].error, "Unknown database 'missing_db'");
  assert.equal(problems[1].error, undefined);
  assert.deepEqual(problems[1].results[0].rows, [['2']]);
  assert.equal(closed, true);
});

test('escapes schema identifiers, including names with hyphens', async () => {
  const queries = [];
  await runWithConnection({
    async query(sql, values) {
      queries.push(mysql.format(sql, values));
      if (sql.startsWith('USE ')) return [];
      return [[[1]], [{ name: 'value' }]];
    },
    async end() {},
  });

  assert.ok(queries.includes('USE `missing_db`'));
  assert.ok(queries.includes('USE `second-db`'));
});

test('keeps query errors local to a problem and closes the connection', async () => {
  let closed = false;
  const problems = await runWithConnection({
    async query(sql) {
      if (sql.startsWith('USE ')) return [];
      if (sql === 'SELECT 1') throw new Error('Query failed');
      return [[[2]], [{ name: 'value' }]];
    },
    async end() { closed = true; },
  });

  assert.equal(problems[0].error, 'Query failed');
  assert.deepEqual(problems[1].results[0].rows, [['2']]);
  assert.equal(closed, true);
});
