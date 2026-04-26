// Render /cv-print to public/cv.pdf via headless Chromium.
// Runs as a `prebuild` step so the PDF is in public/ before astro build copies it to dist/.
import { spawn, spawnSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { chromium } from 'playwright';

const PORT = 4327;
const URL  = `http://127.0.0.1:${PORT}/cv-print`;
const OUT  = 'public/brian_gautreau_cv.pdf';

function killPort(port) {
  // Best-effort: kill anything bound to the port. Silent if nothing matches.
  spawnSync('sh', ['-c', `fuser -k ${port}/tcp 2>/dev/null || true`], { stdio: 'ignore' });
}

async function waitFor(url, { timeoutMs = 30000, intervalMs = 250 } = {}) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch { /* not ready */ }
    await sleep(intervalMs);
  }
  throw new Error(`Timed out waiting for ${url}`);
}

async function main() {
  killPort(PORT);

  console.log(`[render-pdf] starting astro dev on :${PORT}`);
  const astro = spawn('npx', ['astro', 'dev', '--host', '127.0.0.1', '--port', String(PORT)], {
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, NODE_ENV: 'development' },
    detached: true,        // own process group so we can kill the tree
  });
  astro.stdout.on('data', (d) => process.stdout.write(`[astro] ${d}`));
  astro.stderr.on('data', (d) => process.stderr.write(`[astro] ${d}`));

  const cleanup = () => {
    try {
      // Kill the entire process group (negative PID).
      process.kill(-astro.pid, 'SIGTERM');
    } catch {}
    // Belt and suspenders: free the port even if SIGTERM is slow.
    killPort(PORT);
  };
  process.on('SIGINT',  () => { cleanup(); process.exit(130); });
  process.on('SIGTERM', () => { cleanup(); process.exit(143); });

  let exitCode = 0;
  try {
    await waitFor(URL);
    await sleep(800);                          // let dev server settle after first hit
    const probe = await fetch(URL);
    if (!probe.ok) throw new Error(`probe got HTTP ${probe.status}`);
    console.log(`[render-pdf] dev server up (HTTP ${probe.status}); rendering ${URL}`);

    const browser = await chromium.launch();
    try {
      const page = await browser.newPage();
      await page.emulateMedia({ media: 'print' });
      await page.goto(URL, { waitUntil: 'networkidle', timeout: 30000 });
      const pdf = await page.pdf({
        format: 'Letter',
        printBackground: false,
        margin: { top: '0.75in', bottom: '0.75in', left: '0.6in', right: '0.6in' },
        preferCSSPageSize: true,
      });
      await mkdir(dirname(OUT), { recursive: true });
      await writeFile(OUT, pdf);
      console.log(`[render-pdf] wrote ${OUT} (${pdf.length} bytes)`);
    } finally {
      await browser.close();
    }
  } catch (err) {
    console.error('[render-pdf] failed:', err);
    exitCode = 1;
  } finally {
    cleanup();
    // Don't wait on any lingering handles. Astro's child gets reaped via the SIGTERM above.
    process.exit(exitCode);
  }
}

main();
