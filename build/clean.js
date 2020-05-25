const fs = require('fs').promises;
const path = require('path');

(async () => {
  try {

    const rootDir = path.resolve(__dirname, '..');

    await Promise.all([
      fs.rmdir(path.resolve(rootDir, 'd.ts'), { recursive: true }),
      fs.rmdir(path.resolve(rootDir, 'dist'), { recursive: true }),
      fs.rmdir(path.resolve(rootDir, 'target'), { recursive: true }),
    ]);
  } catch (e) {
    console.error('Failed to clean build artifacts');
    process.exit(1);
  }
})();
