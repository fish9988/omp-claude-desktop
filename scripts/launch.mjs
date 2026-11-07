import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const bunExe = 'C:\\Users\\lai\\.cherrystudio\\bin\\bun.exe';
const electronExe = path.join(rootDir, 'node_modules', 'electron', 'dist', 'electron.exe');
const viteBin = path.join(rootDir, 'node_modules', 'vite', 'bin', 'vite.js');

const mode = process.argv[2] || 'start';
const children = [];

function cleanup() {
  for (const child of children) {
    try {
      child.kill();
    } catch {}
  }
}

process.on('SIGINT', () => {
  cleanup();
  process.exit(0);
});
process.on('SIGTERM', () => {
  cleanup();
  process.exit(0);
});

async function isServerReady(url) {
  try {
    const res = await fetch(url);
    return res.ok;
  } catch {
    return false;
  }
}

async function waitForUrl(url, timeoutMs = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await isServerReady(url)) return true;
    await new Promise((r) => setTimeout(r, 180));
  }
  return false;
}

async function main() {
  // 1. Ensure Bun API + WS backend server on 127.0.0.1:5189 is running
  const apiReady = await isServerReady('http://127.0.0.1:5189/api/bootstrap');
  if (!apiReady) {
    console.log('[OMP Desktop] Starting Bun multi-session backend on http://127.0.0.1:5189 ...');
    const serverProc = spawn(bunExe, ['run', path.join(rootDir, 'server', 'index.ts')], {
      cwd: rootDir,
      stdio: 'inherit',
    });
    children.push(serverProc);
    await waitForUrl('http://127.0.0.1:5189/api/bootstrap', 12000);
  } else {
    console.log('[OMP Desktop] Bun backend already active on http://127.0.0.1:5189');
  }

  let targetUrl = 'http://127.0.0.1:5189';

  // 2. In dev mode, start Vite HMR dev server on 127.0.0.1:5188
  if (mode === 'dev') {
    const viteReady = await isServerReady('http://127.0.0.1:5188');
    if (!viteReady) {
      console.log('[OMP Desktop] Starting Vite HMR server on http://127.0.0.1:5188 ...');
      const viteProc = spawn(process.execPath, [viteBin, '--port', '5188', '--host', '127.0.0.1'], {
        cwd: rootDir,
        stdio: 'inherit',
      });
      children.push(viteProc);
      await waitForUrl('http://127.0.0.1:5188', 12000);
    }
    targetUrl = 'http://127.0.0.1:5188';
  }

  // 3. Launch Electron Desktop Shell
  console.log(`[OMP Desktop] Opening Electron Desktop window -> ${targetUrl}`);
  const env = { ...process.env, OMP_DESKTOP_URL: targetUrl };
  delete env.ELECTRON_RUN_AS_NODE;

  const electronProc = spawn(electronExe, ['.'], {
    cwd: rootDir,
    env,
    stdio: 'inherit',
  });
  children.push(electronProc);

  electronProc.on('exit', (code) => {
    cleanup();
    process.exit(code ?? 0);
  });
}

main().catch((err) => {
  console.error('[OMP Desktop] Launch failed:', err);
  cleanup();
  process.exit(1);
});
