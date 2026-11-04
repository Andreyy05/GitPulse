const { nativeImage } = require('electron');

/**
 * Creates a nativeImage for the system tray from SVG
 * @param {'green' | 'red' | 'default'} status 
 */
function createTrayIcon(status = 'default') {
  const color = status === 'green' ? '#10b981' : status === 'red' ? '#ef4444' : '#6366f1';
  const pulseColor = status === 'green' ? 'rgba(16,185,129,0.3)' : status === 'red' ? 'rgba(239,68,68,0.3)' : 'rgba(99,102,241,0.3)';

  // 32x32 SVG representing an ECG pulse line inside a dark circle with glowing dot
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
      <circle cx="16" cy="16" r="14" fill="#090d16" stroke="${color}" stroke-width="2"/>
      <circle cx="16" cy="16" r="10" fill="${pulseColor}"/>
      <path d="M7 16 L11 16 L13 11 L16 21 L19 13 L21 16 L25 16" fill="none" stroke="${color}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="21" cy="16" r="1.8" fill="${color}"/>
    </svg>
  `.trim();

  return nativeImage.createFromBuffer(Buffer.from(svg), {
    width: 16,
    height: 16,
  });
}

module.exports = { createTrayIcon };
