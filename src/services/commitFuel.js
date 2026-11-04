/**
 * Commit Fuel Generator: realistic and witty commit messages
 */

export const COMMIT_MESSAGES = {
  conventional: [
    'feat(auth): implement refresh token rotation with secure cookie storage',
    'fix(api): handle network timeout and retry gracefully',
    'refactor(core): decouple business logic from UI controller',
    'perf(render): memoize expensive list component and avoid re-renders',
    'test(unit): add boundary condition tests for date parser',
    'chore(deps): bump dependencies to latest patched releases',
    'style(theme): enhance dark mode contrast and focus rings',
    'docs(readme): add setup guide and environment variable schema',
    'fix(db): add composite index to speed up frequent lookups',
    'feat(ui): implement smooth drag-and-drop reordering',
    'fix(types): resolve strict null check violations in api client',
    'ci(workflow): cache node_modules to accelerate pipeline',
    'refactor(state): migrate global store to lightweight context hooks',
    'feat(export): add one-click JSON backup and restore handler',
  ],
  witty: [
    'fix: edge case that will definitely never happen again',
    'refactor: simplify code I wrote yesterday at 2 AM',
    'style: clean up unused imports and vibes',
    'fix: remove console.log from production',
    'chore: delete commented-out code that was haunting us',
    'fix: it was a typo. it is always a typo.',
    'perf: make the algorithm slightly less embarrassing',
    'docs: explain the workaround so future me does not panic',
    'test: write the tests I promised in the last PR',
    'fix: stop users from clicking the submit button 42 times',
    'feat: implement feature that nobody requested but looks amazing',
    'refactor: burn down tech debt before it becomes sentient',
    'chore: appease the strict linter deities',
    'fix: works on my machine, now hopefully everywhere',
    'fix: the bug was between keyboard and chair',
    'refactor: turn 8 nested if-statements into something human-readable',
    'feat: add subtle loading spinner because instant is suspicious',
  ],
};

export function getRandomCommit(category = 'all') {
  let pool = [];
  if (category === 'conventional') {
    pool = COMMIT_MESSAGES.conventional;
  } else if (category === 'witty') {
    pool = COMMIT_MESSAGES.witty;
  } else {
    pool = [...COMMIT_MESSAGES.conventional, ...COMMIT_MESSAGES.witty];
  }

  const index = Math.floor(Math.random() * pool.length);
  return pool[index];
}
