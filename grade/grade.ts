import { grade, type GradeResult } from './lib.ts';

const [task, dir] = process.argv.slice(2);
if (!task || !dir) {
  console.error('Usage: npm run grade -- <task> <submission-dir>');
  process.exit(2);
}

const result = await grade(task, dir);
printResult(result);
process.exit(result.passed ? 0 : 1);

function printResult({ task, submission, criteria, passed }: GradeResult): void {
  console.log(`\n${task}  <-  ${submission}\n`);
  const width = Math.max(...criteria.map((c) => c.id.length));
  for (const c of criteria) {
    console.log(`  ${c.passed ? 'PASS' : 'FAIL'}  ${c.id.padEnd(width)}  ${c.title}`);
    if (!c.passed && c.detail) console.log(`        ${' '.repeat(width)}${c.detail}`);
  }
  const count = criteria.filter((c) => c.passed).length;
  console.log(`\n${passed ? 'PASS' : 'FAIL'}  ${count}/${criteria.length} criteria\n`);
}
