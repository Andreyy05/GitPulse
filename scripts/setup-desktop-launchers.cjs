const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const desktopPath = 'C:\\Users\\skarl\\Desktop';
const exePath = 'D:\\CODING\\GitPulse\\dist-electron\\win-unpacked\\GitPulse.exe';
const workingDir = 'D:\\CODING\\GitPulse\\dist-electron\\win-unpacked';
const iconPath = 'D:\\CODING\\GitPulse\\assets\\icon.ico';

// 1. Create .lnk shortcut
const lnkPath = path.join(desktopPath, 'GitPulse.lnk');
const psContent = `
$w = New-Object -ComObject WScript.Shell
$s = $w.CreateShortcut('${lnkPath}')
$s.TargetPath = '${exePath}'
$s.WorkingDirectory = '${workingDir}'
$s.IconLocation = '${iconPath},0'
$s.Description = 'GitPulse - GitHub Streak & Commit Monitor'
$s.Save()
Write-Host "LNK Result:" (Test-Path '${lnkPath}')
`;

const tempPs = path.join(__dirname, 'temp_lnk.ps1');
fs.writeFileSync(tempPs, psContent);
try {
  const out = execSync(`powershell -NoProfile -ExecutionPolicy Bypass -File "${tempPs}"`).toString();
  console.log(out.trim());
} catch (e) {
  console.error('PS LNK error:', e.message);
} finally {
  if (fs.existsSync(tempPs)) fs.unlinkSync(tempPs);
}

// 2. Create .bat launcher
const batPath = path.join(desktopPath, 'Spustit GitPulse.bat');
const batContent = `@echo off
cd /d "${workingDir}"
start "" "${exePath}"
exit
`;
fs.writeFileSync(batPath, batContent);
console.log('BAT Result:', fs.existsSync(batPath));

console.log('Desktop launchers configured successfully!');

