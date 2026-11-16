# Android Mobile Setup & Build Guide — LUNA AI

## 1. Overview
The LUNA AI mobile app (`apps/mobile`) is built with React Native and Expo. It provides:
- Portable LUNA Holographic Orb
- Push-to-Talk Tamil & English voice chat with speech playback
- Remote Windows PC Agent control (Launch VS Code, Lock PC, Battery status)
- Authenticated device pairing via QR / 6-digit handshake code

---

## 2. Development Setup

### Step 1: Navigate to Mobile Application Directory
```powershell
cd d:\luna\apps\mobile
```

### Step 2: Start Expo Metro Bundler
```powershell
npx expo start
```
This starts the Metro bundler:
- Press `a` to open on an active Android emulator or connected device via ADB.
- Or scan the terminal QR code with the **Expo Go** app on your physical Android phone (ensure both PC and phone are on the same Wi-Fi network).

---

## 3. Device Pairing Walkthrough
1. In the LUNA Windows Desktop application, navigate to **Android Sync** in the sidebar.
2. Click **Generate Pairing Code**. You will receive a code like `LN-784-291`.
3. In the LUNA Android mobile app, open the **Pairing** tab.
4. Enter your PC's IP address (e.g. `http://192.168.1.100:8000` or `http://10.0.2.2:8000` for Android Emulator) and the pairing code.
5. Tap **Authorize Pairing**. The phone receives an authorized JWT token stored in `expo-secure-store`.
6. You can now speak to your phone: "Luna, open VS Code on my PC" and watch VS Code launch on your Windows desktop!

---

## 4. Building the Standalone Android APK
To compile a standalone release APK:
```powershell
cd d:\luna\apps\mobile
npx eas build --platform android --profile preview
```
Or for local Gradle build:
```powershell
npx expo prebuild
cd android
.\gradlew assembleRelease
```
The resulting `.apk` file is located at `apps/mobile/android/app/build/outputs/apk/release/app-release.apk`.
