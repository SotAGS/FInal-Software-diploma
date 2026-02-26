const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const cacheDir = path.join(process.cwd(), '.cache', 'puppeteer');

try {
  fs.mkdirSync(cacheDir, { recursive: true });

  const env = {
    ...process.env,
    PUPPETEER_CACHE_DIR: cacheDir
  };

  console.log(`[postinstall] Instalando Chrome de Puppeteer en ${cacheDir}`);
  execSync('npx puppeteer browsers install chrome', {
    stdio: 'inherit',
    env
  });
  console.log('[postinstall] Chrome de Puppeteer instalado correctamente');
} catch (error) {
  console.warn('[postinstall] No se pudo instalar Chrome de Puppeteer:', error?.message || error);
}
