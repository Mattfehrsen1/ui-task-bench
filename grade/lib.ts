import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { cp, mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { build, type Plugin } from 'vite';
import { serveStatic } from './serve.ts';

export const repoRoot = path.resolve(import.meta.dirname, '..');
const tasksRoot = path.join(repoRoot, 'tasks');
const workRoot = path.join(repoRoot, '.grade-out');

export interface Criterion {
  id: string;
  title: string;
  passed: boolean;
  detail?: string;
}

export interface GradeResult {
  task: string;
  submission: string;
  criteria: Criterion[];
  passed: boolean;
}

export interface GradeOptions {
  /** Rewrite the task's reference.png from this submission instead of comparing against it. */
  updateSnapshots?: boolean;
  /** Only run tests whose title matches this pattern. */
  grep?: string;
}

export async function listTasks(): Promise<string[]> {
  const entries = await readdir(tasksRoot, { withFileTypes: true });
  return entries
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort();
}

/** Accepts a full task name ("01-pricing-cards") or its numeric prefix ("01"). */
export async function resolveTask(name: string): Promise<string> {
  const tasks = await listTasks();
  const match = tasks.find((t) => t === name || t.startsWith(`${name}-`));
  if (!match) throw new Error(`Unknown task "${name}". Available: ${tasks.join(', ')}`);
  return match;
}

export async function grade(
  taskName: string,
  submissionDir: string,
  options: GradeOptions = {},
): Promise<GradeResult> {
  const task = await resolveTask(taskName);
  const taskDir = path.join(tasksRoot, task);
  const workDir = path.join(workRoot, `${task}-${randomUUID().slice(0, 8)}`);
  const submission = path.join(workDir, 'submission');

  // Grade a private copy so the submission cannot be modified mid-run, and so that
  // relative imports escaping it are detectable.
  await mkdir(workDir, { recursive: true });
  await cp(path.resolve(submissionDir), submission, {
    recursive: true,
    filter: (src) => !/[\\/](node_modules|dist)$/.test(src),
  });

  try {
    const typecheck = await typecheckAgainstContract(taskDir, workDir);
    const bundle = await buildSubmission(taskDir, submission, path.join(workDir, 'dist'));
    const buildChecks: Criterion[] = [
      {
        id: 'B1',
        title: 'Typechecks against the task contract (strict)',
        passed: typecheck.ok,
        detail: typecheck.output,
      },
      {
        id: 'B2',
        title: 'Builds using only allowed imports',
        passed: bundle.ok,
        detail: bundle.error,
      },
    ];

    let behaviour: Criterion[];
    if (bundle.ok) {
      const server = await serveStatic(path.join(workDir, 'dist'));
      try {
        behaviour = await runTests(taskDir, workDir, server.url, options);
      } finally {
        await server.close();
      }
    } else {
      behaviour = (await listTests(taskDir, workDir, options)).map((c) => ({
        ...c,
        passed: false,
        detail: 'not run: submission did not build',
      }));
    }

    const criteria = options.updateSnapshots ? behaviour : [...buildChecks, ...behaviour];
    return {
      task,
      submission: path.relative(repoRoot, path.resolve(submissionDir)) || '.',
      criteria,
      passed: criteria.length > 0 && criteria.every((c) => c.passed),
    };
  } finally {
    await rm(workDir, { recursive: true, force: true });
  }
}

async function typecheckAgainstContract(
  taskDir: string,
  workDir: string,
): Promise<{ ok: boolean; output?: string }> {
  // The harness passes contract-typed fixtures into the submission's component, so a
  // component whose props drift from the contract fails here.
  const config = {
    extends: path.join(repoRoot, 'tsconfig.json'),
    compilerOptions: { paths: { '@submission/*': ['./submission/src/*'] } },
    include: ['submission/src', path.join(taskDir, 'tests', 'harness')],
  };
  const configPath = path.join(workDir, 'tsconfig.json');
  await writeFile(configPath, JSON.stringify(config, null, 2));
  const tsc = path.join(repoRoot, 'node_modules', 'typescript', 'bin', 'tsc');
  const { code, output } = await run(process.execPath, [
    tsc,
    '-p',
    configPath,
    '--pretty',
    'false',
  ]);
  return { ok: code === 0, output: code === 0 ? undefined : firstLines(output, 3) };
}

async function buildSubmission(
  taskDir: string,
  submission: string,
  outDir: string,
): Promise<{ ok: boolean; error?: string }> {
  const pkg = JSON.parse(await readFile(path.join(repoRoot, 'package.json'), 'utf8')) as {
    dependencies: Record<string, string>;
  };
  try {
    await build({
      configFile: false,
      root: path.join(taskDir, 'tests', 'harness'),
      logLevel: 'silent',
      resolve: {
        alias: { '@submission': path.join(submission, 'src') },
        dedupe: Object.keys(pkg.dependencies),
      },
      plugins: [submissionBoundary(submission, Object.keys(pkg.dependencies))],
      build: { outDir, emptyOutDir: true, minify: false },
    });
    return { ok: true };
  } catch (error) {
    return { ok: false, error: firstLines(String(error), 2) };
  }
}

/**
 * Rejects bare imports of packages outside the allowed list, and relative imports that
 * leave the submission directory (for example, importing the reference solution).
 */
function submissionBoundary(submission: string, allowedPackages: string[]): Plugin {
  const inside = (file: string) => file === submission || file.startsWith(submission + path.sep);
  return {
    name: 'submission-boundary',
    enforce: 'pre',
    resolveId(source, importer) {
      if (!importer || !inside(importer) || source.startsWith('\0')) return null;
      if (source.startsWith('.') || path.isAbsolute(source)) {
        const target = path.resolve(path.dirname(importer), source.split('?')[0] ?? source);
        if (!inside(target)) {
          this.error(
            `${path.relative(submission, importer)} imports "${source}" from outside the submission`,
          );
        }
        return null;
      }
      const name = source.startsWith('@')
        ? source.split('/').slice(0, 2).join('/')
        : (source.split('/')[0] ?? source);
      if (!allowedPackages.includes(name)) {
        this.error(
          `${path.relative(submission, importer)} imports "${source}", which is not an allowed dependency`,
        );
      }
      return null;
    },
  };
}

interface JsonSpec {
  title: string;
  tests: { results: { status: string; error?: { message?: string } }[] }[];
}
interface JsonSuite {
  suites?: JsonSuite[];
  specs?: JsonSpec[];
}

async function runTests(
  taskDir: string,
  workDir: string,
  baseUrl: string,
  options: GradeOptions,
): Promise<Criterion[]> {
  const extra = options.updateSnapshots ? ['--update-snapshots=all'] : [];
  const specs = await playwright(taskDir, workDir, baseUrl, [...extra], options.grep);
  return specs.map((spec) => {
    const results = spec.tests.flatMap((t) => t.results);
    const failure = results.find((r) => r.status !== 'passed');
    return {
      ...parseTitle(spec.title),
      passed: results.length > 0 && !failure,
      detail: failure
        ? firstLines(stripAnsi(failure.error?.message ?? failure.status), 2)
        : undefined,
    };
  });
}

async function listTests(
  taskDir: string,
  workDir: string,
  options: GradeOptions,
): Promise<Omit<Criterion, 'passed'>[]> {
  const specs = await playwright(taskDir, workDir, 'http://127.0.0.1:9', ['--list'], options.grep);
  return specs.map((spec) => parseTitle(spec.title));
}

async function playwright(
  taskDir: string,
  workDir: string,
  baseUrl: string,
  args: string[],
  grep?: string,
): Promise<JsonSpec[]> {
  const reportPath = path.join(workDir, 'report.json');
  const cli = path.join(repoRoot, 'node_modules', '@playwright', 'test', 'cli.js');
  const config = path.join(repoRoot, 'grade', 'playwright.config.ts');
  const { output } = await run(
    process.execPath,
    [cli, 'test', '-c', config, ...args, ...(grep ? ['--grep', grep] : [])],
    {
      GRADE_TASK_DIR: taskDir,
      GRADE_BASE_URL: baseUrl,
      GRADE_OUTPUT_DIR: path.join(workDir, 'artifacts'),
      PLAYWRIGHT_JSON_OUTPUT_NAME: reportPath,
    },
  );
  let report: { suites: JsonSuite[]; errors?: { message: string }[] };
  try {
    report = JSON.parse(await readFile(reportPath, 'utf8'));
  } catch {
    throw new Error(`Playwright produced no report:\n${output}`);
  }
  if (report.errors?.length) {
    throw new Error(
      `Playwright failed to run:\n${stripAnsi(report.errors.map((e) => e.message).join('\n'))}`,
    );
  }
  const collect = (suite: JsonSuite): JsonSpec[] => [
    ...(suite.specs ?? []),
    ...(suite.suites ?? []).flatMap(collect),
  ];
  return report.suites.flatMap(collect).sort((a, b) => compareIds(a.title, b.title));
}

/** Test titles look like "AC3 Prices follow the billing period". */
function parseTitle(title: string): { id: string; title: string } {
  const match = /^(\S+)\s+(.*)$/.exec(title);
  return match ? { id: match[1] ?? title, title: match[2] ?? '' } : { id: title, title };
}

function compareIds(a: string, b: string): number {
  return a.localeCompare(b, 'en', { numeric: true });
}

function run(
  command: string,
  args: string[],
  env: Record<string, string> = {},
): Promise<{ code: number; output: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd: repoRoot, env: { ...process.env, ...env } });
    let output = '';
    child.stdout.on('data', (chunk) => (output += chunk));
    child.stderr.on('data', (chunk) => (output += chunk));
    child.on('error', reject);
    child.on('close', (code) => resolve({ code: code ?? 1, output }));
  });
}

function stripAnsi(text: string): string {
  // eslint-disable-next-line no-control-regex
  return text.replace(/\u001b\[[0-9;]*m/g, '');
}

function firstLines(text: string, count: number): string {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, count)
    .join(' | ');
}
