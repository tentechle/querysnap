const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const test = require('node:test');

function runCli(problems) {
  const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'querysnap-cli-'));
  const script = `
    const runner = require(${JSON.stringify(require.resolve('../runsql'))});
    const shots = require(${JSON.stringify(require.resolve('../shots'))});
    runner.runWeek = async () => JSON.parse(process.env.QUERYSNAP_TEST_PROBLEMS);
    shots.renderAll = async (problems) => console.log('Rendered ' + problems.length + ' problems');
    require(${JSON.stringify(require.resolve('../snap'))});
  `;
  try {
    return spawnSync(process.execPath, ['-e', script, 'snap.js', 'spec.sql', outDir], {
      encoding: 'utf8',
      env: { ...process.env, QUERYSNAP_TEST_PROBLEMS: JSON.stringify(problems) },
    });
  } finally {
    fs.rmSync(outDir, { recursive: true, force: true });
  }
}

test('returns a failure status after rendering and reporting all problems with errors', () => {
  const result = runCli([{ num: '1', error: 'Invalid query' }, { num: '2' }]);

  assert.equal(result.error, undefined);
  assert.equal(result.status, 1, result.stderr);
  assert.match(result.stdout, /Rendered 2 problems/);
  assert.match(result.stdout, /ERROR problem 1 .*Invalid query/);
  assert.match(result.stdout, /ok\s+problem 2/);
});

test('returns a successful status when every problem succeeds', () => {
  const result = runCli([{ num: '1' }]);

  assert.equal(result.error, undefined);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Rendered 1 problems/);
  assert.match(result.stdout, /ok\s+problem 1/);
});
