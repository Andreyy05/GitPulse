const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Determine user Desktop directory
const userProfile = process.env.USERPROFILE || 'C:\\Users\\skarl';
const desktopPath = path.join(userProfile, 'Desktop');
const oneDriveDesktop = path.join(userProfile, 'OneDrive', 'Desktop');

let targetDesktop = desktopPath;
if (!fs.existsSync(desktopPath) && fs.existsSync(oneDriveDesktop)) {
  targetDesktop = oneDriveDesktop;
}

const shortcutPath = path.join(targetDesktop, 'GitPulse.lnk');
const exePath = path.resolve(__dirname, '../dist-electron/win-unpacked/GitPulse.exe');
const workingDir = path.dirname(exePath);
const fallbackIcon = path.resolve(__dirname, '../assets/icon.ico');

console.log('Target Desktop:', targetDesktop);
console.log('Shortcut Path:', shortcutPath);
console.log('Executable:', exePath);

if (!fs.existsSync(exePath)) {
  console.error('GitPulse.exe not found at:', exePath);
  process.exit(1);
}

// PowerShell script with semicolon separators
const psCommands = [
  `$s = (New-Object -ComObject WScript.Shell).CreateShortcut('${shortcutPath.replace(/'/g, "''")}')`,
  `$s.TargetPath = '${exePath.replace(/'/g, "''")}'`,
  `$s.WorkingDirectory = '${workingDir.replace(/'/g, "''")}'`,
  `$s.IconLocation = '${fallbackIcon.replace(/'/g, "''")},0'`,
  `$s.Description = 'GitPulse - GitHub Streak & Commit Monitor'`,
  `$s.Save()`,
  `Write-Host 'Shortcut created successfully pointing to GitPulse.exe'`
].join('; ');

try {
  execSync(`powershell -NoProfile -Command "${psCommands}"`, { stdio: 'inherit' });
} catch (err) {
  console.error('Failed to create shortcut:', err);
  process.exit(1);
}
