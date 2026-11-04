const { spawn } = require('child_process');
const path = require('path');
const electronPath = require('electron');

const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;

const appDir = path.resolve(__dirname, '..');

const child = spawn(electronPath, [appDir], {
  cwd: appDir,
  env,
  stdio: 'ignore',
});

child.on('error', (err) => {
  console.error('Failed to start GitPulse:', err);
});

