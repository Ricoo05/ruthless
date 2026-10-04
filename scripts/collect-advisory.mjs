import {mkdir, open} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {collectAdvisory, coverageFor} from '../collection/govuk-advisory.mjs';

if (process.argv.length !== 3 || process.argv[2] !== '--collect') {
  console.error('Usage: node scripts/collect-advisory.mjs --collect');
  process.exitCode = 2;
} else {
  try {
    const run = await collectAdvisory();
    const directory = new URL('../.collection-runtime/', import.meta.url);
    await mkdir(directory, {recursive: true});
    const target = new URL(`${run.id}.json`, directory);
    const file = await open(target, 'wx', 0o600);
    try {await file.writeFile(JSON.stringify(run, null, 2) + '\n', 'utf8'); await file.sync();}
    finally {await file.close();}
    console.log(JSON.stringify({status: run.status, reason: run.reason,
      localFile: fileURLToPath(target), coverage: coverageFor(run),
      aiCalls: 0, workspaceChanges: 0}, null, 2));
    if (run.status !== 'collected') process.exitCode = 1;
  } catch {
    console.error('Collection report could not be written; no successful capture is claimed.');
    process.exitCode = 1;
  }
}
