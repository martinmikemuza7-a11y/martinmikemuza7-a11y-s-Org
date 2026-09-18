// Android APK build and asset preparation pipeline
import fs from 'fs';
import path from 'path';

console.log('🤖 Starting Android APK build preparation for StudyBuddy AI...');

const distDir = path.resolve('dist');
if (!fs.existsSync(distDir)) {
  console.error('Error: dist directory does not exist. Run "npm run build" first.');
  process.exit(1);
}

const androidDir = path.resolve('android/app/src/main/assets/public');
fs.mkdirSync(androidDir, { recursive: true });

// Copy compiled web distribution into Android assets
fs.cpSync(distDir, androidDir, { recursive: true });

// Ensure AndroidManifest.xml template exists
const manifestPath = path.resolve('android/app/src/main/AndroidManifest.xml');
if (!fs.existsSync(manifestPath)) {
  fs.mkdirSync(path.dirname(manifestPath), { recursive: true });
  const manifestXml = `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.studybuddy.app">
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
    <uses-permission android:name="android.permission.CAMERA" />
    <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="StudyBuddy AI"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:supportsRtl="true"
        android:theme="@style/AppTheme">
        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:configChanges="orientation|keyboardHidden|keyboard|screenSize|locale|smallestScreenSize|screenLayout|uiMode"
            android:theme="@style/AppTheme.NoActionBarLaunch">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>
</manifest>`;
  fs.writeFileSync(manifestPath, manifestXml);
}

console.log('✅ Android web bundle and AndroidManifest generated at android/app/src/main/assets/public.');
console.log('📱 To compile the final signed release APK: run "./gradlew assembleRelease" inside the android/ directory.');
