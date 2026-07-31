import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import process from 'node:process';

const token = process.env.CAPAWESOME_TOKEN?.trim();

if (!token) {
  console.error(
    'CAPAWESOME_TOKEN fehlt. Setze den bereitgestellten Lizenzschlüssel nur lokal als Umgebungsvariable und starte den Befehl erneut.',
  );
  process.exit(1);
}

const npmrcPath = new URL('../.npmrc', import.meta.url);
const markerStart = '# BEGIN CAPAWESOME';
const markerEnd = '# END CAPAWESOME';
const block = `${markerStart}
@capawesome-team:registry=https://npm.registry.capawesome.io
//npm.registry.capawesome.io/:_authToken=\${CAPAWESOME_TOKEN}
${markerEnd}`;

const current = existsSync(npmrcPath) ? readFileSync(npmrcPath, 'utf8') : '';
const withoutOldBlock = current
  .replace(new RegExp(`${markerStart}[\\s\\S]*?${markerEnd}\\s*`, 'g'), '')
  .trim();
writeFileSync(npmrcPath, `${withoutOldBlock ? `${withoutOldBlock}\n\n` : ''}${block}\n`, {
  mode: 0o600,
});

const install = spawnSync(
  process.platform === 'win32' ? 'npm.cmd' : 'npm',
  ['install', '@capawesome-team/capacitor-zip@^8.0.0', '--save'],
  {
    cwd: new URL('..', import.meta.url),
    env: process.env,
    stdio: 'inherit',
  },
);

if (install.status !== 0) {
  process.exit(install.status ?? 1);
}

const sync = spawnSync(
  process.platform === 'win32' ? 'npx.cmd' : 'npx',
  ['cap', 'sync', 'android'],
  {
    cwd: new URL('..', import.meta.url),
    env: process.env,
    stdio: 'inherit',
  },
);

process.exit(sync.status ?? 1);
