# Building StudyBuddy AI for Android (.apk)

StudyBuddy AI uses **Capacitor** to compile into a native, installable Android APK (`com.studybuddy.app`).

---

## Prerequisites
- Node.js 20+
- Android Studio / Android SDK (API level 34, Android 14)
- Java 17 (OpenJDK recommended)

---

## Quick Build Steps

### Step 1: Build Web Distribution & Assets
```bash
npm run build:android
```
This runs `vite build`, copies assets into `android/app/src/main/assets/public`, and validates `AndroidManifest.xml`.

### Step 2: Compile the Signed APK
From the `android/` directory:
```bash
cd android
./gradlew assembleRelease
```
The output APK is generated at:
`android/app/build/outputs/apk/release/app-release-unsigned.apk` (or signed if keystore configured).

### Step 3: Install onto Device
```bash
adb install android/app/build/outputs/apk/release/app-release.apk
```
Or download `studybuddy-ai-v1.0.0.apk` directly from the in-app Downloads hub!
