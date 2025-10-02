# HoneyDo by Amber – Mobile Shell Setup

The web app now ships with Capacitor wrappers so we can publish native shells on iOS and Android while reusing the existing Next.js UI. This doc summarizes the workflow and extra steps needed for push notifications on the mobile builds.

## Prerequisites

| Platform | Requirements |
| --- | --- |
| iOS | macOS with Xcode (latest stable), Command Line Tools switched to Xcode (`sudo xcode-select -s /Applications/Xcode.app`), CocoaPods (`sudo gem install cocoapods`), Firebase `GoogleService-Info.plist` added to `ios/App/App` once sync succeeds. |
| Android | Android Studio (Hedgehog+), Android SDK Platform 34, Android SDK Build-Tools 34, `ANDROID_HOME` configured. |
| Shared | Node 20 (already required by Firebase warn), npm, Firebase CLI (already in use). |

## Initial Sync

```bash
npm install              # already done locally
npm run capacitor:sync   # copies web assets & updates native projects
```

> **Note:** Sync currently fails on iOS if Xcode/CocoaPods are missing. After installing Xcode run the sync again to generate Pods.

For Android you can now use the helper script:

```bash
npm run android:prepare   # build web bundle + sync android project
```

It compiles the latest Next.js build and refreshes the native project in one go. There’s also `npm run android:launch`, which runs the prepare step and immediately opens Android Studio.

### Project layout

- `capacitor.config.ts` – shared config; points the shell at `https://ambers-affirmations.web.app` by default and whitelists localhost/10.0.2.2 plus ngrok when you override `CAP_SERVER_URL` for local testing.
- `android/` – Android Studio project. Open via `npm run capacitor:open:android`.
- `ios/` – Xcode workspace. Open via `npm run capacitor:open:ios` once pods install successfully.

## Running the Native Shells

1. Sync Capacitor (prep scripts keep configs up to date):
   ```bash
   npm run android:prepare        # Android (build + sync)
   npm run capacitor:sync         # iOS (or run android:prepare if you prefer the two-step flow)
   ```
2. Launch the native IDEs:
   - Android: `npm run android:launch` (or run `npm run capacitor:open:android` after preparing)
   - iOS: `npm run capacitor:open:ios`
3. Configure signing / provisioning as usual, then run on device or simulator.

By default the Android and iOS shells load the production site (`https://ambers-affirmations.web.app`). To iterate against a local dev server, run it on your machine and set `CAP_SERVER_URL` before syncing—for the Android emulator use `http://10.0.2.2:3000` so the WebView can resolve your host.

## Local Notifications (Android)

- Capacitor now uses `@capacitor/local-notifications` on native builds. When you enable notifications inside the app, the Android shell will request the `POST_NOTIFICATIONS` runtime permission and schedule reminders locally on the device.
- Tapping a notification routes to `/bark/[id]`, a detail screen that shows the reminder, priority, and quick actions (complete, snooze). Ensure the payload includes `extra.route` when scheduling custom notifications.
- Scheduling happens automatically when reminders are added, edited, or re-enabled. Deleting or completing a reminder cancels its scheduled alert.
- No Firebase token or `google-services.json` file is required for local notifications. The Capacitor shell works offline using the reminder data stored on device.
- After installing a fresh build, visit Settings ➜ *Enable Gentle Barks* to grant permission, then add a reminder a few minutes out to confirm the notification arrives while the app is backgrounded.

> iOS still relies on FCM/APNs for now. When you are ready to ship iOS, re-enable the push token flow or wire up the equivalent local notifications plugin for Swift.

## Testing Checklist

1. **Web fallback:** open the hosted app in Chrome/Safari, enable notifications in Settings ➜ *Enable Gentle Barks*, and send a test from `/test-notifications`.
2. **Android shell:** install on a device, enable notifications in Settings ➜ *Enable Gentle Barks*, and create a reminder due in the next few minutes. Lock the device and verify that Amber's notification appears.
3. **iOS shell (device, optional):** the local notification flow is not wired yet. Until then, continue using the Firebase push path described in earlier revisions if needed.

## Environment Overrides

Set `CAP_SERVER_URL` before syncing to point the shells at staging while keeping production hosting untouched:

```bash
CAP_SERVER_URL=https://your-staging-domain.web.app npm run capacitor:sync
```

This updates the native projects with the alternate URL on the next sync.
