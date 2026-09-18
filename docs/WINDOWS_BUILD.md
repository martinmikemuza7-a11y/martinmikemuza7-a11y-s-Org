# Building StudyBuddy AI for Windows (.exe)

StudyBuddy AI uses an **Electron** wrapper to produce a standalone Windows desktop executable with NSIS installer packaging.

---

## Prerequisites
- Windows 10/11 x64 (or Linux/macOS with wine/docker for cross-compilation)
- Node.js 20+

---

## Packaging Steps

### Step 1: Prepare Desktop Assets
```bash
npm run build:windows
```
This compiles the web distribution into `dist/` and checks `electron/main.cjs`.

### Step 2: Build Standalone Windows Installer
```bash
npx electron-builder --win nsis --x64
```
The output installer will be saved at:
`dist/StudyBuddyAI-Setup-1.0.0.exe`

### Features of the Desktop App:
- Auto-registers Windows protocol handlers
- Native window management with min/max/close
- Local file persistence in `%APPDATA%/StudyBuddyAI`
- Complete offline capability
