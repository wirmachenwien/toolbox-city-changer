// PDF/EPUB download builder with graceful degradation: when the Python
// toolchain is unavailable, skip the downloads with a warning instead of
// failing the whole build, so local development without Python still gets a
// working site (download buttons 404 with an explanatory message).
// CI stays strict: with CI=true a missing/broken toolchain fails the build,
// since release builds must always ship downloads.
import { spawnSync } from 'node:child_process';

function probe() {
  const cmd = spawnSync('python3', ['-c', 'import markdown, weasyprint'], { encoding: 'utf8' });
  if (cmd.error) return `python3 not found (${cmd.error.message})`;
  if (cmd.status !== 0) {
    return (cmd.stderr || '').trim()
      || 'required Python modules missing (pip install -r requirements.txt)';
  }
  return null;
}

const problem = probe();
if (problem) {
  const message =
    `build:downloads: skipping PDF/EPUB downloads — ${problem}.\n` +
    'Install Python ≥ 3.12 with `pip install -r requirements.txt`, then run `npm run build:downloads`.';
  if (process.env.CI === 'true') {
    console.error(message);
    process.exit(1);
  }
  console.warn(message);
  process.exit(0);
}

for (const args of [[ 'scripts/build-pdf.py', '--all' ], [ 'scripts/build-epub.py', '--all' ]]) {
  const run = spawnSync('python3', args, { stdio: 'inherit' });
  if (run.status !== 0) process.exit(run.status ?? 1);
}
