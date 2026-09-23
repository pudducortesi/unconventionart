import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
const root = new URL('../', import.meta.url);
const { repositories: optimization } = JSON.parse(readFileSync(new URL('../research/upstream-lock.json', import.meta.url), 'utf8'));
const { repositories: avatars } = JSON.parse(readFileSync(new URL('../research/avatar-sources.json', import.meta.url), 'utf8'));
const repositories=[...optimization,...avatars];
const run = args => execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] }).trim();
// Downloads source only; never installs packages or executes upstream build scripts.
run(['submodule', 'sync', '--', ...repositories.map(p => p.path)]);
run(['submodule', 'update', '--init', '--checkout', '--depth', '1', '--', ...repositories.map(p => p.path)]);
for (const p of repositories) {
  const actual = run(['-C', p.path, 'rev-parse', 'HEAD']);
  if (actual !== p.sha) throw Error(`${p.repo}: expected ${p.sha}, found ${actual}`);
  console.log(`${p.repo}: ${actual} verified`);
}
