// Windows EXE build preparation pipeline
import fs from 'fs';
import path from 'path';

console.log('🪟 Starting Windows .exe preparation for StudyBuddy AI...');

const distDir = path.resolve('dist');
if (!fs.existsSync(distDir)) {
  console.error('Error: dist directory does not exist. Run "npm run build" first.');
  process.exit(1);
}

const electronMain = path.resolve('electron/main.cjs');
if (!fs.existsSync(electronMain)) {
  console.error('Error: electron/main.cjs not found.');
  process.exit(1);
}

console.log('✅ Windows packaging assets verified.');
console.log('📦 Desktop entry point: electron/main.cjs');
console.log('💡 To package as a standalone installable Windows .exe installer:');
console.log('   Run: npx electron-builder --win nsis --x64');
