import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { grade, listTasks, repoRoot, type GradeResult } from './lib.ts';

// Dataset gate for every task: the reference passes, the starter fails, every cheat fails,
// and grading the reference twice gives identical per-criterion outcomes.

interface Row {
  task: string;
  submission: string;
  expected: string;
  got: string;
  ok: boolean;
}

const rows: Row[] = [];
const summary = (r: GradeResult) =>
  `${r.criteria.filter((c) => c.passed).length}/${r.criteria.length} pass`;
const failedIds = (r: GradeResult) =>
  r.criteria
    .filter((c) => !c.passed)
    .map((c) => c.id)
    .join(' ');

for (const task of await listTasks()) {
  const taskDir = path.join(repoRoot, 'tasks', task);
  const gradeDir = (dir: string) => grade(task, path.join(taskDir, dir));

  const reference = await gradeDir('reference');
  rows.push({
    task,
    submission: 'reference',
    expected: 'pass all',
    got: reference.passed
      ? summary(reference)
      : `${summary(reference)}; failed ${failedIds(reference)}`,
    ok: reference.passed,
  });

  const starter = await gradeDir('starter');
  rows.push({
    task,
    submission: 'starter',
    expected: 'fail',
    got: summary(starter),
    ok: !starter.passed,
  });

  const cheats = (await readdir(path.join(taskDir, 'cheats'), { withFileTypes: true }))
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort();
  for (const cheat of cheats) {
    const result = await gradeDir(path.join('cheats', cheat));
    rows.push({
      task,
      submission: `cheat: ${cheat}`,
      expected: 'fail',
      got: `${summary(result)}; caught by ${failedIds(result) || 'nothing'}`,
      ok: !result.passed,
    });
  }

  const rerun = await gradeDir('reference');
  const outcomes = (r: GradeResult) => r.criteria.map((c) => `${c.id}:${c.passed}`).join(',');
  const same = outcomes(rerun) === outcomes(reference);
  rows.push({
    task,
    submission: 'reference (rerun)',
    expected: 'identical',
    got: same ? 'identical' : `differs: ${failedIds(rerun) || 'outcomes changed'}`,
    ok: same,
  });
}

printTable(rows);
const failures = rows.filter((r) => !r.ok).length;
console.log(failures ? `\nverify: ${failures} check(s) failed` : '\nverify: all checks passed');
process.exit(failures ? 1 : 0);

function printTable(table: Row[]): void {
  const header = { task: 'task', submission: 'submission', expected: 'expected', got: 'result' };
  const columns = ['task', 'submission', 'expected', 'got'] as const;
  const widths = columns.map((key) =>
    Math.max(header[key].length, ...table.map((row) => row[key].length)),
  );
  const line = (cells: string[]) => cells.map((cell, i) => cell.padEnd(widths[i] ?? 0)).join('  ');
  console.log(`\n${line(columns.map((key) => header[key]))}  ok`);
  for (const row of table)
    console.log(`${line(columns.map((key) => row[key]))}  ${row.ok ? 'yes' : 'NO'}`);
}
