import { copyFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { grade, listTasks, repoRoot, resolveTask } from './lib.ts';

// Captures each task's reference.png from its reference solution. Run this only when the
// reference's appearance changes on purpose; graders never update snapshots.
const requested = process.argv[2];
const tasks = requested ? [await resolveTask(requested)] : await listTasks();

for (const task of tasks) {
  const taskDir = path.join(repoRoot, 'tasks', task);
  const result = await grade(task, path.join(taskDir, 'reference'), {
    updateSnapshots: true,
    grep: 'reference\\.png',
  });
  if (!result.passed) throw new Error(`${task}: could not capture reference.png`);

  // The screenshot cheat submits the target image itself, so keep its copy in sync.
  const cheat = path.join(taskDir, 'cheats', 'screenshot', 'src');
  const hasCheat = await readdir(cheat).then(
    () => true,
    () => false,
  );
  if (hasCheat) await copyFile(path.join(taskDir, 'reference.png'), path.join(cheat, 'target.png'));
  console.log(`${task}: reference.png updated`);
}
