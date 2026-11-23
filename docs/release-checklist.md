# Release checklist — ACVEL Consumidor (mobile)

Expo SDK 57 · React Native 0.86 · TypeScript · Expo Router · native Firebase Auth (`@react-native-firebase` 26.4).
Identifiers: **Android `com.acvel.app` · iOS `com.acvel.app`** · version `1.0.0` (Android `versionCode` 1, iOS `buildNumber` 1) · URL scheme `acvel`.

Scope reminder: feature parity with the consumer portal (`cliente.appacvel.com.br`); ADM operations and invoice/Pix/boleto/charge generation are out of scope (`src/services/__tests__/app-scope.test.ts`).

---

## 1. Environment variables

Ready-made, secret-free templates: **`.env.homologation.example`** (demo/QA) and **`.env.production.example`** (store) — copy the one for the target environment to `.env` (git-ignored) before building; `src/config/__tests__/env-templates.test.ts` keeps both valid and consistent (homologation APIs ↔ `cliente-test`, production APIs ↔ `cliente`). Otherwise copy `.env.example` → `.env` (git-ignored). Every `EXPO_PUBLIC_*` value is **embedded in the app bundle at build time** — never put secrets here; changing a value requires a new build.

| Variable | Homologation (demo) | Production | Notes |
|---|---|---|---|
| `EXPO_PUBLIC_APP_ENV` | `preview` | `production` | `production` rejects mocks and non-https URLs (app shows a configuration error screen instead of starting) |
| `EXPO_PUBLIC_USE_MOCKS` | `false` | `false` | `true` only for offline demos with simulated data |
| `EXPO_PUBLIC_AUTH_API_URL` | `https://api-acvel.souaiv.com/api/auth` | `https://api.appacvel.com.br/api/auth` | no `/v1` suffix |
| `EXPO_PUBLIC_BUSINESS_API_URL` | `https://api-acvel.souaiv.com/api/business` | `https://api.appacvel.com.br/api/business` | |
| `EXPO_PUBLIC_RATEIO_API_URL` | `https://api-acvel.souaiv.com/api/rateio` | `https://api.appacvel.com.br/api/rateio` | |
| `EXPO_PUBLIC_CONSUMIDOR_APP_URL` | `https://cliente-test.appacvel.com.br` | `https://cliente.appacvel.com.br` | portal of the **same** environment as the APIs (referral codes exist only there); legacy `EXPO_PUBLIC_PORTAL_URL` still read as fallback |
| `EXPO_PUBLIC_TERMS_URL` | `https://cliente-test.appacvel.com.br/termos-de-uso-e-privacidade` | `https://cliente.appacvel.com.br/termos-de-uso-e-privacidade` | combined terms/privacy page |
| `EXPO_PUBLIC_PRIVACY_URL` | `https://cliente-test.appacvel.com.br/termos-de-uso-e-privacidade` | `https://cliente.appacvel.com.br/termos-de-uso-e-privacidade` | same page as terms → one "Termos de uso e privacidade" entry |
| `EXPO_PUBLIC_API_TIMEOUT_MS` | `20000` | `20000` | 1000–120000 |
| `EXPO_PUBLIC_CEP_API_URL` | (empty → BrasilAPI v2) | (empty) | optional |

**Never mix environments:** homologation APIs only accept tokens of Firebase project `teste---00`; production APIs only accept `acvel-prod` tokens (docs/live-api-validation.md §1.2).

Local test credentials for `npm run test:live` live in `.env.test.local` (git-ignored) — never commit them.

## 2. Firebase setup

Firebase is configured **natively** (no Firebase env vars). The files are read at build time from `app.json`:

| Platform | File (git-ignored folder `firebase/`) | Must match |
|---|---|---|
| Android | `firebase/google-services-android.json` → `android.googleServicesFile` | `package_name` = `com.acvel.app` |
| iOS | `firebase/GoogleService-Info.plist` → `ios.googleServicesFile` | `BUNDLE_ID` = `com.acvel.app` |

Current files: project **`teste---00`** (homologation) — verified: Android package `com.acvel.app`, iOS bundle `com.acvel.app`.

For production: obtain both files from the **`acvel-prod`** project (Android app + iOS app registered with id `com.acvel.app`, e-mail/password provider enabled) and replace them before the production build. Expo Go is not supported (native Firebase module) — use a development/release build.

## 3. Android build

Prerequisites: Node 20+, JDK 17, Android SDK (platform 36, build-tools, NDK as requested by Gradle), `ANDROID_HOME` set.

> **Windows:** the repository path contains spaces; NDK/CMake fails from such paths. Build from a copy in a short path without spaces (e.g. `C:\acvel-build\m`), or move the repository.

### 3.1 Development build (connected device / emulator, with Metro)

```bash
npm install
npx expo prebuild --platform android      # generates android/ from app.json (git-ignored)
npx expo run:android                       # builds, installs on the device, starts Metro
```

### 3.2 Demo APK (stand-alone, JS bundled — no Metro needed)

```bash
npm install
cp .env.example .env    # fill in the homologation values (section 1)
npx expo prebuild --platform android
cd android
./gradlew assembleRelease -PreactNativeArchitectures=arm64-v8a   # Windows: gradlew.bat
# → android/app/build/outputs/apk/release/app-release.apk
```

- `-PreactNativeArchitectures=arm64-v8a` keeps the APK small and fits all current phones; omit it to include every ABI (also x86_64 for emulators).
- The generated project signs `release` with the **debug keystore**: fine for sideloading a demo, **not** for Google Play.

### 3.3 Install on a device

1. Copy `app-release.apk` to the phone (USB, Drive, e-mail) **or** `adb install -r app-release.apk` with USB debugging enabled.
2. On the phone, allow "Instalar apps desconhecidos" for the app used to open the file.
3. Open the APK → Instalar. A previous build with a different signature must be uninstalled first.
4. First launch: log in with the homologation consumer account.

### 3.4 Store build (later)

- Create an upload keystore (or use EAS managed credentials) and configure `signingConfigs.release`; never commit keystores.
- Recommended: EAS Build (`eas.json` with `development`, `preview` (APK, internal distribution) and `production` (AAB) profiles; `appVersionSource: remote` to auto-increment `versionCode`/`buildNumber`).
- Generate an **AAB** (`./gradlew bundleRelease` or EAS `production`) for Google Play.

### 3.5 Android permissions (merged manifest)

`INTERNET`, `ACCESS_NETWORK_STATE`/`ACCESS_WIFI_STATE` (connectivity banner), `CAMERA` (photograph bill/documents; requested at runtime with a pt-BR rationale), `READ/WRITE_EXTERNAL_STORAGE` (max SDK 32, legacy file picking), `VIBRATE` (haptics), `USE_BIOMETRIC`/`USE_FINGERPRINT` (declared by expo-secure-store; not used), `WAKE_LOCK`. **Blocked** in `app.json` (`android.blockedPermissions` + image-picker `microphonePermission: false`): `RECORD_AUDIO` (the app never records audio/video) and `SYSTEM_ALERT_WINDOW` (added by the Android template; not used).

### 3.6 Demo APK built

**Current: v3 (2026-10-09)** — use this one: `C:\acvel-build\dist\ACVEL-Consumidor-1.0.0-hml-demo-v3.apk` (49.5 MB), SHA-256 `43d235c379f9f119e3154bff645af9950946c1a6daff6dfd2e4f73ab4c09afc8`. Built from `.env.homologation.example` values: homologation APIs + **homologation portal** `cliente-test.appacvel.com.br` (terms/privacy, referral `/indicacao/<codigo>`, sign-up `/auth/cadastro?codigo_representante=`). Bundle checked: `cliente-test` URLs present, no `cliente.appacvel.com.br`, no production API, no test credentials, developer tools stripped; `apksigner verify` OK; BUILD SUCCESSFUL (20 m 54 s, low-memory settings). Same permissions as v2.

v2 (2026-10-07, superseded — portal links pointed to production):

| Item | Value |
|---|---|
| File | `C:\acvel-build\dist\ACVEL-Consumidor-1.0.0-hml-demo-v2.apk` (49.5 MB) |
| SHA-256 | `ea0be0e9b56d3114a9438f5d134ba2ec073885292953078136842262ea198ded` |
| Build | `assembleRelease`, arm64-v8a, signed with the debug keystore (`apksigner verify` OK), BUILD SUCCESSFUL — all 696 tasks |
| Package | `com.acvel.app`, versionCode 1, versionName 1.0.0, compile/target SDK 36 |
| Environment baked in | homologation APIs (`api-acvel.souaiv.com/api/{auth,business,rateio}`), portal `cliente.appacvel.com.br`, Firebase `teste---00`, mocks **off**, `EXPO_PUBLIC_APP_ENV=preview` |
| Checks | JS bundle embedded (no Metro needed); no production host; developer tools stripped; **no test credentials** in the bundle; `RECORD_AUDIO` and `SYSTEM_ALERT_WINDOW` absent, `CAMERA` present |
| Differences from v1 | `APP_ENV` `development` → `preview` (https-only, mocks rejected); `SYSTEM_ALERT_WINDOW` removed. Same app code. |
| Not yet done | installation on a physical device (no device on the build host) |

Previous: v1 (2026-10-05) `C:\acvel-build\dist\ACVEL-Consumidor-1.0.0-hml-demo.apk`, SHA-256 `e9f76f87f4227521c15f101b9087a1d5ea987cbc2f9807f2c00fc2333ffd2ec6` (`APP_ENV=development`, `SYSTEM_ALERT_WINDOW` present).

**Build host note:** this Windows host has 12 GB RAM, mostly in use by other applications. The first v2 attempt crashed the JVM (out of memory). The successful build used `--no-daemon --max-workers=2 -Dorg.gradle.jvmargs="-Xmx1536m -XX:MaxMetaspaceSize=384m" -Pkotlin.compiler.execution.strategy=in-process` (≈ 1 h). After "BUILD SUCCESSFUL" the single-use Gradle daemon reported "Insufficient system resources" while shutting down. That happened after the APK was written; the APK verifies and is complete. On a machine with ≥ 16 GB free RAM the normal command (§3.2) is enough.

## 4. iOS build

Requires macOS + Xcode (or EAS Build in the cloud). Not built yet on this project.

| Item | Value / requirement |
|---|---|
| Bundle identifier | `com.acvel.app` (Apple Developer account of the client; App ID with that identifier) |
| Firebase | `firebase/GoogleService-Info.plist` from the target project (`teste---00` for homologation, `acvel-prod` for production) |
| Native config | `@react-native-firebase/app` with `ios.disableSPM: true` (CocoaPods) + `expo-build-properties` `ios.useFrameworks: "static"` |
| Capabilities | none beyond the defaults (no push, no Sign in with Apple, no associated domains). Keychain is used by Firebase/SecureStore by default |
| Permissions (Info.plist) | `NSCameraUsageDescription`, `NSPhotoLibraryUsageDescription` (pt-BR texts from `app.json`); no microphone |
| Export compliance | `ITSAppUsesNonExemptEncryption = NO` (`ios.config.usesNonExemptEncryption: false`; HTTPS only) |
| Version / build | `version` 1.0.0, `buildNumber` "1" — increment `buildNumber` for every upload |
| Devices | iPhone only (`supportsTablet: false`), portrait |

```bash
npm install
npx expo prebuild --platform ios    # generates ios/ + runs pod install
npx expo run:ios --device           # development build on a registered device
# or: eas build --platform ios --profile preview   (internal distribution / TestFlight)
```

Do **not** submit to the App Store until production Firebase files, production URLs and store metadata (privacy policy URL, screenshots, data-safety answers) are approved.

## 5. Testing checklist (before handing a build to the client)

- [ ] `npm run typecheck` · `npm run lint` · `npm test` green
- [ ] `npm run test:live` (homologation) green — read-only, creates no data
- [ ] `npx expo-doctor` 21/21
- [ ] `.env` points to **one** environment that matches the Firebase files
- [ ] Install on a real Android device; run the client demo checklist (`docs/client-demo-checklist.md`)
- [ ] Airplane mode once: offline banner + retry
- [ ] Kill and reopen the app: session restored
- [ ] Logout → login again
- [ ] Light and dark theme
- [ ] Small screen (≈ 5.5") and large screen

## 6. Known limitations

1. **Minhas usinas** (generator area of the portal) not implemented — needs a generator test account.
2. **Pix / boleto content**: the app only displays charges generated by the ACVEL systems; in homologation the Sisprime registration fails (`nosso_numero` collision), so "Pix/Boleto ainda não disponível" is shown.
3. **Push notifications** not enabled (no device-registration endpoint); notifications are in-app.
4. Marketplace catalogue filters/sorting, referral code at sign-up, in-app password-reset form and maintenance screen not ported (portal-only today).
5. Support: consumers need the `suporte` permission on the backend (homologation test user works through a temporary role).
6. Account deletion: the request works; checking/cancelling an open request is not possible (route missing on the legacy auth-api).
7. iOS never built; no device QA yet (Android APK builds).
8. Production Firebase files (`acvel-prod`) and store signing not configured yet.
