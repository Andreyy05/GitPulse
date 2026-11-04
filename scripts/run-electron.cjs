const { spawn } = require('child_process');
const http = require('http');
const electron = require('electron');

const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;
env.NODE_ENV = 'development';

function waitForVite(callback, attempts = 0) {
  const req = http.get('http://127.0.0.1:5173', (res) => {
    callback();
  });

  req.on('error', () => {
    if (attempts > 60) {
      console.error('[RUNNER] Timed out waiting for Vite dev server.');
      process.exit(1);
    }
    setTimeout(() => waitForVite(callback, attempts + 1), 250);
  });
}

console.log('[RUNNER] Waiting for Vite on http://127.0.0.1:5173...');
waitForVite(() => {
  console.log('[RUNNER] Vite is ready! Spawning Electron:', electron);
  const child = spawn(electron, ['.'], {
    env,
    stdio: 'inherit',
    windowsHide: false,
  });

  child.on('error', (err) => {
    console.error('[RUNNER] Error spawning electron:', err);
  });

  child.on('exit', (code, signal) => {
    console.log(`[RUNNER] Electron exited with code ${code}, signal ${signal}`);
    process.exit(code || 0);
  });
});
