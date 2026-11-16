# ui-task-bench

Three frontend coding tasks built from a visual reference, each with a starter, a reference
implementation and hidden automated graders. The graders pass the reference, fail the starter
and reject deliberately wrong submissions that a weaker grader would accept.

This is the shape of work behind UI tasks for code-model training and evaluation: turn a
mockup into a self-contained prompt with objective success criteria, then prove the criteria
are both satisfiable and hard to game.

| Task                                               | What it exercises                                                                                   | Criteria |
| -------------------------------------------------- | --------------------------------------------------------------------------------------------------- | -------- |
| [01 Pricing cards](tasks/01-pricing-cards/TASK.md) | Accessible switch, derived prices, conditional badge, responsive stacking                           | 12       |
| [02 Donut chart](tasks/02-donut-chart/TASK.md)     | SVG arc geometry, hover and focus states, tooltip, roving-tabindex keyboard navigation              | 11       |
| [03 Accounts table](tasks/03-data-table/TASK.md)   | Stable multi-column sort, filtering, live status, empty states, sticky header, Canvas 2D sparklines | 13       |

## Task anatomy

```
tasks/02-donut-chart/
  TASK.md          prompt the candidate receives: goal, image, acceptance criteria, constraints, scope
  reference.png    visual target, captured from the reference implementation
  starter/         runnable Vite + React + TypeScript shell: types, styles entry, TODOs
  reference/       the gold solution
  tests/           hidden grader
    contract.ts    the props interface the component must accept
    fixtures.ts    data sets the grader mounts, including ones the candidate never sees
    harness/       grader-owned page that mounts the submission's component with a fixture
    *.spec.ts      Playwright criteria, one test per acceptance criterion (AC1, AC2, ...)
  cheats/          plausible wrong submissions the grader must reject
```

Each test title starts with the criterion ID from `TASK.md`, so a grading report maps one to
one onto the prompt.

## How grading works

`npm run grade -- <task> <dir>` grades any directory that has the task's component under
`src/`:

1. **Copy.** The submission is copied to a private work directory, so it cannot change during
   the run and imports that escape it can be detected.
2. **B1 Typecheck.** Strict `tsc` over the submission and the grader harness together. The
   harness passes contract-typed fixtures into the component, so props that drift from the
   contract fail here.
3. **B2 Build.** Vite builds the grader's harness page, aliasing `@submission` to the copy. A
   build plugin rejects imports of packages outside `dependencies` (`react`, `react-dom`) and
   relative imports that leave the submission, such as importing the reference solution.
4. **Behaviour.** Playwright runs the task's specs against the built page in Chromium at
   1280×800, `deviceScaleFactor` 1, `en-US`, UTC, reduced motion, no retries.
5. **Report.** One `PASS`/`FAIL` line per criterion with the first line of any failure; the
   exit code is 0 only if every criterion passes.

```
$ npm run grade -- 02 tasks/02-donut-chart/cheats/mouse-only

02-donut-chart  <-  tasks/02-donut-chart/cheats/mouse-only

  PASS  B1   Typechecks against the task contract (strict)
  PASS  B2   Builds using only allowed imports
  PASS  AC1  Chart is a group named by its title with one labelled segment per datum
  PASS  AC2  Segment angles are proportional to values, clockwise from 12 o’clock
  PASS  AC3  The centre shows "Total" and the sum of the values
  PASS  AC4  The legend lists every label, value and percentage in order
  PASS  AC5  Hovering a segment shows its tooltip and highlights its legend row
  FAIL  AC6  Arrow keys, Home and End move focus between segments; Tab enters and leaves
             Error: Tab focuses the first segment | expect(locator).toBeFocused() failed
  FAIL  AC7  A focused segment shows its tooltip and legend highlight; Escape hides the tooltip
             Error: expect(locator).toBeVisible() failed | Locator: getByRole('tooltip')
  PASS  AC8  The legend sits beside the chart from 640px and below it when narrower
  PASS  AC9  Matches reference.png at 1280x800 (at most 1% of pixels differ)

FAIL  9/11 criteria
```

### Writing criteria any correct implementation passes

- **Query by role and accessible name**, the way assistive technology does:
  `getByRole('switch', { name: 'Annual billing' })`, `getByRole('columnheader', { name: 'Revenue' })`.
  No test uses a class name, test ID or DOM shape, so markup and styling choices are free.
- **Assert outcomes, not mechanisms.** The donut test does not inspect path data: it computes
  where each segment's mid-angle falls on the ring and asks the browser which element is there
  (`elementFromPoint`). Arcs, stroked circles or a single path with a pointer handler all pass.
- **Read pixels where the output is pixels.** Sparklines are checked by reading the canvas back
  and comparing where the line starts and ends against the data, with a 15% tolerance.
- **State every number the tests check.** Rounding, number formats, breakpoints, geometry and the
  visual threshold are all spelled out in `TASK.md`, so no criterion is a hidden trap.
- **Keep visual comparison tolerant and secondary.** One criterion per task compares a
  screenshot with `reference.png`: at most 1% of pixels may differ by more than a per-pixel
  colour threshold of 0.1. It catches a broken layout; it cannot by itself pass anything.

## Cheats the graders reject

`npm run verify` runs every cheat; these are the criteria that catch each one.

| Cheat                 | Shortcut                                                            | Caught by                                      |
| --------------------- | ------------------------------------------------------------------- | ---------------------------------------------- |
| `01/screenshot`       | Renders `reference.png` as an `<img>`; pixel-perfect, no behaviour  | AC1–AC9 (passes AC10, the visual check)        |
| `01/static-markup`    | Identical look, but the toggle is a styled `<div>` with no state    | AC1, AC2, AC5, AC6                             |
| `01/hardcoded-plans`  | Fully working, but renders the mockup's plans and ignores its props | AC3, AC4, AC5, AC7, AC8 (hidden fixture)       |
| `02/screenshot`       | The target image again                                              | AC1–AC8                                        |
| `02/hardcoded-data`   | Accessible and interactive, but always draws the mockup's data      | AC1–AC7 (hidden fixture)                       |
| `02/mouse-only`       | Correct drawing and hover, ARIA labels present, no keyboard support | AC6, AC7                                       |
| `03/screenshot`       | The target image again                                              | AC1–AC10                                       |
| `03/click-only-sort`  | Sorts on click with identical styling, but headers are not buttons  | AC3, AC4, AC8, AC10                            |
| `03/stale-sparklines` | Rows keyed by index, canvas drawn once on mount                     | AC8 only: correct until the rows are reordered |

Three defences do most of the work:

- **Hidden fixtures.** The harness mounts the component with data the candidate never sees
  (different counts, labels, values, colours, an empty set, a 40-row set), which defeats
  anything hard-coded from the image.
- **Behaviour after interaction.** State changes, keyboard paths and data after a sort or filter
  are checked, not just the first render. `stale-sparklines` is correct on load and fails only
  once rows move.
- **Accessibility as a hard requirement.** Roles, names, `aria-checked`, `aria-sort`,
  `aria-current` and focus order are part of the spec, so a lookalike built from `<div>`s fails.

## The dataset gate

`npm run verify` checks, for every task, the properties a coding-task dataset needs:

| Check                   | Expectation                                      |
| ----------------------- | ------------------------------------------------ |
| reference               | passes every criterion (the task is solvable)    |
| starter                 | fails (the task is not already done)             |
| each cheat              | fails (no known reward hack passes)              |
| reference, graded again | identical per-criterion outcomes (deterministic) |

```
$ npm run verify

task              submission               expected   result                                                         ok
01-pricing-cards  reference                pass all   12/12 pass                                                     yes
01-pricing-cards  starter                  fail       2/12 pass                                                      yes
01-pricing-cards  cheat: hardcoded-plans   fail       7/12 pass; caught by AC3 AC4 AC5 AC7 AC8                       yes
01-pricing-cards  cheat: screenshot        fail       3/12 pass; caught by AC1 AC2 AC3 AC4 AC5 AC6 AC7 AC8 AC9       yes
01-pricing-cards  cheat: static-markup     fail       8/12 pass; caught by AC1 AC2 AC5 AC6                           yes
01-pricing-cards  reference (rerun)        identical  identical                                                      yes
02-donut-chart    reference                pass all   11/11 pass                                                     yes
02-donut-chart    starter                  fail       2/11 pass                                                      yes
02-donut-chart    cheat: hardcoded-data    fail       4/11 pass; caught by AC1 AC2 AC3 AC4 AC5 AC6 AC7               yes
02-donut-chart    cheat: mouse-only        fail       9/11 pass; caught by AC6 AC7                                   yes
02-donut-chart    cheat: screenshot        fail       3/11 pass; caught by AC1 AC2 AC3 AC4 AC5 AC6 AC7 AC8           yes
02-donut-chart    reference (rerun)        identical  identical                                                      yes
03-data-table     reference                pass all   13/13 pass                                                     yes
03-data-table     starter                  fail       2/13 pass                                                      yes
03-data-table     cheat: click-only-sort   fail       9/13 pass; caught by AC3 AC4 AC8 AC10                          yes
03-data-table     cheat: screenshot        fail       3/13 pass; caught by AC1 AC2 AC3 AC4 AC5 AC6 AC7 AC8 AC9 AC10  yes
03-data-table     cheat: stale-sparklines  fail       12/13 pass; caught by AC8                                      yes
03-data-table     reference (rerun)        identical  identical                                                      yes

verify: all checks passed
```

## Running it

Requires Node 22.18 or newer (the scripts use Node's built-in TypeScript type stripping).

```sh
npm ci
npx playwright install chromium         # once, if Chromium 1243 is not already cached

npm run grade -- 01 tasks/01-pricing-cards/reference    # grade one submission
npm run verify                                          # full gate across all tasks
npm run dev -- tasks/01-pricing-cards/starter           # work on a task in the browser
npm run snapshots -- 01                                 # re-capture reference.png on purpose

npm run lint && npm run format:check && npm run typecheck
```

Screenshots depend on fonts and the renderer. The grader page serves its own font (Noto Sans,
in `fonts/`, SIL OFL 1.1) instead of relying on system fonts, and the Docker image pins the
browser build, so the same baselines pass on a Linux workstation and in the container:

```sh
docker build -t ui-task-bench .
docker run --rm ui-task-bench                                        # npm run verify
docker run --rm -v "$PWD/my-attempt:/sub:ro" ui-task-bench npm run grade -- 01 /sub
```

CI (`.github/workflows/ci.yml`) runs lint, formatting, typecheck and `verify` in the same
image.

In a real dataset `tests/`, `reference/` and `cheats/` would be withheld from the candidate;
they sit side by side here so the whole pipeline can be read in one place.

## Checklist for writing a good UI task

1. **Pin the contract.** Name the file, export and props type the grader will mount, and
   typecheck against it.
2. **Make every criterion observable.** If a test checks it, `TASK.md` states it: names, roles,
   formats, rounding, breakpoints, geometry, thresholds.
3. **Specify accessibility as behaviour.** Roles, accessible names, states and keyboard paths
   belong in the acceptance criteria, not in a note at the end.
4. **Grade through public surfaces.** Use roles and labels, real pointer and keyboard input, and
   rendered pixels; never classes, test IDs or component internals.
5. **Feed hidden data.** At least one fixture the candidate cannot see, plus the edge cases:
   empty, long, ties, mixed case, values that round to zero.
6. **Test after interaction.** Check states, transitions and the results of sorting or filtering,
   not only the initial render.
7. **Keep visual checks tolerant and outnumbered.** State the threshold and make sure an image
   alone cannot pass.
8. **Write the cheats before trusting the grader.** Try a screenshot, a static lookalike,
   hard-coded data and a mouse-only version; each must fail.
9. **Prove the gate.** Gold passes, starter fails, every cheat fails, and a rerun agrees.
10. **Scope it.** List what is out of scope so a candidate does not lose time on unrewarded work.

## License

MIT, Matthew Fehrsen. See [LICENSE](LICENSE).
